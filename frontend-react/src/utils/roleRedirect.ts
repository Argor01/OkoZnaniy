import { ordersApi } from '../api/orders';
import { ROUTES } from './constants';

/**
 * @param role - Роль пользователя
 * @param navigate - Функция навигации из react-router-dom (useNavigate hook)
 */
export const redirectByRole = async (
  role: string, 
  navigate: (to: string) => void
) => {
  if (role === 'director') {
    navigate(ROUTES.admin.directorDashboard);
    return;
  }

  switch (role) {
    case 'client':
      try {
        const ordersData = await ordersApi.getClientOrders();
        const orders = ordersData?.results || ordersData || [];
        if (orders.length > 0) {
          navigate(ROUTES.dashboard);
        } else {
          navigate(ROUTES.createOrder);
        }
      } catch (error) {
        console.error('Error checking client orders:', error);
        navigate(ROUTES.dashboard);
      }
      break;
      
    case 'expert':
      navigate(ROUTES.expert.root);
      break;
      
    case 'partner':
      navigate(ROUTES.partner.root);
      break;
      
    case 'admin':
      navigate(ROUTES.admin.dashboard);
      break;
      
    case 'arbitrator':
      navigate(ROUTES.arbitrator.root);
      break;
      
    default:
      navigate(ROUTES.dashboard);
  }
};

