import type {
  FlashAccountGroupOption,
  FlashCell,
  FlashDirection,
  FlashInputMode,
  FlashDateRule,
  FlashSelectionMode,
  FlashStep,
  FlashWriteRow
} from './flashNoteTypes';
import { FlashSelectStep } from './FlashSelectStep';
import { FlashInputStep } from './FlashInputStep';
import { FlashConfirmStep } from './FlashConfirmStep';
import { FlashShortcutHint } from './FlashShortcutHint';

export type FlashNotePageProps = {
  step: FlashStep;
  accountName: string;
  selectedAccountId?: string;
  inputMode: FlashInputMode;
  direction: FlashDirection;
  selectionMode: FlashSelectionMode;
  activeDateRule: FlashDateRule | null;
  disabledDateRules: Record<FlashDateRule, boolean>;
  visibleMonth: Date;
  accountGroups: FlashAccountGroupOption[];
  selectedDates: Set<string>;
  previewDates: Set<string>;
  startDate: string;
  endDate: string;
  inputWeeks: Date[][];
  confirmWeeks: Date[][];
  currentDate: string;
  nextDate: string;
  currentInput: string;
  confirmSelectedDate: string;
  writeRows: FlashWriteRow[];
  showShortcutHint: boolean;
  canStartInput: boolean;
  canWrite: boolean;
  getCell: (dateValue: string) => FlashCell;
  getCalendarDays: (monthDate: Date) => Date[];
  onChooseAccount: (groupName: string, accountId: string) => void;
  onModeChange: (mode: FlashInputMode) => void;
  onSelectionModeChange: (mode: FlashSelectionMode) => void;
  onDateRuleApply: (rule: FlashDateRule) => void;
  onVisibleMonthChange: (monthDate: Date) => void;
  onDatePointerDown: (dateValue: string) => void;
  onDatePointerEnter: (dateValue: string) => void;
  onDatePointerUp: (dateValue: string) => void;
  onClose: () => void;
  onBackToSelect: () => void;
  onStartInput: () => void;
  onGoToConfirm: () => void;
  onBackToInput: () => void;
  onConfirmWrite: () => void;
  onSelectConfirmDate: (dateValue: string) => void;
  onCloseShortcutHint: () => void;
};

const stageLabels: Record<FlashStep, string> = {
  select: '选择',
  input: '输入',
  confirm: '确认',
  completed: '完成写入'
};

const stageOrder: FlashStep[] = ['select', 'input', 'confirm', 'completed'];

export function FlashNotePage({
  step,
  accountName,
  selectedAccountId,
  inputMode,
  direction,
  selectionMode,
  activeDateRule,
  disabledDateRules,
  visibleMonth,
  accountGroups,
  selectedDates,
  previewDates,
  startDate,
  endDate,
  inputWeeks,
  confirmWeeks,
  currentDate,
  nextDate,
  currentInput,
  confirmSelectedDate,
  writeRows,
  showShortcutHint,
  canStartInput,
  canWrite,
  getCell,
  getCalendarDays,
  onChooseAccount,
  onModeChange,
  onSelectionModeChange,
  onDateRuleApply,
  onVisibleMonthChange,
  onDatePointerDown,
  onDatePointerEnter,
  onDatePointerUp,
  onStartInput,
  onGoToConfirm,
  onConfirmWrite,
  onSelectConfirmDate,
  onCloseShortcutHint
}: FlashNotePageProps) {
  const currentIndex = stageOrder.indexOf(step);

  const renderStageRail = () => (
    <ol className="flash-note-stage-rail" aria-label="闪记阶段">
      {stageOrder.map((stage, index) => (
        <li
          key={stage}
          className={[
            'flash-note-stage-pill',
            index === currentIndex ? 'is-current' : '',
            index < currentIndex ? 'is-done' : ''
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {stageLabels[stage]}
        </li>
      ))}
    </ol>
  );

  const renderContent = () => {
    if (step === 'select') {
      return (
        <FlashSelectStep
          accountGroups={accountGroups}
          selectedAccountId={selectedAccountId}
          inputMode={inputMode}
          selectionMode={selectionMode}
          activeDateRule={activeDateRule}
          disabledDateRules={disabledDateRules}
          visibleMonth={visibleMonth}
          selectedDates={selectedDates}
          previewDates={previewDates}
          startDate={startDate}
          endDate={endDate}
          getCell={getCell}
          getCalendarDays={getCalendarDays}
          onChooseAccount={onChooseAccount}
          onModeChange={onModeChange}
          onSelectionModeChange={onSelectionModeChange}
          onDateRuleApply={onDateRuleApply}
          onVisibleMonthChange={onVisibleMonthChange}
          onDatePointerDown={onDatePointerDown}
          onDatePointerEnter={onDatePointerEnter}
          onDatePointerUp={onDatePointerUp}
        />
      );
    }

    if (step === 'input') {
      return (
        <FlashInputStep
          weeks={inputWeeks}
          getCell={getCell}
          currentDate={currentDate}
          nextDate={nextDate}
          currentInput={currentInput}
        />
      );
    }

    if (step === 'confirm') {
      return (
        <FlashConfirmStep
          weeks={confirmWeeks}
          getCell={getCell}
          selectedDate={confirmSelectedDate}
          onSelectDate={onSelectConfirmDate}
        />
      );
    }

    return null;
  };

  const renderStatus = () => {
    if (step === 'select') {
      return (
        <div className="flash-note-status">
          <span>{direction === 'forward' ? '正向输入' : '反向输入'}</span>
          <span>已选取 {selectedDates.size}天</span>
          {endDate ? <span>已选择终点</span> : null}
        </div>
      );
    }

    if (step === 'input') {
      return (
        <div className="flash-note-status">
          <span>当前 {currentDate || '--'}</span>
          <span>已输入 {writeRows.length}</span>
        </div>
      );
    }

    return <div className="flash-note-status" />;
  };

  const renderActions = () => {
    if (step === 'select') {
      return (
        <button
          type="button"
          className="flash-note-primary"
          disabled={!canStartInput}
          onClick={onStartInput}
        >
          开始输入
        </button>
      );
    }

    if (step === 'input') {
      return (
        <button type="button" className="flash-note-primary" onClick={onGoToConfirm}>
          进入确认
        </button>
      );
    }

    if (step === 'confirm') {
      return (
        <button
          type="button"
          className="flash-note-primary"
          disabled={!canWrite}
          onClick={onConfirmWrite}
        >
          完成写入
        </button>
      );
    }

    return null;
  };

  const hintText =
    step === 'input'
      ? 'Enter 下一格 · Backspace 删除一位 · Ctrl+Z 清空并回退'
      : '点击数据块修改 · Enter 下一项 · Delete 清空';

  return (
    <section className={`flash-note-page flash-note-page--${step}`}>
      <header className="flash-note-header">
        <div>
          <h1>闪记</h1>
        </div>
        <div className="flash-note-header__meta">
          <span>{accountName || '未选择账户'}</span>
          <span>{inputMode === 'change' ? '净值变动' : '账户余额'}</span>
        </div>
        {renderStageRail()}
      </header>

      <div className="flash-note-content-stack">
        <main className="flash-note-main">{renderContent()}</main>
        {showShortcutHint && (step === 'input' || step === 'confirm') ? (
          <div className="flash-note-inline-hint-zone">
            <FlashShortcutHint text={hintText} onClose={onCloseShortcutHint} />
          </div>
        ) : null}
      </div>

      <footer className={`flash-note-footer flash-note-footer--${step}`}>
        <div className="flash-note-footer__info">
          {renderStatus()}
        </div>
        <div className="flash-note-actions">{renderActions()}</div>
      </footer>
    </section>
  );
}
