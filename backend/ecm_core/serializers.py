"""
ECM Core Serializers - Main Entry Point

This module imports all serializers from the modular serializer structure.
Serializers are organized by model groups for better maintainability.
"""

# Import all serializers to maintain backward compatibility
from .models import *

# Import serializers from modular structure
try:
    from .serializers.organization import (
        DepartmentSerializer, PortSerializer, OrganizationalUnitSerializer, UserSerializer
    )
    from .serializers.document import (
        DocumentSerializer, DocumentVersionSerializer, DocumentMetadataSerializer, AttachmentSerializer
    )
    from .serializers.document_type import DocumentTypeSerializer
    from .serializers.workflow import (
        WorkflowTemplateSerializer, WorkflowInstanceSerializer, WorkflowStepSerializer
    )
    from .serializers.approval import ApprovalActionSerializer, ApprovalTemplateSerializer
    from .serializers.archive import (
        RetentionPolicySerializer, ArchiveRecordSerializer, LegalHoldSerializer
    )
    from .serializers.audit import AuditLogSerializer, AuditLogConfigSerializer
    from .serializers.integration import (
        EmailIntegrationSerializer, ScannerQueueSerializer, ScannerFileSerializer,
        APIAccessTokenSerializer, APIAccessLogSerializer
    )
except ImportError:
    # Fallback serializers for basic functionality
    from rest_framework import serializers
    from .models import (
        Department, Port, OrganizationalUnit, User,
        Document, DocumentVersion, DocumentMetadata, Attachment, DocumentType,
        WorkflowTemplate, WorkflowInstance, WorkflowStep,
        ApprovalAction, RetentionPolicy, ArchiveRecord, AuditLog
    )
    
    # Basic fallback serializers
    class UserSerializer(serializers.ModelSerializer):
        full_name = serializers.SerializerMethodField()
        
        class Meta:
            model = User
            fields = [
                'id', 'username', 'email', 'first_name', 'last_name', 
                'full_name', 'role', 'department', 'phone_number', 
                'is_active', 'created_at'
            ]
            read_only_fields = ['id', 'created_at']
        
        def get_full_name(self, obj):
            return obj.get_full_name() or obj.username
    
    class DocumentSerializer(serializers.ModelSerializer):
        uploaded_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
        document_type_name = serializers.CharField(source='document_type.name', read_only=True)
        file_url = serializers.SerializerMethodField()
        
        class Meta:
            model = Document
            fields = [
                'id', 'title', 'description', 'document_number', 'file', 'file_name',
                'file_type', 'file_size', 'status', 'access_level', 'version',
                'created_by', 'uploaded_by_name', 'document_type', 'document_type_name',
                'created_at', 'updated_at', 'file_url'
            ]
            read_only_fields = [
                'id', 'file_size', 'file_type', 'version', 
                'created_at', 'updated_at', 'document_number'
            ]
        
        def get_file_url(self, obj):
            if obj.file:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.file.url)
                return obj.file.url
            return None
    
    class WorkflowInstanceSerializer(serializers.ModelSerializer):
        workflow_name = serializers.CharField(source='workflow_template.name', read_only=True)
        document_title = serializers.CharField(source='document.title', read_only=True)
        
        class Meta:
            model = WorkflowInstance
            fields = [
                'id', 'workflow_template', 'workflow_name', 'document', 'document_title',
                'status', 'current_step', 'total_steps', 'progress_percentage',
                'initiated_by', 'started_at', 'completed_at'
            ]
            read_only_fields = ['id', 'started_at', 'completed_at']


# Export commonly used serializers
__all__ = [
    # Organization serializers
    'UserSerializer',
    
    # Document serializers
    'DocumentSerializer',
    
    # Workflow serializers
    'WorkflowInstanceSerializer',
]