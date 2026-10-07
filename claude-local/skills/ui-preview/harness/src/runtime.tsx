import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { AppProviders, initApp } from "ui-preview-app";
import type { PreviewDefinition, PreviewOptions, PreviewState } from "./api";
import { getInflight, report, setFixtures } from "./network";
import { setRouterState } from "./shims/router-state";

type Loader = () => Promise<unknown>;

export interface IndexEntry {
  scenario: string;
  title: string;
  states: Array<
    { name: string } & Pick<
      PreviewOptions,
      "viewport" | "capture" | "interact" | "theme" | "frame" | "locale"
    >
  >;
}

declare global {
  interface Window {
    __UI_PREVIEW_INDEX__?: IndexEntry[];
  }
}

const idOf = (key: string) => key.replace(/^\/scenarios\//, "").replace(/\.preview\.tsx$/, "");

async function loadDef(loader: Loader) {
  const mod = (await loader()) as { default?: PreviewDefinition };
  if (!mod.default?.states) throw new Error("scenario must `export default definePreview({...})`");
  return mod.default;
}

function resolveState(def: PreviewDefinition, name: string) {
  const raw = def.states[name];
  if (!raw) throw new Error(`state "${name}" not found (have: ${Object.keys(def.states).join(", ")})`);
  const state: PreviewState = typeof raw === "function" ? { render: raw } : raw;
  const { states: _s, title: _t, ...base } = def;
  return {
    ...base,
    ...state,
    api: { ...(base.api ?? {}), ...(state.api ?? {}) },
    route: { ...(base.route ?? {}), ...(state.route ?? {}) },
    user: { ...(base.user ?? {}), ...(state.user ?? {}) },
    auth: { ...(base.auth ?? {}), ...(state.auth ?? {}) },
    profile: state.profile !== undefined ? state.profile : base.profile,
  } satisfies PreviewState;
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    report.errors.push(`render: ${error.message}\n${info.componentStack?.split("\n").slice(0, 8).join("\n")}`);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <pre
        data-ui-preview-error
        style={{ color: "#b91c1c", background: "#fef2f2", padding: 16, whiteSpace: "pre-wrap", font: "12px monospace" }}
      >
        {`Render error: ${this.state.error.message}\n\n${this.state.error.stack ?? ""}`}
      </pre>
    );
  }
}

async function waitReady(opts: PreviewOptions) {
  await document.fonts.ready;
  const started = performance.now();
  let quietSince = performance.now();
  for (;;) {
    await new Promise((ok) => setTimeout(ok, 50));
    const waiting = opts.waitFor && !document.querySelector(opts.waitFor);
    if (getInflight() > 0 || waiting) quietSince = performance.now();
    if (performance.now() - quietSince > 400) break;
    if (performance.now() - started > 15000) {
      report.errors.push(
        `ready timeout: inflight=${getInflight()}${waiting ? `, waitFor "${opts.waitFor}" never matched` : ""}`,
      );
      break;
    }
  }
  await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
  report.ready = true;
}

function IndexPage({ entries, errors }: { entries: IndexEntry[]; errors: string[] }) {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui", fontSize: 14 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>ui-preview</h1>
      {entries.length === 0 && <p>No scenarios. Add files under .ui-preview/scenarios/*.preview.tsx</p>}
      {entries.map((e) => (
        <div key={e.scenario} style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600 }}>
            {e.title} <code style={{ color: "#64748b" }}>{e.scenario}</code>
          </div>
          {e.states.map((s) => (
            <a
              key={s.name}
              href={`/?s=${encodeURIComponent(e.scenario)}&state=${encodeURIComponent(s.name)}`}
              style={{ marginRight: 12, color: "#2563eb" }}
            >
              {s.name}
            </a>
          ))}
        </div>
      ))}
      {errors.map((err) => (
        <pre key={err} style={{ color: "#b91c1c", whiteSpace: "pre-wrap" }}>
          {err}
        </pre>
      ))}
    </div>
  );
}

export async function bootstrap(scenarios: Record<string, Loader>) {
  const root = createRoot(document.getElementById("preview-root")!);
  const params = new URLSearchParams(location.search);
  const scenarioId = params.get("s");

  if (!scenarioId) {
    const entries: IndexEntry[] = [];
    const errors: string[] = [];
    for (const [key, loader] of Object.entries(scenarios).sort()) {
      try {
        const def = await loadDef(loader);
        entries.push({
          scenario: idOf(key),
          title: def.title ?? idOf(key),
          states: Object.keys(def.states).map((name) => {
            const s = resolveState(def, name);
            return {
              name,
              viewport: s.viewport,
              capture: s.capture,
              interact: s.interact,
              theme: s.theme,
              frame: s.frame,
              locale: s.locale,
            };
          }),
        });
      } catch (err) {
        errors.push(`${idOf(key)}: ${(err as Error).message}`);
      }
    }
    window.__UI_PREVIEW_INDEX__ = entries;
    report.errors.push(...errors);
    root.render(<IndexPage entries={entries} errors={errors} />);
    report.ready = true;
    return;
  }

  const key = `/scenarios/${scenarioId}.preview.tsx`;
  const loader = scenarios[key];
  if (!loader) {
    report.errors.push(`scenario not found: ${scenarioId}`);
    root.render(<IndexPage entries={[]} errors={[`scenario not found: ${scenarioId}`]} />);
    report.ready = true;
    return;
  }

  const def = await loadDef(loader);
  const stateName = params.get("state") ?? Object.keys(def.states)[0]!;
  const state = resolveState(def, stateName);
  report.scenario = scenarioId;
  report.state = stateName;
  // Module mocks (mocks.json) are global; they branch on this to vary per state.
  (window as unknown as { __UI_PREVIEW_STATE__: unknown }).__UI_PREVIEW_STATE__ = {
    scenario: scenarioId,
    state: stateName,
  };
  document.title = `${def.title ?? scenarioId} · ${stateName}`;

  setFixtures(state.api ?? {});
  setRouterState({
    pathname: state.route?.pathname ?? "/",
    query: state.route?.query ?? {},
    locale: state.locale ?? "es",
  });
  await initApp({ theme: state.theme ?? "light", locale: state.locale ?? "es" });

  const content = state.wrapper ? state.wrapper(state.render()) : state.render();
  const padded = state.frame !== "none";
  root.render(
    <StrictMode>
      <AppProviders options={state}>
        <div
          id="ui-preview-frame"
          className="bg-background text-foreground"
          style={padded ? { padding: 24, minHeight: "100vh" } : { minHeight: "100vh" }}
        >
          <ErrorBoundary>{content}</ErrorBoundary>
        </div>
      </AppProviders>
    </StrictMode>,
  );
  await waitReady(state);
}
