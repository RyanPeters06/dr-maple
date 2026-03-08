import { useEffect, RefObject } from 'react';

/**
 * Watches all `.fade-in-up` elements inside `containerRef` and adds
 * the `.visible` class when they scroll into view.
 *
 * Uses a MutationObserver to also catch elements that are added to the DOM
 * after the initial mount (e.g. when switching dashboard sections).
 */
export const useScrollReveal = (containerRef: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            intersectionObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const observeElement = (el: HTMLElement) => {
      if (!el.classList.contains('visible')) {
        intersectionObserver.observe(el);
      }
    };

    // Observe elements already in the DOM
    container.querySelectorAll<HTMLElement>('.fade-in-up').forEach(observeElement);

    // Watch for elements added later (section switches, data loading)
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.classList.contains('fade-in-up')) observeElement(node);
          node.querySelectorAll<HTMLElement>('.fade-in-up').forEach(observeElement);
        });
      });
    });

    mutationObserver.observe(container, { childList: true, subtree: true });

    return () => {
      intersectionObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [containerRef]);
};
