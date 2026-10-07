// Network layer of the harness: every axios request and every cross-origin /
// `/api/*` fetch goes through the active scenario's fixtures. Nothing reaches a
// real backend. Unmatched requests answer 501 and are recorded so the agent
// knows which fixtures to add.
import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import type { Fixtures, FixtureResponse, PreviewRequest } from "./api";

declare const __UI_PREVIEW_BACKEND__: string;
export const BACKEND = __UI_PREVIEW_BACKEND__;

export interface RequestLog {
  method: string;
  path: string;
  status: number;
  matched: string | null;
}

export interface PreviewReport {
  ready: boolean;
  scenario: string | null;
  state: string | null;
  requests: RequestLog[];
  unmocked: string[];
  errors: string[];
  navigations: string[];
}

declare global {
  interface Window {
    __UI_PREVIEW__: PreviewReport;
  }
}

export const report: PreviewReport = {
  ready: false,
  scenario: null,
  state: null,
  requests: [],
  unmocked: [],
  errors: [],
  navigations: [],
};
window.__UI_PREVIEW__ = report;

let fixtures: Fixtures = {};
export function setFixtures(next: Fixtures) {
  fixtures = next;
}

// In-flight requests that are expected to finish (pending() ones are excluded).
let inflight = 0;
// Requests parked forever by pending(); their queries stay "fetching" on purpose.
let parked = 0;
export const getParked = () => parked;

// Extra busy signals (e.g. React Query retry backoff, where no request is in flight).
const busyProbes: Array<() => boolean> = [];
export const addBusyProbe = (probe: () => boolean) => busyProbes.push(probe);
export const getInflight = () => inflight + busyProbes.filter((p) => p()).length;

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------
function compile(pattern: string) {
  const names: string[] = [];
  const re = pattern
    .split("/")
    .map((seg) => {
      if (seg === "*") return ".*";
      if (seg.startsWith(":")) {
        names.push(seg.slice(1));
        return "([^/]+)";
      }
      return seg.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { re: new RegExp(`^${re}/?$`), names };
}

function match(method: string, path: string) {
  for (const [key, fixture] of Object.entries(fixtures)) {
    const space = key.indexOf(" ");
    const kMethod = space === -1 ? "*" : key.slice(0, space).toUpperCase();
    const kPath = space === -1 ? key : key.slice(space + 1).trim();
    if (kMethod !== "*" && kMethod !== method) continue;
    const { re, names } = compile(kPath.split("?")[0]!);
    const m = path.match(re);
    if (!m) continue;
    const params: Record<string, string> = {};
    names.forEach((n, i) => (params[n] = decodeURIComponent(m[i + 1]!)));
    return { key, fixture, params };
  }
  return null;
}

const isFixtureResponse = (v: unknown): v is FixtureResponse =>
  !!v && typeof v === "object" && (v as FixtureResponse).__fixture === true;

const clone = (v: unknown) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

function parseBody(body: unknown) {
  if (typeof body !== "string") return body ?? null;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

/** Normalizes a URL into the path fixtures are keyed by. */
function toPath(url: URL) {
  if (url.origin === BACKEND || url.origin === location.origin) return url.pathname;
  return `${url.origin}${url.pathname}`;
}

async function handle(
  method: string,
  url: URL,
  body: unknown,
  headers: Record<string, string>,
): Promise<FixtureResponse> {
  method = method.toUpperCase();
  const path = toPath(url);
  const hit = match(method, path);
  const log: RequestLog = { method, path, status: 0, matched: hit?.key ?? null };
  report.requests.push(log);

  if (!hit) {
    const sig = `${method} ${path}`;
    if (!report.unmocked.includes(sig)) report.unmocked.push(sig);
    console.warn(`[ui-preview] unmocked request: ${sig}`);
    log.status = 501;
    return { __fixture: true, status: 501, data: { message: `ui-preview: no fixture for ${sig}` } };
  }

  const req: PreviewRequest = {
    method,
    path,
    url: url.toString(),
    query: Object.fromEntries(url.searchParams),
    params: hit.params,
    body: parseBody(body),
    headers,
  };
  const raw = typeof hit.fixture === "function" ? await hit.fixture(req) : hit.fixture;
  const out = isFixtureResponse(raw) ? raw : { __fixture: true as const, status: 200, data: raw };
  log.status = out.status;
  return { ...out, data: clone(out.data) };
}

async function respond<T>(
  method: string,
  url: URL,
  body: unknown,
  headers: Record<string, string>,
  build: (r: FixtureResponse) => T,
): Promise<T> {
  const r = await handle(method, url, body, headers);
  if (r.delay === Infinity) {
    parked++;
    return new Promise<T>(() => {});
  }
  inflight++;
  try {
    if (r.delay) await new Promise((ok) => setTimeout(ok, r.delay));
    return build(r);
  } finally {
    inflight--;
  }
}

// ---------------------------------------------------------------------------
// axios
// ---------------------------------------------------------------------------
function axiosUrl(config: InternalAxiosRequestConfig) {
  const base = config.baseURL ?? BACKEND;
  const raw = config.url ?? "";
  const url = /^https?:\/\//.test(raw)
    ? new URL(raw)
    : new URL(base.replace(/\/$/, "") + "/" + raw.replace(/^\//, ""));
  for (const [k, v] of Object.entries(config.params ?? {})) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((item) => url.searchParams.append(k, String(item)));
    else url.searchParams.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  return url;
}

export const fixtureAdapter: AxiosAdapter = (config) =>
  respond(
    config.method ?? "get",
    axiosUrl(config),
    config.data,
    Object.fromEntries(
      Object.entries(config.headers ?? {}).map(([k, v]) => [k, String(v)]),
    ),
    (r) => {
      const response = {
        data: r.data,
        status: r.status,
        statusText: String(r.status),
        headers: r.headers ?? { "content-type": "application/json" },
        config,
        request: {},
      };
      const ok = config.validateStatus ? config.validateStatus(r.status) : r.status < 400;
      if (ok) return response;
      throw new AxiosError(
        `Request failed with status code ${r.status}`,
        r.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
        config,
        {},
        response,
      );
    },
  );

// ---------------------------------------------------------------------------
// fetch / WebSocket / navigation
// ---------------------------------------------------------------------------
function shouldMockFetch(url: URL) {
  if (url.origin !== location.origin) return true;
  return url.pathname.startsWith("/api/");
}

export function installNetworkMocks() {
  axios.defaults.adapter = fixtureAdapter;

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : null;
    const url = new URL(req ? req.url : String(input), location.href);
    if (!shouldMockFetch(url)) {
      inflight++;
      try {
        return await realFetch(input, init);
      } finally {
        inflight--;
      }
    }
    const method = init?.method ?? req?.method ?? "GET";
    const body = init?.body ?? null;
    const headers = Object.fromEntries(new Headers(init?.headers ?? req?.headers).entries());
    return respond(method, url, body, headers, (r) =>
      new Response(r.data == null ? null : JSON.stringify(r.data), {
        status: r.status,
        headers: { "content-type": "application/json", ...(r.headers ?? {}) },
      }),
    );
  };

  // Sockets never connect: realtime features stay idle instead of erroring.
  class DeadWebSocket extends EventTarget {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    readyState = 0;
    url: string;
    protocol = "";
    extensions = "";
    bufferedAmount = 0;
    binaryType: BinaryType = "blob";
    onopen = null;
    onclose = null;
    onerror = null;
    onmessage = null;
    constructor(url: string | URL) {
      super();
      this.url = String(url);
    }
    send() {}
    close() {
      this.readyState = 3;
    }
  }
  window.WebSocket = DeadWebSocket as unknown as typeof WebSocket;
  // EventSource (SSE) likewise never opens.
  if ("EventSource" in window) {
    window.EventSource = class extends EventTarget {
      readyState = 0;
      close() {}
    } as unknown as typeof EventSource;
  }

  // Error capture for the report.
  const push = (msg: string) => {
    if (report.errors.length < 50 && !report.errors.includes(msg)) report.errors.push(msg);
  };
  window.addEventListener("error", (e) => push(`error: ${e.message}`));
  window.addEventListener("unhandledrejection", (e) =>
    push(`unhandledrejection: ${e.reason?.message ?? String(e.reason)}`),
  );
  const consoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    push(
      `console.error: ${args
        .map((a) => (a instanceof Error ? a.message : typeof a === "string" ? a : safeJson(a)))
        .join(" ")
        .slice(0, 500)}`,
    );
    consoleError(...args);
  };
}

function safeJson(v: unknown) {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
