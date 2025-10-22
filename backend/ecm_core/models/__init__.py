"""
ECM Core Models

This module imports all ECM models to make them available through a single import.
The models are organized into logical groups:
- organization.py: Organizational structure (Department, Port, OrganizationalUnit, User)
- document.py: Core document models (Document, DocumentVersion, DocumentMetadata, Attachment)
- document_type.py: Document types and configurations
- workflow.py: Workflow engine models (WorkflowTemplate, WorkflowInstance, WorkflowStep)
- approval.py: Approval actions and history
- archive.py: Retention policies and archival
- audit.py: Comprehensive audit logging
- integration.py: External integrations (email, scanner, API)
"""

# Import all models to make them available
from .organization import Department, Port, OrganizationalUnit, User
from .document import Document, DocumentVersion, DocumentMetadata, Attachment
from .document_type import DocumentType
from .workflow import WorkflowTemplate, WorkflowInstance, WorkflowStep
from .approval import ApprovalAction
from .archive import RetentionPolicy, ArchiveRecord
from .audit import AuditLog
from .integration import EmailIntegration, ScannerQueue, APIAccessToken

# Memo and Correspondence models
from .memo import Memo, MemoComment, MemoApprovalHistory
from .correspondence import Correspondence, CorrespondenceForward, CorrespondenceComment

__all__ = [
    # Organization models
    'Department',
    'Port',
    'OrganizationalUnit',
    'User',

    # Document models
    'Document',
    'DocumentVersion',
    'DocumentMetadata',
    'Attachment',

    # Document type models
    'DocumentType',

    # Workflow models
    'WorkflowTemplate',
    'WorkflowInstance',
    'WorkflowStep',

    # Approval models
    'ApprovalAction',

    # Archive models
    'RetentionPolicy',
    'ArchiveRecord',

    # Audit models
    'AuditLog',

    # Integration models
    'EmailIntegration',
    'ScannerQueue',
    'APIAccessToken',

    # Memo models
    'Memo',
    'MemoComment',
    'MemoApprovalHistory',

    # Correspondence models
    'Correspondence',
    'CorrespondenceForward',
    'CorrespondenceComment',
]
