import React from 'react';
import { Card, Tabs } from 'antd';
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
          <DollarOutlined className="financialStatisticsTabIcon" />
          Общий оборот
        </span>
      ),
      children: <MonthlyTurnover />,
    },
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
        <Tabs defaultActiveKey="turnover" items={items} />
      </Card>
    </div>
  );
};

export default FinancialStatistics;
