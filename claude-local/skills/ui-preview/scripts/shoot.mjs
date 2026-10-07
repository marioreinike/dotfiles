#!/usr/bin/env node
// Screenshots ui-preview scenario states with Playwright (system Chrome, headless).
// Writes <out>/<scenario>--<state>.png plus report.json, prints a compact summary.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const repo = opt("repo");
const base = opt("base");
const defaultOut = opt("default-out");
const out = path.resolve(opt("out", path.join(defaultOut, "latest")));
const [vw, vh] = opt("viewport", "1280x800").split("x").map(Number);
const scale = Number(opt("scale", "1"));
const concurrency = Number(opt("concurrency", "3"));
const targets = args.filter((a) => !a.startsWith("--"));

const { chromium } = createRequire(path.join(repo, "package.json"))("@playwright/test");

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });

// Vite may reload the page once while it optimizes newly discovered deps, which
// destroys the execution context mid-wait; keep polling across reloads.
async function waitReady(page, timeout = 45000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try {
      if (await page.evaluate(() => window.__UI_PREVIEW__?.ready === true)) return true;
    } catch {
      // context destroyed by a reload; retry
    }
    await page.waitForTimeout(150);
  }
  return false;
}

async function readIndex() {
  const page = await browser.newPage();
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  if (!(await waitReady(page))) throw new Error("index page never became ready");
  const index = await page.evaluate(() => ({
    entries: window.__UI_PREVIEW_INDEX__ ?? [],
    errors: window.__UI_PREVIEW__.errors,
  }));
  await page.close();
  return index;
}

// Crop to the rendered content (frame children + portals such as popovers), padded.
async function contentClip(page) {
  return page.evaluate(() => {
    const nodes = [
      ...document.querySelectorAll("#ui-preview-frame > *"),
      ...[...document.body.children].filter(
        (el) => el.id !== "preview-root" && el.tagName !== "SCRIPT" && el.tagName !== "STYLE",
      ),
    ];
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const el of nodes) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      x1 = Math.min(x1, r.left + scrollX);
      y1 = Math.min(y1, r.top + scrollY);
      x2 = Math.max(x2, r.right + scrollX);
      y2 = Math.max(y2, r.bottom + scrollY);
    }
    if (x1 === Infinity) return null;
    const pad = 16;
    const w = document.documentElement.scrollWidth;
    const h = document.documentElement.scrollHeight;
    const x = Math.max(0, x1 - pad);
    const y = Math.max(0, y1 - pad);
    return { x, y, width: Math.min(w, x2 + pad) - x, height: Math.min(h, y2 + pad) - y };
  });
}

async function runStep(page, step) {
  if ("click" in step) await page.click(step.click);
  else if ("hover" in step) await page.hover(step.hover);
  else if ("fill" in step) await page.fill(step.fill, step.value);
  else if ("press" in step) await page.keyboard.press(step.press);
  else if ("wait" in step) await page.waitForTimeout(step.wait);
}

const index = await readIndex();
const jobs = [];
for (const entry of index.entries) {
  for (const state of entry.states) {
    const wanted =
      targets.length === 0 ||
      targets.includes(entry.scenario) ||
      targets.includes(`${entry.scenario}:${state.name}`);
    if (wanted) jobs.push({ entry, state });
  }
}
if (index.errors.length) console.log(`index errors:\n  ${index.errors.join("\n  ")}`);
if (jobs.length === 0) {
  console.log(`no matching scenario states (have: ${index.entries.map((e) => e.scenario).join(", ") || "none"})`);
  await browser.close();
  process.exit(1);
}

async function shootOne({ entry, state }) {
  const viewport = state.viewport ?? { width: vw, height: vh };
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: scale,
    colorScheme: state.theme ?? "light",
    locale: state.locale ?? "es-CL",
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
  const url = `${base}/?s=${encodeURIComponent(entry.scenario)}&state=${encodeURIComponent(state.name)}`;
  const file = path.join(out, `${entry.scenario.replaceAll("/", "__")}--${state.name}.png`);
  const result = { scenario: entry.scenario, state: state.name, url, file };
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    result.ready = await waitReady(page);
    for (const step of state.interact ?? []) await runStep(page, step);
    if (state.interact?.length) await page.waitForTimeout(300);
    if (state.capture === "viewport") {
      await page.screenshot({ path: file });
    } else if (state.capture) {
      await page.locator(state.capture).first().screenshot({ path: file });
    } else if (state.frame === "none") {
      await page.screenshot({ path: file, fullPage: true });
    } else {
      const clip = await contentClip(page);
      await page.screenshot({ path: file, fullPage: true, ...(clip ? { clip } : {}) });
    }
    Object.assign(result, await page.evaluate(() => {
      const r = window.__UI_PREVIEW__;
      return { unmocked: r.unmocked, errors: r.errors, navigations: r.navigations, requests: r.requests.length };
    }));
  } catch (err) {
    result.failure = err.message.split("\n")[0];
  }
  result.errors = [...new Set([...(result.errors ?? []), ...consoleErrors])];
  await context.close();
  return result;
}

// Small pool: states are independent pages; 3 at a time keeps the machine calm.
const results = new Array(jobs.length);
let next = 0;
await Promise.all(
  Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
    while (next < jobs.length) {
      const i = next++;
      results[i] = await shootOne(jobs[i]);
    }
  }),
);
await browser.close();

fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(results, null, 2));

const dirty = results.filter(
  (r) => r.failure || r.ready === false || r.unmocked?.length || r.errors?.length,
).length;
console.log(
  `${results.length} state(s) shot: ${dirty === 0 ? "all clean (ready, 0 unmocked, 0 errors)" : `${dirty} with problems (see below)`}`,
);
console.log(`screenshots: ${out}`);
for (const r of results) {
  const flags = [];
  if (r.failure) flags.push(`FAILED: ${r.failure}`);
  if (r.ready === false) flags.push("not-ready(timeout)");
  if (r.unmocked?.length) flags.push(`unmocked: ${r.unmocked.join(", ")}`);
  if (r.errors?.length) flags.push(`${r.errors.length} error(s)`);
  console.log(`- ${r.scenario}:${r.state}  ${path.basename(r.file)}${flags.length ? "  [" + flags.join("; ") + "]" : ""}`);
  for (const e of (r.errors ?? []).slice(0, 5)) console.log(`    ${e.split("\n")[0].slice(0, 300)}`);
}
console.log(`full report: ${path.join(out, "report.json")}`);
