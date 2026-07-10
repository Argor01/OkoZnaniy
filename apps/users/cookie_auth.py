"""JWT authentication using Secure HttpOnly cookies.

Authorization headers remain supported for API clients, while browsers no
longer expose JWTs to JavaScript/localStorage.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication


ACCESS_COOKIE = "oko_access"
REFRESH_COOKIE = "oko_refresh"


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            return super().authenticate(request)
        raw_token = request.COOKIES.get(ACCESS_COOKIE)
        if not raw_token:
            return None
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
