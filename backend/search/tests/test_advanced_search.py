"""Regression tests for advanced search filtering and pagination contracts."""

from datetime import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from correspondence.models import Case, Correspondence
from dms.models import Document
from organization.models import Department, Directorate, Division, Role
from search.services import SearchService


def _at(year: int, month: int, day: int, hour: int) -> datetime:
    return timezone.make_aware(datetime(year, month, day, hour, 30))


class DateToUpperBoundTests(TestCase):
    """A date-only `date_to` must cover the whole selected day."""

    def setUp(self):
        self.user = get_user_model().objects.create_superuser(
            username="datefilteradmin",
            email="datefilter@npa.gov.ng",
            password="testpass123",
        )
        self.document_on_day = Document.objects.create(
            title="Budget memo",
            document_type=Document.DocumentType.MEMO,
            author=self.user,
        )
        self.document_next_day = Document.objects.create(
            title="Budget circular",
            document_type=Document.DocumentType.CIRCULAR,
            author=self.user,
        )
        Document.objects.filter(pk=self.document_on_day.pk).update(
            created_at=_at(2026, 6, 22, 15)
        )
        Document.objects.filter(pk=self.document_next_day.pk).update(
            created_at=_at(2026, 6, 23, 9)
        )

        self.case_on_day = Case.objects.create(
            case_number="CASE-DATE-1",
            title="Budget audit",
            created_by=self.user,
        )
        self.case_next_day = Case.objects.create(
            case_number="CASE-DATE-2",
            title="Budget review",
            created_by=self.user,
        )
        Case.objects.filter(pk=self.case_on_day.pk).update(
            opened_at=_at(2026, 6, 22, 18)
        )
        Case.objects.filter(pk=self.case_next_day.pk).update(
            opened_at=_at(2026, 6, 23, 8)
        )

    def test_document_date_to_includes_the_rest_of_the_selected_day(self):
        results = SearchService.full_text_search_documents(
            "", {"date_to": "2026-06-22"}, limit=10, offset=0, user=self.user
        )
        result_ids = {str(document.id) for document in results["results"]}

        self.assertIn(str(self.document_on_day.id), result_ids)
        self.assertNotIn(str(self.document_next_day.id), result_ids)

    def test_case_date_to_includes_the_rest_of_the_selected_day(self):
        results = SearchService.search_cases(
            "", {"date_to": "2026-06-22"}, limit=10, offset=0, user=self.user
        )
        result_ids = {str(case.id) for case in results["results"]}

        self.assertIn(str(self.case_on_day.id), result_ids)
        self.assertNotIn(str(self.case_next_day.id), result_ids)


class UnifiedSearchPaginationTests(TestCase):
    """All-results search must tell the client whether another page exists."""

    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_superuser(
            username="paginationadmin",
            email="pagination@npa.gov.ng",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)
        for index in range(3):
            Document.objects.create(
                title=f"Procurement memo {index}",
                document_type=Document.DocumentType.MEMO,
                author=self.user,
            )
        Correspondence.objects.create(
            subject="Procurement request",
            reference_number="IN-PAGE-1",
            created_by=self.user,
        )
        Case.objects.create(
            case_number="CASE-PAGE-1",
            title="Procurement audit",
            created_by=self.user,
        )

    def test_first_page_reports_continuation_per_result_type(self):
        response = self.client.post(
            "/api/v1/search/operations/search/",
            {"query": "", "search_type": "all", "limit": 2, "offset": 0},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["documents"]["has_more"])
        self.assertFalse(data["correspondence"]["has_more"])
        self.assertFalse(data["cases"]["has_more"])
        self.assertTrue(data["has_more"])
        self.assertEqual(data["limit"], 2)
        self.assertEqual(data["offset"], 0)

    def test_last_page_reports_no_continuation(self):
        response = self.client.post(
            "/api/v1/search/operations/search/",
            {"query": "", "search_type": "all", "limit": 2, "offset": 2},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["documents"]["has_more"])
        self.assertFalse(data["has_more"])
        self.assertEqual(data["offset"], 2)


class SearchScopeEndpointTests(TestCase):
    """The scope note must report the same boundary the search filters with."""

    def setUp(self):
        self.client = APIClient()
        self.directorate = Directorate.objects.create(name="Operations", code="OPS")
        self.division = Division.objects.create(
            directorate=self.directorate, name="Finance", code="FIN"
        )
        self.department = Department.objects.create(
            division=self.division, name="Budget", code="BUD"
        )
        self.other_division = Division.objects.create(
            directorate=self.directorate, name="Legal", code="LEG"
        )
        self.other_department = Department.objects.create(
            division=self.other_division, name="Litigation", code="LIT"
        )

    def _user(self, username: str, grade: str, **extra):
        return get_user_model().objects.create_user(
            username=username,
            email=f"{username}@npa.gov.ng",
            password="testpass123",
            grade_level=grade,
            **extra,
        )

    def test_department_leadership_is_scoped_to_its_department(self):
        self.client.force_authenticate(
            user=self._user("scopeagm", "MSS2", department=self.department)
        )

        response = self.client.get("/api/v1/search/operations/scope/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "level": "department",
                "unit": "Budget",
                "division_ids": [str(self.division.id)],
                "department_ids": [str(self.department.id)],
            },
        )

    def test_directorate_leadership_may_filter_to_units_beneath_it(self):
        self.client.force_authenticate(
            user=self._user("scopeed", "EDCS", directorate=self.directorate)
        )

        response = self.client.get("/api/v1/search/operations/scope/")
        data = response.json()

        self.assertEqual(data["level"], "directorate")
        self.assertEqual(data["unit"], "Operations")
        self.assertEqual(
            set(data["division_ids"]),
            {str(self.division.id), str(self.other_division.id)},
        )
        self.assertEqual(
            set(data["department_ids"]),
            {str(self.department.id), str(self.other_department.id)},
        )

    def test_org_wide_permission_is_not_narrowed_by_grade(self):
        role = Role.objects.create(
            name="Registry Desk", permissions={"can_view_all_correspondence": True}
        )
        self.client.force_authenticate(
            user=self._user(
                "scoperegistry",
                "SSS4",
                system_role=role,
                department=self.department,
            )
        )

        response = self.client.get("/api/v1/search/operations/scope/")

        self.assertEqual(
            response.json(),
            {
                "level": "all",
                "unit": None,
                "division_ids": None,
                "department_ids": None,
            },
        )

    def test_office_staff_fall_back_to_what_they_handled(self):
        self.client.force_authenticate(
            user=self._user("scopeofficer", "SSS3", department=self.department)
        )

        response = self.client.get("/api/v1/search/operations/scope/")

        self.assertEqual(
            response.json(),
            {
                "level": "participation",
                "unit": None,
                # The department's parent division comes from the department
                # itself, since a participation account carries no grade tier.
                "division_ids": [str(self.division.id)],
                "department_ids": [str(self.department.id)],
            },
        )


class PublicRecordCrossUnitSearchTests(TestCase):
    """Published PUBLIC documents cross units; nothing else may."""

    def setUp(self):
        self.directorate = Directorate.objects.create(name="Operations", code="OPS")
        self.own_division = Division.objects.create(
            directorate=self.directorate, name="Finance", code="FIN"
        )
        self.own_department = Department.objects.create(
            division=self.own_division, name="Budget", code="BUD"
        )
        self.other_division = Division.objects.create(
            directorate=self.directorate, name="Legal", code="LEG"
        )
        self.other_department = Department.objects.create(
            division=self.other_division, name="Litigation", code="LIT"
        )

        self.reader = get_user_model().objects.create_user(
            username="scope-reader",
            email="scope-reader@npa.gov.ng",
            password="testpass123",
            grade_level="MSS2",
            department=self.own_department,
            division=self.own_division,
            directorate=self.directorate,
        )
        author = get_user_model().objects.create_user(
            username="scope-author",
            email="scope-author@npa.gov.ng",
            password="testpass123",
            grade_level="MSS2",
            department=self.other_department,
            division=self.other_division,
            directorate=self.directorate,
        )

        def make(title, status, sensitivity):
            return Document.objects.create(
                title=title,
                document_type=Document.DocumentType.REPORT,
                author=author,
                status=status,
                sensitivity=sensitivity,
                division=self.other_division,
                department=self.other_department,
            )

        self.public_record = make(
            "Port tariff notice",
            Document.DocumentStatus.PUBLISHED,
            Document.Sensitivity.PUBLIC,
        )
        self.internal_record = make(
            "Internal legal brief",
            Document.DocumentStatus.PUBLISHED,
            Document.Sensitivity.INTERNAL,
        )
        self.draft_public_record = make(
            "Draft tariff notice",
            Document.DocumentStatus.DRAFT,
            Document.Sensitivity.PUBLIC,
        )

    def test_another_units_published_public_record_is_searchable(self):
        results = SearchService.full_text_search_documents(
            "", {}, limit=50, offset=0, user=self.reader
        )
        result_ids = {str(document.id) for document in results["results"]}

        self.assertIn(str(self.public_record.id), result_ids)

    def test_another_units_internal_and_unpublished_records_stay_hidden(self):
        results = SearchService.full_text_search_documents(
            "", {}, limit=50, offset=0, user=self.reader
        )
        result_ids = {str(document.id) for document in results["results"]}

        self.assertNotIn(str(self.internal_record.id), result_ids)
        self.assertNotIn(str(self.draft_public_record.id), result_ids)
