import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Result } from 'antd';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="notFoundPage">
      <Result
        status="404"
        title={<span className="notFoundTitle">404</span>}
        subTitle={<span className="notFoundSubtitle">Страница не найдена</span>}
        extra={
          <Button
            type="primary"
            size="large"
            onClick={() => navigate('/')}
            className="notFoundButton"
          >
            Вернуться на главную
          </Button>
        }
      />
    </div>
  );
};

export default NotFound;
