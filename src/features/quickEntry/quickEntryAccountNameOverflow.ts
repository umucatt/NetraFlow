export type QuickEntryAccountNameOverflowElement = Pick<
  HTMLElement,
  'clientWidth' | 'scrollWidth'
>;

export function isQuickEntryAccountNameOverflowing(
  element: QuickEntryAccountNameOverflowElement | null | undefined
) {
  return Boolean(element && element.scrollWidth > element.clientWidth);
}

export function getQuickEntryAccountNameTooltipContent(
  accountName: string,
  element: QuickEntryAccountNameOverflowElement | null | undefined
) {
  return isQuickEntryAccountNameOverflowing(element) ? accountName : undefined;
}
