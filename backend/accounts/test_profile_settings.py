from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from organization.models import Role

from .models import User


def make_image(name="photo.png", size=(800, 800), image_format="PNG", content_type="image/png"):
    buffer = BytesIO()
    Image.new("RGB", size, "navy").save(buffer, format=image_format)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=content_type)


class CurrentUserProfileTests(APITestCase):
    def setUp(self):
        self.role = Role.objects.create(name="Super Admin")
        self.user = User.objects.create_user(
            username="profile-owner",
            email="profile-owner@example.com",
            password="testpass123",
            system_role=self.role,
            middle_name="Chukwuemeka",
            designation="Director, Human Resources",
            personnel_number="NPA-0042",
            employee_id="EMP-0042",
            grade_level="MSS2",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.url = reverse("api_v1:current_user")
        self.photo_url = reverse("api_v1:current_user_photo")

    def test_patch_persists_phone_and_bio(self):
        response = self.client.patch(
            self.url,
            {"phone": "+234 800 000 0000", "bio": "Port operations specialist."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.phone, "+234 800 000 0000")
        self.assertEqual(self.user.bio, "Port operations specialist.")
        self.assertEqual(response.data["phone"], "+234 800 000 0000")
        self.assertEqual(response.data["bio"], "Port operations specialist.")

    def test_patch_persists_middle_name(self):
        response = self.client.patch(self.url, {"middle_name": "Obi"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.middle_name, "Obi")
        self.assertEqual(response.data["middle_name"], "Obi")

    def test_get_exposes_admin_managed_service_fields(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["personnel_number"], "NPA-0042")
        self.assertEqual(response.data["employee_id"], "EMP-0042")
        self.assertEqual(response.data["designation"], "Director, Human Resources")
        self.assertEqual(response.data["grade_level"], "MSS2")

    def test_patch_cannot_change_admin_managed_service_fields(self):
        response = self.client.patch(
            self.url,
            {
                "personnel_number": "NPA-9999",
                "employee_id": "EMP-9999",
                "designation": "Permanent Secretary",
                "grade_level": "MSS1",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.personnel_number, "NPA-0042")
        self.assertEqual(self.user.employee_id, "EMP-0042")
        self.assertEqual(self.user.designation, "Director, Human Resources")
        self.assertEqual(self.user.grade_level, "MSS2")

    def test_patch_does_not_allow_self_service_role_changes(self):
        response = self.client.patch(
            self.url,
            {"system_role": None, "is_superuser": True, "phone": "+234 800 000 0001"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.system_role, self.role)
        self.assertFalse(self.user.is_superuser)
        self.assertEqual(self.user.phone, "+234 800 000 0001")

    def test_photo_upload_persists_and_is_returned_as_data_uri(self):
        response = self.client.post(
            self.photo_url,
            {"profile_photo": make_image()},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.addCleanup(self.user.profile_photo.delete, save=False)
        self.assertTrue(self.user.profile_photo.name.startswith("accounts/profiles/"))
        self.assertIsInstance(response.data["profile_photo"], str)
        self.assertTrue(response.data["profile_photo"].startswith("data:image/jpeg;base64,"))

        fetched = self.client.get(self.url)
        self.assertEqual(fetched.data["profile_photo"], response.data["profile_photo"])

    def test_photo_upload_rejects_unsupported_type(self):
        response = self.client.post(
            self.photo_url,
            {
                "profile_photo": SimpleUploadedFile(
                    "photo.gif",
                    b"GIF89a",
                    content_type="image/gif",
                )
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("profile_photo", response.data)

    def test_current_user_exposes_designation_separately_from_system_role(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["designation"], "Director, Human Resources")
        self.assertEqual(response.data["system_role_name"], "Super Admin")
