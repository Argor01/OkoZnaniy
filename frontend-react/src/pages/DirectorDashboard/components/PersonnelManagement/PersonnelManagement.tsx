import React from 'react';
import { Card, Tabs, Typography, Alert } from 'antd';
import { TeamOutlined, UserAddOutlined, FileTextOutlined, InboxOutlined, ExperimentOutlined } from '@ant-design/icons';
import EmployeeRegistration from './EmployeeRegistration';
import ExpertApplications from './ExpertApplications';
import EmployeeList from './EmployeeList';
import EmployeeArchive from './EmployeeArchive';

const { Title } = Typography;

const PersonnelManagement: React.FC = () => {
  const items = [
    {
      key: 'registration',
      label: (
        <span>
          <UserAddOutlined />
          Регистрация сотрудника
        </span>
      ),
      children: <EmployeeRegistration />,
    },
    {
      key: 'applications',
      label: (
        <span>
          <FileTextOutlined />
          Анкеты экспертов
        </span>
      ),
      children: <ExpertApplications />,
    },
    {
      key: 'list',
      label: (
        <span>
          <TeamOutlined />
          Список сотрудников
        </span>
      ),
      children: <EmployeeList />,
    },
    {
      key: 'archive',
      label: (
        <span>
          <InboxOutlined />
          Архив
        </span>
      ),
      children: <EmployeeArchive />,
    },
  ];

  return (
    <div>
      <Title level={3}>Управление персоналом</Title>
      <Alert
        message="Режим тестовых данных"
        description="В данный момент используется режим тестовых данных. Все операции выполняются локально для демонстрации функционала."
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

export default PersonnelManagement;
