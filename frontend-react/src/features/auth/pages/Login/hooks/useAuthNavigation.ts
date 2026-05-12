import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';

export function useAuthNavigation() {
  const navigate = useNavigate();
  const location = window.location;

  const isAdminLogin = location.pathname === ROUTES.admin.login;
  const isDirectorLogin = location.pathname === ROUTES.admin.directorLogin;

  const navigateByRole = useCallback((role?: string) => {
    if (isAdminLogin) {
      navigate(role === 'admin' ? ROUTES.admin.dashboard : ROUTES.expert.root);
      return;
    }
    if (isDirectorLogin) {
      navigate(role === 'director' ? ROUTES.admin.directorDashboard : ROUTES.expert.root);
      return;
    }
    switch (role) {
      case 'client':
      case 'expert':
        navigate(ROUTES.expert.root);
        break;
      case 'partner':
        navigate(ROUTES.partner.root);
        break;
      case 'admin':
        navigate(ROUTES.admin.dashboard);
        break;
      case 'director':
        navigate(ROUTES.admin.directorDashboard);
        break;
      case 'arbitrator':
        navigate(ROUTES.arbitrator.root);
        break;
      default:
        navigate(ROUTES.expert.root);
    }
  }, [navigate, isAdminLogin, isDirectorLogin]);

  return { navigate, isAdminLogin, isDirectorLogin, navigateByRole };
}
