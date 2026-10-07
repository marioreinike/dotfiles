// Stand-in for `next/router` (pages router).
import { createContext, type ComponentType } from "react";
import { asPath, recordNavigation, routerState } from "./router-state";

type Handler = (...args: unknown[]) => void;
const listeners = new Map<string, Set<Handler>>();
const events = {
  on(name: string, fn: Handler) {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name)!.add(fn);
  },
  off(name: string, fn: Handler) {
    listeners.get(name)?.delete(fn);
  },
  emit(name: string, ...args: unknown[]) {
    listeners.get(name)?.forEach((fn) => fn(...args));
  },
};

const router = {
  get pathname() {
    return routerState.pathname;
  },
  get route() {
    return routerState.pathname;
  },
  get query() {
    return routerState.query;
  },
  get asPath() {
    return asPath();
  },
  get locale() {
    return routerState.locale;
  },
  locales: ["es", "en", "pt"],
  defaultLocale: "es",
  basePath: "",
  isReady: true,
  isFallback: false,
  isPreview: false,
  isLocaleDomain: false,
  events,
  push: (href: unknown) => recordNavigation("push", href),
  replace: (href: unknown) => recordNavigation("replace", href),
  back: () => void recordNavigation("back", ""),
  forward: () => void recordNavigation("forward", ""),
  reload: () => void recordNavigation("reload", ""),
  prefetch: () => Promise.resolve(),
  beforePopState: () => {},
};

export type NextRouter = typeof router;
export const RouterContext = createContext<NextRouter | null>(router);
export const useRouter = () => router;
export function withRouter<P>(Comp: ComponentType<P & { router: NextRouter }>) {
  return (props: P) => <Comp {...props} router={router} />;
}
export const Router = router;
export default router;
