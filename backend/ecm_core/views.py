"""
ECM Core Views

REST API views for the Electronic Content Management system.
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from .models import (
    User, Document, DocumentType, WorkflowInstance, 
    Department, Port, WorkflowTemplate, AuditLog
)
from .serializers import (
    UserSerializer, DocumentSerializer, WorkflowInstanceSerializer
)


class UserViewSet(viewsets.ModelViewSet):
    """User management endpoints"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'department', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['created_at', 'username']


class CategoryViewSet(viewsets.ModelViewSet):
    """Category/Folder management endpoints"""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['parent']
    search_fields = ['name', 'description']
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class DocumentViewSet(viewsets.ModelViewSet):
    """Document management endpoints"""
    queryset = Document.objects.filter(is_deleted=False)
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['document_type', 'status', 'access_level', 'created_by', 'originating_department']
    search_fields = ['title', 'description', 'keywords', 'ocr_text']
    ordering_fields = ['created_at', 'title', 'file_size']
    
    def perform_create(self, serializer):
        document = serializer.save(created_by=self.request.user)
        # Trigger async OCR processing
        from .tasks.document_tasks import process_document_ocr
        process_document_ocr.delay(str(document.id))
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a document"""
        document = self.get_object()
        document.status = 'approved'
        document.approved_by = request.user
        document.approved_at = timezone.now()
        document.save()
        
        AuditLog.objects.create(
            user=request.user,
            content_object=document,
            action_type='document_approve',
            description=f'Document approved by {request.user.get_full_name()}'
        )
        
        return Response({'status': 'approved'})
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a document"""
        document = self.get_object()
        document.status = 'rejected'
        document.save()
        
        AuditLog.objects.create(
            user=request.user,
            content_object=document,
            action_type='document_reject',
            description=f'Document rejected by {request.user.get_full_name()}'
        )
        
        return Response({'status': 'rejected'})
    
    @action(detail=True, methods=['post'])
    def download(self, request, pk=None):
        """Track document downloads"""
        document = self.get_object()
        document.download_count += 1
        document.save()
        
        AuditLog.objects.create(
            user=request.user,
            content_object=document,
            action_type='document_download',
            description=f'Document downloaded',
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        return Response({'download_url': document.file.url})
    
    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        """Get all versions of a document"""
        document = self.get_object()
        versions = Document.objects.filter(parent_document=document)
        serializer = self.get_serializer(versions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def create_version(self, request, pk=None):
        """Create a new version of document"""
        parent = self.get_object()
        
        # Create new version
        new_version = Document.objects.create(
            title=parent.title,
            description=parent.description,
            file=request.FILES.get('file'),
            category=parent.category,
            parent_document=parent,
            version=parent.version + 1,
            uploaded_by=request.user,
            status='draft'
        )
        
        serializer = self.get_serializer(new_version)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DocumentShareViewSet(viewsets.ModelViewSet):
    """Document sharing endpoints"""
    queryset = DocumentShare.objects.all()
    serializer_class = DocumentShareSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['document', 'shared_with', 'permission', 'is_active']
    
    def perform_create(self, serializer):
        share = serializer.save(shared_by=self.request.user)
        
        AuditLog.objects.create(
            user=self.request.user,
            document=share.document,
            action='share',
            description=f'Document shared with {share.shared_with.get_full_name()}'
        )


class DocumentCommentViewSet(viewsets.ModelViewSet):
    """Document comment endpoints"""
    queryset = DocumentComment.objects.all()
    serializer_class = DocumentCommentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['document', 'user', 'is_resolved']
    
    def perform_create(self, serializer):
        comment = serializer.save(user=self.request.user)
        
        AuditLog.objects.create(
            user=self.request.user,
            document=comment.document,
            action='comment',
            description=f'Comment added'
        )


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Audit log endpoints (read-only)"""
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['user', 'document', 'action']
    ordering_fields = ['created_at']


class WorkflowViewSet(viewsets.ModelViewSet):
    """Workflow management endpoints"""
    queryset = Workflow.objects.all()
    serializer_class = WorkflowSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class WorkflowInstanceViewSet(viewsets.ModelViewSet):
    """Workflow instance endpoints"""
    queryset = WorkflowInstance.objects.all()
    serializer_class = WorkflowInstanceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['workflow', 'document', 'status']


