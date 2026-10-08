const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-in');
    observer.unobserve(entry.target);
  });
}, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

export const observeReveal = (el) => observer.observe(el);

export function initReveal() {
  document.querySelectorAll('.reveal').forEach(observeReveal);
}
