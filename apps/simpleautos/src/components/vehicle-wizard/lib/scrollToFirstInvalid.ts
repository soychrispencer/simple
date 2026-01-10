export type ScrollToFirstInvalidOptions = {
  root?: ParentNode;
  behavior?: ScrollBehavior;
};

function isVisible(el: HTMLElement) {
  // offsetParent === null suele indicar display:none o detached.
  if (el.offsetParent === null && el !== document.body) return false;
  const style = window.getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none') return false;
  return true;
}

export function scrollToFirstInvalidField(options: ScrollToFirstInvalidOptions = {}) {
  if (typeof window === 'undefined') return;
  const root = options.root ?? document;
  const behavior = options.behavior ?? 'smooth';

  const candidates = Array.from(
    root.querySelectorAll<HTMLElement>('[data-invalid="true"], [aria-invalid="true"]')
  );

  const target = candidates.find(isVisible) ?? null;
  if (!target) return;

  target.scrollIntoView({ behavior, block: 'center' });

  // Focus si es posible (inputs/buttons).
  if (typeof (target as any).focus === 'function') {
    window.setTimeout(() => {
      try {
        (target as any).focus({ preventScroll: true });
      } catch {
        (target as any).focus();
      }
    }, 250);
  }
}
