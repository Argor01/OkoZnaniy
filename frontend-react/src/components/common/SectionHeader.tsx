import type { CSSProperties, FC, ReactNode } from 'react';
import { Typography } from 'antd';
import { COLORS } from '../../config/ui';

const { Text } = Typography;

interface SectionHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  style?: CSSProperties;
  titleStyle?: CSSProperties;
  subtitleStyle?: CSSProperties;
}

const SectionHeader: FC<SectionHeaderProps> = ({ title, subtitle, style, titleStyle, subtitleStyle }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      <Text style={{ fontSize: 18, fontWeight: 600, color: COLORS.text.primary, ...titleStyle }}>{title}</Text>
      {subtitle ? (
        <Text type="secondary" style={{ fontSize: 12, ...subtitleStyle }}>
          {subtitle}
        </Text>
      ) : null}
    </div>
  );
};

export default SectionHeader;
