import { useOverlayBack } from './useOverlayBack';

import type { OverlayBackdropProps } from './overlayTypes';

export function OverlayBackdrop({ onBack, ...props }: OverlayBackdropProps) {
  const overlayBackProps = useOverlayBack<HTMLDivElement>(onBack);

  return <div {...props} {...overlayBackProps} />;
}
