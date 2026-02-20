from rest_framework import permissions


class CanCreateExpertRating(permissions.BasePermission):
    """
    Разрешение на создание рейтинга эксперта.
    Только клиент завершенного заказа может оставить отзыв.
    """
    
    def has_permission(self, request, view):
        # Разрешаем GET запросы всем авторизованным
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        # Для POST проверяем дополнительные условия
        if request.method == 'POST':
            if not request.user or not request.user.is_authenticated:
                return False
            
            # Проверяем наличие order_id
            order_id = request.data.get('order')
            if not order_id:
                return False
            
            # Импортируем здесь, чтобы избежать циклических импортов
            from apps.orders.models import Order
            
            try:
                order = Order.objects.get(id=order_id)
                
                # Проверяем, что пользователь - клиент заказа
                if order.client != request.user:
                    return False
                
                # Проверяем, что заказ завершен
                if order.status != 'completed':
                    return False
                
                # Проверяем, что у заказа есть эксперт
                if not order.expert:
                    return False
                
                return True
                
            except Order.DoesNotExist:
                return False
        
        return True


class IsRatingOwnerOrReadOnly(permissions.BasePermission):
    """
    Разрешение на редактирование/удаление рейтинга.
    Только автор отзыва или администратор может редактировать/удалять.
    """
    
    def has_object_permission(self, request, view, obj):
        # Чтение разрешено всем авторизованным
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Редактирование и удаление только для автора или админа
        return obj.client == request.user or request.user.is_staff


class IsExpertOrClient(permissions.BasePermission):
    """
    Разрешение для просмотра рейтингов.
    Эксперт может видеть свои рейтинги, клиент - свои отзывы.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Админы видят все
        if request.user.is_staff:
            return True
        
        # Эксперт видит отзывы о себе
        if obj.expert == request.user:
            return True
        
        # Клиент видит свои отзывы
        if obj.client == request.user:
            return True
        
        return False


class CanRatePurchase(permissions.BasePermission):
    """
    Разрешение на оценку купленной работы.
    Только покупатель может оценить работу.
    """
    
    def has_object_permission(self, request, view, obj):
        # Только покупатель может оценить
        return obj.buyer == request.user
