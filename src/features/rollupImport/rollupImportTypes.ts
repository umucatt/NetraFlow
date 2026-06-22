import type { ChangeEvent } from 'react';

import type { AccountMarkAccount } from '../../accountMark';
import type {
  Account,
  AssetGroupWithAccounts,
  CommitAppDataUpdate,
  HistoryRecord
} from '../../app/types';
import type {
  RollupAccountAssignment,
  RollupImportRecord,
  RollupImportReview,
  RollupRiskLevel
} from '../../rollupImportLogic';

export type RollupPromptTab = 'explanation' | 'prompt';

export type RollupImportRecordGroup = {
  keyword: string;
  records: RollupImportRecord[];
};

export type RollupImportAccountOption = AccountMarkAccount & {
  id: string;
  name: string;
};

export type RollupImportAccountGroup = {
  id: string;
  name: string;
  activeAccounts: RollupImportAccountOption[];
};

export type RollupImportAccountMatch = {
  account: RollupImportAccountOption;
  score: number;
};

export type RollupImportPageProps = {
  mode: 'prompt' | 'review';
  promptTab: RollupPromptTab;
  promptExplanation: string;
  promptContent: string;
  onPromptTabChange: (tab: RollupPromptTab) => void;
  review: RollupImportReview | null;
  recordGroups: RollupImportRecordGroup[];
  accountGroups: RollupImportAccountGroup[];
  accountAssignments: Record<string, RollupAccountAssignment | null>;
  getAccountMatches: (keyword: string) => RollupImportAccountMatch[];
  getRiskLabel: (
    riskLevel: RollupRiskLevel,
    lowRiskKind?: RollupImportReview['lowRiskKind']
  ) => string;
  formatRecordAmount: (record: RollupImportRecord) => string;
  onSelectAccount: (keyword: string, accountId: string) => void;
  onCreateAccount: (keyword: string) => void;
};

export type RollupImportActionsPanelProps =
  | {
      mode: 'prompt';
      inputValue: string;
      error: string;
      onInputChange: (value: string) => void;
      onImportText: () => void;
      onSelectFile: () => void;
      onCopyPrompt: () => void;
      onClose: () => void;
    }
  | {
      mode: 'review';
      confirmedAccountCount: number;
      accountGroupCount: number;
      recordCount: number;
      hasBlockingIssues: boolean;
      canConfirm: boolean;
      onDiscardImport: () => void;
      onConfirmImport: () => void;
      onClose: () => void;
    };

export type RollupToastTone = 'info' | 'success' | 'error';

export type RollupHistoryRecordInput = {
  account: Account;
  groupName: string;
  beforeAmount: number | null;
  afterAmount: number | null;
  time: string;
  source: HistoryRecord['source'];
};

export type UseRollupImportControllerOptions = {
  groups: AssetGroupWithAccounts[];
  accountGroups: RollupImportAccountGroup[];
  isExampleMode: boolean;
  initialImportedHashes: string[];
  commitAppDataUpdate: CommitAppDataUpdate;
  persistImportedHashes: (hashes: string[]) => void;
  createHistoryRecord: (input: RollupHistoryRecordInput) => HistoryRecord;
  showToast: (message: string, tone?: RollupToastTone) => void;
  onClosePage: () => void;
  onSelectFile: () => void;
  onRequestCreateAccount: (keyword: string) => void;
  onScrollMainToTop: (behavior?: ScrollBehavior) => void;
};

export type RollupNewAccountAssignment = {
  groupId: string;
  groupName: string;
  accountId: string;
};

export type RollupImportController = {
  pageProps: RollupImportPageProps;
  actionsPanelProps: RollupImportActionsPanelProps;
  actionsTitle: string;
  actionsClassName: string;
  importFile: (event: ChangeEvent<HTMLInputElement>) => void;
  openSession: () => void;
  closeSession: () => void;
  dismissPage: () => void;
  clearPendingNewAccount: () => void;
  completePendingNewAccount: (assignment: RollupNewAccountAssignment) => boolean;
  removeAssignmentsForGroup: (groupId: string) => void;
};
