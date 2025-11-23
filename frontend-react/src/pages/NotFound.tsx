import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Result } from 'antd';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Result
        status="404"
        title={<span style={{ color: '#fff', fontSize: '72px', fontWeight: 'bold' }}>404</span>}
        subTitle={<span style={{ color: '#fff', fontSize: '20px' }}>Страница не найдена</span>}
        extra={
          <Button 
            type="primary" 
            size="large"
            onClick={() => navigate('/')}
            style={{ 
              background: '#fff',
              color: '#667eea',
              border: 'none',
              height: '48px',
              fontSize: '16px',
              fontWeight: '500',
              borderRadius: '8px',
              padding: '0 32px'
            }}
          >
            Вернуться на главную
          </Button>
        }
      />
    </div>
  );
};

export default NotFound;
