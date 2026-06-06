import type { SearchLogicMode } from '../../search/searchTypes';
import { SettingsSegmentedControl } from './SettingsSectionFrame';

export type SearchSettingsPanelProps = {
  searchLogicMode: SearchLogicMode;
  onSearchLogicModeChange: (value: SearchLogicMode) => void;
};

function SearchSettingsPanel({
  searchLogicMode,
  onSearchLogicModeChange
}: SearchSettingsPanelProps) {
  return (
    <SettingsSegmentedControl
      id="global-settings-search-logic"
      label="允许推断"
      options={[
        { value: 'infer', label: '开启' },
        { value: 'strict', label: '关闭' }
      ]}
      currentValue={searchLogicMode}
      note={
        <>
          开启：包含拼音、首字母、错字与近似金额等推断匹配
          <br />
          关闭：只显示能在字段中直接对应的命中结果
        </>
      }
      onChange={(value) => onSearchLogicModeChange(value as SearchLogicMode)}
      statusLabel={null}
    />
  );
}

export default SearchSettingsPanel;
