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
          <UserAddOutlined className="personnelManagementTabIcon" />
          Регистрация сотрудника
        </span>
      ),
      children: <EmployeeRegistration />,
    },
    {
      key: 'applications',
      label: (
        <span>
          <FileTextOutlined className="personnelManagementTabIcon" />
          Анкеты экспертов
        </span>
      ),
      children: <ExpertApplications />,
    },
    {
      key: 'list',
      label: (
        <span>
          <TeamOutlined className="personnelManagementTabIcon" />
          Список сотрудников
        </span>
      ),
      children: <EmployeeList />,
    },
    {
      key: 'archive',
      label: (
        <span>
          <InboxOutlined className="personnelManagementTabIcon" />
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
        className={[
          'personnelManagementCard',
          isMobile ? 'personnelManagementCardMobile' : '',
        ].filter(Boolean).join(' ')}
      >
        <Tabs 
          activeKey={activeTab}
          onChange={handleTabChange}
          defaultActiveKey="list" 
          items={items}
          size={isMobile ? 'middle' : 'large'}
          className={[
            'personnelManagementTabs',
            isMobile ? 'personnelManagementTabsMobile' : '',
          ].filter(Boolean).join(' ')}
        />
      </Card>
    </div>
  );
};

export default PersonnelManagement;
