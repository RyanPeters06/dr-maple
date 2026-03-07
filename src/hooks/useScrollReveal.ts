import { useEffect, RefObject } from 'react';

/**
 * Watches all `.fade-in-up` elements inside `containerRef` and adds
 * the `.visible` class when they scroll into view.
 */
export const useScrollReveal = (containerRef: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const elements = container.querySelectorAll<HTMLElement>('.fade-in-up');
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            // Stop watching once revealed — element stays visible
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [containerRef]);
};
