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

// Crop to the rendered content (frame content + portals such as popovers), padded.
// Descendants count too, so content overflowing a fixed-width wrapper stays visible.
async function contentClip(page) {
  return page.evaluate(() => {
    const portals = [...document.body.children].filter(
      (el) => el.id !== "preview-root" && el.tagName !== "SCRIPT" && el.tagName !== "STYLE",
    );
    const nodes = [
      ...document.querySelectorAll("#ui-preview-frame *"),
      ...portals.flatMap((el) => [el, ...el.querySelectorAll("*")]),
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

// Steps fail fast (5s) and name themselves, so a wrong selector (e.g. English
// text on the default es locale) costs seconds, not Playwright's 30s default.
async function runStep(page, step) {
  const timeout = 5000;
  try {
    if ("click" in step) await page.click(step.click, { timeout });
    else if ("hover" in step) await page.hover(step.hover, { timeout });
    else if ("fill" in step) await page.fill(step.fill, step.value, { timeout });
    else if ("press" in step) await page.keyboard.press(step.press);
    else if ("wait" in step) await page.waitForTimeout(step.wait);
  } catch (err) {
    const visible = await page
      .evaluate(() =>
        [...document.querySelectorAll("button, [role=button], [role=option], a, input")]
          .filter((el) => el.getBoundingClientRect().width > 0)
          .map((el) => el.getAttribute("aria-label") || el.textContent?.trim() || el.getAttribute("placeholder") || el.tagName)
          .filter(Boolean)
          .slice(0, 12),
      )
      .catch(() => []);
    throw new Error(
      `interact step ${JSON.stringify(step)} failed (${err.message.split("\n")[0]}). ` +
        `Clickable now: ${JSON.stringify(visible)}`,
    );
  }
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
// Contact sheets: labelled grids of up to 6 states, so a reviewer (human or agent)
// reads a handful of images instead of one per state. Individual PNGs stay for zooming.
const SHEET_SIZE = 6;
const sheets = [];
const shot = results.filter((r) => !r.failure && fs.existsSync(r.file));
for (let i = 0; i < shot.length; i += SHEET_SIZE) {
  const chunk = shot.slice(i, i + SHEET_SIZE);
  const cells = chunk
    .map((r) => {
      const flag = r.unmocked?.length || r.errors?.length || r.ready === false ? " ⚠" : "";
      const data = fs.readFileSync(r.file).toString("base64");
      return `<figure><figcaption>${r.scenario}:${r.state}${flag}</figcaption><img src="data:image/png;base64,${data}"></figure>`;
    })
    .join("");
  // Tiny viewport height: the full-page shot then equals the grid's own height.
  const page = await browser.newPage({ viewport: { width: 1200, height: 100 } });
  await page.setContent(
    `<style>body{margin:0;padding:12px;background:#94a3b8;font:600 13px system-ui}
      main{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
      figure{margin:0;background:#fff;padding:6px;border-radius:6px}
      figcaption{margin-bottom:4px;color:#0f172a}
      img{display:block;max-width:100%;max-height:420px;object-fit:contain;object-position:left top}</style>
     <main>${cells}</main>`,
  );
  const file = path.join(out, `sheet-${sheets.length + 1}.png`);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
  sheets.push(file);
}
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
if (sheets.length) console.log(`contact sheets (read these first, ${SHEET_SIZE} states each):\n  ${sheets.join("\n  ")}`);
