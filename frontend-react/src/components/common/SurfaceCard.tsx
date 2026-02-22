import type { FC, ReactNode } from 'react';
import { Card } from 'antd';
import type { CardProps } from 'antd';
import { BORDER_RADIUS, BOX_SHADOW, SPACING } from '../../config/ui';
import styles from './SurfaceCard.module.css';

type ShadowKey = keyof typeof BOX_SHADOW;
type RadiusKey = keyof typeof BORDER_RADIUS;

interface SurfaceCardProps extends CardProps {
  bodyPadding?: number;
  radius?: RadiusKey | number;
  shadow?: ShadowKey | false;
  title?: ReactNode;
}

const SurfaceCard: FC<SurfaceCardProps> = ({
  bodyPadding = SPACING.lg,
  radius = 'md',
  shadow = 'sm',
  className,
  ...props
}) => {
  const radiusClass =
    typeof radius === 'number'
      ? styles.radiusMd
      : radius === 'sm'
        ? styles.radiusSm
        : radius === 'lg'
          ? styles.radiusLg
          : radius === 'xl'
            ? styles.radiusXl
            : radius === 'round'
              ? styles.radiusRound
              : styles.radiusMd;

  const shadowClass =
    shadow === false
      ? styles.shadowNone
      : shadow === 'md'
        ? styles.shadowMd
        : shadow === 'lg'
          ? styles.shadowLg
          : shadow === 'xl'
            ? styles.shadowXl
            : styles.shadowSm;

  const bodyPaddingClass =
    bodyPadding === SPACING.xs
      ? styles.bodyPaddingXs
      : bodyPadding === SPACING.sm
        ? styles.bodyPaddingSm
        : bodyPadding === SPACING.md
          ? styles.bodyPaddingMd
          : bodyPadding === SPACING.xl
            ? styles.bodyPaddingXl
            : bodyPadding === SPACING.xxl
              ? styles.bodyPaddingXxl
              : styles.bodyPaddingLg;

  const mergedClassName = [
    styles.surfaceCard,
    radiusClass,
    shadowClass,
    bodyPaddingClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <Card className={mergedClassName} {...props} />;
};

export default SurfaceCard;
