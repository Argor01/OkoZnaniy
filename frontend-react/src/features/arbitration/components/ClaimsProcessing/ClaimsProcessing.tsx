import React, { useState } from 'react';
import { Tabs, Card } from 'antd';
import {
  DollarOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import RefundRequests from './RefundRequests';
import CancelledOrders from './CancelledOrders';

type ClaimsProcessingTab = 'refund' | 'cancelled';

const ClaimsProcessing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ClaimsProcessingTab>('refund');

  const tabItems = [
    {
      key: 'refund',
      label: (
        <span>
          <DollarOutlined /> Заявки на возврат средств
        </span>
      ),
      children: <RefundRequests />,
    },
    {
      key: 'cancelled',
      label: (
        <span>
          <CloseCircleOutlined /> Отменённые обращения
        </span>
      ),
      children: <CancelledOrders />,
    },
  ];

  return (
    <Card>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as ClaimsProcessingTab)}
        items={tabItems}
        size="large"
      />
    </Card>
  );
};

export default ClaimsProcessing;
