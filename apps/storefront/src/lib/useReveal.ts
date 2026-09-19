import { useEffect } from 'react';

/**
 * Reveals `.reveal` elements as they enter the viewport, staggered by their
 * order within a common parent. Elements are shown immediately when the
 * IntersectionObserver is unavailable or motion is reduced.
 */
export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.is-in)'));
    if (!nodes.length) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      nodes.forEach((node) => node.classList.add('is-in'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const node = entry.target as HTMLElement;
          const siblings = Array.from(node.parentElement?.children ?? []);
          const index = Math.min(siblings.indexOf(node), 7);
          node.style.setProperty('--reveal-delay', `${index * 45}ms`);
          node.classList.add('is-in');
          observer.unobserve(node);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );

    nodes.forEach((node) => observer.observe(node));

    // If the observer never fires for a node (restored scroll position, a jump
    // to an anchor), show it anyway rather than leaving it invisible.
    const failsafe = window.setTimeout(() => {
      nodes.forEach((node) => node.classList.add('is-in'));
    }, 2000);

    return () => {
      window.clearTimeout(failsafe);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Sets the document title per page. */
export function useTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
