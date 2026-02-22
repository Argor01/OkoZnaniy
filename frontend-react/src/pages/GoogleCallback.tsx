import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { redirectByRole } from '../utils/roleRedirect';
import { ROUTES } from '../utils/constants';

const GoogleCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const access = searchParams.get('access');
    const refresh = searchParams.get('refresh');
    const error = searchParams.get('error');

    if (error) {
      navigate(`${ROUTES.login}?error=google_auth_failed`, { replace: true });
      return;
    }

    if (access && refresh) {
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);

      let cancelled = false;

      (async () => {
        try {
          const me = await authApi.getCurrentUser();
          if (cancelled) return;
          localStorage.setItem('user', JSON.stringify(me));
          await redirectByRole(me?.role ?? '', (to) => navigate(to, { replace: true }));
        } catch (_e) {
          if (!cancelled) navigate(`${ROUTES.login}?error=me_failed`, { replace: true });
        }
      })();

      return () => {
        cancelled = true;
      };
    } else {
      navigate(`${ROUTES.login}?error=missing_params`, { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="centeredColumnFullHeight">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <p>Завершаем авторизацию через Google...</p>
    </div>
  );
};

export default GoogleCallback;
