from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer

from .cookie_auth import ACCESS_COOKIE, REFRESH_COOKIE


class CookieTokenRefreshView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        refresh = request.COOKIES.get(REFRESH_COOKIE)
        if not refresh:
            return Response({"detail": "Refresh cookie missing"}, status=status.HTTP_401_UNAUTHORIZED)
        serializer = TokenRefreshSerializer(data={"refresh": refresh})
        serializer.is_valid(raise_exception=True)
        # AuthCookieMiddleware moves access (and rotated refresh, if enabled)
        # into HttpOnly cookies and removes them from the JSON body.
        return Response(serializer.validated_data)


class CookieLogoutView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        response = Response(status=status.HTTP_204_NO_CONTENT)
        response.delete_cookie(ACCESS_COOKIE, path="/api/", samesite="Strict")
        response.delete_cookie(REFRESH_COOKIE, path="/api/users/", samesite="Strict")
        return response
