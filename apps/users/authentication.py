from rest_framework.authentication import SessionAuthentication


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    SessionAuthentication без проверки CSRF.
    Используется для API endpoints, где аутентификация происходит через JWT.
    """
    
    def enforce_csrf(self, request):
        """
        Отключаем проверку CSRF для API
        """
        return
