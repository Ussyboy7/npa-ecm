# NPA ECM Module Implementation Plan

**Date:** January 2025  
**Status:** Planning Phase  
**Priority Modules:** Content Capture, Records Management, Advanced Search, Integration Hub

---

## Executive Summary

This document provides detailed implementation plans for the 8 critical module enhancements identified in the ECM Module Comparison. Each module includes architecture, implementation steps, dependencies, and timelines.

---

## 1. Content Capture Module (OCR, Scanning, Intelligent Processing)

### Priority: 🔴 **HIGH** (Critical for ECM completeness)

### Overview
Add OCR capabilities, document scanning integration, batch processing, and intelligent metadata extraction to match industry-standard ECM solutions.

### Architecture

```
backend/
├── capture/
│   ├── models.py          # CaptureJob, OCRResult, ScanSession
│   ├── services.py        # OCRService, ScanService, BatchProcessor
│   ├── views.py           # CaptureViewSet, OCRViewSet
│   ├── tasks.py            # Celery tasks for async OCR
│   ├── processors/
│   │   ├── ocr_processor.py    # Tesseract/Google Vision OCR
│   │   ├── scanner_processor.py # Scanner integration
│   │   └── metadata_extractor.py # Intelligent metadata extraction
│   └── urls.py
```

### Implementation Steps

#### Phase 1: OCR Foundation (Week 1-2)
1. **Create `capture` Django app**
   ```bash
   python manage.py startapp capture
   ```

2. **Install OCR dependencies**
   ```python
   # requirements.txt additions
   pytesseract==0.3.10
   Pillow==10.0.0
   pdf2image==1.16.3
   # Optional: Google Vision API
   google-cloud-vision==3.4.4
   ```

3. **Create models**
   ```python
   # backend/capture/models.py
   class CaptureJob(UUIDModel, TimeStampedModel):
       document = ForeignKey(Document, on_delete=CASCADE)
       job_type = CharField(choices=['ocr', 'scan', 'batch'])
       status = CharField(choices=['pending', 'processing', 'completed', 'failed'])
       result = JSONField(null=True)
       error_message = TextField(null=True)
   
   class OCRResult(UUIDModel, TimeStampedModel):
       capture_job = ForeignKey(CaptureJob)
       extracted_text = TextField()
       confidence_score = FloatField()
       language = CharField(max_length=10)
   ```

4. **Create OCR service**
   ```python
   # backend/capture/services.py
   class OCRService:
       @staticmethod
       def process_document(document_id: str) -> OCRResult:
           # Use Tesseract or Google Vision API
           pass
   ```

#### Phase 2: Scanner Integration (Week 3)
1. **Scanner API integration**
   - Support for TWAIN, WIA, SANE scanners
   - REST API endpoints for scanner control
   - Scan-to-ECM workflow

2. **Frontend scanner interface**
   - Scanner selection
   - Scan settings (DPI, color mode)
   - Preview before upload

#### Phase 3: Batch Processing (Week 4)
1. **Batch upload processor**
   - Process multiple files simultaneously
   - Progress tracking
   - Error handling per file

2. **Celery tasks**
   ```python
   @shared_task
   def process_batch_upload(file_ids: List[str]):
       # Process multiple files in background
       pass
   ```

#### Phase 4: Metadata Extraction (Week 5-6)
1. **Intelligent extraction**
   - Extract dates, reference numbers, names
   - Auto-classify document types
   - Extract key-value pairs from forms

2. **Machine learning integration** (optional)
   - Train models for document classification
   - Named entity recognition (NER)

### Dependencies
- Tesseract OCR installed on server
- Celery workers for async processing
- Storage for OCR results

### Frontend Components
- `DocumentCaptureDialog.tsx` - Upload/scan interface
- `OCRResultsView.tsx` - Display extracted text
- `BatchUploadProgress.tsx` - Batch processing UI

### API Endpoints
```
POST /api/v1/capture/ocr/          # Process OCR
POST /api/v1/capture/scan/          # Scan document
POST /api/v1/capture/batch/         # Batch processing
GET  /api/v1/capture/jobs/{id}/     # Get job status
```

### Timeline: **6 weeks**

---

## 2. Records Management Module (Retention, Legal Hold, Disposition)

### Priority: 🔴 **HIGH** (Compliance critical)

### Overview
Implement automated records retention policies, legal hold functionality, and disposition workflows for compliance and governance.

### Architecture

```
backend/
├── records/
│   ├── models.py          # RetentionPolicy, LegalHold, Disposition
│   ├── services.py        # RetentionService, LegalHoldService
│   ├── views.py           # RecordsViewSet, RetentionPolicyViewSet
│   ├── tasks.py            # Celery tasks for retention checks
│   ├── policies/
│   │   ├── retention_engine.py    # Retention policy engine
│   │   ├── disposition_engine.py  # Disposition workflow
│   │   └── compliance_reporter.py # Compliance reporting
│   └── urls.py
```

### Implementation Steps

#### Phase 1: Retention Policies (Week 1-2)
1. **Create `records` Django app**
   ```bash
   python manage.py startapp records
   ```

2. **Create models**
   ```python
   # backend/records/models.py
   class RetentionPolicy(UUIDModel, TimeStampedModel):
       name = CharField(max_length=255)
       description = TextField()
       retention_period_days = IntegerField()
       trigger_event = CharField(choices=['creation', 'completion', 'last_access'])
       disposition_action = CharField(choices=['archive', 'delete', 'review'])
       applies_to = CharField(choices=['document', 'correspondence', 'all'])
       is_active = BooleanField(default=True)
   
   class LegalHold(UUIDModel, TimeStampedModel):
       name = CharField(max_length=255)
       reason = TextField()
       start_date = DateTimeField()
       end_date = DateTimeField(null=True)
       documents = ManyToManyField(Document)
       correspondences = ManyToManyField(Correspondence)
       is_active = BooleanField(default=True)
   
   class Disposition(UUIDModel, TimeStampedModel):
       document = ForeignKey(Document, on_delete=CASCADE)
       policy = ForeignKey(RetentionPolicy)
       scheduled_date = DateTimeField()
       action = CharField(choices=['archive', 'delete', 'review'])
       status = CharField(choices=['pending', 'completed', 'cancelled'])
   ```

3. **Retention policy engine**
   ```python
   # backend/records/services.py
   class RetentionService:
       @staticmethod
       def apply_policy(document_id: str, policy_id: str):
           # Calculate retention date
           # Schedule disposition
           pass
       
       @staticmethod
       def check_retention_dates():
           # Daily task to check expired retention
           # Trigger disposition actions
           pass
   ```

#### Phase 2: Legal Hold (Week 3)
1. **Legal hold functionality**
   - Create/update/delete legal holds
   - Prevent deletion/archival during hold
   - Notify users of legal holds
   - Track hold history

2. **Integration with DMS**
   - Override retention policies when legal hold exists
   - Block deletion operations
   - Audit all hold-related actions

#### Phase 3: Disposition Workflows (Week 4)
1. **Disposition engine**
   - Automatic disposition scheduling
   - Review workflows before deletion
   - Approval required for sensitive documents
   - Disposition audit trail

2. **Celery scheduled tasks**
   ```python
   @periodic_task(run_every=crontab(hour=2, minute=0))
   def process_dispositions():
       # Check for documents ready for disposition
       # Execute disposition actions
       pass
   ```

#### Phase 4: Compliance Reporting (Week 5)
1. **Compliance dashboard**
   - Retention policy compliance
   - Legal hold status
   - Disposition history
   - Audit reports

2. **Export capabilities**
   - PDF compliance reports
   - Excel exports for audits

### Dependencies
- Celery beat for scheduled tasks
- Integration with DMS and Correspondence modules

### Frontend Components
- `RetentionPolicyManager.tsx` - Policy CRUD
- `LegalHoldManager.tsx` - Legal hold management
- `DispositionQueue.tsx` - Pending dispositions
- `ComplianceDashboard.tsx` - Compliance metrics

### API Endpoints
```
POST   /api/v1/records/policies/           # Create retention policy
GET    /api/v1/records/policies/           # List policies
POST   /api/v1/records/legal-holds/        # Create legal hold
GET    /api/v1/records/dispositions/       # List dispositions
POST   /api/v1/records/dispositions/{id}/execute/  # Execute disposition
GET    /api/v1/records/compliance/         # Compliance report
```

### Timeline: **5 weeks**

---

## 3. Advanced Search Module (Full-Text, Semantic, Intelligent Discovery)

### Priority: 🟡 **MEDIUM-HIGH** (User experience critical)

### Overview
Implement full-text search, advanced filters, saved searches, and intelligent document discovery.

### Architecture

**Option A: PostgreSQL Full-Text Search** (Recommended for start)
```
backend/
├── search/
│   ├── models.py          # SavedSearch, SearchHistory
│   ├── services.py         # SearchService, FullTextSearchService
│   ├── views.py            # SearchViewSet
│   └── urls.py
```

**Option B: Elasticsearch Integration** (For scale)
```
backend/
├── search/
│   ├── elasticsearch_client.py  # ES client wrapper
│   ├── indexers.py              # Document indexers
│   └── services.py              # Search service
```

### Implementation Steps

#### Phase 1: PostgreSQL Full-Text Search (Week 1-2)
1. **Create `search` Django app**
   ```bash
   python manage.py startapp search
   ```

2. **Add full-text search to Document model**
   ```python
   # backend/dms/models.py
   class Document(UUIDModel, TimeStampedModel):
       # ... existing fields ...
       
       # Add search vector field
       search_vector = SearchVectorField(null=True)
       
       class Meta:
           indexes = [
               GinIndex(fields=['search_vector']),  # GIN index for fast search
           ]
   ```

3. **Create search service**
   ```python
   # backend/search/services.py
   from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
   
   class SearchService:
       @staticmethod
       def full_text_search(query: str, filters: dict = None):
           # Full-text search with ranking
           search_vector = SearchVector('title', weight='A') + \
                          SearchVector('description', weight='B') + \
                          SearchVector('tags', weight='C')
           search_query = SearchQuery(query)
           
           results = Document.objects.annotate(
               search=search_vector,
               rank=SearchRank(search_vector, search_query)
           ).filter(search=search_query).order_by('-rank')
           
           return results
   ```

4. **Migration**
   ```python
   # Create migration to add search_vector
   python manage.py makemigrations
   python manage.py migrate
   ```

#### Phase 2: Advanced Filters (Week 2-3)
1. **Filter builder**
   - Date range filters
   - Author filters
   - Document type filters
   - Status filters
   - Tag filters
   - Custom metadata filters

2. **Filter combinations**
   - AND/OR logic
   - Nested filters
   - Filter presets

#### Phase 3: Saved Searches (Week 3-4)
1. **Saved search model**
   ```python
   # backend/search/models.py
   class SavedSearch(UUIDModel, TimeStampedModel):
       user = ForeignKey(User, on_delete=CASCADE)
       name = CharField(max_length=255)
       query = CharField(max_length=500)
       filters = JSONField()
       is_shared = BooleanField(default=False)
   ```

2. **Search history**
   - Track recent searches
   - Suggest based on history
   - Auto-complete suggestions

#### Phase 4: Search Within Documents (Week 4-5)
1. **Index document content**
   - Extract text from PDFs (using OCR results)
   - Index Word document content
   - Search within document bodies

2. **Highlight search results**
   - Highlight matching text in preview
   - Show context snippets

#### Phase 5: Elasticsearch Migration (Optional, Week 6-8)
1. **Elasticsearch setup**
   - Install and configure ES
   - Create document index
   - Index existing documents

2. **Advanced features**
   - Faceted search
   - Aggregations
   - Fuzzy matching
   - Synonym support

### Dependencies
- PostgreSQL (for full-text search)
- Optional: Elasticsearch (for advanced features)
- OCR results (for search within documents)

### Frontend Components
- `AdvancedSearchBar.tsx` - Search input with autocomplete
- `SearchFilters.tsx` - Filter panel
- `SearchResults.tsx` - Results display with highlighting
- `SavedSearches.tsx` - Manage saved searches
- `SearchHistory.tsx` - Recent searches

### API Endpoints
```
GET  /api/v1/search/                    # Full-text search
GET  /api/v1/search/suggestions/         # Autocomplete suggestions
POST /api/v1/search/saved/               # Create saved search
GET  /api/v1/search/saved/               # List saved searches
GET  /api/v1/search/history/            # Search history
```

### Timeline: **5-8 weeks** (depending on Elasticsearch)

---

## 4. Integration Hub Module (Webhooks, Email, ERP Connectors)

### Priority: 🟡 **MEDIUM** (Strategic value)

### Overview
Create a centralized integration hub for webhooks, email gateway, ERP connectors, and external system integrations.

### Architecture

```
backend/
├── integrations/
│   ├── models.py          # Integration, Webhook, Connector
│   ├── services.py        # WebhookService, EmailService, ERPConnector
│   ├── views.py           # IntegrationViewSet, WebhookViewSet
│   ├── connectors/
│   │   ├── email_connector.py      # Email gateway
│   │   ├── erp_connector.py        # Oracle ERP connector
│   │   ├── webhook_handler.py      # Webhook processor
│   │   └── sso_connector.py        # SSO/SAML
│   ├── webhooks/
│   │   ├── handlers.py             # Webhook event handlers
│   │   └── validators.py           # Webhook validation
│   └── urls.py
```

### Implementation Steps

#### Phase 1: Webhook Infrastructure (Week 1-2)
1. **Create `integrations` Django app**
   ```bash
   python manage.py startapp integrations
   ```

2. **Webhook models**
   ```python
   # backend/integrations/models.py
   class Webhook(UUIDModel, TimeStampedModel):
       name = CharField(max_length=255)
       url = URLField()
       events = JSONField()  # ['document.created', 'correspondence.completed']
       secret = CharField(max_length=255)  # For signature validation
       is_active = BooleanField(default=True)
       retry_count = IntegerField(default=3)
   
   class WebhookEvent(UUIDModel, TimeStampedModel):
       webhook = ForeignKey(Webhook, on_delete=CASCADE)
       event_type = CharField(max_length=100)
       payload = JSONField()
       status = CharField(choices=['pending', 'sent', 'failed'])
       response_code = IntegerField(null=True)
       response_body = TextField(null=True)
   ```

3. **Webhook service**
   ```python
   # backend/integrations/services.py
   class WebhookService:
       @staticmethod
       def trigger_event(event_type: str, data: dict):
           # Find matching webhooks
           # Send webhook requests
           # Handle retries
           pass
   ```

4. **Signal handlers**
   ```python
   # backend/integrations/signals.py
   @receiver(post_save, sender=Document)
   def document_created_webhook(sender, instance, created, **kwargs):
       if created:
           WebhookService.trigger_event('document.created', {
               'id': str(instance.id),
               'title': instance.title,
               # ... other fields
           })
   ```

#### Phase 2: Email Gateway (Week 3-4)
1. **Email connector**
   ```python
   # backend/integrations/connectors/email_connector.py
   class EmailConnector:
       def receive_email(self, email_data):
           # Parse incoming email
           # Create correspondence or document
           # Extract attachments
           pass
       
       def send_email(self, to, subject, body, attachments):
           # Send email via SMTP
           # Track delivery status
           pass
   ```

2. **Email integration**
   - Incoming: Create correspondence from email
   - Outgoing: Send correspondence via email
   - Attachments: Auto-upload to DMS
   - Threading: Link related emails

3. **IMAP/POP3 integration**
   - Poll email accounts
   - Process incoming emails
   - Auto-create documents/correspondence

#### Phase 3: ERP Connector (Week 5-6)
1. **Oracle ERP connector**
   ```python
   # backend/integrations/connectors/erp_connector.py
   class OracleERPConnector:
       def sync_documents(self):
           # Fetch documents from Oracle
           # Create/update in ECM
           pass
       
       def push_document(self, document_id):
           # Send document to Oracle
           # Update Oracle records
           pass
   ```

2. **ERP integration points**
   - Document sync (bidirectional)
   - Metadata mapping
   - Approval workflow integration
   - Status synchronization

#### Phase 4: SSO/SAML (Week 7)
1. **SAML integration**
   - Install `python3-saml` or `django-saml2`
   - Configure identity provider
   - Single sign-on support

2. **OAuth2 support**
   - OAuth2 provider
   - OAuth2 client for external systems

### Dependencies
- Celery for async webhook delivery
- Email server (SMTP/IMAP)
- ERP API access
- SAML library

### Frontend Components
- `IntegrationHub.tsx` - Integration management dashboard
- `WebhookManager.tsx` - Webhook CRUD
- `EmailConnectorSettings.tsx` - Email configuration
- `ERPConnectorSettings.tsx` - ERP configuration
- `IntegrationLogs.tsx` - Integration activity logs

### API Endpoints
```
POST   /api/v1/integrations/webhooks/          # Create webhook
GET    /api/v1/integrations/webhooks/          # List webhooks
POST   /api/v1/integrations/webhooks/{id}/test/ # Test webhook
POST   /api/v1/integrations/email/send/        # Send email
POST   /api/v1/integrations/erp/sync/          # Sync with ERP
GET    /api/v1/integrations/logs/              # Integration logs
```

### Timeline: **7 weeks**

---

## 5. Workflow Enhancement (Visual Designer, Rules Engine)

### Priority: 🟡 **MEDIUM** (User experience)

### Overview
Add visual workflow designer and rules engine for conditional routing and automation.

### Architecture

```
backend/
├── workflow/
│   ├── models.py          # WorkflowTemplate, WorkflowRule, WorkflowNode
│   ├── services.py        # WorkflowEngine, RulesEngine
│   ├── views.py           # WorkflowDesignerViewSet
│   ├── engine/
│   │   ├── workflow_executor.py    # Execute workflows
│   │   ├── rules_engine.py          # Evaluate rules
│   │   └── condition_evaluator.py  # Evaluate conditions
│   └── urls.py

frontend/
├── components/
│   └── workflow/
│       ├── WorkflowDesigner.tsx     # Visual designer
│       ├── WorkflowCanvas.tsx      # Canvas component
│       ├── WorkflowNode.tsx        # Node component
│       └── RulesBuilder.tsx        # Rules builder
```

### Implementation Steps

#### Phase 1: Rules Engine (Week 1-2)
1. **Rule model**
   ```python
   # backend/workflow/models.py
   class WorkflowRule(UUIDModel, TimeStampedModel):
       workflow = ForeignKey(WorkflowTemplate)
       name = CharField(max_length=255)
       condition = JSONField()  # {field: 'priority', operator: 'equals', value: 'urgent'}
       action = JSONField()      # {type: 'route', target: 'office_id'}
       priority = IntegerField()  # Rule evaluation order
   ```

2. **Rules engine**
   ```python
   # backend/workflow/engine/rules_engine.py
   class RulesEngine:
       def evaluate(self, rules: List[WorkflowRule], context: dict):
           # Evaluate rules in priority order
           # Return matching rule
           pass
   ```

#### Phase 2: Visual Designer (Week 3-5)
1. **Workflow node model**
   ```python
   class WorkflowNode(UUIDModel, TimeStampedModel):
       workflow = ForeignKey(WorkflowTemplate)
       node_type = CharField(choices=['start', 'approval', 'condition', 'end'])
       position_x = FloatField()
       position_y = FloatField()
       config = JSONField()  # Node-specific configuration
   ```

2. **Frontend designer**
   - Use React Flow or similar library
   - Drag-and-drop nodes
   - Connect nodes with edges
   - Save workflow structure

3. **Workflow execution**
   - Parse visual workflow
   - Execute nodes in order
   - Handle conditional branches

### Timeline: **5 weeks**

---

## 6. Content Types & Template Management Enhancement

### Priority: 🟢 **LOW-MEDIUM** (Nice to have)

### Overview
Enhance template system with advanced content types, template versioning, and template approval workflows.

### Implementation Steps

#### Phase 1: Content Types (Week 1-2)
1. **Content type model**
   ```python
   # backend/dms/models.py
   class ContentType(UUIDModel, TimeStampedModel):
       name = CharField(max_length=255)
       description = TextField()
       metadata_schema = JSONField()  # Required fields
       workflow_template = ForeignKey(WorkflowTemplate, null=True)
       is_active = BooleanField(default=True)
   ```

2. **Template versioning**
   - Track template versions
   - Allow template updates
   - Maintain backward compatibility

#### Phase 2: Template Library (Week 2-3)
1. **Template management**
   - Template categories
   - Template search
   - Template preview
   - Template approval workflow

### Timeline: **3 weeks**

---

## 7. Records Retention Module

### Priority: 🔴 **HIGH** (Compliance)

**Note:** This overlaps with Records Management Module (#2). Should be implemented together.

See **Records Management Module** section above for implementation details.

---

## 8. Metadata Management & Content Types Enhancement

### Priority: 🟡 **MEDIUM** (User experience)

**Note:** This overlaps with Content Types & Template Management (#6).

See **Content Types & Template Management** section above.

---

## Implementation Roadmap

### Q1 2025 (Weeks 1-13)
1. **Content Capture Module** (6 weeks)
2. **Records Management Module** (5 weeks)
3. **Advanced Search Module** (5 weeks) - Start in parallel

### Q2 2025 (Weeks 14-26)
4. **Integration Hub Module** (7 weeks)
5. **Workflow Enhancement** (5 weeks)
6. **Content Types Enhancement** (3 weeks)

### Q3 2025
7. **Mobile Module** (6-8 weeks)
8. **Security Enhancements** (4-6 weeks)

---

## Dependencies & Prerequisites

### Infrastructure
- ✅ Celery workers (already configured)
- ✅ Redis (already configured)
- ✅ PostgreSQL (already configured)
- ⚠️ Tesseract OCR (need to install)
- ⚠️ Optional: Elasticsearch (for advanced search)

### Python Packages
```python
# requirements.txt additions
pytesseract==0.3.10
Pillow==10.0.0
pdf2image==1.16.3
django-celery-beat==2.5.0  # For scheduled tasks
requests==2.31.0  # For webhooks
# Optional
elasticsearch==8.10.0
google-cloud-vision==3.4.4
```

### Frontend Packages
```json
{
  "react-flow-renderer": "^10.3.17",  // For workflow designer
  "react-pdf": "^7.5.1",              // For PDF preview
  "@elastic/react-search-ui": "^1.11.0"  // Optional: ES search UI
}
```

---

## Success Metrics

### Content Capture
- ✅ OCR accuracy > 90%
- ✅ Processing time < 30 seconds per document
- ✅ Batch processing supports 100+ documents

### Records Management
- ✅ 100% retention policy compliance
- ✅ Legal hold prevents all deletions
- ✅ Automated disposition reduces manual work by 80%

### Advanced Search
- ✅ Search response time < 500ms
- ✅ Search accuracy > 95%
- ✅ 50% of users use saved searches

### Integration Hub
- ✅ Webhook delivery success rate > 99%
- ✅ Email integration processes 1000+ emails/day
- ✅ ERP sync latency < 5 minutes

---

## Risk Mitigation

### Technical Risks
1. **OCR Accuracy** - Use multiple OCR engines, allow manual correction
2. **Performance** - Implement caching, async processing
3. **Integration Complexity** - Start with simple integrations, iterate

### Business Risks
1. **User Adoption** - Provide training, clear documentation
2. **Compliance** - Work with legal/compliance team
3. **Data Migration** - Plan migration strategy for existing data

---

## Next Steps

1. **Review and approve** this implementation plan
2. **Prioritize modules** based on business needs
3. **Allocate resources** (developers, infrastructure)
4. **Create detailed tickets** for each module
5. **Set up development environment** (Tesseract, etc.)
6. **Begin Phase 1** implementation

---

**Last Updated:** January 2025  
**Status:** Ready for Implementation

