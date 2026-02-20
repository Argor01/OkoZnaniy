import { ordersApi } from '../api/orders';

/**
 * Функция для редиректа пользователя в зависимости от его роли
 * @param role - Роль пользователя
 * @param navigate - Функция навигации из react-router-dom (useNavigate hook)
 */
export const redirectByRole = async (
  role: string, 
  navigate: (to: string) => void
) => {
  if (role === 'director') {
    navigate('/admin/directordashboard');
    return;
  }

  switch (role) {
    case 'client':
      // Проверка наличия заказов
      try {
        const ordersData = await ordersApi.getClientOrders();
        const orders = ordersData?.results || ordersData || [];
        if (orders.length > 0) {
          navigate('/dashboard');
        } else {
          navigate('/create-order');
        }
      } catch (error) {
        // В случае ошибки редиректим на dashboard
        console.error('Error checking client orders:', error);
        navigate('/dashboard');
      }
      break;
      
    case 'expert':
      navigate('/expert');
      break;
      
    case 'partner':
      navigate('/partner');
      break;
      
    case 'admin':
      navigate('/admin/dashboard');
      break;
      
    case 'arbitrator':
      navigate('/arbitrator');
      break;
      
    default:
      navigate('/dashboard');
  }
};

