from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

User = get_user_model()

class AuthenticationTests(APITestCase):
    def setUp(self):
        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123',
            'password2': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User',
            'role': 'client'
        }
        self.login_data = {
            'username': 'testuser',
            'password': 'testpass123'
        }

    def test_user_registration(self):
        """Тест регистрации пользователя"""
        url = reverse('user-list')
        response = self.client.post(url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(User.objects.get().username, 'testuser')

    def test_user_login(self):
        """Тест входа пользователя"""
        # Создаем пользователя
        User.objects.create_user(
            username=self.user_data['username'],
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        
        url = reverse('token_obtain_pair')
        response = self.client.post(url, self.login_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)

    def test_token_refresh(self):
        """Тест обновления токена"""
        # Создаем пользователя и получаем токены
        User.objects.create_user(
            username=self.user_data['username'],
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        
        response = self.client.post(reverse('token_obtain_pair'), self.login_data)
        refresh_token = response.data['refresh']
        
        url = reverse('token_refresh')
        response = self.client.post(url, {'refresh': refresh_token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_password_reset_request(self):
        """Тест запроса на сброс пароля"""
        # Создаем пользователя
        User.objects.create_user(
            username=self.user_data['username'],
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        
        url = reverse('user-reset-password')
        response = self.client.post(url, {'email': self.user_data['email']})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_invalid_login(self):
        """Тест входа с неверными данными"""
        url = reverse('token_obtain_pair')
        response = self.client.post(url, {
            'username': 'wronguser',
            'password': 'wrongpass'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_me_endpoint(self):
        """Тест эндпоинта профиля пользователя"""
        # Создаем пользователя
        user = User.objects.create_user(
            username=self.user_data['username'],
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        
        # Получаем токен
        response = self.client.post(reverse('token_obtain_pair'), self.login_data)
        token = response.data['access']
        
        # Тестируем эндпоинт me
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        url = reverse('user-me')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], self.user_data['username'])
