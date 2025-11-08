import React from 'react';
import { Card, Tabs, Typography, Alert } from 'antd';
import { DollarOutlined, LineChartOutlined, FileTextOutlined, ExperimentOutlined } from '@ant-design/icons';
import MonthlyTurnover from './MonthlyTurnover';
import NetProfit from './NetProfit';
import IncomeExpenseDetail from './IncomeExpenseDetail';

const { Title } = Typography;

const FinancialStatistics: React.FC = () => {
  const items = [
    {
      key: 'turnover',
      label: (
        <span>
          <DollarOutlined />
          Общий оборот
        </span>
      ),
      children: <MonthlyTurnover />,
    },
    {
      key: 'profit',
      label: (
        <span>
          <LineChartOutlined />
          Чистая прибыль
        </span>
      ),
      children: <NetProfit />,
    },
    {
      key: 'detail',
      label: (
        <span>
          <FileTextOutlined />
          Доходы и расходы
        </span>
      ),
      children: <IncomeExpenseDetail />,
    },
  ];

  return (
    <div>
      <Title level={3}>Финансовая статистика</Title>
      <Alert
        message="Режим тестовых данных"
        description="В данный момент используется режим тестовых данных. Финансовые показатели генерируются динамически для демонстрации функционала."
        type="info"
        icon={<ExperimentOutlined />}
        showIcon
        style={{ marginBottom: 16 }}
        closable
      />
      <Card>
        <Tabs defaultActiveKey="turnover" items={items} />
      </Card>
    </div>
  );
};

export default FinancialStatistics;
