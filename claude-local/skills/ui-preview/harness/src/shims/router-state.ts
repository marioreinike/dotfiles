import { report } from "../network";

export interface RouterState {
  pathname: string;
  query: Record<string, string | string[]>;
  locale: string;
}

export const routerState: RouterState = { pathname: "/", query: {}, locale: "es" };

export function setRouterState(next: RouterState) {
  Object.assign(routerState, next);
}

export function asPath() {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(routerState.query)) {
    (Array.isArray(v) ? v : [v]).forEach((item) => qs.append(k, item));
  }
  const s = qs.toString();
  return s ? `${routerState.pathname}?${s}` : routerState.pathname;
}

export function hrefToString(href: unknown): string {
  if (typeof href === "string") return href;
  if (href && typeof href === "object") {
    const { pathname = "", query } = href as { pathname?: string; query?: Record<string, string> };
    const qs = query ? new URLSearchParams(query).toString() : "";
    return qs ? `${pathname}?${qs}` : pathname;
  }
  return "#";
}

/** Navigation never leaves the preview; it is recorded in the report instead. */
export function recordNavigation(kind: string, href: unknown) {
  report.navigations.push(`${kind} ${hrefToString(href)}`);
  return Promise.resolve(true);
}
