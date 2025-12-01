import React from 'react';
import { Card, Tabs, Alert } from 'antd';
import { UserAddOutlined, DollarOutlined, ExperimentOutlined } from '@ant-design/icons';
import PartnerList from './PartnerList';
import PartnerTurnover from './PartnerTurnover';

const PartnerPanel: React.FC = () => {
  const isMobile = window.innerWidth <= 840;
  
  const items = [
    {
      key: 'list',
      label: (
        <span>
          <UserAddOutlined style={{ marginRight: 8 }} />
          Список партнёров
        </span>
      ),
      children: <PartnerList />,
    },
    {
      key: 'turnover',
      label: (
        <span>
          <DollarOutlined style={{ marginRight: 8 }} />
          Оборот по партнёрам
        </span>
      ),
      children: <PartnerTurnover />,
    },
  ];

  return (
    <div>
      <Alert
        message="Режим тестовых данных"
        description="В данный момент используется режим тестовых данных. Все операции с партнёрами выполняются локально для демонстрации функционала."
        type="info"
        icon={<ExperimentOutlined />}
        showIcon
        style={{ 
          marginBottom: 16,
          borderRadius: isMobile ? 8 : 12
        }}
        closable
      />
      <Card style={{ 
        borderRadius: isMobile ? 8 : 12
      }}>
        <Tabs 
          defaultActiveKey="list" 
          items={items}
          size={isMobile ? 'middle' : 'large'}
          tabBarStyle={{
            fontSize: isMobile ? 14 : 16,
            fontWeight: 500
          }}
        />
      </Card>
    </div>
  );
};

export default PartnerPanel;
