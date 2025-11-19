import React from 'react';
import { Card, Tabs, Alert } from 'antd';
import { UserAddOutlined, DollarOutlined, ExperimentOutlined } from '@ant-design/icons';
import PartnerList from './PartnerList';
import PartnerTurnover from './PartnerTurnover';

const PartnerPanel: React.FC = () => {
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
        style={{ marginBottom: 16 }}
        closable
      />
      <Card>
        <Tabs defaultActiveKey="list" items={items} />
      </Card>
    </div>
  );
};

export default PartnerPanel;
