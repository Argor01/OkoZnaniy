import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '@/features/auth/api/auth';
import { redirectByRole } from '@/utils/roleRedirect';
import { ROUTES } from '@/utils/constants';

const GoogleCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    let cancelled = false;

    if (error || !code) {
      navigate(`${ROUTES.login}?error=${error ? 'oauth_failed' : 'missing_code'}`, { replace: true });
      return;
    }

    (async () => {
      try {
        const { access, refresh } = await authApi.exchangeOAuthCode(code);
        if (cancelled) return;
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        // Remove the one-time code from browser history immediately.
        window.history.replaceState({}, document.title, '/google-callback');
        const me = await authApi.getCurrentUser();
        if (cancelled) return;
        localStorage.setItem('user', JSON.stringify(me));
        await redirectByRole(me?.role ?? '', (to) => navigate(to, { replace: true }));
      } catch (_e) {
        if (!cancelled) navigate(`${ROUTES.login}?error=oauth_exchange_failed`, { replace: true });
      }
    })();

    return () => { cancelled = true; };
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
