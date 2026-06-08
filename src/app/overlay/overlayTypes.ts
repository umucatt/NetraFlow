import type { HTMLAttributes } from 'react';

export type OverlayBackdropProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'onClick'
> & {
  onBack: () => void;
};
