import type { PointerEvent } from 'react';
import bilibiliIcon from '../../assets/Bilibili_tv_a.svg';
import { NfGithubIcon } from '../../assets/icons';
import NfSvgIcon from '../../components/NfSvgIcon';

export type AboutNetraFlowPanelProps = {
  appVersion: string;
  productIconPath: string;
  productNameZh: string;
  productNameEn: string;
  onOpenBilibili: () => void;
  onOpenGithubReleases: () => void;
  onStartVersionLongPress: (event: PointerEvent<HTMLElement>) => void;
  onClearVersionLongPress: () => void;
};

function AboutNetraFlowPanel({
  appVersion,
  productIconPath,
  productNameZh,
  productNameEn,
  onOpenBilibili,
  onOpenGithubReleases,
  onStartVersionLongPress,
  onClearVersionLongPress
}: AboutNetraFlowPanelProps) {
  return (
    <section className="about-netraflow">
      <div className="about-netraflow__summary">
        <img src={productIconPath} alt="净流图标" />
        <div>
          <h2>{productNameZh}</h2>
          <p>{productNameEn}</p>
          <span
            className="about-netraflow__version-trigger"
            onPointerDown={onStartVersionLongPress}
            onPointerUp={onClearVersionLongPress}
            onPointerCancel={onClearVersionLongPress}
            onPointerLeave={onClearVersionLongPress}
            onContextMenu={(event) => event.preventDefault()}
          >
            当前版本：{appVersion}
          </span>
        </div>
      </div>

      <section
        className="about-netraflow__license"
        aria-labelledby="netraflow-license-title"
      >
        <h3 id="netraflow-license-title">开源许可</h3>
        <div className="about-netraflow__font-license">
          <p className="about-netraflow__license-label">字体</p>
          <p>
            NetraFlow 内置使用 Noto Sans CJK SC 与 Noto Sans Symbols 2
            <br />
            Noto Fonts 由 The Noto Project Authors 提供，并依据 SIL Open Font License 1.1
            授权使用
          </p>
        </div>
      </section>

      <section className="about-netraflow__contact" aria-labelledby="netraflow-contact-title">
        <h3 id="netraflow-contact-title">获取信息</h3>
        <div className="about-netraflow__info-links">
          <button
            type="button"
            className="about-netraflow__info-button about-netraflow__info-button--bilibili"
            onClick={onOpenBilibili}
          >
            <img src={bilibiliIcon} alt="" aria-hidden="true" />
            <span>Bilibili</span>
          </button>
          <button
            type="button"
            className="about-netraflow__info-button about-netraflow__info-button--github"
            onClick={onOpenGithubReleases}
          >
            <NfSvgIcon svg={NfGithubIcon} className="about-netraflow__info-icon" decorative />
            <span>GitHub</span>
          </button>
        </div>
      </section>

    </section>
  );
}

export default AboutNetraFlowPanel;
