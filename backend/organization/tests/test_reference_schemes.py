import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from organization.models import (
    Department,
    Directorate,
    Division,
    Office,
    ReferenceAllocation,
    ReferenceClassification,
    ReferenceScheme,
)
from correspondence.models import Correspondence
from organization.reference_services import (
    allocate_reference,
    build_reference_number,
    default_classification,
    preview_next_reference,
    resolve_reference_scheme,
)

User = get_user_model()


class ReferenceSchemeServiceTests(TestCase):
    def setUp(self):
        self.directorate = Directorate.objects.create(name="Marine", code="MAR")
        self.division = Division.objects.create(
            directorate=self.directorate, name="ICT", code="ICT"
        )
        self.department = Department.objects.create(
            division=self.division, name="Systems", code="SYS"
        )
        self.office = Office.objects.create(
            name="ICT Division Office",
            code="OFF_DIV_ICT_TEST",
            office_type="gm",
            division=self.division,
            directorate=self.directorate,
        )
        self.scheme = ReferenceScheme.objects.create(
            scope_type=ReferenceScheme.ScopeType.DIVISION,
            division=self.division,
            location_code="HQ",
            authority_code="GM",
            unit_code="ICT",
            serial_length=3,
        )
        self.ad = ReferenceClassification.objects.create(
            scheme=self.scheme, code="AD", label="Administrative"
        )
        self.op = ReferenceClassification.objects.create(
            scheme=self.scheme, code="OP", label="Operations"
        )

    def test_reference_format(self):
        self.assertEqual(
            build_reference_number(self.scheme, "AD", 1), "HQ/GM/ICT/AD/001"
        )

    def test_authority_level_scheme_can_omit_unit_segment(self):
        scheme = ReferenceScheme.objects.create(
            scope_type=ReferenceScheme.ScopeType.DIRECTORATE,
            directorate=self.directorate,
            location_code="HQ",
            authority_code="MD",
            unit_code="",
            serial_length=3,
        )
        self.assertEqual(build_reference_number(scheme, "AD", 1), "HQ/MD/AD/001")

    def test_preview_does_not_consume_serial(self):
        first = preview_next_reference(self.scheme, self.ad)
        second = preview_next_reference(self.scheme, self.ad)
        self.assertEqual(first, "HQ/GM/ICT/AD/001")
        self.assertEqual(second, first)
        self.ad.refresh_from_db()
        self.assertEqual(self.ad.next_serial, 1)

    def test_counters_are_independent_per_classification(self):
        ad_number, _ = allocate_reference(self.scheme, self.ad)
        op_number, _ = allocate_reference(self.scheme, self.op)
        self.assertEqual(ad_number, "HQ/GM/ICT/AD/001")
        self.assertEqual(op_number, "HQ/GM/ICT/OP/001")

        second_ad, _ = allocate_reference(self.scheme, self.ad)
        self.assertEqual(second_ad, "HQ/GM/ICT/AD/002")
        self.assertEqual(ReferenceAllocation.objects.count(), 3)

    def test_most_specific_scheme_wins(self):
        self.assertEqual(resolve_reference_scheme(office=self.office), self.scheme)

        department_scheme = ReferenceScheme.objects.create(
            scope_type=ReferenceScheme.ScopeType.DEPARTMENT,
            department=self.department,
            authority_code="AGM",
            unit_code="SYS",
        )
        self.office.department = self.department
        self.office.save(update_fields=["department"])
        self.assertEqual(
            resolve_reference_scheme(office=self.office), department_scheme
        )

    def test_inactive_scheme_is_skipped(self):
        directorate_scheme = ReferenceScheme.objects.create(
            scope_type=ReferenceScheme.ScopeType.DIRECTORATE,
            directorate=self.directorate,
            authority_code="ED",
            unit_code="MAR",
        )
        self.scheme.is_active = False
        self.scheme.save(update_fields=["is_active"])
        self.assertEqual(
            resolve_reference_scheme(office=self.office), directorate_scheme
        )

    def test_default_classification_prefers_administrative(self):
        self.assertEqual(default_classification(self.scheme), self.ad)


class ReferenceSchemeApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(
            username="refadmin", password="testpass123", email="ref@example.com"
        )
        self.client.force_authenticate(user=self.user)
        self.directorate = Directorate.objects.create(name="Finance", code="FIN")
        self.division = Division.objects.create(
            directorate=self.directorate, name="Accounts", code="ACC"
        )

    def test_create_scheme_seeds_preview(self):
        response = self.client.post(
            "/api/v1/organization/reference-schemes/",
            {
                "scope_type": "division",
                "division": str(self.division.id),
                "location_code": "hq",
                "authority_code": "gm",
                "unit_code": "sa&dm",
                "serial_length": 3,
                "is_active": True,
                "classifications": [
                    {"code": "ad", "label": "Administrative", "next_serial": 1},
                    {"code": "op", "label": "Operations", "next_serial": 1},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["reference_preview"], "HQ/GM/SA&DM/AD/001")
        self.assertEqual(response.data["unit_code"], "SA&DM")
        self.assertEqual(
            sorted(item["code"] for item in response.data["classifications"]),
            ["AD", "OP"],
        )

    def test_create_scheme_allows_blank_unit_segment(self):
        response = self.client.post(
            "/api/v1/organization/reference-schemes/",
            {
                "scope_type": "directorate",
                "directorate": str(self.directorate.id),
                "location_code": "HQ",
                "authority_code": "MD",
                "unit_code": "",
                "serial_length": 3,
                "is_active": True,
                "classifications": [
                    {"code": "ad", "label": "Administrative", "next_serial": 1},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["reference_preview"], "HQ/MD/AD/001")

    def test_duplicate_scheme_for_same_unit_is_rejected(self):
        payload = {
            "scope_type": "division",
            "division": str(self.division.id),
            "authority_code": "GM",
            "unit_code": "ACC",
        }
        first = self.client.post(
            "/api/v1/organization/reference-schemes/", payload, format="json"
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED, first.data)
        second = self.client.post(
            "/api/v1/organization/reference-schemes/", payload, format="json"
        )
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resolve_endpoint_returns_scheme(self):
        scheme = ReferenceScheme.objects.create(
            scope_type=ReferenceScheme.ScopeType.DIVISION,
            division=self.division,
            authority_code="GM",
            unit_code="ACC",
        )
        ReferenceClassification.objects.create(
            scheme=scheme, code="AD", label="Administrative"
        )
        response = self.client.get(
            f"/api/v1/organization/reference-schemes/resolve/?division={self.division.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["scheme"]["unit_code"], "ACC")
        self.assertEqual(
            response.data["scheme"]["classifications"][0]["preview"],
            "HQ/GM/ACC/AD/001",
        )


class CorrespondenceReferenceAllocationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(
            username="refregister", password="testpass123", email="reg@example.com"
        )
        self.client.force_authenticate(user=self.user)
        self.directorate = Directorate.objects.create(name="Operations", code="OPS")
        self.division = Division.objects.create(
            directorate=self.directorate, name="ICT", code="ICT"
        )
        self.office = Office.objects.create(
            name="ICT Division Office",
            code="OFF_DIV_ICT_ALLOC",
            office_type="gm",
            division=self.division,
            directorate=self.directorate,
        )
        self.scheme = ReferenceScheme.objects.create(
            scope_type=ReferenceScheme.ScopeType.DIVISION,
            division=self.division,
            authority_code="GM",
            unit_code="ICT",
        )
        self.ad = ReferenceClassification.objects.create(
            scheme=self.scheme, code="AD", label="Administrative"
        )

    def test_registration_uses_selected_classification(self):
        response = self.client.post(
            "/api/v1/correspondence/items/",
            {
                "subject": f"Reference allocation {uuid.uuid4().hex[:6]}",
                "source": "internal",
                "owning_office": str(self.office.id),
                "division": str(self.division.id),
                "reference_classification_code": "AD",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["reference_number"], "HQ/GM/ICT/AD/001")
        self.assertEqual(
            response.data["reference_classification"]["code"], "AD"
        )
        allocation = ReferenceAllocation.objects.get(
            reference_number=response.data["reference_number"]
        )
        self.assertEqual(str(allocation.correspondence_id), str(response.data["id"]))
        self.ad.refresh_from_db()
        self.assertEqual(self.ad.next_serial, 2)


class ReferenceAllocationApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(
            username="refaudit", password="testpass123", email="audit@example.com"
        )
        self.client.force_authenticate(user=self.user)
        self.directorate = Directorate.objects.create(name="Marine", code="MAR")
        self.division = Division.objects.create(
            directorate=self.directorate, name="ICT", code="ICT_AUDIT"
        )
        self.scheme = ReferenceScheme.objects.create(
            scope_type=ReferenceScheme.ScopeType.DIVISION,
            division=self.division,
            authority_code="GM",
            unit_code="ICT",
        )
        self.ad = ReferenceClassification.objects.create(
            scheme=self.scheme, code="AD", label="Administrative"
        )
        reference_number, self.allocation = allocate_reference(
            self.scheme, self.ad, user=self.user
        )
        self.correspondence = Correspondence.objects.create(
            subject="Contract renewal for harbour equipment",
            reference_number=reference_number,
            reference_classification=self.ad,
        )
        self.allocation.correspondence = self.correspondence
        self.allocation.save(update_fields=["correspondence"])

    def test_lists_issued_references_with_audit_fields(self):
        response = self.client.get("/api/v1/organization/reference-allocations/")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["count"], 1)
        row = response.data["results"][0]
        self.assertEqual(row["reference_number"], "HQ/GM/ICT/AD/001")
        self.assertEqual(row["unit_name"], "ICT")
        self.assertEqual(row["scope_label"], "Division")
        self.assertEqual(row["classification_code"], "AD")
        self.assertEqual(row["classification_label"], "Administrative")
        self.assertEqual(str(row["correspondence"]), str(self.correspondence.id))
        self.assertEqual(
            row["correspondence_subject"], "Contract renewal for harbour equipment"
        )
        self.assertEqual(row["correspondence_reference"], "HQ/GM/ICT/AD/001")
        self.assertIn("created_at", row)

    def test_search_and_scope_filters(self):
        by_subject = self.client.get(
            "/api/v1/organization/reference-allocations/?search=Contract"
        )
        self.assertEqual(by_subject.data["count"], 1)

        by_reference = self.client.get(
            "/api/v1/organization/reference-allocations/?search=HQ%2FGM%2FICT%2FAD%2F001"
        )
        self.assertEqual(by_reference.data["count"], 1)

        wrong_scope = self.client.get(
            "/api/v1/organization/reference-allocations/?scope_type=department"
        )
        self.assertEqual(wrong_scope.data["count"], 0)

    def test_requires_administration_access(self):
        staff = User.objects.create_user(
            username="refauditstaff", password="testpass123", email="staff@example.com"
        )
        self.client.force_authenticate(user=staff)
        response = self.client.get("/api/v1/organization/reference-allocations/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
