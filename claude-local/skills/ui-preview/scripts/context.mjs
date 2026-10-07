#!/usr/bin/env node
// Pre-digests a branch for ui-preview so the agent writes scenarios without exploring:
// changed components, their exports, the @vambe/api hooks they use resolved to
// HTTP verb + path + response type, who renders them, changed i18n keys side by
// side in every locale, and existing scenarios that already cover them.
//
//   context.mjs --repo PATH [--base origin/dev] [--harness DIR] [file ...]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const repo = opt("repo");
const base = opt("base", "origin/dev");
const harness = opt("harness", path.join(repo, "apps/mercur/.ui-preview"));
const explicit = args.filter((a) => !a.startsWith("--"));

const git = (...a) => {
  try {
    return execFileSync("git", ["-C", repo, ...a], { encoding: "utf8", maxBuffer: 64 << 20 });
  } catch {
    return "";
  }
};
const read = (rel) => {
  try {
    return fs.readFileSync(path.join(repo, rel), "utf8");
  } catch {
    return "";
  }
};
const out = [];
const say = (s = "") => out.push(s);

const changed = explicit.length
  ? explicit
  : git("diff", "--name-only", `${base}...HEAD`).split("\n").filter(Boolean);
const isComponent = (f) =>
  /\.tsx$/.test(f) &&
  /^(apps\/[^/]+\/src|packages\/[^/]+\/src)\//.test(f) &&
  !/(\.test|\.spec|\.stories)\.tsx$|__tests__|\/pages\/_/.test(f);
const components = changed.filter(isComponent);
const locales = changed.filter((f) => /\/public\/locales\/[^/]+\/[^/]+\.json$/.test(f));
const others = changed.filter((f) => !components.includes(f) && !locales.includes(f));

say(`# ui-preview context (${explicit.length ? "explicit files" : `${base}...HEAD`})`);
say(`changed components: ${components.length}, locale files: ${locales.length}, other: ${others.length}`);
if (others.length) say(`other changed files: ${others.join(", ")}`);

// ---------------------------------------------------------------------------
// Hook index: use* exports under packages/api/src -> file
// ---------------------------------------------------------------------------
const hookIndex = new Map();
for (const line of git(
  "grep", "-n", "-E", "export (async )?function use[A-Z][A-Za-z0-9]*|export const use[A-Z][A-Za-z0-9]* *=",
  "--", "packages/api/src",
).split("\n")) {
  const m = line.match(/^([^:]+):\d+:.*?(use[A-Z]\w*)/);
  if (m && !hookIndex.has(m[2])) hookIndex.set(m[2], m[1]);
}

function resolveRel(fromFile, spec) {
  const baseDir = path.dirname(fromFile);
  for (const ext of ["", ".ts", ".tsx", "/index.ts"]) {
    const p = path.normalize(path.join(baseDir, spec + ext));
    if (fs.existsSync(path.join(repo, p)) && fs.statSync(path.join(repo, p)).isFile()) return p;
  }
  return null;
}

function endpointsOf(file, depth = 0) {
  const src = read(file);
  const found = [];
  const re = /api\.(get|post|put|patch|delete)\s*(?:<([^>(]*)>)?\s*\(\s*([`"'])([^`"']+)\3/g;
  for (const m of src.matchAll(re)) {
    const camelize = /camelize:\s*true/.test(src.slice(m.index, m.index + 400));
    found.push({
      verb: m[1].toUpperCase(),
      path: m[4].replace(/\$\{[^}]+\}/g, ":param"),
      type: m[2]?.trim() || "?",
      camelize,
      file,
    });
  }
  if (found.length || depth > 1) return found;
  // Follow relative imports one level (hook -> infrastructure).
  for (const m of src.matchAll(/from\s+["'](\.{1,2}\/[^"']+)["']/g)) {
    const target = resolveRel(file, m[1]);
    if (target && /infrastructure|api|service/.test(target)) found.push(...endpointsOf(target, depth + 1));
  }
  return found;
}

function typeSource(typeName, file) {
  const bare = typeName.replace(/\[\]$/, "").replace(/^Array<(.+)>$/, "$1").trim();
  const src = read(file);
  const m = src.match(new RegExp(`import\\s*(?:type\\s*)?\\{[^}]*\\b${bare}\\b[^}]*\\}\\s*from\\s*["']([^"']+)["']`));
  if (!m) return null;
  const spec = m[1];
  if (spec.startsWith("@vambe/types/")) return `packages/types/${spec.slice("@vambe/types/".length)}`;
  return spec;
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
// Palettes themed in the `.dark` block of the shared tailwind globals.
const themed = new Set(
  (read("packages/config/tailwind/globals.css").match(/^\.dark \{[\s\S]*?^\}/m)?.[0] ?? "")
    .match(/--([a-z]+)-\d+:/g)
    ?.map((v) => v.slice(2).replace(/-\d+:$/, "")) ?? [],
);
const TW_PALETTES = ["slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"];
const unthemed = TW_PALETTES.filter((p) => !themed.has(p));
const UNTHEMED = new RegExp(
  String.raw`(?<![\w:-])((?:bg|text|border)-(?:white|black)(?![\w/-])` +
    (unthemed.length ? String.raw`|(?:text|bg|border|ring|fill|stroke|divide|from|to|via)-(?:${unthemed.join("|")})-\d{2,3}\b` : "") +
    ")",
  "g",
);

const existingScenarios = fs.existsSync(path.join(harness, "scenarios"))
  ? fs.readdirSync(path.join(harness, "scenarios")).filter((f) => f.endsWith(".preview.tsx"))
  : [];

for (const file of components) {
  const src = read(file);
  if (!src) {
    say(`\n## ${file} (deleted)`);
    continue;
  }
  const exports = [
    ...src.matchAll(/export\s+(?:default\s+)?(?:function|const)\s+([A-Z]\w*)/g),
  ].map((m) => m[1]);
  const props = [...src.matchAll(/(?:type|interface)\s+(\w*Props)\b/g)].map((m) => m[1]);
  const importPath = file.startsWith("apps/mercur/src/")
    ? `@/${file.slice("apps/mercur/src/".length).replace(/\.tsx$/, "")}`
    : file.replace(/^packages\/([^/]+)\//, "@vambe/$1/").replace(/\.tsx$/, "");
  say(`\n## ${file}`);
  say(`import: import { ${exports.join(", ") || "?"} } from "${importPath}";`);
  if (props.length) say(`props types: ${[...new Set(props)].join(", ")} (read them in the file)`);

  const apiImport = src.match(/import\s*\{([^}]+)\}\s*from\s*["']@vambe\/api["']/);
  const hooks = apiImport
    ? apiImport[1].split(",").map((s) => s.trim().replace(/^type\s+/, "")).filter((s) => /^use[A-Z]/.test(s))
    : [];
  const localHooks = [...src.matchAll(/import\s*\{([^}]+)\}\s*from\s*["'](\.{1,2}\/[^"']*hooks?[^"']*)["']/g)];
  for (const m of localHooks) {
    for (const h of m[1].split(",").map((s) => s.trim()).filter((s) => /^use[A-Z]/.test(s))) {
      const f = resolveRel(file, m[2]);
      if (f) hookIndex.set(h, f);
      hooks.push(h);
    }
  }
  for (const hook of hooks) {
    const hookFile = hookIndex.get(hook);
    if (!hookFile) {
      say(`hook ${hook}: not found under packages/api/src`);
      continue;
    }
    const eps = endpointsOf(hookFile);
    const hookSrc = read(hookFile);
    const retry = hookSrc.match(/retry:\s*([^,\n]+)/)?.[1]?.trim();
    const refetch = hookSrc.match(/refetchInterval:\s*([^,\n]+)/)?.[1]?.trim();
    const extra = [retry && `retry=${retry}`, refetch && `refetchInterval=${refetch}`].filter(Boolean).join(" ");
    if (!eps.length) say(`hook ${hook} (${hookFile})${extra ? ` ${extra}` : ""}: no direct api.* call found, read it`);
    for (const ep of eps) {
      const types = ep.type !== "?" ? typeSource(ep.type, ep.file) : null;
      say(
        `hook ${hook}: fixture "${ep.verb} ${ep.path}" -> ${ep.type}${types ? ` (${types})` : ""}` +
          `${ep.camelize ? ", camelize: write snake_case" : ", no camelize: write the shape as-is"}` +
          `${extra ? `, ${extra}` : ""}  [${ep.file}]`,
      );
    }
  }
  const otherHooks = [...src.matchAll(/\b(use[A-Z]\w*)\(/g)]
    .map((m) => m[1])
    .filter((h) => !hooks.includes(h) && !/^use(State|Effect|Memo|Callback|Ref|Translations?|Router|Context|Id|Reducer|LayoutEffect|Transition|DeferredValue|ImperativeHandle|SyncExternalStore)$/.test(h));
  if (otherHooks.length) say(`other hooks used: ${[...new Set(otherHooks)].join(", ")} (may need a provider via wrapper or a module mock)`);

  for (const name of exports.slice(0, 2)) {
    const users = git("grep", "-l", "-E", `<${name}([[:space:]]|/|>|$)`, "--", ":(glob)apps/*/src/**", ":(glob)packages/*/src/**")
      .split("\n")
      .filter((f) => f && f !== file && !/__tests__|\.test\./.test(f))
      .slice(0, 3);
    if (users.length) say(`rendered by (<${name}>): ${users.join(", ")}`);
  }
  // Colors that do NOT flip in dark mode, added by the change. Palettes with
  // vars in the `.dark` block of the tailwind globals (slate, blue, ...) theme
  // fine; bg-white/black and un-themed palettes do not.
  const hits = [];
  let lineNo = 0;
  for (const line of git("diff", "-U0", `${base}...HEAD`, "--", file).split("\n")) {
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (hunk) {
      lineNo = Number(hunk[1]);
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      for (const m of line.matchAll(UNTHEMED)) hits.push(`${file}:${lineNo} ${m[1]}`);
      lineNo++;
    }
  }
  if (hits.length) {
    say(
      `⚠ UNTHEMED COLORS added (do not flip in dark mode; check the dark shot, prefer bg-card, ` +
        `bg-background, text-foreground, border-border): ${hits.join(", ")}`,
    );
  }

  const covered = existingScenarios.filter((s) =>
    read(path.relative(repo, path.join(harness, "scenarios", s))).includes(importPath),
  );
  if (covered.length) say(`EXISTING scenarios importing it (extend these): ${covered.join(", ")}`);
}

// ---------------------------------------------------------------------------
// Locale keys: changed keys, every locale side by side
// ---------------------------------------------------------------------------
const byNamespace = new Map();
for (const f of locales) {
  const m = f.match(/^(.*\/public\/locales)\/([^/]+)\/([^/]+)\.json$/);
  if (!m) continue;
  const key = `${m[1]}|${m[3]}`;
  if (!byNamespace.has(key)) byNamespace.set(key, { root: m[1], ns: m[3], keys: new Set() });
  for (const line of git("diff", "-U0", `${base}...HEAD`, "--", f).split("\n")) {
    const k = line.match(/^\+\s*"([^"]+)"\s*:/);
    if (k) byNamespace.get(key).keys.add(k[1]);
  }
}
for (const { root, ns, keys } of byNamespace.values()) {
  const langs = fs.readdirSync(path.join(repo, root)).filter((l) => fs.existsSync(path.join(repo, root, l, `${ns}.json`)));
  const data = Object.fromEntries(
    langs.map((l) => {
      try {
        return [l, JSON.parse(read(`${root}/${l}/${ns}.json`))];
      } catch {
        return [l, {}];
      }
    }),
  );
  const flat = (obj, k) => k.split(".").reduce((o, p) => (o == null ? o : o[p]), obj);
  say(`\n## i18n namespace "${ns}": changed keys (compare wording across locales and with existing keys)`);
  for (const k of keys) {
    say(`${k}:`);
    for (const l of langs) say(`  ${l}: ${JSON.stringify(flat(data[l], k) ?? "MISSING")}`);
  }
  // Terminology: compare "noun + connector + noun" product terms (guia de ligação),
  // plural-normalized, between new and existing strings. A new variant of a term
  // established 2+ times is flagged. (Modifier+noun pairs were too noisy.)
  const CONNECTORS = new Set(["de", "da", "do", "das", "dos", "del", "di", "of"]);
  const norm = (w) => (w.length > 3 ? w.replace(/s$/, "") : w);
  const tokens = (s) => (typeof s === "string" ? (s.toLowerCase().match(/\p{L}+/gu) ?? []).map(norm) : []);
  const terms = (s) => {
    const t = tokens(s);
    const out = [];
    for (let i = 0; i + 2 < t.length; i++) {
      if (t[i].length >= 4 && CONNECTORS.has(t[i + 1]) && t[i + 2].length >= 4) out.push([`${t[i]} ${t[i + 1]}`, t[i + 2]]);
    }
    return out;
  };
  const allKeys = (obj, prefix = "") =>
    Object.entries(obj ?? {}).flatMap(([k, v]) =>
      v && typeof v === "object" ? allKeys(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]],
    );
  for (const l of langs) {
    const established = new Map(); // head -> Map(variant -> count)
    for (const [k, v] of allKeys(data[l])) {
      if (keys.has(k)) continue;
      for (const [head, variant] of terms(v)) {
        if (!established.has(head)) established.set(head, new Map());
        const m = established.get(head);
        m.set(variant, (m.get(variant) ?? 0) + 1);
      }
    }
    const flags = new Set();
    for (const k of keys) {
      for (const [head, variant] of terms(flat(data[l], k))) {
        const known = established.get(head);
        if (!known || known.has(variant)) continue;
        const [top, n] = [...known].sort((a, b) => b[1] - a[1])[0];
        if (n >= 2) flags.add(`new "${head} ${variant}" vs established "${head} ${top}" (${n}x)`);
      }
    }
    if (flags.size) say(`⚠ TERMINOLOGY ${l}: ${[...flags].slice(0, 4).join("; ")}. Report it unless intentional.`);
  }
  const nearby = Object.keys(data.es ?? data[langs[0]] ?? {}).filter((k) => !keys.has(k)).slice(0, 6);
  if (nearby.length) {
    say(`existing keys for terminology reference:`);
    for (const k of nearby) say(`  ${k}: ${langs.map((l) => `${l}=${JSON.stringify(flat(data[l], k))}`).join("  ")}`);
  }
}

if (existingScenarios.length) say(`\nall existing scenarios: ${existingScenarios.join(", ")}`);
console.log(out.join("\n"));
