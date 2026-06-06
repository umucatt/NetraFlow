import { getHistoryTimestamp } from '../../app/dateUtils';
import type { Account, HistoryRecord, HistoryType } from '../../app/types';

type CreateAccountHistoryRecordOptions = {
  id: string;
  type: HistoryType;
  account: Account;
  groupName: string;
  beforeAmount: number | null;
  afterAmount: number | null;
  time: string;
  relatedTime?: string;
  source?: HistoryRecord['source'];
  note?: string;
};

export const createAccountHistoryRecord = ({
  id,
  type,
  account,
  groupName,
  beforeAmount,
  afterAmount,
  time,
  relatedTime,
  source,
  note
}: CreateAccountHistoryRecordOptions): HistoryRecord => ({
  id,
  accountId: account.id,
  type,
  groupName,
  accountName: account.name,
  beforeAmount,
  afterAmount,
  time,
  relatedTime,
  source,
  note
});

export type AccountHistoryGroupSummary = {
  beforeAmount: number | null;
  afterAmount: number | null;
  delta: number;
  displayType: HistoryType;
};

const HISTORY_TYPE_CREATE: HistoryType = '\u65b0\u589e';
const HISTORY_TYPE_MODIFY: HistoryType = '\u4fee\u6539';
const HISTORY_TYPE_RESTORE: HistoryType = '\u91cd\u65b0\u542f\u7528';

const accountFlowHistoryTypes = new Set<HistoryType>([
  HISTORY_TYPE_CREATE,
  HISTORY_TYPE_MODIFY,
  HISTORY_TYPE_RESTORE
]);

const getAccountFlowDisplayType = (
  records: HistoryRecord[],
  fallbackType: HistoryType
): HistoryType => {
  if (records.some((record) => !accountFlowHistoryTypes.has(record.type))) {
    return fallbackType;
  }

  if (records.some((record) => record.type === HISTORY_TYPE_MODIFY)) {
    return HISTORY_TYPE_MODIFY;
  }

  if (records.some((record) => record.type === HISTORY_TYPE_RESTORE)) {
    return HISTORY_TYPE_RESTORE;
  }

  return HISTORY_TYPE_CREATE;
};

export const sortAccountHistoryRecordsByTimeAsc = <TRecord extends HistoryRecord>(
  records: TRecord[]
) =>
  records
    .map((record, index) => ({
      record,
      timestamp: getHistoryTimestamp(record),
      index
    }))
    .sort((left, right) => left.timestamp - right.timestamp || left.index - right.index)
    .map(({ record }) => record);

export const getAccountHistoryGroupSummary = (
  records: HistoryRecord[]
): AccountHistoryGroupSummary | null => {
  const recordsByTimeAsc = sortAccountHistoryRecordsByTimeAsc(records);
  const firstRecord = recordsByTimeAsc[0];
  const lastRecord = recordsByTimeAsc[recordsByTimeAsc.length - 1];

  if (!firstRecord || !lastRecord) {
    return null;
  }

  const beforeAmount = firstRecord.beforeAmount;
  const afterAmount = lastRecord.afterAmount;

  return {
    beforeAmount,
    afterAmount,
    delta: (afterAmount ?? 0) - (beforeAmount ?? 0),
    displayType: getAccountFlowDisplayType(records, lastRecord.type)
  };
};
