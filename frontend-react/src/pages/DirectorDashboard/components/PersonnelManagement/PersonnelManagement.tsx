import React, { useState } from 'react';
import { Card, Tabs, Typography } from 'antd';
import { TeamOutlined, UserAddOutlined, FileTextOutlined, InboxOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import EmployeeRegistration from './EmployeeRegistration';
import ExpertApplications from './ExpertApplications';
import EmployeeList from './EmployeeList';
import EmployeeArchive from './EmployeeArchive';

const { Title } = Typography;

const PersonnelManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('list');
  const queryClient = useQueryClient();

  
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    
    
    if (key === 'list') {
      queryClient.invalidateQueries({ queryKey: ['director-personnel'] });
    } else if (key === 'applications') {
      queryClient.invalidateQueries({ queryKey: ['director-expert-applications'] });
    } else if (key === 'archive') {
      queryClient.invalidateQueries({ queryKey: ['director-personnel-archive'] });
    }
  };

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
      <Card
        style={{
          borderRadius: isMobile ? 8 : 16,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          border: '1px solid #f0f0f0',
        }}
      >
        <Tabs 
          activeKey={activeTab}
          onChange={handleTabChange}
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
