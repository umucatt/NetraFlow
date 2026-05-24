import RightPanelActionButton from '../../components/rightPanel/RightPanelActionButton';

type RollupImportDropzoneProps = {
  inputValue: string;
  error: string;
  onInputChange: (value: string) => void;
  onImportText: () => void;
  onSelectFile: () => void;
};

function RollupImportDropzone({
  inputValue,
  error,
  onInputChange,
  onImportText,
  onSelectFile
}: RollupImportDropzoneProps) {
  return (
    <>
      <section className="right-panel-subsection rollup-import-side-section">
        <h2>导入功能区</h2>
        <RightPanelActionButton label="选择汇总文件" onClick={onSelectFile} />
        <label className="right-panel-label">
          粘贴汇总 JSON
          <textarea
            className="rollup-import-textarea"
            value={inputValue}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="在这里粘贴 netraflow_rollup JSON"
          />
        </label>
        <button
          type="button"
          className="right-panel-primary-button"
          disabled={!inputValue.trim()}
          onClick={onImportText}
        >
          导入粘贴内容
        </button>
        {error ? <p className="rollup-import-error">{error}</p> : null}
      </section>

      <article className="right-panel-preview rollup-import-risk-note">
        <p>NetraFlow 不内置 AI 或识别模型，也不会连接外部平台</p>
        <p>导入时仅检查汇总文件的格式、字段和本地规则问题，无法验证外部整理结果是否准确</p>
        <p>请确认后再导入</p>
      </article>
    </>
  );
}

export default RollupImportDropzone;
