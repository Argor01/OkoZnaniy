import React from 'react';
import { Card, Tabs } from 'antd';
import { UserAddOutlined, DollarOutlined } from '@ant-design/icons';
import PartnerList from './PartnerList';
import PartnerTurnover from './PartnerTurnover';

const PartnerPanel: React.FC = () => {
  const isMobile = window.innerWidth <= 840;
  
  const items = [
    {
      key: 'list',
      label: (
        <span>
          <UserAddOutlined className="partnerPanelTabIcon" />
          Список партнёров
        </span>
      ),
      children: <PartnerList />,
    },
    {
      key: 'turnover',
      label: (
        <span>
          <DollarOutlined className="partnerPanelTabIcon" />
          Оборот по партнёрам
        </span>
      ),
      children: <PartnerTurnover />,
    },
  ];

  return (
    <div>
      <Card
        className={[
          'partnerPanelCard',
          isMobile ? 'partnerPanelCardMobile' : '',
        ].filter(Boolean).join(' ')}
      >
        <Tabs 
          defaultActiveKey="list" 
          items={items}
          size={isMobile ? 'middle' : 'large'}
          className={[
            'partnerPanelTabs',
            isMobile ? 'partnerPanelTabsMobile' : '',
          ].filter(Boolean).join(' ')}
        />
      </Card>
    </div>
  );
};

export default PartnerPanel;
