import type { CSSProperties } from 'react';

import type { RollupPromptTab } from './rollupImportTypes';

type RollupPromptPanelProps = {
  promptTab: RollupPromptTab;
  promptExplanation: string;
  promptContent: string;
  onPromptTabChange: (tab: RollupPromptTab) => void;
};

const segmentedControlStyle = {
  '--segmented-option-count': 2
} as CSSProperties;

function RollupPromptPanel({
  promptTab,
  promptExplanation,
  promptContent,
  onPromptTabChange
}: RollupPromptPanelProps) {
  return (
    <div className="rollup-import-prompt-panel">
      <div className="rollup-import-copy">
        <p>
          提示词解释：面向使用者的说明，帮助你了解如何准备材料与使用外部工具
        </p>
        <p>
          提示词：面向外部 AI 的任务说明，用于生成 NetraFlow 可导入的汇总 JSON
        </p>
      </div>

      <div
        className="segmented-control right-panel-segmented rollup-import-segmented"
        style={segmentedControlStyle}
        aria-label="提示词内容切换"
      >
        {[
          { value: 'explanation' as const, label: '提示词解释' },
          { value: 'prompt' as const, label: '提示词' }
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            className={promptTab === item.value ? 'is-selected' : undefined}
            onClick={() => onPromptTabChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <pre className="rollup-import-display rollup-prompt-display" tabIndex={0}>
        {promptTab === 'explanation' ? promptExplanation : promptContent}
      </pre>
    </div>
  );
}

export default RollupPromptPanel;
