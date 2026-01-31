import React from 'react';
import { Card, Tabs, Alert } from 'antd';
import { DollarOutlined, LineChartOutlined, FileTextOutlined } from '@ant-design/icons';
import MonthlyTurnover from './MonthlyTurnover';
import NetProfit from './NetProfit';
import IncomeExpenseDetail from './IncomeExpenseDetail';

const FinancialStatistics: React.FC = () => {
  const items = [
    {
      key: 'turnover',
      label: (
        <span>
          <DollarOutlined style={{ marginRight: 8 }} />
          Общий оборот
        </span>
      ),
      children: <MonthlyTurnover />,
    },
    {
      key: 'profit',
      label: (
        <span>
          <LineChartOutlined style={{ marginRight: 8 }} />
          Чистая прибыль
        </span>
      ),
      children: <NetProfit />,
    },
    {
      key: 'detail',
      label: (
        <span>
          <FileTextOutlined style={{ marginRight: 8 }} />
          Доходы и расходы
        </span>
      ),
      children: <IncomeExpenseDetail />,
    },
  ];

  return (
    <div>
      <Card>
        <Tabs defaultActiveKey="turnover" items={items} />
      </Card>
    </div>
  );
};

export default FinancialStatistics;
