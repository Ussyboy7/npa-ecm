"""
Reference Number Generator Utilities

Generate unique reference numbers for memos and correspondence.
"""

from django.utils import timezone


def generate_memo_reference(department_code, year=None):
    """
    Generate memo reference: NPA/ICT/2025/0012

    Args:
        department_code: Department code (e.g., 'ICT', 'HR')
        year: Year to use, defaults to current year

    Returns:
        str: Formatted reference number
    """
    from ..models.memo import Memo

    year = year or timezone.now().year
    sequence = Memo.objects.filter(
        department__code=department_code,
        created_at__year=year
    ).count() + 1

    return f"NPA/{department_code}/{year}/{sequence:04d}"


def generate_correspondence_reference(correspondence_type, year=None):
    """
    Generate correspondence reference: NPA/CORR/IN/2025/0045

    Args:
        correspondence_type: 'incoming' or 'outgoing'
        year: Year to use, defaults to current year

    Returns:
        str: Formatted reference number
    """
    from ..models.correspondence import Correspondence

    year = year or timezone.now().year
    type_prefix = 'IN' if correspondence_type == 'incoming' else 'OUT'

    sequence = Correspondence.objects.filter(
        correspondence_type=correspondence_type,
        registered_at__year=year
    ).count() + 1

    return f"NPA/CORR/{type_prefix}/{year}/{sequence:04d}"


def generate_attachment_reference(document_type, year=None):
    """
    Generate attachment reference: NPA/ATT/2025/0123

    Args:
        document_type: Type of document ('memo', 'correspondence', etc.)
        year: Year to use, defaults to current year

    Returns:
        str: Formatted reference number
    """
    from ..models.document import Attachment

    year = year or timezone.now().year

    sequence = Attachment.objects.filter(
        uploaded_at__year=year
    ).count() + 1

    return f"NPA/ATT/{year}/{sequence:04d}"


def generate_workflow_reference(workflow_type, year=None):
    """
    Generate workflow reference: NPA/WF/APPROVAL/2025/0056

    Args:
        workflow_type: Type of workflow ('approval', 'review', etc.)
        year: Year to use, defaults to current year

    Returns:
        str: Formatted reference number
    """
    from ..models.workflow import WorkflowInstance

    year = year or timezone.now().year
    type_code = workflow_type.upper()[:3]  # First 3 chars

    sequence = WorkflowInstance.objects.filter(
        created_at__year=year
    ).count() + 1

    return f"NPA/WF/{type_code}/{year}/{sequence:04d}"

