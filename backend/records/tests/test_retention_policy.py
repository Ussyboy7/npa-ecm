import uuid

from django.test import TestCase

from correspondence.models import Correspondence
from organization.models import Department, Directorate, Division, Office
from records.models import RetentionSchedule
from records.services import find_retention_schedule


class RetentionScheduleSelectionTests(TestCase):
    def setUp(self):
        token = uuid.uuid4().hex[:8]
        self.directorate = Directorate.objects.create(name=f"Retention Dir {token}", code=f"RD-{token}")
        self.division = Division.objects.create(
            directorate=self.directorate,
            name=f"Retention Div {token}",
            code=f"RV-{token}",
        )
        self.department = Department.objects.create(
            division=self.division,
            name=f"Retention Dept {token}",
            code=f"RP-{token}",
        )
        self.office = Office.objects.create(
            name=f"Retention Office {token}",
            code=f"RO-{token}",
            directorate=self.directorate,
            division=self.division,
            department=self.department,
        )
        self.correspondence = Correspondence.objects.create(
            reference_number=f"RETENTION/{token}",
            subject="Retention selector test",
            department=self.department,
            division=self.division,
            owning_office=self.office,
            archive_level=Correspondence.ArchiveLevel.DEPARTMENT,
            status=Correspondence.Status.ARCHIVED,
        )

    def _schedule(self, name, **kwargs):
        return RetentionSchedule.objects.create(
            name=name,
            record_type=RetentionSchedule.RecordType.CORRESPONDENCE,
            retention_years=1,
            **kwargs,
        )

    def test_exact_level_and_unit_match_precedes_scoped_and_global_schedules(self):
        global_schedule = self._schedule("Global fallback")
        division_schedule = self._schedule("Division fallback", division=self.division)
        level_schedule = self._schedule(
            "Department archive schedule",
            archive_level=Correspondence.ArchiveLevel.DEPARTMENT,
            department=self.department,
        )

        self.assertEqual(find_retention_schedule(self.correspondence), level_schedule)
        self.assertNotEqual(find_retention_schedule(self.correspondence), division_schedule)
        self.assertNotEqual(find_retention_schedule(self.correspondence), global_schedule)

    def test_refiling_changes_level_schedule_without_changing_archive_timestamp(self):
        division_schedule = self._schedule(
            "Division archive schedule",
            archive_level=Correspondence.ArchiveLevel.DIVISION,
            division=self.division,
        )
        self.correspondence.archive_level = Correspondence.ArchiveLevel.DIVISION
        self.correspondence.save(update_fields=["archive_level"])

        self.assertEqual(find_retention_schedule(self.correspondence), division_schedule)

    def test_explicit_correspondence_schedule_has_precedence(self):
        explicit = self._schedule("Explicit correspondence schedule")
        self.correspondence.retention_schedule = explicit
        self.correspondence.save(update_fields=["retention_schedule"])

        self.assertEqual(find_retention_schedule(self.correspondence), explicit)
