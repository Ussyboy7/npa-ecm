import pytest
from correspondence.models import Correspondence, Minute
from workflow.models import WorkflowTemplate, WorkflowStep

@pytest.mark.django_db
def test_correspondence_has_required_approval_level():
    c = Correspondence.objects.create(subject="t", required_approval_level="executive")
    assert c.required_approval_level == "executive"
    c2 = Correspondence.objects.create(subject="t2")
    assert c2.required_approval_level == "departmental"

@pytest.mark.django_db
def test_minute_has_approval_level_and_role():
    from organization.models import Office
    corr = Correspondence.objects.first() or Correspondence.objects.create(subject="corr")
    office = Office.objects.first()
    m = Minute.objects.create(
        correspondence=corr, action_type="approve",
        approval_level="executive", approval_role="approval", minute_text="Approved subject to funds",
        from_office=office, to_office=office
    )
    assert m.approval_level == "executive"
    assert m.approval_role == "approval"

@pytest.mark.django_db
def test_workflow_step_has_required_level():
    tpl = WorkflowTemplate.objects.create(name="Test Tiered", slug="test-tiered-2", applies_to="correspondence")
    s = WorkflowStep.objects.create(template=tpl, order=1, title="MD", required_approval_level="executive")
    assert s.required_approval_level == "executive"
