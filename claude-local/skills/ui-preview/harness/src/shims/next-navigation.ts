// Stand-in for `next/navigation` (app router hooks).
import { asPath, recordNavigation, routerState } from "./router-state";

const appRouter = {
  push: (href: string) => void recordNavigation("push", href),
  replace: (href: string) => void recordNavigation("replace", href),
  back: () => void recordNavigation("back", ""),
  forward: () => void recordNavigation("forward", ""),
  refresh: () => void recordNavigation("refresh", ""),
  prefetch: () => {},
};

export const useRouter = () => appRouter;
export const usePathname = () => routerState.pathname;
export const useSearchParams = () => new URLSearchParams(asPath().split("?")[1] ?? "");
export const useParams = () => routerState.query;
export const useSelectedLayoutSegment = () => null;
export const useSelectedLayoutSegments = () => [];
export function redirect(href: string): never {
  void recordNavigation("redirect", href);
  throw new Error(`ui-preview: redirect(${href})`);
}
export const permanentRedirect = redirect;
export function notFound(): never {
  throw new Error("ui-preview: notFound()");
}
export const ReadonlyURLSearchParams = URLSearchParams;
