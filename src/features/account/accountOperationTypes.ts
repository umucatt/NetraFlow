export type AccountActionsPanelProps = {
  isArchived: boolean;
  onEditBalance: () => void;
  onEditAccount: () => void;
  onRestoreAccount?: () => void;
  onOpenDangerActions: () => void;
  onBack: () => void;
};

export type AccountDangerActionsPanelProps = {
  isArchived: boolean;
  onArchiveAccount: () => void;
  onDeleteAccount: () => void;
  onBackToAccountDetail: () => void;
};
