const TEXT_ASSISTANCE_SELECTOR =
  'input, textarea, [contenteditable]:not([contenteditable="false"])';

const disableTextAssistance = (element: Element) => {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  element.setAttribute('spellcheck', 'false');
  element.setAttribute('autocorrect', 'off');
  element.setAttribute('autocapitalize', 'off');

  if (
    (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) &&
    !element.hasAttribute('autocomplete')
  ) {
    element.setAttribute('autocomplete', 'off');
  }
};

const disableTextAssistanceInTree = (root: ParentNode | Element) => {
  if (root instanceof Element && root.matches(TEXT_ASSISTANCE_SELECTOR)) {
    disableTextAssistance(root);
  }

  root.querySelectorAll(TEXT_ASSISTANCE_SELECTOR).forEach(disableTextAssistance);
};

export const installTextInputAssistanceGuard = () => {
  if (typeof document === 'undefined') {
    return () => undefined;
  }

  disableTextAssistanceInTree(document.documentElement);

  const handleFocusIn = (event: FocusEvent) => {
    if (event.target instanceof Element) {
      disableTextAssistance(event.target);
    }
  };

  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          disableTextAssistanceInTree(node);
        }
      });
    });
  });

  document.addEventListener('focusin', handleFocusIn, true);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  return () => {
    document.removeEventListener('focusin', handleFocusIn, true);
    observer.disconnect();
  };
};
