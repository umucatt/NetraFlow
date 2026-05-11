type NfSvgIconProps = {
  svg: string;
  className?: string;
  title?: string;
  ariaLabel?: string;
  decorative?: boolean;
};

export default function NfSvgIcon({
  svg,
  className,
  title,
  ariaLabel,
  decorative = true
}: NfSvgIconProps) {
  const accessibleLabel = ariaLabel ?? title;

  return (
    <span
      className={['nf-svg-icon', className].filter(Boolean).join(' ')}
      title={title}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : accessibleLabel}
      aria-hidden={decorative ? true : undefined}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
