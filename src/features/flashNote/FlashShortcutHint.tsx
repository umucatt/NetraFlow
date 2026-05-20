import NfSvgIcon from '../../components/NfSvgIcon';
import { NfWindowCloseIcon } from '../../assets/icons';

type FlashShortcutHintProps = {
  text: string;
  onClose: () => void;
};

export function FlashShortcutHint({ text, onClose }: FlashShortcutHintProps) {
  return (
    <aside className="flash-note-shortcut-hint">
      <span>{text}</span>
      <button type="button" aria-label="关闭快捷键提示" onClick={onClose}>
        <NfSvgIcon svg={NfWindowCloseIcon} decorative />
      </button>
    </aside>
  );
}
