import type { GlobalSearchPanelProps } from '../../components/search/GlobalSearchPanel';
import type { SearchFloatingNavigatorProps } from '../../components/search/SearchFloatingNavigator';
import type { OverlayBackdropProps } from '../overlay';

export type SearchOverlayBackdropProps = OverlayBackdropProps;

export type SearchOverlayLayerProps = {
  isOpen: boolean;
  panelProps: GlobalSearchPanelProps;
  floatingNavigator: SearchFloatingNavigatorProps | null;
  onClose: () => void;
};
