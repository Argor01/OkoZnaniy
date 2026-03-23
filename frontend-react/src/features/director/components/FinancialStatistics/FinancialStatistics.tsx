import React from 'react';
import { Card, Tabs } from 'antd';
import { LineChartOutlined, FileTextOutlined } from '@ant-design/icons';
import NetProfit from './NetProfit';
import IncomeExpenseDetail from './IncomeExpenseDetail';

const FinancialStatistics: React.FC = () => {
  const items = [
    {
      key: 'profit',
      label: (
        <span>
          <LineChartOutlined className="financialStatisticsTabIcon" />
          Чистая прибыль
        </span>
      ),
      children: <NetProfit />,
    },
    {
      key: 'detail',
      label: (
        <span>
          <FileTextOutlined className="financialStatisticsTabIcon" />
          Доходы и расходы
        </span>
      ),
      children: <IncomeExpenseDetail />,
    },
  ];

  return (
    <div>
      <Card>
        <Tabs defaultActiveKey="profit" items={items} />
      </Card>
    </div>
  );
};

export default FinancialStatistics;
