import type { FC, ReactNode } from 'react';
import { Typography } from 'antd';
import styles from './SectionHeader.module.css';

const { Text } = Typography;

interface SectionHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
}

const SectionHeader: FC<SectionHeaderProps> = ({ title, subtitle }) => {
  return (
    <div className={styles.container}>
      <Text className={styles.title}>{title}</Text>
      {subtitle ? (
        <Text type="secondary" className={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </div>
  );
};

export default SectionHeader;
