import GlobalSearchPanel from '../../components/search/GlobalSearchPanel';
import SearchFloatingNavigator from '../../components/search/SearchFloatingNavigator';
import { OverlayBackdrop } from '../overlay';

import type { SearchOverlayLayerProps } from './searchOverlayLayerTypes';

const searchOverlayBackdropStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 90,
  display: 'grid',
  placeItems: 'start center',
  padding: '74px 24px 24px',
  background: 'var(--modal-backdrop)'
} as const;

export function SearchOverlayLayer({
  isOpen,
  panelProps,
  floatingNavigator,
  onClose
}: SearchOverlayLayerProps) {
  return (
    <>
      {isOpen ? (
        <OverlayBackdrop
          onBack={onClose}
          className="layout-layer layout-layer--left layout-layer--search"
          style={searchOverlayBackdropStyle}
        >
          <GlobalSearchPanel {...panelProps} />
        </OverlayBackdrop>
      ) : null}

      {floatingNavigator ? <SearchFloatingNavigator {...floatingNavigator} /> : null}
    </>
  );
}
