import NetraFlowLogoSvg from '../../assets/brand/netraflow-logo.svg?raw';
import NfSvgIcon from '../../components/NfSvgIcon';

type NetraFlowLogoProps = {
  className?: string;
  decorative?: boolean;
  ariaLabel?: string;
};

export default function NetraFlowLogo({
  className,
  decorative = true,
  ariaLabel = 'NetraFlow'
}: NetraFlowLogoProps) {
  return (
    <NfSvgIcon
      svg={NetraFlowLogoSvg}
      className={['netraflow-logo', className].filter(Boolean).join(' ')}
      decorative={decorative}
      ariaLabel={decorative ? undefined : ariaLabel}
    />
  );
}
