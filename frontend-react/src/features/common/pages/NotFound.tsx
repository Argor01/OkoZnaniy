import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Result } from 'antd';
import styles from '@/features/common/NotFound.module.css';
import SEO from '@/features/common/components/SEO';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.notFoundPage}>
      <SEO
        title="Страница не найдена (404) | Око Знаний"
        description=""
        robots="noindex, nofollow"
      />
      <Result
        status="404"
        title={<span className={styles.notFoundTitle}>404</span>}
        subTitle={<span className={styles.notFoundSubtitle}>Страница не найдена</span>}
        extra={
          <Button
            type="primary"
            size="large"
            onClick={() => navigate('/')}
            className={styles.notFoundButton}
          >
            Вернуться на главную
          </Button>
        }
      />
    </div>
  );
};

export default NotFound;
