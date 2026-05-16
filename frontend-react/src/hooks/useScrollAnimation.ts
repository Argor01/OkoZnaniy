import { useEffect, useRef, type RefObject } from 'react';

type AnimationType = 'fade-up' | 'fade-left' | 'fade-right' | 'zoom-in' | 'fade-up-stagger';

interface ScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
}

export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  animation: AnimationType = 'fade-up',
  options: ScrollAnimationOptions = {}
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const { threshold = 0.15, rootMargin = '0px 0px -40px 0px' } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.classList.add('scroll-hidden', `scroll-${animation}`);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('scroll-visible');
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [animation, threshold, rootMargin]);

  return ref;
}
