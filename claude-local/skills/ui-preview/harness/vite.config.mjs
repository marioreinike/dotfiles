// Vite config for the ui-preview harness.
//
// This file is copied into <repo>/apps/<app>/.ui-preview/ by scripts/ui-preview.sh
// and run with cwd = apps/<app>, so the app's postcss/tailwind config apply as-is.
// It deliberately imports nothing from `vite` (not resolvable from the app dir
// under pnpm); the config is a plain object.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HARNESS = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(HARNESS, "..");
const REPO = path.resolve(APP_DIR, "../..");
const FAKE_BACKEND = "https://api.ui-preview.invalid";

const APP_NAME = path.basename(APP_DIR);

const appRequire = createRequire(path.join(APP_DIR, "package.json"));
const i18nRequire = createRequire(appRequire.resolve("next-i18next"));
const apiRequire = createRequire(path.join(REPO, "packages/api/package.json"));
const AXIOS_DIR = path.dirname(apiRequire.resolve("axios/package.json"));
const nuqsRequire = createRequire(path.join(REPO, "packages/nuqs/package.json"));
const NUQS_TESTING = nuqsRequire.resolve("nuqs/adapters/testing");
const shim = (file) => path.join(HARNESS, "src/shims", file);

// ---------------------------------------------------------------------------
// Env: NEXT_PUBLIC_* from the app's env schema + .env files, backend faked.
// ---------------------------------------------------------------------------
function publicEnv() {
  const env = {};
  for (const file of ["src/env.mjs", "src/env.ts", "env.mjs"]) {
    const p = path.join(APP_DIR, file);
    if (!fs.existsSync(p)) continue;
    for (const m of fs.readFileSync(p, "utf8").matchAll(/NEXT_PUBLIC_\w+/g)) {
      env[m[0]] = "ui-preview";
    }
  }
  for (const file of [".env", ".env.local", ".env.development"]) {
    const p = path.join(APP_DIR, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*(NEXT_PUBLIC_\w+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  }
  env.NEXT_PUBLIC_BACKEND_URL = FAKE_BACKEND;
  env.NODE_ENV = "development";
  return env;
}

// ---------------------------------------------------------------------------
// Module mocks: built-ins + .ui-preview/mocks.json.
//   { "<module specifier or repo-relative file>": "<mock file, relative to .ui-preview>" }
// Matching is on the *resolved* file, so a hook re-exported through a barrel
// (`import { useFoo } from "@vambe/api"`) is still replaced. Inside a mock,
// import the real module with the `?original` suffix to re-export the rest.
// ---------------------------------------------------------------------------
const MOCKS_FILE = path.join(HARNESS, "mocks.json");

function readMocks() {
  const builtin = {
    "packages/auth/src/utils/firebase/client.ts": "src/shims/firebase-client.ts",
  };
  let user = {};
  if (fs.existsSync(MOCKS_FILE)) {
    user = JSON.parse(fs.readFileSync(MOCKS_FILE, "utf8"));
  }
  return { ...builtin, ...user };
}

function moduleMocksPlugin() {
  const stripQuery = (id) => id.split("?")[0];
  let byFile = null; // resolved absolute file -> mock absolute file
  let bySpecifier = {}; // bare specifier -> mock absolute file

  async function load(ctx) {
    byFile = new Map();
    bySpecifier = {};
    for (const [target, mock] of Object.entries(readMocks())) {
      const mockAbs = path.resolve(HARNESS, mock);
      const asFile = path.resolve(REPO, target);
      if (/^[./]/.test(target) || fs.existsSync(asFile)) {
        byFile.set(asFile, mockAbs);
      } else {
        bySpecifier[target] = mockAbs;
        const resolved = await ctx.resolve(target, path.join(APP_DIR, "index.ts"), {
          skipSelf: true,
        });
        if (resolved) byFile.set(stripQuery(resolved.id), mockAbs);
      }
    }
  }

  return {
    name: "ui-preview-module-mocks",
    enforce: "pre",
    buildStart() {
      byFile = null;
    },
    configureServer(server) {
      server.watcher.add(MOCKS_FILE);
      const restart = (file) => {
        if (file === MOCKS_FILE) server.restart();
      };
      server.watcher.on("change", restart);
      server.watcher.on("add", restart);
      server.watcher.on("unlink", restart);
    },
    async resolveId(source, importer, options) {
      if (source.endsWith("?original")) {
        const real = await this.resolve(source.slice(0, -"?original".length), importer, {
          ...options,
          skipSelf: true,
        });
        return real ? `${stripQuery(real.id)}?original` : null;
      }
      if (!byFile) await load(this);
      if (bySpecifier[source]) return bySpecifier[source];
      let resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      // Shared packages sometimes import deps only the app declares (Next's
      // bundler tolerates it). Fall back to resolving bare imports from the app.
      if (!resolved && /^[@a-z]/i.test(source) && importer) {
        resolved = await this.resolve(source, path.join(APP_DIR, "index.ts"), {
          ...options,
          skipSelf: true,
        });
      }
      if (!resolved) return null;
      const mock = byFile.get(stripQuery(resolved.id));
      if (mock && importer && stripQuery(importer) !== mock) return mock;
      return resolved;
    },
  };
}

// Serves the scenario list so the index page / shoot script can enumerate it.
function scenarioIndexPlugin() {
  return {
    name: "ui-preview-scenario-index",
    configureServer(server) {
      server.middlewares.use("/__ui-preview/health", (_req, res) => {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ok: true, harness: HARNESS }));
      });
    },
  };
}

// Node built-ins: the same browser polyfills Next's webpack config uses, so
// modules that work in `next dev` (util.promisify, Buffer, stream, ...) work here.
// Built-ins Next maps to `false` get an empty module.
const NEXT_POLYFILLS = {
  assert: "next/dist/compiled/assert",
  buffer: "next/dist/compiled/buffer",
  constants: "next/dist/compiled/constants-browserify",
  crypto: "next/dist/compiled/crypto-browserify",
  domain: "next/dist/compiled/domain-browser",
  http: "next/dist/compiled/stream-http",
  https: "next/dist/compiled/https-browserify",
  os: "next/dist/compiled/os-browserify",
  path: "next/dist/compiled/path-browserify",
  punycode: "next/dist/compiled/punycode",
  process: "next/dist/build/polyfills/process",
  querystring: "next/dist/compiled/querystring-es3",
  stream: "next/dist/compiled/stream-browserify",
  string_decoder: "next/dist/compiled/string_decoder",
  sys: "next/dist/compiled/util",
  timers: "next/dist/compiled/timers-browserify",
  tty: "next/dist/compiled/tty-browserify",
  util: "next/dist/compiled/util",
  vm: "next/dist/compiled/vm-browserify",
  zlib: "next/dist/compiled/browserify-zlib",
  events: "next/dist/compiled/events",
};
const EMPTY_BUILTINS = [
  "fs", "fs/promises", "net", "tls", "dns", "child_process", "http2", "module",
  "worker_threads", "perf_hooks", "async_hooks", "cluster", "readline", "inspector",
];
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const builtinAliases = [
  ...Object.entries(NEXT_POLYFILLS).flatMap(([name, target]) => {
    try {
      return [{ find: new RegExp(`^(node:)?${escapeRe(name)}/?$`), replacement: appRequire.resolve(target) }];
    } catch {
      return [];
    }
  }),
  ...EMPTY_BUILTINS.map((name) => ({
    find: new RegExp(`^(node:)?${escapeRe(name)}$`),
    replacement: shim("empty.ts"),
  })),
];

const env = publicEnv();

export default {
  root: HARNESS,
  cacheDir: path.join(HARNESS, ".vite"),
  publicDir: path.join(APP_DIR, "public"),
  clearScreen: false,
  logLevel: "info",
  plugins: [moduleMocksPlugin(), scenarioIndexPlugin()],
  define: {
    "process.env": JSON.stringify(env),
    "process.browser": "true",
    global: "globalThis",
    // webpack polyfills these for browser bundles; some modules rely on it.
    __dirname: JSON.stringify("/"),
    __filename: JSON.stringify("/index.js"),
    __UI_PREVIEW_BACKEND__: JSON.stringify(FAKE_BACKEND),
  },
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: [
      { find: /^ui-preview$/, replacement: path.join(HARNESS, "src/api.ts") },
      { find: /^ui-preview-app$/, replacement: path.join(HARNESS, `src/apps/${APP_NAME}.tsx`) },
      // One axios copy for app + harness, so the global fixture adapter applies everywhere.
      { find: /^axios$/, replacement: AXIOS_DIR },
      // Same nuqs copy as @vambe/nuqs, so the testing adapter's context is the one hooks read.
      { find: /^nuqs\/adapters\/testing$/, replacement: NUQS_TESTING },
      { find: /^@\//, replacement: path.join(APP_DIR, "src") + "/" },
      { find: /^next\/router$/, replacement: shim("next-router.tsx") },
      { find: /^next\/navigation$/, replacement: shim("next-navigation.ts") },
      { find: /^next\/image$/, replacement: shim("next-image.tsx") },
      { find: /^next\/legacy\/image$/, replacement: shim("next-image.tsx") },
      { find: /^next\/link$/, replacement: shim("next-link.tsx") },
      { find: /^next\/dynamic$/, replacement: shim("next-dynamic.tsx") },
      { find: /^next\/head$/, replacement: shim("next-head.tsx") },
      { find: /^next\/script$/, replacement: shim("next-script.tsx") },
      { find: /^next\/font\/(google|local)$/, replacement: shim("next-font.ts") },
      { find: /^next-i18next$/, replacement: shim("next-i18next.ts") },
      { find: /^react-i18next$/, replacement: i18nRequire.resolve("react-i18next") },
      { find: /^i18next$/, replacement: i18nRequire.resolve("i18next") },
      ...builtinAliases,
    ],
    dedupe: ["react", "react-dom", "@tanstack/react-query", "react-i18next", "i18next"],
  },
  server: {
    host: "127.0.0.1",
    strictPort: true,
    fs: { allow: [REPO] },
    hmr: { overlay: false },
  },
  optimizeDeps: {
    entries: ["index.html"],
    esbuildOptions: {
      define: { global: "globalThis" },
    },
  },
};
