"""Signals for DMS models."""

from __future__ import annotations

from django.contrib.postgres.search import SearchVector
from django.db.models.signals import post_save
from django.dispatch import receiver

from dms.models import Document


@receiver(post_save, sender=Document)
def update_document_search_vector(sender, instance, **kwargs):
    """
    Update search vector when document is created or updated.
    """
    # Build search vector
    search_vector = (
        SearchVector("title", weight="A", config="english")
        + SearchVector("description", weight="B", config="english")
        + SearchVector("reference_number", weight="A", config="english")
        + SearchVector("tags", weight="C", config="english")
    )

    # Update search vector (using update to avoid recursion)
    Document.objects.filter(id=instance.id).update(search_vector=search_vector)

