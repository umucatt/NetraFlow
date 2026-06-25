import { getAutomaticAccountMark } from './accountMark';
import type {
  Account,
  AccountTypeNature,
  AssetGroup,
  AssetGroupWithAccounts,
  BackupRecord,
  HistoryRecord,
  HistoryType
} from './app/types';
import { deriveGroupsWithAccounts } from './app/accountData';
import { createStableAccountId, createStableGroupId } from './app/ids';

export type ExampleTemplateId = 'light' | 'daily' | 'advanced';

export type ExampleTemplateDefinition = {
  id: ExampleTemplateId;
  name: string;
  description: string;
  meta: string;
  accountRange: [number, number];
  historyRange: [number, number];
  dayRange: [number, number];
  snapshotCount: number;
  snapshotAgeRange: [number, number];
  positiveMainRange: [number, number];
  positiveAllowedRange: [number, number];
  debtBands: Array<{ weight: number; range: [number, number] }>;
};

type ExampleAccountDefinition = {
  key: string;
  name: string;
  groupName: string;
  nature: AccountTypeNature;
  probabilities: Record<ExampleTemplateId, number>;
  alias?: string;
  weight?: number;
  liabilityRole?: 'mortgage' | 'loan' | 'small';
  amountRange?: [number, number];
};

type ExampleAccountLifecycle = 'active' | 'archived' | 'restored';

type ExampleEntry = {
  definition: ExampleAccountDefinition;
  account: Account;
  createdDaysAgo: number;
  lifecycle: ExampleAccountLifecycle;
  archivedDaysAgo?: number;
  restoredDaysAgo?: number;
};

type ExampleHistoryDraft = {
  entry: ExampleEntry;
  type: Exclude<HistoryType, '删除'>;
  time: string;
  forceFinal?: boolean;
};

type ExampleRemarkCategory = 'liquid' | 'investment' | 'debt' | 'fixed' | 'receivable';

export type ExampleGeneratedData = {
  appData: {
    groups: AssetGroup[];
    accounts: Account[];
    history: HistoryRecord[];
  };
  backupRecords: BackupRecord[];
  lastBackupAt: string;
  lastBackupHistoryCount: number;
};

export const EXAMPLE_TEMPLATES: ExampleTemplateDefinition[] = [
  {
    id: 'light',
    name: '轻量资产模板',
    description: '适合快速体验基础账户、钱包、简单理财和少量负债',
    meta: '4-8 个账户 · 8-15 条历史记录 · 近 30 天',
    accountRange: [4, 8],
    historyRange: [8, 15],
    dayRange: [30, 30],
    snapshotCount: 1,
    snapshotAgeRange: [3, 7],
    positiveMainRange: [15000, 50000],
    positiveAllowedRange: [8000, 80000],
    debtBands: [
      { weight: 75, range: [0, 0.05] },
      { weight: 22, range: [0.05, 0.12] },
      { weight: 3, range: [0.12, 0.25] }
    ]
  },
  {
    id: 'daily',
    name: '日常资产模板',
    description: '适合验证常见储蓄、钱包、理财、投资和负债场景',
    meta: '8-14 个账户 · 25-45 条历史记录 · 近 90 天',
    accountRange: [8, 14],
    historyRange: [25, 45],
    dayRange: [90, 90],
    snapshotCount: 2,
    snapshotAgeRange: [7, 14],
    positiveMainRange: [120000, 350000],
    positiveAllowedRange: [80000, 600000],
    debtBands: [
      { weight: 35, range: [0.05, 0.12] },
      { weight: 42, range: [0.12, 0.35] },
      { weight: 15, range: [0.35, 1] },
      { weight: 4, range: [1, 1.8] },
      { weight: 4, range: [2, 2.8] }
    ]
  },
  {
    id: 'advanced',
    name: '进阶资产模板',
    description: '适合验证多账户、多投资、多负债、复杂搜索和图表场景',
    meta: '16-28 个账户 · 70-120 条历史记录 · 近 180-365 天',
    accountRange: [16, 28],
    historyRange: [70, 120],
    dayRange: [180, 365],
    snapshotCount: 3,
    snapshotAgeRange: [14, 30],
    positiveMainRange: [1200000, 3500000],
    positiveAllowedRange: [800000, 5000000],
    debtBands: [
      { weight: 25, range: [0.1, 0.25] },
      { weight: 45, range: [0.25, 0.55] },
      { weight: 20, range: [0.55, 1.2] },
      { weight: 7, range: [1.2, 1.8] },
      { weight: 3, range: [2, 2.6] }
    ]
  }
];

const EXAMPLE_ACCOUNT_DEFINITIONS: ExampleAccountDefinition[] = [
  {
    key: 'cash',
    name: '现金',
    groupName: '流动资金',
    nature: 'asset',
    probabilities: { light: 1, daily: 0.6, advanced: 0.6 },
    alias: '现',
    weight: 0.35
  },
  {
    key: 'salary-card',
    name: '银行卡 / 工资卡',
    groupName: '流动资金',
    nature: 'asset',
    probabilities: { light: 1, daily: 1, advanced: 1 },
    alias: '工',
    weight: 1.1
  },
  {
    key: 'saving-card',
    name: '建设银行储蓄卡',
    groupName: '流动资金',
    nature: 'asset',
    probabilities: { light: 0.7, daily: 1, advanced: 1 },
    alias: '储',
    weight: 0.9
  },
  {
    key: 'wechat',
    name: '微信零钱',
    groupName: '流动资金',
    nature: 'asset',
    probabilities: { light: 1, daily: 1, advanced: 0.8 },
    alias: '微',
    weight: 0.22
  },
  {
    key: 'alipay',
    name: '支付宝余额',
    groupName: '流动资金',
    nature: 'asset',
    probabilities: { light: 1, daily: 1, advanced: 0.8 },
    alias: '支',
    weight: 0.22
  },
  {
    key: 'qq-wallet',
    name: 'QQ 钱包',
    groupName: '流动资金',
    nature: 'asset',
    probabilities: { light: 0.1, daily: 0.08, advanced: 0.05 },
    alias: 'Q',
    weight: 0.12
  },
  {
    key: 'yu-ebao',
    name: '余额宝',
    groupName: '稳健理财',
    nature: 'asset',
    probabilities: { light: 0.7, daily: 0.55, advanced: 0.35 },
    alias: '余',
    weight: 0.6
  },
  {
    key: 'lingqian-tong',
    name: '零钱通',
    groupName: '稳健理财',
    nature: 'asset',
    probabilities: { light: 0.6, daily: 0.45, advanced: 0.25 },
    alias: '零',
    weight: 0.5
  },
  {
    key: 'fixed-deposit',
    name: '定期存款 / 存单',
    groupName: '稳健理财',
    nature: 'asset',
    probabilities: { light: 0.4, daily: 0.45, advanced: 0.25 },
    alias: '定',
    weight: 1.2
  },
  {
    key: 'passbook',
    name: '存折',
    groupName: '稳健理财',
    nature: 'asset',
    probabilities: { light: 0.12, daily: 0.08, advanced: 0.05 },
    alias: '折',
    weight: 0.28
  },
  {
    key: 'fund',
    name: '基金账户',
    groupName: '投资资产',
    nature: 'asset',
    probabilities: { light: 0.2, daily: 0.75, advanced: 1 },
    alias: '基',
    weight: 1.25
  },
  {
    key: 'fund-2',
    name: '沪深300指数基金',
    groupName: '投资资产',
    nature: 'asset',
    probabilities: { light: 0, daily: 0.2, advanced: 0.65 },
    alias: '沪深',
    weight: 0.9
  },
  {
    key: 'stock',
    name: '股票账户',
    groupName: '投资资产',
    nature: 'asset',
    probabilities: { light: 0, daily: 0.45, advanced: 1 },
    alias: '股',
    weight: 1.35
  },
  {
    key: 'eastmoney',
    name: '证券账户 / 东方财富账户',
    groupName: '投资资产',
    nature: 'asset',
    probabilities: { light: 0, daily: 0.25, advanced: 0.65 },
    alias: '东',
    weight: 1
  },
  {
    key: 'global-stock',
    name: '港美股账户',
    groupName: '投资资产',
    nature: 'asset',
    probabilities: { light: 0, daily: 0.05, advanced: 0.35 },
    alias: '港',
    weight: 0.9
  },
  {
    key: 'gold',
    name: '黄金',
    groupName: '投资资产',
    nature: 'asset',
    probabilities: { light: 0.05, daily: 0.15, advanced: 0.5 },
    alias: '金',
    weight: 0.5
  },
  {
    key: 'oil',
    name: '原油',
    groupName: '投资资产',
    nature: 'asset',
    probabilities: { light: 0, daily: 0, advanced: 0.25 },
    alias: '油',
    weight: 0.45
  },
  {
    key: 'futures',
    name: '期货账户',
    groupName: '投资资产',
    nature: 'asset',
    probabilities: { light: 0, daily: 0, advanced: 0.25 },
    alias: '期',
    weight: 0.55
  },
  {
    key: 'house',
    name: '房产',
    groupName: '固定资产',
    nature: 'asset',
    probabilities: { light: 0.03, daily: 0.15, advanced: 1 },
    alias: '房',
    weight: 6
  },
  {
    key: 'car',
    name: '车辆',
    groupName: '固定资产',
    nature: 'asset',
    probabilities: { light: 0.08, daily: 0.35, advanced: 0.7 },
    alias: '车',
    weight: 1.4
  },
  {
    key: 'other-fixed',
    name: '家庭固定资产',
    groupName: '固定资产',
    nature: 'asset',
    probabilities: { light: 0, daily: 0.1, advanced: 0.35 },
    alias: '固',
    weight: 0.8
  },
  {
    key: 'credit-card',
    name: '交通银行信用卡',
    groupName: '负债',
    nature: 'liability',
    probabilities: { light: 0.15, daily: 0.7, advanced: 0.8 },
    alias: '信',
    weight: 0.4,
    liabilityRole: 'small'
  },
  {
    key: 'huabei',
    name: '花呗 / 白条',
    groupName: '负债',
    nature: 'liability',
    probabilities: { light: 0.5, daily: 0.55, advanced: 0.45 },
    alias: '花',
    weight: 0.28,
    liabilityRole: 'small'
  },
  {
    key: 'loan',
    name: '车贷',
    groupName: '负债',
    nature: 'liability',
    probabilities: { light: 0, daily: 0.25, advanced: 0.45 },
    alias: '贷',
    weight: 1.2,
    liabilityRole: 'loan'
  },
  {
    key: 'mortgage',
    name: '房贷',
    groupName: '负债',
    nature: 'liability',
    probabilities: { light: 0, daily: 0.35, advanced: 0.45 },
    alias: '房贷',
    weight: 4,
    liabilityRole: 'mortgage'
  },
  {
    key: 'online-loan',
    name: '消费分期',
    groupName: '负债',
    nature: 'liability',
    probabilities: { light: 0, daily: 0.08, advanced: 0.2 },
    alias: '分',
    weight: 0.35,
    liabilityRole: 'small'
  },
  {
    key: 'receivable',
    name: '应收款',
    groupName: '应收款',
    nature: 'receivable',
    probabilities: { light: 0.25, daily: 0.35, advanced: 0.45 },
    alias: '收',
    weight: 0.45
  }
];

export const exampleRemarkPools: Record<ExampleRemarkCategory, string[]> = {
  liquid: ['月度调整', '日常余额整理', '工资到账', '转账汇总', '账单整理', '零钱归集', '现金盘点'],
  investment: ['基金估值调整', '持仓市值同步', '月度收益整理', '投资账户同步', '定投后整理', '净值更新', '股票持仓同步'],
  debt: ['账单更新', '还款后调整', '月度账单整理', '贷款余额更新', '信用卡账单', '分期余额调整'],
  fixed: ['估值调整', '资产重估', '折旧调整', '市场估值更新', '房产估值', '车辆估值'],
  receivable: ['应收款更新', '部分回款', '尾款确认', '款项调整']
};

const EXAMPLE_ARCHIVED_PROBABILITIES: Record<ExampleTemplateId, number> = {
  light: 0.15,
  daily: 0.4,
  advanced: 0.7
};

const EXAMPLE_DELETED_HISTORY_PROBABILITIES: Record<ExampleTemplateId, number> = {
  light: 0,
  daily: 0.1,
  advanced: 0.35
};

const EXAMPLE_RESTORED_PROBABILITIES: Record<ExampleTemplateId, number> = {
  light: 0.03,
  daily: 0.1,
  advanced: 0.18
};

const EXAMPLE_MAX_RESTORED_ACCOUNTS: Record<ExampleTemplateId, number> = {
  light: 1,
  daily: 2,
  advanced: 4
};

const EXAMPLE_INVALID_ACCOUNT_NAME_PATTERN = /^(第[一二三四五六七八九十]+|备用账户\s*\d+|账户\s*\d+|account\s*\d+)/i;

const getExampleTemplate = (templateId: ExampleTemplateId) =>
  EXAMPLE_TEMPLATES.find((template) => template.id === templateId) ?? EXAMPLE_TEMPLATES[0];

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

const randomIntBetween = (min: number, max: number) =>
  Math.floor(randomBetween(min, max + 1));

const roundExampleAmount = (amount: number) => Math.round(amount / 10) * 10;

const pickRandom = <T,>(items: T[]) => items[randomIntBetween(0, Math.max(0, items.length - 1))];

const EXAMPLE_GENERATION_NOW = new Date(Date.now() - 1000);

const getExampleAccountAlias = (definition: ExampleAccountDefinition) =>
  getAutomaticAccountMark(definition.name);

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);

  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
};

const isPositiveNature = (nature: AccountTypeNature) =>
  nature === 'asset' || nature === 'receivable';

const toStoredAmountByNature = (nature: AccountTypeNature, amount: number) =>
  nature === 'liability' ? -Math.abs(amount) : Math.abs(amount);

const pickWeightedRange = (
  bands: ExampleTemplateDefinition['debtBands']
): [number, number] => {
  const totalWeight = bands.reduce((sum, band) => sum + band.weight, 0);
  let cursor = randomBetween(0, totalWeight);

  for (const band of bands) {
    cursor -= band.weight;

    if (cursor <= 0) {
      return band.range;
    }
  }

  return bands[bands.length - 1]?.range ?? [0, 0];
};

const getExampleIsoTime = (daysAgo: number, hour = randomIntBetween(9, 21)) => {
  const baseNow = EXAMPLE_GENERATION_NOW;
  const safeDaysAgo = Math.max(0, Math.floor(daysAgo));

  if (safeDaysAgo === 0) {
    return baseNow.toISOString();
  }

  const date = addDays(baseNow, -safeDaysAgo);

  date.setHours(hour, randomIntBetween(0, 59), randomIntBetween(0, 59), 0);

  if (date.getTime() > baseNow.getTime()) {
    date.setTime(baseNow.getTime());
  }

  return date.toISOString();
};

const selectExampleAccountDefinitions = (template: ExampleTemplateDefinition) => {
  const selected = EXAMPLE_ACCOUNT_DEFINITIONS.filter(
    (definition) => Math.random() < definition.probabilities[template.id]
  );
  const [minAccounts, maxAccounts] = template.accountRange;
  const ensureDefinition = (key: string) => {
    if (selected.some((definition) => definition.key === key)) {
      return;
    }

    const definition = EXAMPLE_ACCOUNT_DEFINITIONS.find((item) => item.key === key);

    if (definition) {
      selected.push(definition);
    }
  };

  ensureDefinition('salary-card');

  if (!selected.some((definition) => isPositiveNature(definition.nature))) {
    ensureDefinition('wechat');
  }

  while (selected.length < minAccounts) {
    const nextDefinition = EXAMPLE_ACCOUNT_DEFINITIONS.filter(
      (definition) => !selected.some((item) => item.key === definition.key)
    ).sort(
      (left, right) =>
        right.probabilities[template.id] - left.probabilities[template.id]
    )[0];

    if (!nextDefinition) {
      break;
    }

    selected.push(nextDefinition);
  }

  while (selected.length > maxAccounts) {
    const removableIndex = selected
      .map((definition, index) => ({ definition, index }))
      .filter(({ definition }) => definition.key !== 'salary-card')
      .sort(
        (left, right) =>
          left.definition.probabilities[template.id] -
          right.definition.probabilities[template.id]
      )[0]?.index;

    if (removableIndex === undefined) {
      break;
    }

    selected.splice(removableIndex, 1);
  }

  return selected;
};

const createExampleAccount = (
  definition: ExampleAccountDefinition,
  templateId: ExampleTemplateId,
  accountId: string,
  archived = false
): ExampleEntry => {
  const createdDaysAgo =
    templateId === 'light'
      ? randomIntBetween(12, 30)
      : templateId === 'daily'
        ? randomIntBetween(30, 90)
        : randomIntBetween(90, 365);
  const createdAt = getExampleIsoTime(createdDaysAgo, randomIntBetween(8, 12));

  return {
    definition,
    account: {
      id: accountId,
      groupId: '',
      name: definition.name,
      amount: 0,
      createdAt,
      alias: getExampleAccountAlias(definition),
      archived
    },
    createdDaysAgo,
    lifecycle: archived ? 'archived' : 'active'
  };
};

const assignExampleLifecycles = (template: ExampleTemplateDefinition, entries: ExampleEntry[]) => {
  const activeCandidates = entries.filter(
    (entry) => !entry.account.archived && entry.createdDaysAgo >= 8
  );

  activeCandidates.forEach((entry) => {
    if (Math.random() < EXAMPLE_RESTORED_PROBABILITIES[template.id]) {
      entry.lifecycle = 'restored';
    }
  });

  const restoredEntries = activeCandidates.filter((entry) => entry.lifecycle === 'restored');

  restoredEntries.slice(EXAMPLE_MAX_RESTORED_ACCOUNTS[template.id]).forEach((entry) => {
    entry.lifecycle = 'active';
  });

  if (template.id === 'advanced' && !activeCandidates.some((entry) => entry.lifecycle === 'restored')) {
    const restoredEntry =
      activeCandidates.find((entry) => entry.definition.groupName === '投资资产') ?? activeCandidates[0];

    if (restoredEntry) {
      restoredEntry.lifecycle = 'restored';
    }
  }

  entries.forEach((entry) => {
    if (entry.lifecycle === 'archived') {
      const archivedDaysAgo = randomIntBetween(1, Math.max(1, entry.createdDaysAgo - 1));

      entry.archivedDaysAgo = archivedDaysAgo;
      entry.account.archived = true;
      entry.account.archivedAt = getExampleIsoTime(archivedDaysAgo, 20);
      return;
    }

    if (entry.lifecycle === 'restored') {
      const archivedDaysAgo = randomIntBetween(2, Math.max(2, entry.createdDaysAgo - 2));
      const restoredDaysAgo = randomIntBetween(1, Math.max(1, archivedDaysAgo - 1));

      entry.archivedDaysAgo = archivedDaysAgo;
      entry.restoredDaysAgo = restoredDaysAgo;
      entry.account.archived = false;
      entry.account.archivedAt = undefined;
      return;
    }

    entry.account.archived = false;
    entry.account.archivedAt = undefined;
  });
};

const distributeExamplePositiveAmounts = (
  entries: Array<{ definition: ExampleAccountDefinition; account: Account }>,
  targetPositiveTotal: number
) => {
  const positiveEntries = entries.filter(
    ({ definition, account }) => isPositiveNature(definition.nature) && !account.archived
  );
  const weights = positiveEntries.map(
    ({ definition }) => (definition.weight ?? 1) * randomBetween(0.72, 1.32)
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let assigned = 0;

  positiveEntries.forEach(({ definition, account }, index) => {
    const amount =
      index === positiveEntries.length - 1
        ? Math.max(0, targetPositiveTotal - assigned)
        : roundExampleAmount((targetPositiveTotal * weights[index]) / totalWeight);

    account.amount = toStoredAmountByNature(definition.nature, amount);
    assigned += amount;
  });

  entries
    .filter(({ account }) => account.archived)
    .forEach(({ definition, account }) => {
      account.amount = toStoredAmountByNature(
        definition.nature,
        roundExampleAmount(randomBetween(120, 3200))
      );
    });
};

const distributeExampleDebtAmounts = (
  entries: Array<{ definition: ExampleAccountDefinition; account: Account }>,
  targetDebtTotal: number
) => {
  const liabilityEntries = entries.filter(
    ({ definition, account }) => definition.nature === 'liability' && !account.archived
  );

  if (liabilityEntries.length === 0 || targetDebtTotal <= 0) {
    liabilityEntries.forEach(({ account }) => {
      account.amount = 0;
    });
    return;
  }

  const weights = liabilityEntries.map(({ definition }) => {
    if (targetDebtTotal >= 200000 && definition.liabilityRole === 'mortgage') {
      return (definition.weight ?? 1) * 4;
    }

    if (definition.liabilityRole === 'small') {
      return Math.min(definition.weight ?? 1, targetDebtTotal >= 200000 ? 0.12 : 0.45);
    }

    return definition.weight ?? 1;
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let assigned = 0;

  liabilityEntries.forEach(({ definition, account }, index) => {
    const rawAmount =
      index === liabilityEntries.length - 1
        ? Math.max(0, targetDebtTotal - assigned)
        : roundExampleAmount((targetDebtTotal * weights[index]) / totalWeight);
    const cap =
      definition.liabilityRole === 'small'
        ? Math.min(rawAmount, targetDebtTotal >= 200000 ? 30000 : 60000)
        : rawAmount;
    const amount = roundExampleAmount(cap);

    account.amount = toStoredAmountByNature('liability', amount);
    assigned += amount;
  });

  const assignedDebt = liabilityEntries.reduce(
    (sum, { account }) => sum + Math.abs(account.amount),
    0
  );
  const debtGap = targetDebtTotal - assignedDebt;
  const fillEntry =
    liabilityEntries.find(({ definition }) => definition.liabilityRole === 'mortgage') ??
    liabilityEntries.find(({ definition }) => definition.liabilityRole === 'loan') ??
    liabilityEntries[liabilityEntries.length - 1];

  if (fillEntry && debtGap > 0) {
    fillEntry.account.amount = toStoredAmountByNature(
      'liability',
      Math.abs(fillEntry.account.amount) + roundExampleAmount(debtGap)
    );
  }
};

const createExampleGroups = (
  entries: Array<{ definition: ExampleAccountDefinition; account: Account }>
) => {
  const groupOrder = [
    '\u6d41\u52a8\u8d44\u91d1',
    '\u7a33\u5065\u7406\u8d22',
    '\u6295\u8d44\u8d44\u4ea7',
    '\u56fa\u5b9a\u8d44\u4ea7',
    '\u5e94\u6536\u6b3e',
    '\u8d1f\u503a'
  ];
  const groupIds = new Set<string>();

  return groupOrder.flatMap((groupName, sortOrder): AssetGroup[] => {
    const groupEntries = entries.filter(({ definition }) => definition.groupName === groupName);

    if (groupEntries.length === 0) {
      return [];
    }

    const groupId = createStableGroupId(groupIds);
    groupIds.add(groupId);
    groupEntries.forEach(({ account }) => {
      account.groupId = groupId;
    });

    return [
      {
        id: groupId,
        name: groupName,
        nature: groupEntries[0].definition.nature,
        includeInStats: true,
        sortOrder
      }
    ];
  });
};

const getExampleRemarkCategory = (groupName: string): ExampleRemarkCategory => {
  if (groupName === '投资资产') {
    return 'investment';
  }

  if (groupName === '负债') {
    return 'debt';
  }

  if (groupName === '固定资产') {
    return 'fixed';
  }

  if (groupName === '应收款') {
    return 'receivable';
  }

  return 'liquid';
};

const getExampleHistoryNote = (
  definition: ExampleAccountDefinition,
  type: HistoryType
) => {
  if (type === '创建') {
    return Math.random() < 0.18 ? '账户创建' : undefined;
  }

  if (type === '归档') {
    return Math.random() < 0.65 ? '账户归档' : undefined;
  }

  if (type === '重新启用') {
    return Math.random() < 0.65 ? '重新启用账户' : undefined;
  }

  if (type !== '修改' || Math.random() >= 0.4) {
    return undefined;
  }

  const category = getExampleRemarkCategory(definition.groupName);
  const pool = exampleRemarkPools[category];

  return pickRandom(pool);
};

const createExampleHistoryRecord = (
  templateId: ExampleTemplateId,
  definition: ExampleAccountDefinition,
  account: Account,
  type: HistoryType,
  beforeAmount: number | null,
  afterAmount: number | null,
  time: string,
  note?: string
): HistoryRecord => {
  const record: HistoryRecord = {
    id: createId(`example-history-${templateId}`),
    accountId: account.id,
    type,
    groupName: definition.groupName,
    accountName: account.name,
    beforeAmount,
    afterAmount,
    time
  };

  if (note) {
    record.note = note;
  }

  return record;
};

const getExampleIntermediateAmount = (account: Account, definition: ExampleAccountDefinition) => {
  const finalAmount = Math.abs(account.amount);
  const factor =
    definition.nature === 'liability'
      ? randomBetween(0.55, 1.15)
      : randomBetween(0.45, 1.08);

  return toStoredAmountByNature(definition.nature, roundExampleAmount(finalAmount * factor));
};

const addExampleModificationDraft = (
  drafts: ExampleHistoryDraft[],
  entry: ExampleEntry,
  minimumDaysAgo = 0
) => {
  const windows: Array<[number, number]> = [];
  const addWindow = (startDaysAgo: number, endDaysAgo: number) => {
    const safeStartDaysAgo = Math.max(startDaysAgo, minimumDaysAgo);

    if (safeStartDaysAgo <= endDaysAgo) {
      windows.push([safeStartDaysAgo, endDaysAgo]);
    }
  };

  if (entry.lifecycle === 'archived') {
    const archivedDaysAgo = entry.archivedDaysAgo ?? 1;

    if (entry.createdDaysAgo - 1 >= archivedDaysAgo + 1) {
      addWindow(archivedDaysAgo + 1, entry.createdDaysAgo - 1);
    }
  } else if (entry.lifecycle === 'restored') {
    const archivedDaysAgo = entry.archivedDaysAgo ?? 2;
    const restoredDaysAgo = entry.restoredDaysAgo ?? 1;

    if (entry.createdDaysAgo - 1 >= archivedDaysAgo + 1) {
      addWindow(archivedDaysAgo + 1, entry.createdDaysAgo - 1);
    }

    if (restoredDaysAgo - 1 >= 0) {
      addWindow(0, restoredDaysAgo - 1);
    }
  } else if (entry.createdDaysAgo - 1 >= 0) {
    addWindow(0, entry.createdDaysAgo - 1);
  }

  const window = pickRandom(windows);

  if (!window) {
    return false;
  }

  drafts.push({
    entry,
    type: '修改',
    time: getExampleIsoTime(randomIntBetween(window[0], window[1]))
  });

  return true;
};

const createLifecycleHistoryDrafts = (entries: ExampleEntry[]) => {
  const drafts: ExampleHistoryDraft[] = [];

  entries.forEach((entry) => {
    drafts.push({ entry, type: '创建', time: entry.account.createdAt });

    if (entry.lifecycle === 'archived') {
      drafts.push({
        entry,
        type: '归档',
        time: entry.account.archivedAt ?? getExampleIsoTime(entry.archivedDaysAgo ?? 1, 20)
      });
      return;
    }

    if (entry.lifecycle === 'restored') {
      drafts.push({
        entry,
        type: '归档',
        time: getExampleIsoTime(entry.archivedDaysAgo ?? 2, 16)
      });
      drafts.push({
        entry,
        type: '重新启用',
        time: getExampleIsoTime(entry.restoredDaysAgo ?? 1, 13)
      });
    }
  });

  return drafts;
};

const addExampleFinalModificationDrafts = (drafts: ExampleHistoryDraft[], entries: ExampleEntry[]) => {
  const activeEntries = entries.filter((entry) => !entry.account.archived);

  activeEntries.slice(0, Math.min(3, activeEntries.length)).forEach((entry, index) => {
    const restoredDaysAgo = entry.restoredDaysAgo ?? 1;
    const daysAgo = entry.lifecycle === 'restored' ? Math.max(0, restoredDaysAgo - 1) : index === 0 ? 0 : 1;

    drafts.push({
      entry,
      type: '修改',
      time: getExampleIsoTime(daysAgo, 18 + index),
      forceFinal: true
    });
  });
};

const getExampleFinalModificationDaysAgo = (entries: ExampleEntry[]) => {
  const daysAgoByAccountId = new Map<string, number>();
  const activeEntries = entries.filter((entry) => !entry.account.archived);

  activeEntries.slice(0, Math.min(3, activeEntries.length)).forEach((entry, index) => {
    const restoredDaysAgo = entry.restoredDaysAgo ?? 1;
    const daysAgo = entry.lifecycle === 'restored' ? Math.max(0, restoredDaysAgo - 1) : index === 0 ? 0 : 1;

    daysAgoByAccountId.set(entry.account.id, daysAgo);
  });

  return daysAgoByAccountId;
};

const materializeExampleHistory = (
  template: ExampleTemplateDefinition,
  drafts: ExampleHistoryDraft[]
) => {
  const history: HistoryRecord[] = [];
  const draftsByAccount = new Map<string, ExampleHistoryDraft[]>();

  drafts.forEach((draft) => {
    const accountDrafts = draftsByAccount.get(draft.entry.account.id) ?? [];

    accountDrafts.push(draft);
    draftsByAccount.set(draft.entry.account.id, accountDrafts);
  });

  draftsByAccount.forEach((accountDrafts) => {
    let currentAmount: number | null = null;

    accountDrafts
      .sort((left, right) => Date.parse(left.time) - Date.parse(right.time))
      .forEach((draft) => {
        const { definition, account } = draft.entry;
        const beforeAmount = currentAmount;
        let afterAmount: number | null = currentAmount;

        if (draft.type === '创建') {
          afterAmount = getExampleIntermediateAmount(account, definition);
        } else if (draft.type === '修改') {
          afterAmount = draft.forceFinal
            ? account.amount
            : getExampleIntermediateAmount(account, definition);
        } else if (draft.type === '归档') {
          afterAmount = null;
        } else if (draft.type === '重新启用') {
          afterAmount = getExampleIntermediateAmount(account, definition);
        }

        history.push(
          createExampleHistoryRecord(
            template.id,
            definition,
            account,
            draft.type,
            draft.type === '创建' || draft.type === '重新启用' ? null : beforeAmount,
            afterAmount,
            draft.time,
            getExampleHistoryNote(definition, draft.type)
          )
        );

        currentAmount = afterAmount;
      });
  });

  return history;
};

const createExampleHistory = (
  template: ExampleTemplateDefinition,
  entries: ExampleEntry[],
  dayLimit: number
) => {
  const drafts = createLifecycleHistoryDrafts(entries);
  const finalModificationDaysAgo = getExampleFinalModificationDaysAgo(entries);
  const finalDraftCount = finalModificationDaysAgo.size;
  const minTarget = Math.min(
    template.historyRange[1],
    Math.max(template.historyRange[0], entries.length + 4, drafts.length + finalDraftCount)
  );
  const targetHistoryCount = randomIntBetween(minTarget, template.historyRange[1]);
  const targetDraftCountBeforeFinal = Math.max(drafts.length, targetHistoryCount - finalDraftCount);
  const modifiableEntries = entries.filter((entry) =>
    entry.lifecycle === 'archived'
      ? Boolean(entry.archivedDaysAgo && entry.createdDaysAgo > entry.archivedDaysAgo + 1)
      : true
  );

  while (drafts.length < targetDraftCountBeforeFinal && modifiableEntries.length > 0) {
    const entry = pickRandom(modifiableEntries);
    const finalDaysAgo = finalModificationDaysAgo.get(entry.account.id);
    const didAddDraft = addExampleModificationDraft(
      drafts,
      entry,
      finalDaysAgo === undefined ? 0 : finalDaysAgo + 1
    );

    if (!didAddDraft) {
      const entryIndex = modifiableEntries.indexOf(entry);

      if (entryIndex >= 0) {
        modifiableEntries.splice(entryIndex, 1);
      }
    }
  }

  addExampleFinalModificationDrafts(drafts, entries);

  const history = materializeExampleHistory(template, drafts);

  if (
    history.length < template.historyRange[1] &&
    Math.random() < EXAMPLE_DELETED_HISTORY_PROBABILITIES[template.id]
  ) {
    history.push({
      id: createId(`example-history-${template.id}`),
      accountId: `example-${template.id}-deleted-old-account`,
      type: '删除',
      groupName: '流动资金',
      accountName: '已删除旧账户',
      beforeAmount: roundExampleAmount(randomBetween(800, 6000)),
      afterAmount: null,
      time: getExampleIsoTime(randomIntBetween(4, Math.max(5, dayLimit - 1)), 19),
      note: '旧账户整理'
    });
  }

  return history.sort((left, right) => Date.parse(right.time) - Date.parse(left.time));
};

const createExampleBackupRecords = (
  template: ExampleTemplateDefinition,
  historyCount: number
): BackupRecord[] =>
  Array.from({ length: template.snapshotCount }, (_, index) => {
    const daysAgo = randomIntBetween(
      template.snapshotAgeRange[0] + index * 2,
      template.snapshotAgeRange[1] + index * 3
    );
    const backedUpAt = getExampleIsoTime(daysAgo, 22);
    const historyBase = Math.max(1, historyCount - (template.snapshotCount - index - 1) * 8);

    return {
      id: createId(`example-backup-${template.id}`),
      backedUpAt,
      historyCount: historyBase,
      incrementCount: Math.max(1, randomIntBetween(2, Math.min(18, historyBase))),
      method: (index === 0 ? 'manual' : 'auto') as BackupRecord['method']
    };
  }).sort((left, right) => Date.parse(right.backedUpAt) - Date.parse(left.backedUpAt));

export const getExampleAccounts = (groups: AssetGroupWithAccounts[]) =>
  groups.flatMap((group) => group.accounts.map((account) => ({ group, account })));

export const isExampleAccountNameAllowed = (name: string) =>
  !EXAMPLE_INVALID_ACCOUNT_NAME_PATTERN.test(name.trim());

export const isExampleHistoryNoteAllowed = (record: HistoryRecord) => {
  if (!record.note) {
    return true;
  }

  if (record.note === '账户创建') {
    return record.type === '创建';
  }

  if (record.note === '账户归档') {
    return record.type === '归档';
  }

  if (record.note === '重新启用账户') {
    return record.type === '重新启用';
  }

  if (record.type === '删除') {
    return record.note === '旧账户整理';
  }

  if (record.type !== '修改') {
    return false;
  }

  return exampleRemarkPools[getExampleRemarkCategory(record.groupName)].includes(record.note);
};

const getExampleRecordStage = (record: HistoryRecord) => {
  if (record.type === '创建') {
    return 'created';
  }

  if (record.type === '归档') {
    return 'archived';
  }

  if (record.type === '重新启用') {
    return 'restored';
  }

  if (record.type === '修改') {
    return 'modified';
  }

  return 'deleted';
};

const formatExampleFutureRecordError = (
  accountName: string,
  record: HistoryRecord,
  now: number
) =>
  `${accountName}: 历史记录包含未来日期（类型：${record.type}，阶段：${getExampleRecordStage(record)}，记录时间：${record.time}，校验时间：${new Date(now).toISOString()}）`;

export const validateExampleHistoryConsistency = (appData: {
  groups: AssetGroup[];
  accounts: Account[];
  history: HistoryRecord[];
}) => {
  const errors: string[] = [];
  const now = EXAMPLE_GENERATION_NOW.getTime();
  const groupsWithAccounts = deriveGroupsWithAccounts(appData.groups, appData.accounts);
  const accounts = getExampleAccounts(groupsWithAccounts);
  const accountById = new Map(accounts.map(({ account }) => [account.id, account]));

  accounts.forEach(({ account }) => {
    if (!isExampleAccountNameAllowed(account.name)) {
      errors.push(`${account.name}: 示例账户名称不自然`);
    }

    const records = appData.history
      .filter((record) => record.accountId === account.id)
      .sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
    const createRecords = records.filter((record) => record.type === '创建');

    if (createRecords.length !== 1) {
      errors.push(`${account.name}: 创建记录数量不是 1`);
    }

    let archived = false;

    records.forEach((record) => {
      const timestamp = Date.parse(record.time);

      if (timestamp > now) {
        errors.push(formatExampleFutureRecordError(account.name, record, now));
      }

      if (!isExampleHistoryNoteAllowed(record)) {
        errors.push(`${account.name}: 备注与账户类型不匹配`);
      }

      if (record.type === '创建') {
        archived = false;
        return;
      }

      if (record.type === '归档') {
        archived = true;
        return;
      }

      if (record.type === '重新启用') {
        if (!archived) {
          errors.push(`${account.name}: 重新启用前没有归档记录`);
        }

        archived = false;
        return;
      }

      if (record.type === '修改' && archived) {
        errors.push(`${account.name}: 归档后到重新启用前存在修改记录`);
      }
    });

    const lastRecord = records[records.length - 1];

    if (account.archived && lastRecord?.type !== '归档') {
      errors.push(`${account.name}: 当前归档账户最后状态不是归档`);
    }

    if (!account.archived && lastRecord?.type === '归档') {
      errors.push(`${account.name}: 当前启用账户最后状态为归档`);
    }
  });

  appData.history.forEach((record) => {
    if (Date.parse(record.time) > now) {
      errors.push(formatExampleFutureRecordError(record.accountName, record, now));
    }

    if (accountById.has(record.accountId) && !isExampleHistoryNoteAllowed(record)) {
      errors.push(`${record.accountName}: 备注与账户类型不匹配`);
    }
  });

  return errors;
};

export const createExampleData = (templateId: ExampleTemplateId): ExampleGeneratedData => {
  const template = getExampleTemplate(templateId);
  const selectedDefinitions = selectExampleAccountDefinitions(template);
  const debtBand = pickWeightedRange(template.debtBands);
  const targetPositiveTotal = roundExampleAmount(
    Math.random() < 0.82
      ? randomBetween(template.positiveMainRange[0], template.positiveMainRange[1])
      : randomBetween(template.positiveAllowedRange[0], template.positiveAllowedRange[1])
  );
  const targetDebtRatio = randomBetween(debtBand[0], debtBand[1]);
  const needsMortgageFallback = targetDebtRatio >= 2;
  const hasDebt = targetDebtRatio > 0.005;
  const ensureDefinition = (key: string) => {
    if (selectedDefinitions.some((definition) => definition.key === key)) {
      return;
    }

    const definition = EXAMPLE_ACCOUNT_DEFINITIONS.find((item) => item.key === key);

    if (definition) {
      selectedDefinitions.push(definition);
    }
  };

  if (needsMortgageFallback) {
    ensureDefinition('mortgage');
  } else if (hasDebt && !selectedDefinitions.some((definition) => definition.nature === 'liability')) {
    ensureDefinition(template.id === 'light' ? 'huabei' : 'credit-card');
  }

  while (selectedDefinitions.length > template.accountRange[1]) {
    const removableIndex = selectedDefinitions
      .map((definition, index) => ({ definition, index }))
      .filter(
        ({ definition }) =>
          definition.key !== 'salary-card' &&
          (!needsMortgageFallback || definition.key !== 'mortgage')
      )
      .sort(
        (left, right) =>
          left.definition.probabilities[template.id] -
          right.definition.probabilities[template.id]
      )[0]?.index;

    if (removableIndex === undefined) {
      break;
    }

    selectedDefinitions.splice(removableIndex, 1);
  }

  if (Math.random() < EXAMPLE_ARCHIVED_PROBABILITIES[template.id]) {
    const archivedDefinition: ExampleAccountDefinition = {
      key: 'archived-old',
      name: '家庭备用金',
      groupName: '流动资金',
      nature: 'asset',
      probabilities: { light: 0.15, daily: 0.4, advanced: 0.7 },
      alias: '备',
      weight: 0.2
    };

    if (selectedDefinitions.length < template.accountRange[1]) {
      selectedDefinitions.push(archivedDefinition);
    }
  }

  const accountIds = new Set<string>();
  const entries = selectedDefinitions.map((definition) => {
    const accountId = createStableAccountId(accountIds);
    accountIds.add(accountId);

    return createExampleAccount(
      definition,
      template.id,
      accountId,
      definition.key === 'archived-old'
    );
  });

  assignExampleLifecycles(template, entries);
  distributeExamplePositiveAmounts(entries, targetPositiveTotal);
  distributeExampleDebtAmounts(entries, roundExampleAmount(targetPositiveTotal * targetDebtRatio));

  const dayLimit = randomIntBetween(template.dayRange[0], template.dayRange[1]);
  const history = createExampleHistory(template, entries, dayLimit);
  const groups = createExampleGroups(entries);
  const appData = {
    groups,
    accounts: entries.map(({ account }) => account),
    history
  };
  const validationErrors = validateExampleHistoryConsistency(appData);

  if (validationErrors.length > 0) {
    throw new Error(`示例数据生成不一致：${validationErrors.join('；')}`);
  }

  const backupRecords = createExampleBackupRecords(template, history.length);

  return {
    appData,
    backupRecords,
    lastBackupAt: backupRecords[0]?.backedUpAt ?? '',
    lastBackupHistoryCount: backupRecords[0]?.historyCount ?? history.length
  };
};

export const EXTREME_EXAMPLE_HISTORY_COUNT = 48000;
export const EXTREME_EXAMPLE_DAY_SPAN = 1095;
const EXTREME_EXAMPLE_BASE_DATE = '2026-06-23T12:00:00.000Z';

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const withSeededRandom = <T,>(seed: number, createValue: () => T): T => {
  const originalRandom = Math.random;
  let state = seed >>> 0;

  Math.random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;

    return state / 0x100000000;
  };

  try {
    return createValue();
  } finally {
    Math.random = originalRandom;
  }
};

const getExtremeIsoTime = (daysAgo: number, minuteOffset: number) => {
  const date = new Date(EXTREME_EXAMPLE_BASE_DATE);
  date.setDate(date.getDate() - daysAgo);
  date.setMinutes(date.getMinutes() + minuteOffset);

  return date.toISOString();
};

const createExtremeArchivedAccounts = (
  groups: AssetGroup[],
  existingAccounts: Account[]
): Account[] => {
  const assetGroup = groups.find((group) => group.nature === 'asset') ?? groups[0];
  const liabilityGroup = groups.find((group) => group.nature === 'liability') ?? assetGroup;
  const definitions = [
    { group: assetGroup, name: '长期备用金归档', alias: '备用' },
    { group: assetGroup, name: '旧银行卡归档', alias: '旧卡' },
    { group: assetGroup, name: '历史投资账户归档', alias: '旧投' },
    { group: liabilityGroup, name: '已结清负债归档', alias: '结清' }
  ];
  const existingIds = new Set(existingAccounts.map((account) => account.id));

  return definitions.flatMap((definition, index): Account[] => {
    if (!definition.group) {
      return [];
    }

    const id = `a_extreme_archived_${index + 1}`;

    if (existingIds.has(id)) {
      return [];
    }

    return [
      {
        id,
        groupId: definition.group.id,
        name: definition.name,
        amount: index === 3 ? -15000 : 12000 + index * 2300,
        createdAt: getExtremeIsoTime(EXTREME_EXAMPLE_DAY_SPAN - index * 31, index),
        alias: definition.alias,
        archived: true,
        archivedAt: getExtremeIsoTime(120 + index * 18, index)
      }
    ];
  });
};

export const createExtremeExampleData = (): ExampleGeneratedData => {
  const base = withSeededRandom(0x4e465f99, () => createExampleData('advanced'));
  const groups = cloneJson(base.appData.groups).map((group, index) => ({
    ...group,
    id: `g_extreme_${String(index + 1).padStart(3, '0')}`
  }));
  const groupIdMap = new Map(
    base.appData.groups.map((group, index) => [group.id, groups[index]?.id ?? group.id])
  );
  const baseAccounts = cloneJson(base.appData.accounts).map((account, index) => ({
    ...account,
    id: `a_extreme_${String(index + 1).padStart(3, '0')}`,
    groupId: groupIdMap.get(account.groupId) ?? account.groupId
  }));
  const accounts = [
    ...baseAccounts,
    ...createExtremeArchivedAccounts(groups, baseAccounts)
  ].map((account, index) => ({
    ...account,
    createdAt: getExtremeIsoTime(
      Math.max(1, EXTREME_EXAMPLE_DAY_SPAN - (index % 180)),
      index % 720
    ),
    ...(account.archived
      ? {
          archived: true,
          archivedAt:
            account.archivedAt ??
            getExtremeIsoTime(90 + (index % 120), index % 720)
        }
      : { archived: false, archivedAt: undefined })
  }));
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const amountByAccountId = new Map(accounts.map((account) => [account.id, account.amount]));
  const creationRecords: HistoryRecord[] = accounts.map((account, index) => {
    const group = groupById.get(account.groupId);

    return {
      id: `extreme-history-create-${index + 1}`,
      accountId: account.id,
      type: '创建',
      groupName: group?.name ?? '',
      accountName: account.name,
      beforeAmount: null,
      afterAmount: account.amount,
      time: account.createdAt,
      note: index % 3 === 0 ? '极端测试账户创建' : undefined,
      source: index % 2 === 0 ? 'rollup' : undefined
    };
  });
  const archivedRecords: HistoryRecord[] = accounts
    .filter((account) => account.archived && account.archivedAt)
    .map((account, index) => {
      const group = groupById.get(account.groupId);

      return {
        id: `extreme-history-archive-${index + 1}`,
        accountId: account.id,
        type: '归档',
        groupName: group?.name ?? '',
        accountName: account.name,
        beforeAmount: amountByAccountId.get(account.id) ?? account.amount,
        afterAmount: account.amount,
        time: account.archivedAt ?? getExtremeIsoTime(30 + index, index),
        note: '极端测试归档账户',
        source: 'rollup'
      };
    });
  const activeAccounts = accounts.filter((account) => !account.archived);
  const modifiableAccounts = accounts.filter((account) => account.archived !== true);
  const history: HistoryRecord[] = [...creationRecords];
  const modificationTarget = EXTREME_EXAMPLE_HISTORY_COUNT - creationRecords.length - archivedRecords.length;

  for (let index = 0; index < modificationTarget; index += 1) {
    const account = modifiableAccounts[index % modifiableAccounts.length] ?? activeAccounts[0];
    const group = account ? groupById.get(account.groupId) : undefined;

    if (!account) {
      break;
    }

    const previousAmount = amountByAccountId.get(account.id) ?? account.amount;
    const direction = group?.nature === 'liability' ? -1 : 1;
    const delta = direction * (((index % 17) - 8) * 50 + ((index % 11) - 5) * 20);
    const nextAmount = Math.round((previousAmount + delta) / 10) * 10;
    const daysAgo =
      EXTREME_EXAMPLE_DAY_SPAN -
      Math.floor((index / Math.max(1, modificationTarget - 1)) * (EXTREME_EXAMPLE_DAY_SPAN - 1));
    const noteVariant = index % 9;
    const note =
      noteVariant === 0
        ? '极端测试：较长备注用于验证列表和搜索在大数据量下的表现，包含多种账户来源与批量导入场景。'
        : noteVariant === 3
          ? '极端测试备注'
          : noteVariant === 6
            ? ''
            : undefined;

    amountByAccountId.set(account.id, nextAmount);
    history.push({
      id: `extreme-history-change-${String(index + 1).padStart(5, '0')}`,
      accountId: account.id,
      type: '修改',
      groupName: group?.name ?? '',
      accountName: account.name,
      beforeAmount: previousAmount,
      afterAmount: nextAmount,
      time: getExtremeIsoTime(daysAgo, index % 720),
      relatedTime: index % 5 === 0 ? getExtremeIsoTime(daysAgo, 0).slice(0, 10) : undefined,
      note: note === '' ? undefined : note,
      source: index % 4 === 0 ? 'flash-note' : index % 4 === 1 ? 'rollup' : undefined
    });
  }

  accounts.forEach((account) => {
    if (!account.archived) {
      account.amount = amountByAccountId.get(account.id) ?? account.amount;
    }
  });

  const sortedHistory = [...history, ...archivedRecords]
    .slice(0, EXTREME_EXAMPLE_HISTORY_COUNT)
    .sort((left, right) => Date.parse(right.time) - Date.parse(left.time));
  const backupRecords = createExampleBackupRecords(
    EXAMPLE_TEMPLATES.find((template) => template.id === 'advanced') ?? EXAMPLE_TEMPLATES[2]!,
    sortedHistory.length
  );

  return {
    appData: {
      groups,
      accounts,
      history: sortedHistory
    },
    backupRecords,
    lastBackupAt: backupRecords[0]?.backedUpAt ?? '',
    lastBackupHistoryCount: backupRecords[0]?.historyCount ?? sortedHistory.length
  };
};
