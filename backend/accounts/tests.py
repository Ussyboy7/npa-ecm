from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from .models import User, SealOTP
from unittest.mock import patch


class UserModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
        )

    def test_user_creation(self):
        self.assertEqual(self.user.username, "testuser")
        self.assertTrue(self.user.check_password("testpass123"))

    def test_user_str(self):
        self.assertEqual(str(self.user), self.user.username)


class AuthAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            is_active=True,
        )
        self.login_url = reverse("api_v1:token_obtain_pair")

    def test_login_success(self):
        response = self.client.post(self.login_url, {
            "username": "testuser",
            "password": "testpass123",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_failure(self):
        response = self.client.post(self.login_url, {
            "username": "testuser",
            "password": "wrongpassword",
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class SealOTPModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="otpuser",
            password="testpass123",
        )

    def test_otp_generation(self):
        otp = SealOTP.create_for_user(self.user)
        self.assertEqual(len(otp.code), 6)
        self.assertTrue(otp.code.isdigit())
        self.assertTrue(otp.is_valid())

    def test_otp_verification_valid(self):
        otp = SealOTP.create_for_user(self.user)
        self.assertTrue(otp.verify(otp.code))
        self.assertTrue(otp.is_used)

    def test_otp_verification_invalid(self):
        otp = SealOTP.create_for_user(self.user)
        self.assertFalse(otp.verify("000000"))
        self.assertEqual(otp.attempts, 1)

    def test_otp_max_attempts(self):
        otp = SealOTP.create_for_user(self.user)
        for _ in range(5):
            otp.verify("000000")
        self.assertFalse(otp.is_valid())
