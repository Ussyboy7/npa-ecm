import pytest
from decimal import Decimal

from django.contrib.auth import get_user_model

from correspondence.models import Correspondence
from organization.models import Role

User = get_user_model()


@pytest.mark.django_db
def test_classify_auto_executive_over_threshold():
    from correspondence.services.classification import classify_required_level

    assert classify_required_level(Decimal("60000000"), False) == "executive"
    assert classify_required_level(Decimal("50000000"), False) == "executive"
    assert classify_required_level(Decimal("50000000.00"), False) == "executive"


@pytest.mark.django_db
def test_classify_auto_departmental_under_threshold():
    from correspondence.services.classification import classify_required_level

    assert classify_required_level(Decimal("1000000"), False) == "departmental"
    assert classify_required_level(Decimal("49999999"), False) == "departmental"
    assert classify_required_level(None, False) == "departmental"
    assert classify_required_level(Decimal("0"), False) == "departmental"


@pytest.mark.django_db
def test_classify_strategic_flag_forces_executive():
    from correspondence.services.classification import classify_required_level

    assert classify_required_level(Decimal("1000"), True) == "executive"
    assert classify_required_level(None, True) == "executive"
    assert classify_required_level(Decimal("0"), True) == "executive"


@pytest.mark.django_db
def test_clerk_cannot_escalate():
    from correspondence.services.classification import escalate
    from rest_framework.exceptions import PermissionDenied

    clerk_role = Role.objects.create(name="ClerkTest", permissions={"can_classify_approval": False})
    clerk = User.objects.create_user(username="clerk_classify", password="testpass123", system_role=clerk_role)
    corr = Correspondence.objects.create(subject="clerk escalate", required_approval_level="departmental")

    with pytest.raises(PermissionDenied):
        escalate(corr, clerk, "requests escalation")

    corr.refresh_from_db()
    assert corr.required_approval_level == "departmental"


@pytest.mark.django_db
def test_gm_can_escalate():
    from correspondence.services.classification import escalate

    gm_role = Role.objects.create(name="GMTest", permissions={"can_classify_approval": True})
    gm = User.objects.create_user(username="gm_classify", password="testpass123", system_role=gm_role)
    corr = Correspondence.objects.create(subject="gm escalate", required_approval_level="departmental")

    escalate(corr, gm, "executive review needed")

    corr.refresh_from_db()
    assert corr.required_approval_level == "executive"
    assert corr.classified_by_id == gm.id
    assert corr.classified_at is not None
    assert corr.classification_reason == "executive review needed"


@pytest.mark.django_db
def test_downgrade_requires_reason():
    from correspondence.services.classification import downgrade_with_reason
    from rest_framework.exceptions import ValidationError

    gm_role = Role.objects.create(name="GMDownTest", permissions={"can_classify_approval": True})
    gm = User.objects.create_user(username="gm_downgrade", password="testpass123", system_role=gm_role)
    corr = Correspondence.objects.create(subject="downgrade reason", required_approval_level="executive", amount=Decimal("60000000"))

    # empty reason should raise ValidationError
    with pytest.raises(ValidationError) as exc:
        downgrade_with_reason(corr, gm, "")
    assert "reason" in str(exc.value).lower() or "reason" in exc.value.detail

    with pytest.raises(ValidationError):
        downgrade_with_reason(corr, gm, "   ")

    # valid reason succeeds
    downgrade_with_reason(corr, gm, "not strategic, threshold misapplied")

    corr.refresh_from_db()
    assert corr.required_approval_level == "departmental"
    assert corr.classification_reason == "not strategic, threshold misapplied"
    assert corr.classified_by_id == gm.id
