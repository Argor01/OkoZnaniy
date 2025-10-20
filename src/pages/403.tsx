import React from 'react';
import { Result, Button } from 'antd';
import { useRouter } from 'next/router';

const ForbiddenPage: React.FC = () => {
  const router = useRouter();

  return (
    <Result
      status="403"
      title="403"
      subTitle="Извините, у вас нет доступа к этой странице"
      extra={
        <Button type="primary" onClick={() => router.push('/')}>
          Вернуться на главную
        </Button>
      }
    />
  );
};

export default ForbiddenPage; 