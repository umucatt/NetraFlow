export const ROLLUP_IMPORT_FORMAT = 'netraflow_rollup';

import { roundToMoneyPrecision } from './money';

export type RollupImportMode = 'change' | 'balance';
export type RollupRiskLevel = 'low' | 'medium' | 'high';
export type RollupLowRiskKind = 'strict' | 'normalized';

export type RollupImportRecord = {
  id: string;
  date: string;
  mode: RollupImportMode;
  amount: number;
  currency: string;
  accountKeyword: string;
  inputIndex: number;
};

export type RollupUnresolvedItem = {
  reason: string;
  dateText: string;
  mode: string;
  amount: number | null;
  currency: string;
  accountKeyword: string;
  rawText: string;
};

export type RollupImportIssue = {
  level: RollupRiskLevel;
  message: string;
  blocking?: boolean;
};

export type RollupImportReview = {
  format: typeof ROLLUP_IMPORT_FORMAT;
  records: RollupImportRecord[];
  unresolvedItems: RollupUnresolvedItem[];
  issues: RollupImportIssue[];
  riskLevel: RollupRiskLevel;
  lowRiskKind: RollupLowRiskKind;
  hasBlockingIssues: boolean;
};

export type RollupImportParseResult =
  | {
      ok: true;
      review: RollupImportReview;
    }
  | {
      ok: false;
      issues: RollupImportIssue[];
    };

export type RollupAccountAssignment = {
  groupName: string;
  accountId: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY_CNY = 'CNY';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isValidDateValue = (dateValue: string) => {
  if (!DATE_PATTERN.test(dateValue)) {
    return false;
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (!Number.isFinite(date.getTime())) {
    return false;
  }

  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}` === dateValue;
};

const getTodayDateValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const isFutureDateValue = (dateValue: string, todayDateValue: string) =>
  dateValue > todayDateValue;

const normalizeStringField = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const normalizeAmount = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? roundToMoneyPrecision(value) : null;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return null;
    }

    const amount = Number(trimmedValue);
    return Number.isFinite(amount) ? roundToMoneyPrecision(amount) : null;
  }

  return null;
};

const getRiskLevel = (issues: RollupImportIssue[]): RollupRiskLevel => {
  if (issues.some((issue) => issue.level === 'high')) {
    return 'high';
  }

  if (issues.some((issue) => issue.level === 'medium')) {
    return 'medium';
  }

  return 'low';
};

const getLowRiskKind = (issues: RollupImportIssue[]): RollupLowRiskKind =>
  issues.length === 0 ? 'strict' : 'normalized';

const createRecordId = (record: Pick<RollupImportRecord, 'date' | 'mode' | 'accountKeyword'>) =>
  `${record.accountKeyword}\u0000${record.date}\u0000${record.mode}`;

const createGroupingKey = (record: Pick<RollupImportRecord, 'date' | 'mode' | 'accountKeyword'>) =>
  `${record.accountKeyword}\u0000${record.date}\u0000${record.mode}`;

const createDateAccountKey = (
  record: Pick<RollupImportRecord, 'date' | 'accountKeyword'>
) => `${record.accountKeyword}\u0000${record.date}`;

const normalizeUnresolvedItems = (
  value: unknown,
  issues: RollupImportIssue[]
): RollupUnresolvedItem[] => {
  if (value === undefined) {
    issues.push({
      level: 'low',
      message: 'unresolvedItems 缺失，已按空列表处理'
    });
    return [];
  }

  if (!Array.isArray(value)) {
    issues.push({
      level: 'medium',
      message: 'unresolvedItems 不是数组，已忽略'
    });
    return [];
  }

  return value.filter(isPlainObject).map((item, index) => {
    const amount = item.amount === null || item.amount === undefined
      ? null
      : normalizeAmount(item.amount);

    if (amount === 0) {
      issues.push({
        level: 'medium',
        message: `unresolvedItems 第 ${index + 1} 项金额为 0，建议重新检查外部整理结果`
      });
    }

    return {
      reason: normalizeStringField(item.reason),
      dateText: normalizeStringField(item.dateText),
      mode: normalizeStringField(item.mode),
      amount,
      currency: normalizeStringField(item.currency) || CURRENCY_CNY,
      accountKeyword: normalizeStringField(item.accountKeyword),
      rawText: normalizeStringField(item.rawText)
    };
  });
};

const normalizeRecords = (
  recordsValue: unknown,
  todayDateValue: string,
  issues: RollupImportIssue[]
) => {
  if (!Array.isArray(recordsValue)) {
    issues.push({
      level: 'high',
      message: 'records 缺失或不是数组',
      blocking: true
    });
    return [];
  }

  const normalizedRecords = recordsValue.flatMap((recordValue, index): RollupImportRecord[] => {
    if (!isPlainObject(recordValue)) {
      issues.push({
        level: 'high',
        message: `records 第 ${index + 1} 项不是对象`,
        blocking: true
      });
      return [];
    }

    const unknownFields = Object.keys(recordValue).filter(
      (field) =>
        !['date', 'mode', 'amount', 'currency', 'accountKeyword'].includes(field)
    );

    if (unknownFields.length > 0) {
      issues.push({
        level: 'low',
        message: `records 第 ${index + 1} 项存在未知字段，已忽略`
      });
    }

    const date = normalizeStringField(recordValue.date);

    if (!isValidDateValue(date)) {
      issues.push({
        level: 'high',
        message: `records 第 ${index + 1} 项日期无效`,
        blocking: true
      });
      return [];
    }

    if (isFutureDateValue(date, todayDateValue)) {
      issues.push({
        level: 'high',
        message: `records 第 ${index + 1} 项日期是未来日期`,
        blocking: true
      });
      return [];
    }

    const rawMode = normalizeStringField(recordValue.mode);
    const mode = rawMode.toLocaleLowerCase();

    if (rawMode !== mode && (mode === 'change' || mode === 'balance')) {
      issues.push({
        level: 'low',
        message: `records 第 ${index + 1} 项 mode 大小写已标准化`
      });
    }

    if (mode !== 'change' && mode !== 'balance') {
      issues.push({
        level: 'high',
        message: `records 第 ${index + 1} 项 mode 非法`,
        blocking: true
      });
      return [];
    }

    const amount = normalizeAmount(recordValue.amount);

    if (amount === null) {
      issues.push({
        level: 'high',
        message: `records 第 ${index + 1} 项 amount 不能转为数字`,
        blocking: true
      });
      return [];
    }

    if (typeof recordValue.amount === 'string') {
      issues.push({
        level: 'low',
        message: `records 第 ${index + 1} 项 amount 数字字符串已标准化`
      });
    }

    if (mode === 'change' && amount === 0) {
      issues.push({
        level: 'medium',
        message: `records 第 ${index + 1} 项 change 金额为 0，已保留在确认列表中`
      });
    }

    const rawCurrency = normalizeStringField(recordValue.currency);
    const currency = rawCurrency || CURRENCY_CNY;

    if (!rawCurrency) {
      issues.push({
        level: 'low',
        message: `records 第 ${index + 1} 项 currency 为空，已按 CNY 处理`
      });
    } else if (rawCurrency.toLocaleUpperCase() !== CURRENCY_CNY) {
      issues.push({
        level: 'low',
        message: `records 第 ${index + 1} 项 currency 不是 CNY，当前按统一货币口径处理`
      });
    }

    const accountKeyword = normalizeStringField(recordValue.accountKeyword);

    if (!accountKeyword) {
      issues.push({
        level: 'low',
        message: `records 第 ${index + 1} 项 accountKeyword 为空，需要本地选择账户`
      });
    }

    return [
      {
        id: '',
        date,
        mode,
        amount,
        currency: CURRENCY_CNY,
        accountKeyword,
        inputIndex: index
      }
    ];
  });

  const byDateAndAccount = new Map<string, Set<RollupImportMode>>();

  normalizedRecords.forEach((record) => {
    const key = createDateAccountKey(record);
    const modes = byDateAndAccount.get(key) ?? new Set<RollupImportMode>();
    modes.add(record.mode);
    byDateAndAccount.set(key, modes);
  });

  byDateAndAccount.forEach((modes, key) => {
    if (modes.has('change') && modes.has('balance')) {
      const [accountKeyword, date] = key.split('\u0000');
      issues.push({
        level: 'high',
        message: `同一日期 ${date}、账户关键词「${accountKeyword || '空'}」同时存在 change 和 balance`
      });
    }
  });

  const mergedRecords = new Map<string, RollupImportRecord>();

  normalizedRecords.forEach((record) => {
    const key = createGroupingKey(record);
    const existingRecord = mergedRecords.get(key);

    if (!existingRecord) {
      mergedRecords.set(key, {
        ...record,
        id: createRecordId(record)
      });
      return;
    }

    if (record.mode === 'change') {
      issues.push({
        level: 'medium',
        message: `同一日期 ${record.date}、账户关键词「${record.accountKeyword || '空'}」出现多条 change，已合并`
      });
      mergedRecords.set(key, {
        ...existingRecord,
        amount: roundToMoneyPrecision(existingRecord.amount + record.amount),
        inputIndex: Math.min(existingRecord.inputIndex, record.inputIndex)
      });
      return;
    }

    issues.push({
      level: 'medium',
      message: `同一日期 ${record.date}、账户关键词「${record.accountKeyword || '空'}」出现多条 balance，已保留最后一条`
    });
    mergedRecords.set(key, {
      ...record,
      id: createRecordId(record)
    });
  });

  return [...mergedRecords.values()].sort(
    (left, right) =>
      left.accountKeyword.localeCompare(right.accountKeyword) ||
      left.date.localeCompare(right.date) ||
      left.inputIndex - right.inputIndex
  );
};

export const parseRollupImportJson = (
  jsonText: string,
  options: {
    todayDateValue?: string;
    contentHash?: string;
    importedHashes?: string[];
  } = {}
): RollupImportParseResult => {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(jsonText);
  } catch {
    return {
      ok: false,
      issues: [
        {
          level: 'high',
          message: 'JSON 无法解析',
          blocking: true
        }
      ]
    };
  }

  const issues: RollupImportIssue[] = [];

  if (!isPlainObject(parsedValue)) {
    return {
      ok: false,
      issues: [
        {
          level: 'high',
          message: '汇总文件根节点必须是对象',
          blocking: true
        }
      ]
    };
  }

  if (parsedValue.format !== ROLLUP_IMPORT_FORMAT) {
    return {
      ok: false,
      issues: [
        {
          level: 'high',
          message: 'format 必须是 netraflow_rollup',
          blocking: true
        }
      ]
    };
  }

  if (
    options.contentHash &&
    options.importedHashes?.includes(options.contentHash)
  ) {
    issues.push({
      level: 'high',
      message: '这个汇总文件内容已经导入过'
    });
  }

  const todayDateValue = options.todayDateValue ?? getTodayDateValue();
  const records = normalizeRecords(parsedValue.records, todayDateValue, issues);
  const unresolvedItems = normalizeUnresolvedItems(parsedValue.unresolvedItems, issues);

  if (records.length === 0) {
    issues.push({
      level: 'high',
      message: '没有可导入的汇总记录',
      blocking: true
    });
  }

  const riskLevel = getRiskLevel(issues);
  const hasBlockingIssues = issues.some((issue) => issue.blocking);

  return {
    ok: true,
    review: {
      format: ROLLUP_IMPORT_FORMAT,
      records,
      unresolvedItems,
      issues,
      riskLevel,
      lowRiskKind: riskLevel === 'low' ? getLowRiskKind(issues) : 'normalized',
      hasBlockingIssues
    }
  };
};

export const getRollupAccountGroupKeys = (records: RollupImportRecord[]) =>
  Array.from(new Set(records.map((record) => record.accountKeyword)));

export const areAllRollupGroupsAssigned = (
  groupKeys: string[],
  assignments: Record<string, RollupAccountAssignment | null | undefined>
) =>
  groupKeys.length > 0 &&
  groupKeys.every((key) => Boolean(assignments[key]?.groupName && assignments[key]?.accountId));
