import uuid

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from correspondence.models import Correspondence, Minute
from correspondence.serializers import MinuteSerializer
from organization.models import Office, OfficeMembership, Role
from workflow.models import WorkflowStep, WorkflowTemplate


class WorkflowTemplateAssignmentTests(TestCase):
    def test_first_minute_attaches_selected_template_to_correspondence(self):
        role = Role.objects.create(
            name=f"WorkflowRouteTest-{uuid.uuid4().hex[:8]}",
            permissions={"can_minute_correspondence": True},
        )
        user = User.objects.create_user(
            username=f"workflow-route-test-{uuid.uuid4().hex[:8]}",
            password="test",
            system_role=role,
        )
        recipient = User.objects.create_user(
            username=f"workflow-route-recipient-{uuid.uuid4().hex[:8]}",
            password="test",
            system_role=role,
        )
        final_recipient = User.objects.create_user(
            username=f"workflow-route-final-{uuid.uuid4().hex[:8]}",
            password="test",
        )
        source_office = Office.objects.create(
            name=f"Workflow source {uuid.uuid4().hex[:6]}",
            code=f"WFS-{uuid.uuid4().hex[:8]}",
        )
        destination_office = Office.objects.create(
            name=f"Workflow destination {uuid.uuid4().hex[:6]}",
            code=f"WFD-{uuid.uuid4().hex[:8]}",
        )
        expected_office = Office.objects.create(
            name=f"Workflow expected {uuid.uuid4().hex[:6]}",
            code=f"WFE-{uuid.uuid4().hex[:8]}",
        )
        OfficeMembership.objects.create(
            user=user,
            office=source_office,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
            is_primary=True,
            is_active=True,
        )
        OfficeMembership.objects.create(
            user=recipient,
            office=destination_office,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
            is_primary=True,
            is_active=True,
        )
        OfficeMembership.objects.create(
            user=final_recipient,
            office=expected_office,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL,
            is_primary=True,
            is_active=True,
        )
        registrar = User.objects.create_user(
            username=f"workflow-route-registrar-{uuid.uuid4().hex[:8]}",
            password="test",
        )
        owning_office = Office.objects.create(
            name=f"Workflow owning office {uuid.uuid4().hex[:6]}",
            code=f"WFO-{uuid.uuid4().hex[:8]}",
        )
        correspondence = Correspondence.objects.create(
            reference_number=f"TEST-WF-{uuid.uuid4().hex[:8]}",
            subject="Workflow template assignment test",
            created_by=registrar,
            owning_office=owning_office,
            current_office=source_office,
            current_approver=user,
            status=Correspondence.Status.IN_PROGRESS,
        )
        template = WorkflowTemplate.objects.create(
            name="Test correspondence route",
            slug=f"test-route-{uuid.uuid4().hex[:8]}",
            applies_to=WorkflowTemplate.AppliesTo.CORRESPONDENCE,
            is_active=True,
        )
        WorkflowStep.objects.create(
            template=template,
            order=1,
            title="Source review",
            office=source_office,
        )
        WorkflowStep.objects.create(
            template=template,
            order=2,
            title="Destination review",
            office=destination_office,
        )
        WorkflowStep.objects.create(
            template=template,
            order=3,
            title="Expected follow-up",
            office=expected_office,
        )

        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post(
            reverse("api_v1:minute-list"),
            {
                "correspondence": str(correspondence.id),
                "workflow_template": str(template.id),
                "user_id": str(user.id),
                "action_type": "minute",
                "minute_text": "Test-only workflow route",
                "direction": "downward",
                "step_number": 1,
                "to_office_id": str(destination_office.id),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        routed_minute = Minute.objects.get(correspondence=correspondence)
        self.assertEqual(routed_minute.to_office_id, destination_office.id)

        correspondence.refresh_from_db()
        self.assertEqual(correspondence.workflow_template_id, template.id)
        self.assertEqual(correspondence.current_office_id, destination_office.id)
        self.assertEqual(correspondence.current_approver_id, recipient.id)

        detail_url = reverse("api_v1:correspondence-detail", args=[correspondence.id])
        details = client.get(detail_url)
        self.assertEqual(details.status_code, status.HTTP_200_OK, details.content)
        update = client.patch(
            detail_url,
            {"status": "in-progress", "direction": "downward"},
            format="json",
        )
        self.assertEqual(update.status_code, status.HTTP_200_OK, update.content)

        unrelated = Correspondence.objects.create(
            reference_number=f"TEST-WF-UNRELATED-{uuid.uuid4().hex[:8]}",
            subject="Unrelated correspondence",
            created_by=registrar,
            status=Correspondence.Status.IN_PROGRESS,
        )
        self.assertEqual(
            client.get(reverse("api_v1:correspondence-detail", args=[unrelated.id])).status_code,
            status.HTTP_404_NOT_FOUND,
        )

        route = details.data["workflow_template_details"]
        self.assertEqual(route["id"], str(template.id))
        self.assertEqual(
            [step["title"] for step in route["steps"]],
            ["Source review", "Destination review", "Expected follow-up"],
        )
        self.assertEqual(
            [step["office_name"] for step in route["steps"]],
            [source_office.name, destination_office.name, expected_office.name],
        )

        client.force_authenticate(user=recipient)
        second_handoff = client.post(
            reverse("api_v1:minute-list"),
            {
                "correspondence": str(correspondence.id),
                "workflow_template": str(template.id),
                "user_id": str(recipient.id),
                "action_type": "minute",
                "minute_text": "Second test-only workflow handoff",
                "direction": "downward",
                "step_number": 2,
                "to_office_id": str(expected_office.id),
            },
            format="json",
        )
        self.assertEqual(second_handoff.status_code, status.HTTP_201_CREATED, second_handoff.content)

        correspondence.refresh_from_db()
        self.assertEqual(correspondence.workflow_template_id, template.id)
        self.assertEqual(correspondence.current_office_id, expected_office.id)
        self.assertEqual(correspondence.current_approver_id, final_recipient.id)
        self.assertEqual(client.get(detail_url).status_code, status.HTTP_200_OK)
        self.assertEqual(correspondence.minutes.count(), 2)
        self.assertEqual(
            list(correspondence.minutes.order_by("step_number").values_list("to_office_id", flat=True)),
            [destination_office.id, expected_office.id],
        )

    def test_correspondence_template_cannot_be_replaced_by_first_minute(self):
        user = User.objects.create_user(
            username=f"workflow-route-fixed-{uuid.uuid4().hex[:8]}",
            password="test",
        )
        first_template = WorkflowTemplate.objects.create(
            name="First route",
            slug=f"first-route-{uuid.uuid4().hex[:8]}",
            applies_to=WorkflowTemplate.AppliesTo.CORRESPONDENCE,
            is_active=True,
        )
        other_template = WorkflowTemplate.objects.create(
            name="Other route",
            slug=f"other-route-{uuid.uuid4().hex[:8]}",
            applies_to=WorkflowTemplate.AppliesTo.CORRESPONDENCE,
            is_active=True,
        )
        correspondence = Correspondence.objects.create(
            reference_number=f"TEST-WF-{uuid.uuid4().hex[:8]}",
            subject="Existing route test",
            created_by=user,
            current_approver=user,
            status=Correspondence.Status.IN_PROGRESS,
            workflow_template=first_template,
        )

        serializer = MinuteSerializer(data={
            "correspondence": str(correspondence.id),
            "workflow_template": str(other_template.id),
            "user_id": str(user.id),
            "action_type": "minute",
            "minute_text": "Must not replace route",
            "direction": "downward",
            "step_number": 1,
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn("workflow_template", serializer.errors)