import { ordersApi } from '../api/orders';

/**
 * Функция для редиректа пользователя в зависимости от его роли
 * @param role - Роль пользователя
 * @param navigate - Функция навигации из react-router-dom (useNavigate hook)
 * @param userEmail - Email пользователя (опционально, для определения директора)
 */
export const redirectByRole = async (
  role: string, 
  navigate: (to: string) => void,
  userEmail?: string
) => {
  // Проверка: если роль admin и email director@test.com, то это директор
  const isDirector = role === 'admin' && userEmail === 'director@test.com';
  
  if (isDirector) {
    navigate('/director');
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
      navigate('/administrator');
      break;
      
    case 'arbitrator':
      navigate('/arbitrator');
      break;
      
    case 'director':
      // Директор имеет отдельную страницу
      navigate('/director');
      break;
      
    default:
      navigate('/dashboard');
  }
};

