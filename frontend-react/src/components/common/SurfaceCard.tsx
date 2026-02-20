import type { CSSProperties, FC, ReactNode } from 'react';
import { Card } from 'antd';
import type { CardProps } from 'antd';
import { BORDER_RADIUS, BOX_SHADOW, SPACING } from '../../config/ui';

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
  style,
  styles,
  ...props
}) => {
  const borderRadius = typeof radius === 'number' ? radius : BORDER_RADIUS[radius];
  const boxShadow = shadow ? BOX_SHADOW[shadow] : undefined;

  const mergedStyle: CSSProperties = {
    borderRadius,
    boxShadow,
    ...style,
  };

  const mergedStyles: CardProps['styles'] = {
    ...styles,
    body: {
      padding: bodyPadding,
      ...(styles?.body as CSSProperties | undefined),
    },
  };

  return <Card style={mergedStyle} styles={mergedStyles} {...props} />;
};

export default SurfaceCard;
