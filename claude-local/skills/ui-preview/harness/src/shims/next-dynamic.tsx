// Stand-in for `next/dynamic`: React.lazy + Suspense with the `loading` fallback.
import { lazy, Suspense, type ComponentType, type ReactNode } from "react";

type Loaded<P> = ComponentType<P> | { default: ComponentType<P> };
type Loader<P> = () => Promise<Loaded<P>>;

interface Options {
  loading?: (props: { isLoading?: boolean; error?: Error | null }) => ReactNode;
  ssr?: boolean;
}

export default function dynamic<P extends object>(
  loader: Loader<P> | { loader: Loader<P> },
  options: Options = {},
) {
  const load = typeof loader === "function" ? loader : loader.loader;
  const Lazy = lazy(async () => {
    const mod = await load();
    return { default: "default" in mod ? mod.default : (mod as ComponentType<P>) };
  });
  const Fallback = options.loading;
  return function DynamicComponent(props: P) {
    return (
      <Suspense fallback={Fallback ? <Fallback isLoading /> : null}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}
