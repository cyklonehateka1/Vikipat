import { RefObject, useEffect } from 'react';

/**
 * Scroll reveals. Anything marked data-reveal inside the root fades and rises
 * in as it enters the screen, siblings a beat apart. Once shown, the attribute
 * is removed so the element's own hover and press transitions take over again.
 * Does nothing unless main.tsx armed it (html.can-reveal: JS on, motion allowed).
 */
export function useReveal(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !document.documentElement.classList.contains('can-reveal')) return;

    // Remembered per effect run, not in the DOM. React's development mode runs
    // effects twice; a marker left on the elements made the second run skip
    // them, so they were never observed and stayed hidden.
    const watched = new WeakSet<Element>();
    const timers = new Set<number>();
    const settle = (el: HTMLElement, delay: number) => {
      const timer = window.setTimeout(() => {
        el.removeAttribute('data-reveal');
        el.style.removeProperty('--d');
        timers.delete(timer);
      }, 1100 + delay);
      timers.add(timer);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          el.classList.add('is-in');
          observer.unobserve(el);
          settle(el, parseInt(el.style.getPropertyValue('--d') || '0', 10));
        });
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.08 },
    );

    const scan = () => {
      root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        if (watched.has(el)) return;
        watched.add(el);
        const siblings = el.parentElement
          ? Array.from(el.parentElement.children).filter((child) => child.hasAttribute('data-reveal'))
          : [el];
        const index = Math.max(0, siblings.indexOf(el));
        el.style.setProperty('--d', `${Math.min(index, 8) * 70}ms`);
        observer.observe(el);
      });
    };

    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [rootRef]);
}
