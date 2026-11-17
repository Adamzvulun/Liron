import type { AnchorHTMLAttributes, MouseEvent, Ref } from 'react';
import { navigate } from './router.ts';

/** A link that changes screen without reloading; new-tab clicks behave as usual. */
export function Link({
  href,
  onClick,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; ref?: Ref<HTMLAnchorElement> }) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    e.preventDefault();
    navigate(href);
  };
  return <a {...rest} href={href} onClick={handle} />;
}
