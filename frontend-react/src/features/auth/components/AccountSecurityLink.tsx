import React from 'react';
import { Button, Tooltip } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
export default function AccountSecurityLink() {
  const navigate = useNavigate();
  return <Tooltip title="Пароль и безопасность"><Button type="text" aria-label="Пароль и безопасность"
    icon={<LockOutlined />} style={{ minWidth: 44, minHeight: 44, color: 'inherit', flexShrink: 0 }}
    onClick={() => navigate('/account/security')} /></Tooltip>;
}
