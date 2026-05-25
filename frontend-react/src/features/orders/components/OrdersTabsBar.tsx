import React from 'react';
import styles from '@/features/orders/pages/MyWorks/MyWorks.module.css';

export interface OrdersTabItem<T extends string> {
  key: T;
  label: string;
  shortLabel?: string;
  count: number;
  countTone?: 'green' | 'orange' | 'gray';
}

interface OrdersTabsBarProps<T extends string> {
  tabs: OrdersTabItem<T>[];
  activeTab: T;
  isMobile: boolean;
  onTabChange: (tab: T) => void;
}

const toneClassMap = {
  green: styles.countGreen,
  orange: styles.countOrange,
  gray: styles.countGray,
} as const;

export function OrdersTabsBar<T extends string>({
  tabs,
  activeTab,
  isMobile,
  onTabChange,
}: OrdersTabsBarProps<T>) {
  return (
    <div className={styles.tabsRow}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`${styles.tabButton} ${activeTab === tab.key ? styles.tabActive : ''}`}
          onClick={() => onTabChange(tab.key)}
          title={isMobile ? tab.label : undefined}
        >
          {tab.label}
          <span className={`${styles.countBadge} ${toneClassMap[tab.countTone ?? 'gray']}`}>
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}
