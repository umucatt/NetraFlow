import type { FlashNotePageProps } from '../../features/flashNote/FlashNotePage';

export type FlashNotePagePropsGroup = {
  isOpen: boolean;
  pageProps: FlashNotePageProps;
};

export type FlashNoteConfirmStateGroup = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export type FlashNoteHostLayerProps = {
  page: FlashNotePagePropsGroup;
  exitConfirm: FlashNoteConfirmStateGroup;
  returnDateConfirm: FlashNoteConfirmStateGroup;
};
