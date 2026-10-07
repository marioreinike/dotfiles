// Public API for scenario files: `import { definePreview, res } from "ui-preview"`.
import { createElement, type ReactNode } from "react";

export interface PreviewRequest {
  method: string;
  /** Path relative to the backend (or full URL for third-party hosts), no query. */
  path: string;
  url: string;
  query: Record<string, string>;
  /** Values captured from `:param` segments in the fixture key. */
  params: Record<string, string>;
  body: unknown;
  headers: Record<string, string>;
}

export interface FixtureResponse {
  __fixture: true;
  status: number;
  data: unknown;
  /** ms before responding; `Infinity` keeps the request pending (loading states). */
  delay?: number;
  headers?: Record<string, string>;
}

export type FixtureValue = unknown | FixtureResponse;
export type Fixture =
  | FixtureValue
  | ((req: PreviewRequest) => FixtureValue | Promise<FixtureValue>);

/**
 * Keys: "METHOD /path", e.g. "GET /api/agents/:id", "POST /api/tags",
 * "GET /api/items/*", "* /api/ping". Path is relative to the backend base URL;
 * query string is ignored (use `req.query` in a function fixture).
 * Bodies are the RAW backend shape: snake_case, since `camelize: true`
 * requests are camelized by the real axios interceptor.
 */
export type Fixtures = Record<string, Fixture>;

export type Theme = "light" | "dark";

export interface PreviewOptions {
  api?: Fixtures;
  theme?: Theme;
  locale?: "es" | "en" | "pt";
  viewport?: { width: number; height: number };
  route?: { pathname?: string; query?: Record<string, string | string[]> };
  /** Merged into the fake `useAuth().user`. */
  user?: Record<string, unknown>;
  /** `useAuth().profile`. */
  profile?: Record<string, unknown> | null;
  /** Merged into the whole fake `useAuth()` value (subscription, phones, ...). */
  auth?: Record<string, unknown>;
  /** Extra providers around the component. */
  wrapper?: (children: ReactNode) => ReactNode;
  /** CSS selector to screenshot instead of the preview frame. */
  capture?: string;
  /** Selector that must exist before the state counts as ready. */
  waitFor?: string;
  /** Padding / background around the component. "none" renders edge to edge (pages). */
  frame?: "padded" | "none";
  /** Playwright steps run after ready, before the screenshot (open dropdowns, type, ...). */
  interact?: InteractStep[];
}

export type InteractStep =
  | { click: string }
  | { hover: string }
  | { fill: string; value: string }
  | { press: string }
  | { wait: number };

export interface PreviewState extends PreviewOptions {
  render: () => ReactNode;
}

export interface PreviewDefinition extends PreviewOptions {
  title?: string;
  states: Record<string, PreviewState | (() => ReactNode)>;
}

/** Current scenario/state, for module mocks (mocks.json) that vary per state. */
export function previewState(): { scenario: string; state: string } | null {
  return (window as unknown as { __UI_PREVIEW_STATE__?: { scenario: string; state: string } })
    .__UI_PREVIEW_STATE__ ?? null;
}

export function definePreview(def: PreviewDefinition): PreviewDefinition {
  return def;
}

export function res(
  data: unknown,
  opts: { status?: number; delay?: number; headers?: Record<string, string> } = {},
): FixtureResponse {
  return { __fixture: true, status: opts.status ?? 200, data, ...opts };
}

/** Never resolves: keeps React Query in its loading state. */
export const pending = (): FixtureResponse => res(null, { delay: Infinity });

export const fail = (status = 500, data: unknown = { message: "ui-preview error" }) =>
  res(data, { status });

/**
 * Answers successive calls with successive steps; the last step repeats.
 * A step is a value or `[value, times]`. Each state is a fresh page, so counts reset.
 *   sequence([fail(500), 4], pending())   // 1 try + 3 hook retries fail, user's Retry hangs
 *   sequence([fail(500), 4], guides)      // ...and the Retry succeeds
 */
export function sequence(...steps: Array<FixtureValue | [FixtureValue, number]>) {
  const flat: FixtureValue[] = [];
  for (const step of steps) {
    if (Array.isArray(step) && step.length === 2 && typeof step[1] === "number") {
      for (let i = 0; i < step[1]; i++) flat.push(step[0]);
    } else {
      flat.push(step);
    }
  }
  let calls = 0;
  return () => flat[Math.min(calls++, flat.length - 1)];
}

/** Fixed-width box with a visible dashed outline, for truncation/overflow states. */
export function Box({ width, children }: { width: number; children: ReactNode }) {
  return createElement(
    "div",
    { style: { width, outline: "1px dashed #ef4444", outlineOffset: 2 } },
    children,
  );
}
