import uuid

import pytest
from accounts.models import User
from correspondence.models import Correspondence, Minute
from workflow.models import WorkflowTemplate, WorkflowStep

@pytest.mark.django_db
def test_correspondence_has_required_approval_level():
    c = Correspondence.objects.create(
        subject="t",
        reference_number=f"TEST-{uuid.uuid4().hex}",
        required_approval_level="executive",
    )
    assert c.required_approval_level == "executive"
    c2 = Correspondence.objects.create(subject="t2", reference_number=f"TEST-{uuid.uuid4().hex}")
    assert c2.required_approval_level == "departmental"

@pytest.mark.django_db
def test_minute_has_approval_level_and_role():
    from organization.models import Office
    office = Office.objects.first() or Office.objects.create(
        name="Approval test office",
        code=f"TEST-{uuid.uuid4().hex[:8]}",
    )
    user = User.objects.create_user(username=f"approval-test-{uuid.uuid4().hex[:8]}")
    corr = Correspondence.objects.create(
        subject="corr",
        reference_number=f"TEST-{uuid.uuid4().hex}",
        created_by=user,
    )
    m = Minute.objects.create(
        correspondence=corr,
        user=user,
        action_type="approve",
        approval_level="executive",
        approval_role="approval",
        minute_text="Approved subject to funds",
        from_office=office,
        to_office=office,
    )
    assert m.approval_level == "executive"
    assert m.approval_role == "approval"

@pytest.mark.django_db
def test_workflow_step_has_required_level():
    tpl = WorkflowTemplate.objects.create(
        name="Test Tiered",
        slug=f"test-tiered-{uuid.uuid4().hex[:8]}",
        applies_to="correspondence",
    )
    s = WorkflowStep.objects.create(template=tpl, order=1, title="MD", required_approval_level="executive")
    assert s.required_approval_level == "executive"
