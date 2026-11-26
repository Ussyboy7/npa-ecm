"""Regression tests for CC recipient names in the distribution serializer."""

import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase

from correspondence.models import Correspondence, CorrespondenceDistribution, Minute
from correspondence.serializers import CorrespondenceDistributionSerializer
from organization.models import Office

User = get_user_model()


class CorrespondenceDistributionUserNameTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(username="distribution.author", password="x")
        self.correspondence = Correspondence.objects.create(
            reference_number=f"NPA/CC/{uuid.uuid4().hex[:8].upper()}",
            subject="Distribution name serialization",
            created_by=self.author,
        )
        self.minute = Minute.objects.create(
            correspondence=self.correspondence,
            user=self.author,
            minute_text="For information.",
        )

    def _serialize(self, **kwargs):
        entry = CorrespondenceDistribution.objects.create(
            correspondence=self.correspondence,
            minute=self.minute,
            added_by=self.author,
            purpose=CorrespondenceDistribution.Purpose.INFORMATION,
            **kwargs,
        )
        return CorrespondenceDistributionSerializer(entry).data

    def test_user_recipient_uses_full_name(self):
        recipient = User.objects.create_user(
            username="a.lovelace",
            first_name="Ada",
            last_name="Lovelace",
        )

        data = self._serialize(
            recipient_type=CorrespondenceDistribution.RecipientType.USER,
            user=recipient,
        )

        self.assertEqual(data["user_name"], "Ada Lovelace")

    def test_user_recipient_falls_back_to_username(self):
        recipient = User.objects.create_user(username="no.profile.name")

        data = self._serialize(
            recipient_type=CorrespondenceDistribution.RecipientType.USER,
            user=recipient,
        )

        self.assertEqual(data["user_name"], "no.profile.name")

    def test_office_recipient_does_not_gain_a_user_name(self):
        office = Office.objects.create(name="Distribution Test Office", code="CC_TEST")

        data = self._serialize(
            recipient_type=CorrespondenceDistribution.RecipientType.OFFICE,
            office=office,
        )

        self.assertIsNone(data["user_name"])
        self.assertEqual(data["office_name"], "Distribution Test Office")
