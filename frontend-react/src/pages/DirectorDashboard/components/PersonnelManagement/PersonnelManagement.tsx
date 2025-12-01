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
          <UserAddOutlined style={{ marginRight: 8 }} />
          Регистрация сотрудника
        </span>
      ),
      children: <EmployeeRegistration />,
    },
    {
      key: 'applications',
      label: (
        <span>
          <FileTextOutlined style={{ marginRight: 8 }} />
          Анкеты экспертов
        </span>
      ),
      children: <ExpertApplications />,
    },
    {
      key: 'list',
      label: (
        <span>
          <TeamOutlined style={{ marginRight: 8 }} />
          Список сотрудников
        </span>
      ),
      children: <EmployeeList />,
    },
    {
      key: 'archive',
      label: (
        <span>
          <InboxOutlined style={{ marginRight: 8 }} />
          Архив
        </span>
      ),
      children: <EmployeeArchive />,
    },
  ];

  const isMobile = window.innerWidth <= 840;

  return (
    <div>
      <Alert
        message="Режим тестовых данных"
        description="В данный момент используется режим тестовых данных. Все операции выполняются локально для демонстрации функционала."
        type="info"
        icon={<ExperimentOutlined />}
        showIcon
        style={{ 
          marginBottom: 16,
          borderRadius: isMobile ? 8 : 12,
          border: '1px solid #91d5ff',
          background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
        }}
        closable
      />
      <Card
        style={{
          borderRadius: isMobile ? 8 : 16,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          border: '1px solid #f0f0f0',
        }}
      >
        <Tabs 
          defaultActiveKey="list" 
          items={items}
          size={isMobile ? 'middle' : 'large'}
          style={{ 
            fontSize: isMobile ? '14px' : '16px'
          }}
          tabBarStyle={{
            fontSize: isMobile ? '14px' : '16px',
            fontWeight: 500,
            marginBottom: isMobile ? 16 : 24,
          }}
        />
      </Card>
    </div>
  );
};

export default PersonnelManagement;
