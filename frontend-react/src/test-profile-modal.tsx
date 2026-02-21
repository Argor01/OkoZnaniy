import React, { useState } from 'react';
import { Button } from 'antd';
import ProfileModal from './pages/ExpertDashboard/modals/ProfileModal';

const TestProfileModal: React.FC = () => {
  const [visible, setVisible] = useState(false);

  
  const mockUserProfile = {
    id: 1,
    username: 'test_expert',
    email: 'expert@test.com',
    role: 'expert',
    first_name: 'Тест',
    last_name: 'Эксперт',
    bio: 'Тестовое описание',
    experience_years: 5,
    hourly_rate: 1500,
    education: 'МГУ, факультет ВМК',
    skills: 'JavaScript, React, Python',
    portfolio_url: 'https://github.com/test'
  };

  const mockProfile = {
    id: 1,
    username: 'test_expert',
    email: 'expert@test.com',
    role: 'expert',
    first_name: 'Тест',
    last_name: 'Эксперт',
    bio: 'Тестовое описание',
    experience_years: 5,
    hourly_rate: 1500,
    education: 'МГУ, факультет ВМК',
    skills: 'JavaScript, React, Python',
    portfolio_url: 'https://github.com/test',
    phone: '',
    date_joined: '2024-01-01'
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Тест модального окна профиля эксперта</h2>
      <Button type="primary" onClick={() => setVisible(true)}>
        Открыть модальное окно профиля
      </Button>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Данные пользователя:</h3>
        <pre>{JSON.stringify(mockUserProfile, null, 2)}</pre>
      </div>

      <ProfileModal
        visible={visible}
        onClose={() => setVisible(false)}
        profile={mockProfile}
        userProfile={mockUserProfile}
      />
    </div>
  );
};

export default TestProfileModal;