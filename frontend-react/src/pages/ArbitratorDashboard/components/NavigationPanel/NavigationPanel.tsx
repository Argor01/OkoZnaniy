import React from 'react';
import { Menu } from 'antd';
import {
  BellOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  HourglassOutlined,
} from '@ant-design/icons';

export type NavigationTab = 'new' | 'in_progress' | 'completed' | 'pending_approval';

interface NavigationPanelProps {
  selectedTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  newClaimsCount?: number;
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({
  selectedTab,
  onTabChange,
  newClaimsCount = 0,
}) => {
  const menuItems = [
    {
      key: 'new',
      icon: <BellOutlined />,
      label: (
        <span>
          Новые обращения
          {newClaimsCount > 0 && (
            <span style={{ marginLeft: 8, color: '#1890ff' }}>
              ({newClaimsCount})
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'in_progress',
      icon: <ClockCircleOutlined />,
      label: 'В работе',
    },
    {
      key: 'completed',
      icon: <CheckCircleOutlined />,
      label: 'Завершённые',
    },
    {
      key: 'pending_approval',
      icon: <HourglassOutlined />,
      label: 'Ожидают решения',
    },
  ];

  return (
    <Menu
      mode="inline"
      selectedKeys={[selectedTab]}
      onClick={({ key }) => onTabChange(key as NavigationTab)}
      style={{
        borderRight: 0,
        height: '100%',
      }}
      items={menuItems}
    />
  );
};

export default NavigationPanel;
