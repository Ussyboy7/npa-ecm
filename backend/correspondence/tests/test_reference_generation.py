from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.db import IntegrityError
from rest_framework.test import APITestCase

from accounts.models import User
from correspondence.models import Correspondence, CorrespondenceDocumentLink
from correspondence.serializers import (
    CorrespondenceDocumentLinkSerializer,
    CorrespondenceSerializer,
)
from correspondence.services import CorrespondenceDocumentService
from dms.models import Document, DocumentVersion
from dms.serializers import DocumentVersionSerializer
from organization.models import (
    Department,
    Directorate,
    Division,
    Office,
    ReferenceAllocation,
    ReferenceClassification,
    ReferenceScheme,
)


class CorrespondenceReferenceGenerationTests(APITestCase):
    """References are generated from the owning office, not the creator."""

    def setUp(self):
        self.user = User.objects.create_superuser(
            username="reference-admin",
            email="reference-admin@example.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

    def _office_with_scheme(self):
        directorate = Directorate.objects.create(name="ICT Directorate", code="ICT")
        division = Division.objects.create(
            directorate=directorate,
            name="Information & Communication Technology",
            code="ICT",
        )
        department = Department.objects.create(
            division=division,
            name="Software Applications & Database Management",
            code="SA&DM",
        )
        office = Office.objects.create(
            name="Software Applications & Database Management Department Office",
            code="OFF_DEPT_SA_DM",
            office_type=Office.OfficeTier.DEPARTMENT,
            directorate=directorate,
            division=division,
            department=department,
        )
        scheme = ReferenceScheme.objects.create(
            scope_type=ReferenceScheme.ScopeType.DEPARTMENT,
            department=department,
            location_code="HQ",
            authority_code="AGM",
            unit_code="SA&DM",
            serial_length=3,
        )
        classification = ReferenceClassification.objects.create(
            scheme=scheme, code="AD", label="Administrative", next_serial=1
        )
        return office, department, scheme, classification

    @patch(
        "correspondence.correspondence_views.CorrespondenceDocumentService.create_document_from_correspondence",
        return_value=[],
    )
    def test_placeholder_without_scheme_is_rejected_instead_of_falling_back(
        self, _create_document
    ):
        office = Office.objects.create(name="Registry Office", code="REG")
        response = self.client.post(
            "/api/v1/correspondence/items/",
            {
                "reference_number": "NPA/REG/2026/550E8400",
                "subject": "Reference test without a scheme",
                "sender_name": "Registry Test",
                "sender_organization": "NPA",
                "owning_office": str(office.id),
                "current_office": str(office.id),
                "source": "internal",
                "direction": "upward",
                "priority": "medium",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("No reference scheme", response.data["message"])

    def test_reference_preview_surfaces_missing_scheme(self):
        office = Office.objects.create(name="Registry Office", code="REG")
        response = self.client.get(
            "/api/v1/correspondence/items/reference-preview/",
            {"owning_office": str(office.id)},
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["reference_number"], "")
        self.assertIn("No reference scheme", response.data["warning"])

    def test_scheme_audit_command_reports_a_missing_scheme(self):
        Office.objects.create(name="Registry Office", code="REG")
        output = StringIO()

        call_command("audit_reference_schemes", stdout=output)

        self.assertIn("Missing scheme", output.getvalue())

    @patch(
        "correspondence.correspondence_views.CorrespondenceDocumentService.create_document_from_correspondence",
        return_value=[],
    )
    def test_office_scheme_owns_the_reference_even_when_preview_is_submitted(
        self, _create_document
    ):
        directorate = Directorate.objects.create(name="ICT Directorate", code="ICT")
        division = Division.objects.create(
            directorate=directorate, name="Information & Communication Technology", code="ICT"
        )
        department = Department.objects.create(
            division=division,
            name="Software Applications & Database Management",
            code="SA&DM",
        )
        office = Office.objects.create(
            name="Software Applications & Database Management Department Office",
            code="OFF_DEPT_SA_DM",
            office_type=Office.OfficeTier.DEPARTMENT,
            directorate=directorate,
            division=division,
            department=department,
        )
        scheme = ReferenceScheme.objects.create(
            scope_type=ReferenceScheme.ScopeType.DEPARTMENT,
            department=department,
            location_code="HQ",
            authority_code="AGM",
            unit_code="SA&DM",
            serial_length=3,
        )
        classification = ReferenceClassification.objects.create(
            scheme=scheme, code="AD", label="Administrative", next_serial=1
        )

        response = self.client.post(
            "/api/v1/correspondence/items/",
            {
                "reference_number": "HQ/AGM/SA&DM/AD/001",
                "reference_classification_code": "AD",
                "subject": "Office scheme reference test",
                "sender_name": "Registry Test",
                "sender_organization": "NPA",
                "owning_office": str(office.id),
                "current_office": str(office.id),
                "source": "internal",
                "direction": "upward",
                "priority": "medium",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["reference_number"], "HQ/AGM/SA&DM/AD/001")
        correspondence = Correspondence.objects.get(id=response.data["id"])
        self.assertEqual(correspondence.reference_classification_id, classification.id)
        allocation = ReferenceAllocation.objects.get(correspondence=correspondence)
        self.assertEqual(allocation.reference_number, "HQ/AGM/SA&DM/AD/001")
        classification.refresh_from_db()
        self.assertEqual(classification.next_serial, 2)

        second = self.client.post(
            "/api/v1/correspondence/items/",
            {
                "subject": "Office scheme default test",
                "sender_name": "Registry Test",
                "sender_organization": "NPA",
                "owning_office": str(office.id),
                "current_office": str(office.id),
                "source": "internal",
                "direction": "upward",
                "priority": "medium",
            },
            format="json",
        )

        self.assertEqual(second.status_code, 201, second.data)
        self.assertEqual(second.data["reference_number"], "HQ/AGM/SA&DM/AD/002")
        second_correspondence = Correspondence.objects.get(id=second.data["id"])
        self.assertEqual(second_correspondence.reference_classification_id, classification.id)
        self.assertTrue(
            ReferenceAllocation.objects.filter(
                correspondence=second_correspondence,
                reference_number="HQ/AGM/SA&DM/AD/002",
            ).exists()
        )

    def test_reference_collision_reallocates_without_npa_fallback(self):
        office, _department, _scheme, classification = self._office_with_scheme()
        original_create = CorrespondenceSerializer.create
        collided = {}

        def collide_once(serializer, validated_data):
            if not collided:
                allocation = (
                    ReferenceAllocation.objects.filter(correspondence__isnull=True)
                    .order_by("-created_at")
                    .first()
                )
                collided["reference"] = allocation.reference_number if allocation else None
                raise IntegrityError(
                    'duplicate key value violates unique constraint "correspondence_reference_number_key"'
                )
            return original_create(serializer, validated_data)

        with patch.object(CorrespondenceSerializer, "create", new=collide_once):
            response = self.client.post(
                "/api/v1/correspondence/items/",
                {
                    "subject": "Reference collision retry",
                    "sender_name": "Registry Test",
                    "sender_organization": "NPA",
                    "owning_office": str(office.id),
                    "current_office": str(office.id),
                    "source": "internal",
                    "direction": "upward",
                    "priority": "medium",
                },
                format="json",
            )

        self.assertEqual(response.status_code, 201, response.data)
        reference = response.data["reference_number"]
        self.assertNotEqual(reference, collided["reference"])
        self.assertTrue(reference.startswith("HQ/AGM/SA&DM/AD/"))
        self.assertNotIn("NPA/", reference)
        allocation = ReferenceAllocation.objects.get(correspondence_id=response.data["id"])
        self.assertEqual(allocation.reference_number, reference)
        self.assertEqual(allocation.classification_id, classification.id)

    @patch(
        "correspondence.correspondence_views.CorrespondenceDocumentService.create_document_from_correspondence",
        return_value=[],
    )
    def test_explicit_custom_reference_is_preserved(self, _create_document):
        office = Office.objects.create(name="Registry Office", code="REG")
        custom_reference = "NPA/CUSTOM/2026/0001"

        response = self.client.post(
            "/api/v1/correspondence/items/",
            {
                "reference_number": custom_reference,
                "subject": "Custom reference test",
                "sender_name": "Registry Test",
                "sender_organization": "NPA",
                "owning_office": str(office.id),
                "current_office": str(office.id),
                "source": "internal",
                "direction": "upward",
                "priority": "medium",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["reference_number"], custom_reference)

    @patch(
        "correspondence.correspondence_views.CorrespondenceDocumentService.create_document_from_correspondence",
        return_value=[],
    )
    def test_inward_uses_the_document_reference_without_allocating_a_local_number(
        self, _create_document
    ):
        office, _department, _scheme, classification = self._office_with_scheme()
        incoming_reference = "SA&DM/AD/2026/017"

        response = self.client.post(
            "/api/v1/correspondence/items/",
            {
                "reference_classification_code": "AD",
                "sender_reference": incoming_reference,
                "subject": "Incoming document reference test",
                "sender_name": "SA&DM Registry",
                "sender_organization": "NPA",
                "owning_office": str(office.id),
                "current_office": str(office.id),
                "source": "internal",
                "direction": "upward",
                "priority": "medium",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["reference_number"], incoming_reference)
        self.assertEqual(response.data["sender_reference"], incoming_reference)
        correspondence = Correspondence.objects.get(id=response.data["id"])
        self.assertFalse(
            ReferenceAllocation.objects.filter(correspondence=correspondence).exists()
        )
        classification.refresh_from_db()
        self.assertEqual(classification.next_serial, 1)

    @patch(
        "correspondence.correspondence_views.CorrespondenceDocumentService.create_document_from_correspondence",
        return_value=[],
    )
    def test_inward_without_a_document_reference_allocates_a_local_number(
        self, _create_document
    ):
        office, _department, _scheme, classification = self._office_with_scheme()

        response = self.client.post(
            "/api/v1/correspondence/items/",
            {
                "subject": "Incoming document without reference",
                "sender_name": "External Registry",
                "sender_organization": "External Agency",
                "owning_office": str(office.id),
                "current_office": str(office.id),
                "source": "external",
                "direction": "upward",
                "priority": "medium",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["reference_number"], "HQ/AGM/SA&DM/AD/001")
        correspondence = Correspondence.objects.get(id=response.data["id"])
        self.assertTrue(
            ReferenceAllocation.objects.filter(
                correspondence=correspondence,
                reference_number="HQ/AGM/SA&DM/AD/001",
            ).exists()
        )
        classification.refresh_from_db()
        self.assertEqual(classification.next_serial, 2)

    @patch(
        "correspondence.correspondence_views.CorrespondenceDocumentService.create_document_from_correspondence",
        return_value=[],
    )
    def test_inward_duplicate_document_reference_rejects_a_second_record(
        self, _create_document
    ):
        existing = Correspondence.objects.create(
            reference_number="HQ/AGM/SA&DM/AD/001",
            subject="Existing outgoing memo",
            created_by=self.user,
        )
        office = Office.objects.create(name="Registry Office", code="REG")

        response = self.client.post(
            "/api/v1/correspondence/items/",
            {
                "sender_reference": existing.reference_number,
                "subject": "Duplicate incoming registration",
                "sender_name": "SA&DM Registry",
                "sender_organization": "NPA",
                "owning_office": str(office.id),
                "current_office": str(office.id),
                "source": "internal",
                "direction": "upward",
                "priority": "medium",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("forward the existing record", response.data["message"].lower())
        self.assertEqual(
            response.data["details"]["existing_correspondence_id"],
            str(existing.id),
        )
        self.assertEqual(Correspondence.objects.count(), 1)

    @patch(
        "correspondence.correspondence_views.CorrespondenceDocumentService.create_document_from_correspondence",
        return_value=[],
    )
    def test_outward_keeps_its_generated_reference_when_a_sender_reference_is_supplied(
        self, _create_document
    ):
        office, _department, _scheme, classification = self._office_with_scheme()

        response = self.client.post(
            "/api/v1/correspondence/items/",
            {
                "reference_classification_code": "AD",
                "sender_reference": "EXTERNAL/OUT/2026/1",
                "subject": "Outgoing reference stays canonical",
                "sender_name": "Registry Test",
                "sender_organization": "NPA",
                "recipient_name": "External Recipient",
                "owning_office": str(office.id),
                "current_office": str(office.id),
                "source": "external",
                "direction": "downward",
                "priority": "medium",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["reference_number"], "HQ/AGM/SA&DM/AD/001")
        self.assertEqual(response.data["sender_reference"], "EXTERNAL/OUT/2026/1")
        correspondence = Correspondence.objects.get(id=response.data["id"])
        self.assertTrue(
            ReferenceAllocation.objects.filter(
                correspondence=correspondence,
                reference_number="HQ/AGM/SA&DM/AD/001",
            ).exists()
        )
        classification.refresh_from_db()
        self.assertEqual(classification.next_serial, 2)

    @patch(
        "correspondence.correspondence_views.CorrespondenceDocumentService.create_document_from_correspondence",
        return_value=[],
    )
    def test_inward_document_reference_longer_than_the_reference_field_is_rejected(
        self, _create_document
    ):
        office = Office.objects.create(name="Registry Office", code="REG")

        response = self.client.post(
            "/api/v1/correspondence/items/",
            {
                "sender_reference": "X" * 101,
                "subject": "Long incoming reference",
                "sender_name": "External Registry",
                "sender_organization": "External Agency",
                "owning_office": str(office.id),
                "current_office": str(office.id),
                "source": "external",
                "direction": "upward",
                "priority": "medium",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("100 characters or fewer", response.data["message"])
        self.assertFalse(Correspondence.objects.exists())

    def test_memo_link_rejects_a_printed_reference_that_differs(self):
        correspondence = Correspondence.objects.create(
            reference_number="HQ/AGM/SA&DM/AD/007",
            subject="Memo reference validation",
            created_by=self.user,
        )
        document = Document.objects.create(
            title="Memo with stale printed reference",
            document_type=Document.DocumentType.MEMO,
            author=self.user,
            role=Document.Role.PRIMARY,
        )
        version = DocumentVersion.objects.create(
            document=document,
            version_number=1,
            file_name="memo.html",
            file_type="text/html",
            file_size=1,
            content_html='<p><strong>Ref.:</strong> HQ/OLD/AD/</p>',
            uploaded_by=self.user,
        )

        serializer = CorrespondenceDocumentLinkSerializer(
            data={"correspondence": str(correspondence.id), "document": str(document.id)}
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("canonical reference", str(serializer.errors))

        version.content_html = '<p><strong>Ref.:</strong> HQ/AGM/SA&DM/AD/007</p>'
        version.save(update_fields=["content_html"])
        serializer = CorrespondenceDocumentLinkSerializer(
            data={"correspondence": str(correspondence.id), "document": str(document.id)}
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        self.assertTrue(
            CorrespondenceDocumentLink.objects.filter(
                correspondence=correspondence, document=document
            ).exists()
        )

    def test_memo_version_save_rejects_a_drifted_printed_reference(self):
        correspondence = Correspondence.objects.create(
            reference_number="HQ/AGM/SA&DM/AD/009",
            subject="Memo edit reference validation",
            created_by=self.user,
        )
        document = Document.objects.create(
            title="Editable memo",
            document_type=Document.DocumentType.MEMO,
            author=self.user,
            role=Document.Role.PRIMARY,
        )
        CorrespondenceDocumentLink.objects.create(
            correspondence=correspondence, document=document
        )
        payload = {
            "document": str(document.id),
            "file_name": "memo.html",
            "file_type": "text/html",
            "file_size": 1,
            "content_html": '<p><strong>Ref.:</strong> HQ/OLD/AD/</p>',
        }

        serializer = DocumentVersionSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("canonical reference", str(serializer.errors))

        payload["content_html"] = (
            '<p><strong>Ref.:</strong> HQ/AGM/SA&amp;DM/AD/009</p>'
        )
        serializer = DocumentVersionSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_auto_created_memo_uses_the_correspondence_reference(self):
        correspondence = Correspondence.objects.create(
            reference_number="HQ/AGM/SA&DM/AD/008",
            subject="Memo body reference normalisation",
            body_html='<p><strong>Ref.:</strong> HQ/OLD/AD/</p><p>Body</p>',
            created_by=self.user,
        )

        CorrespondenceDocumentService.create_document_from_correspondence(
            correspondence
        )
        primary = CorrespondenceDocumentLink.objects.get(
            correspondence=correspondence, document__role=Document.Role.PRIMARY
        ).document
        version = primary.versions.get(version_number=1)
        self.assertIn("HQ/AGM/SA&amp;DM/AD/008", version.content_html)
        self.assertNotIn("HQ/OLD/AD/", version.content_html)

    def test_backfill_command_is_repeatable_and_only_changes_legacy_fallbacks(self):
        office, department, _scheme, classification = self._office_with_scheme()
        first = Correspondence.objects.create(
            reference_number="NPA/OFFDEPTICT/2026/000001",
            subject="Legacy reference one",
            owning_office=office,
            division=department.division,
            department=department,
            created_by=self.user,
        )
        second = Correspondence.objects.create(
            reference_number="NPA/OFFDEPTICT/2026/000002",
            subject="Legacy reference two",
            owning_office=office,
            division=department.division,
            department=department,
            created_by=self.user,
        )
        legacy_corr = Correspondence.objects.create(
            reference_number="NPA/CORR/2025/015",
            subject="Legacy CORR reference",
            owning_office=office,
            division=department.division,
            department=department,
            created_by=self.user,
        )
        custom = Correspondence.objects.create(
            reference_number="NPA/CUSTOM/2026/0001",
            subject="Explicit custom reference",
            owning_office=office,
            division=department.division,
            department=department,
            created_by=self.user,
        )

        audit_output = StringIO()
        call_command("backfill_correspondence_references", stdout=audit_output)
        first.refresh_from_db()
        self.assertEqual(first.reference_number, "NPA/OFFDEPTICT/2026/000001")
        self.assertIn("dry run", audit_output.getvalue())

        apply_output = StringIO()
        call_command(
            "backfill_correspondence_references",
            "--apply",
            stdout=apply_output,
        )
        first.refresh_from_db()
        second.refresh_from_db()
        legacy_corr.refresh_from_db()
        custom.refresh_from_db()
        self.assertEqual(first.reference_number, "HQ/AGM/SA&DM/AD/001")
        self.assertEqual(second.reference_number, "HQ/AGM/SA&DM/AD/002")
        self.assertEqual(legacy_corr.reference_number, "HQ/AGM/SA&DM/AD/003")
        self.assertEqual(custom.reference_number, "NPA/CUSTOM/2026/0001")
        self.assertEqual(first.reference_classification_id, classification.id)
        self.assertEqual(legacy_corr.reference_classification_id, classification.id)
        self.assertTrue(
            ReferenceAllocation.objects.filter(
                correspondence=first, reference_number=first.reference_number
            ).exists()
        )

        repeat_output = StringIO()
        call_command(
            "backfill_correspondence_references",
            "--apply",
            stdout=repeat_output,
        )
        self.assertIn("candidates=0", repeat_output.getvalue())
