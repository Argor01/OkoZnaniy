import React from 'react';
import { DashboardLayout } from '@/features/layout';
import { SupportCenterPanel } from '@/features/support/components/SupportCenterPanel';

const SupportCenterPage: React.FC = () => {
  return (
    <DashboardLayout>
      <SupportCenterPanel />
    </DashboardLayout>
  );
};

export default SupportCenterPage;
