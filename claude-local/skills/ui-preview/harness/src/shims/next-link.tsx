// Stand-in for `next/link`: an <a> whose clicks are recorded, never followed.
import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactElement,
} from "react";
import { hrefToString, recordNavigation } from "./router-state";

interface Props extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: unknown;
  as?: unknown;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  prefetch?: boolean | null;
  passHref?: boolean;
  legacyBehavior?: boolean;
  locale?: string | false;
}

const Link = forwardRef<HTMLAnchorElement, Props>(function Link(
  {
    href,
    as: _as,
    replace,
    scroll: _scroll,
    shallow: _shallow,
    prefetch: _prefetch,
    passHref: _passHref,
    legacyBehavior,
    locale: _locale,
    children,
    onClick,
    ...rest
  },
  ref,
) {
  const url = hrefToString(href);
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    e.preventDefault();
    void recordNavigation(replace ? "replace" : "push", url);
  };
  if (legacyBehavior && isValidElement(children)) {
    const child = Children.only(children) as ReactElement<Record<string, unknown>>;
    return cloneElement(child, { href: url, onClick: handle, ref });
  }
  return (
    <a ref={ref} href={url} onClick={handle} {...rest}>
      {children}
    </a>
  );
});

export default Link;
