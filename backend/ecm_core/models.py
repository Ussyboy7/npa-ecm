"""
ECM Core Models - Main Entry Point

This file imports all ECM models from the modular structure to maintain
backward compatibility while organizing models into logical groups.

All models are now defined in separate files within the models/ directory:
- organization.py: Department, Port, OrganizationalUnit, User
- document.py: Document, DocumentVersion, DocumentMetadata, Attachment  
- document_type.py: DocumentType
- workflow.py: WorkflowTemplate, WorkflowInstance, WorkflowStep
- approval.py: ApprovalAction
- archive.py: RetentionPolicy, ArchiveRecord, LegalHold
- audit.py: AuditLog, AuditLogConfig
- integration.py: EmailIntegration, ScannerQueue, ScannerFile, APIAccessToken, APIAccessLog

This modular approach improves code organization and maintainability.
"""

# Import all models to maintain backward compatibility
from .models import *

# Re-export commonly used models for easier importing
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
    'ApprovalTemplate',
    
    # Archive models
    'RetentionPolicy',
    'ArchiveRecord',
    'LegalHold',
    
    # Audit models
    'AuditLog',
    'AuditLogConfig',
    
    # Integration models
    'EmailIntegration',
    'ScannerQueue',
    'ScannerFile',
    'APIAccessToken',
    'APIAccessLog',
]