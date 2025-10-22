"""
ECM Core Tasks - Main Entry Point

This module imports all Celery tasks from the modular task structure.
Tasks are organized by functionality:
- document_tasks.py: Document processing, OCR, indexing
- email_tasks.py: Email monitoring and processing  
- workflow_tasks.py: Workflow notifications and escalations
- retention_tasks.py: Retention policy enforcement
"""

# Import all task modules to make them discoverable by Celery
from .tasks import document_tasks  # noqa


