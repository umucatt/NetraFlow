import { type ChangeEvent, useMemo, useState } from 'react';

import { toStoredAmountByNature } from '../../app/accountNature';
import { compareHistoryByTimeDesc } from '../../app/dateUtils';
import { nfStorage } from '../../app/nfStorage';
import { ROLLUP_IMPORT_HASHES_STORAGE_KEY } from '../../app/storageKeys';
import { getAccountOperationTodayDateValue } from '../../accountOperationDate';
import { normalizeAccountName } from '../account/accountEditorLogic';
import { formatMoneyValue, roundToMoneyPrecision } from '../../money';
import { ROLLUP_IMPORT_EXPLANATION, ROLLUP_IMPORT_PROMPT } from '../../rollupImportContent';
import {
  areAllRollupGroupsAssigned,
  getRollupAccountGroupKeys,
  parseRollupImportJson,
  type RollupAccountAssignment,
  type RollupImportRecord,
  type RollupImportReview,
  type RollupRiskLevel
} from '../../rollupImportLogic';
import type { Account, AssetGroupWithAccounts } from '../../app/types';
import type {
  RollupImportAccountMatch,
  RollupImportController,
  RollupImportRecordGroup,
  RollupNewAccountAssignment,
  RollupPromptTab,
  UseRollupImportControllerOptions
} from './rollupImportTypes';

const loadRollupImportHashes = () => {
  try {
    const rawValue = nfStorage.getItem(ROLLUP_IMPORT_HASHES_STORAGE_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];

    return Array.isArray(parsedValue)
      ? parsedValue.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
};

const saveRollupImportHashes = (hashes: string[]) => {
  nfStorage.setItem(
    ROLLUP_IMPORT_HASHES_STORAGE_KEY,
    JSON.stringify(Array.from(new Set(hashes)).slice(-80))
  );
};

const createRollupImportHash = async (text: string) => {
  if (window.crypto?.subtle) {
    const bytes = new TextEncoder().encode(text);
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);

    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
  }

  return `fallback-${Math.abs(hash).toString(16)}-${text.length}`;
};

const findRollupAccountById = (groups: AssetGroupWithAccounts[], accountId: string) => {
  for (const group of groups) {
    const account = group.accounts.find((currentAccount) => currentAccount.id === accountId);

    if (account) {
      return { group, account };
    }
  }

  return undefined;
};

const getRollupRiskLabel = (
  riskLevel: RollupRiskLevel,
  lowRiskKind: RollupImportReview['lowRiskKind'] = 'normalized'
) => {
  if (riskLevel === 'high') {
    return '高风险';
  }

  if (riskLevel === 'medium') {
    return '中风险';
  }

  return lowRiskKind === 'strict' ? '低风险 · 本地未发现明显问题' : '低风险 · 已本地修正';
};

const formatRollupSignedAmount = (record: RollupImportRecord) => {
  const formattedAmount = formatMoneyValue(Math.abs(record.amount));

  if (record.mode === 'balance') {
    return formattedAmount;
  }

  if (record.amount > 0) {
    return `+${formattedAmount}`;
  }

  if (record.amount < 0) {
    return `-${formattedAmount}`;
  }

  return '0';
};

const normalizeRollupMatchText = (value: string) => normalizeAccountName(value).replace(/\s+/g, '');

export const useRollupImportController = ({
  assetGroups,
  accounts,
  groups,
  accountGroups,
  history,
  isExampleMode,
  updateAppData,
  createHistoryRecord,
  showToast,
  onClosePage,
  onSelectFile,
  onRequestCreateAccount,
  onScrollMainToTop
}: UseRollupImportControllerOptions): RollupImportController => {
  const [promptTab, setPromptTab] = useState<RollupPromptTab>('explanation');
  const [pasteText, setPasteText] = useState('');
  const [importError, setImportError] = useState('');
  const [importReview, setImportReview] = useState<RollupImportReview | null>(null);
  const [importHash, setImportHash] = useState('');
  const [importedHashes, setImportedHashes] = useState(loadRollupImportHashes);
  const [accountAssignments, setAccountAssignments] = useState<
    Record<string, RollupAccountAssignment | null>
  >({});
  const [pendingNewAccountKey, setPendingNewAccountKey] = useState('');

  const accountGroupKeys = useMemo(
    () => (importReview ? getRollupAccountGroupKeys(importReview.records) : []),
    [importReview]
  );

  const recordGroups: RollupImportRecordGroup[] = useMemo(
    () =>
      accountGroupKeys.map((keyword) => ({
        keyword,
        records: importReview?.records.filter((record) => record.accountKeyword === keyword) ?? []
      })),
    [accountGroupKeys, importReview]
  );

  const activeAccountOptions = useMemo(
    () =>
      groups.flatMap((group) =>
        group.accounts
          .filter((account) => !account.archived)
          .map((account) => ({
            groupId: group.id,
            groupName: group.name,
            account
          }))
      ),
    [groups]
  );

  const confirmedAccountCount = accountGroupKeys.filter((keyword) =>
    Boolean(accountAssignments[keyword]?.accountId)
  ).length;

  const isImportReady =
    Boolean(importReview) &&
    !importReview?.hasBlockingIssues &&
    areAllRollupGroupsAssigned(accountGroupKeys, accountAssignments);

  const resetReview = () => {
    setImportReview(null);
    setImportHash('');
    setImportError('');
    setAccountAssignments({});
    setPendingNewAccountKey('');
  };

  const dismissPage = () => {
    setImportReview(null);
    setImportError('');
    setAccountAssignments({});
    setPendingNewAccountKey('');
  };

  const closeSession = () => {
    onClosePage();
    setPromptTab('explanation');
    setPasteText('');
    resetReview();
  };

  const openSession = () => {
    setPromptTab('explanation');
    resetReview();
  };

  const acceptImportText = async (text: string) => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      setImportError('请先提供汇总 JSON');
      setImportReview(null);
      setAccountAssignments({});
      return;
    }

    try {
      const contentHash = await createRollupImportHash(trimmedText);
      const result = parseRollupImportJson(trimmedText, {
        todayDateValue: getAccountOperationTodayDateValue(),
        contentHash,
        importedHashes
      });

      if (!result.ok) {
        setImportError(result.issues[0]?.message ?? '汇总 JSON 无法导入');
        setImportReview(null);
        setAccountAssignments({});
        setImportHash('');
        return;
      }

      setImportHash(contentHash);
      setImportReview(result.review);
      setImportError('');
      setAccountAssignments({});
      setPendingNewAccountKey('');
      window.setTimeout(() => onScrollMainToTop('smooth'), 0);
    } catch (error) {
      console.error('[NetraFlow rollup] Failed to parse rollup import.', error);
      setImportError('汇总 JSON 无法导入，请确认文件内容');
      setImportReview(null);
      setAccountAssignments({});
      setImportHash('');
    }
  };

  const importFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      void acceptImportText(String(reader.result ?? ''));
    };
    reader.onerror = () => {
      setImportError('汇总文件读取失败');
    };
    reader.readAsText(file);
  };

  const copyPrompt = () => {
    void navigator.clipboard
      .writeText(ROLLUP_IMPORT_PROMPT)
      .then(() => showToast('提示词已复制', 'success'))
      .catch((error) => {
        console.error('[NetraFlow rollup] Failed to copy prompt.', error);
        showToast('复制失败，请重试', 'error');
      });
  };

  const assignAccount = (keyword: string, assignment: RollupAccountAssignment | null) => {
    setAccountAssignments((currentAssignments) => ({
      ...currentAssignments,
      [keyword]: assignment
    }));
  };

  const selectAccount = (keyword: string, accountId: string) => {
    if (!accountId) {
      assignAccount(keyword, null);
      return;
    }

    const match = findRollupAccountById(groups, accountId);

    if (!match || match.account.archived) {
      assignAccount(keyword, null);
      return;
    }

    assignAccount(keyword, {
      groupId: match.group.id,
      groupName: match.group.name,
      accountId: match.account.id
    });
  };

  const openNewAccount = (keyword: string) => {
    setPendingNewAccountKey(keyword);
    onRequestCreateAccount(keyword);
  };

  const discardReview = () => {
    resetReview();
    setPasteText('');
  };

  const getAccountMatches = (keyword: string): RollupImportAccountMatch[] => {
    const normalizedKeyword = normalizeRollupMatchText(keyword);

    if (!normalizedKeyword) {
      return [];
    }

    return activeAccountOptions
      .map((option, index) => {
        const normalizedName = normalizeRollupMatchText(option.account.name);
        const normalizedAlias = normalizeRollupMatchText(option.account.alias ?? '');
        const score =
          normalizedName === normalizedKeyword || normalizedAlias === normalizedKeyword
            ? 100
            : normalizedName.includes(normalizedKeyword) ||
                Boolean(normalizedAlias && normalizedAlias.includes(normalizedKeyword))
              ? 86
              : normalizedKeyword.includes(normalizedName) && normalizedName.length >= 2
                ? 78
                : 0;

        return { account: option.account, index, score };
      })
      .filter((option) => option.score >= 72)
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .slice(0, 4)
      .map(({ account, score }) => ({ account, score }));
  };

  const performImportWrite = () => {
    if (!importReview || !isImportReady) {
      return;
    }

    const runningAmounts = new Map<string, number>();
    const finalAmounts = new Map<string, number>();
    const recordsWithAccounts = importReview.records
      .map((record) => {
        const assignment = accountAssignments[record.accountKeyword];

        if (!assignment) {
          return null;
        }

        const match = findRollupAccountById(groups, assignment.accountId);

        if (!match || match.account.archived) {
          return null;
        }

        return {
          record,
          groupId: match.group.id,
          groupName: match.group.name,
          account: match.account
        };
      })
      .filter(
        (
          item
        ): item is {
          record: RollupImportRecord;
          groupId: string;
          groupName: string;
          account: Account;
        } => Boolean(item)
      )
      .sort(
        (left, right) =>
          left.account.id.localeCompare(right.account.id) ||
          left.record.date.localeCompare(right.record.date) ||
          left.record.inputIndex - right.record.inputIndex
      );

    if (recordsWithAccounts.length !== importReview.records.length) {
      showToast('仍有账户未确认', 'error');
      return;
    }

    const rollupHistory = recordsWithAccounts.map((item, index) => {
      const beforeAmount = runningAmounts.get(item.account.id) ?? item.account.amount;
      const groupNature = groups.find((group) => group.id === item.groupId)?.nature ?? 'asset';
      const afterAmount = roundToMoneyPrecision(
        item.record.mode === 'change'
          ? beforeAmount + item.record.amount
          : toStoredAmountByNature(groupNature, item.record.amount)
      );
      const recordTime = new Date(`${item.record.date}T12:00:00`);

      recordTime.setMilliseconds(index);
      runningAmounts.set(item.account.id, afterAmount);
      finalAmounts.set(item.account.id, afterAmount);

      return createHistoryRecord({
        account: item.account,
        groupName: item.groupName,
        beforeAmount,
        afterAmount,
        time: recordTime.toISOString(),
        source: 'rollup'
      });
    });

    const nextAccounts = accounts.map((account) => {
      const finalAmount = finalAmounts.get(account.id);

      return typeof finalAmount === 'number' ? { ...account, amount: finalAmount } : account;
    });

    const nextHistory = [...rollupHistory, ...history].sort(compareHistoryByTimeDesc);

    updateAppData({ groups: assetGroups, accounts: nextAccounts, history: nextHistory });

    if (importHash && !isExampleMode) {
      const nextHashes = Array.from(new Set([...importedHashes, importHash]));

      setImportedHashes(nextHashes);
      saveRollupImportHashes(nextHashes);
    }

    closeSession();
    showToast(`已导入 ${rollupHistory.length} 条汇总记录`, 'success');
  };

  const confirmImportWrite = () => {
    if (!importReview || !isImportReady) {
      return;
    }

    performImportWrite();
  };

  const clearPendingNewAccount = () => {
    setPendingNewAccountKey('');
  };

  const completePendingNewAccount = (assignment: RollupNewAccountAssignment) => {
    if (!pendingNewAccountKey) {
      return false;
    }

    assignAccount(pendingNewAccountKey, assignment);
    setPendingNewAccountKey('');

    return true;
  };

  const removeAssignmentsForGroup = (groupId: string) => {
    setAccountAssignments((currentAssignments) => {
      let changed = false;
      const nextAssignments: Record<string, RollupAccountAssignment | null> = {};

      Object.entries(currentAssignments).forEach(([keyword, assignment]) => {
        if (assignment?.groupId === groupId) {
          changed = true;
          return;
        }

        nextAssignments[keyword] = assignment;
      });

      return changed ? nextAssignments : currentAssignments;
    });
  };

  const pageProps = {
    mode: importReview ? 'review' as const : 'prompt' as const,
    promptTab,
    promptExplanation: ROLLUP_IMPORT_EXPLANATION,
    promptContent: ROLLUP_IMPORT_PROMPT,
    onPromptTabChange: setPromptTab,
    review: importReview,
    recordGroups,
    accountGroups,
    accountAssignments,
    getAccountMatches,
    getRiskLabel: getRollupRiskLabel,
    formatRecordAmount: formatRollupSignedAmount,
    onSelectAccount: selectAccount,
    onCreateAccount: openNewAccount
  };

  const actionsPanelProps = importReview
    ? {
        mode: 'review' as const,
        confirmedAccountCount,
        accountGroupCount: accountGroupKeys.length,
        recordCount: importReview.records.length,
        hasBlockingIssues: importReview.hasBlockingIssues,
        canConfirm: isImportReady,
        onDiscardImport: discardReview,
        onConfirmImport: confirmImportWrite,
        onClose: closeSession
      }
    : {
        mode: 'prompt' as const,
        inputValue: pasteText,
        error: importError,
        onInputChange: (value: string) => {
          setPasteText(value);
          setImportError('');
        },
        onImportText: () => {
          void acceptImportText(pasteText);
        },
        onSelectFile,
        onCopyPrompt: copyPrompt,
        onClose: closeSession
      };

  return {
    pageProps,
    actionsPanelProps,
    actionsTitle: importReview ? '本次导入' : '汇总导入',
    actionsClassName: 'right-panel-page--rollup-import-actions',
    importFile,
    openSession,
    closeSession,
    dismissPage,
    clearPendingNewAccount,
    completePendingNewAccount,
    removeAssignmentsForGroup
  };
};
