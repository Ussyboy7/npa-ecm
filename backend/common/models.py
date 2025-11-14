"""Common reusable models and mixins."""

from __future__ import annotations

import uuid

from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    """Abstract base model providing created/updated timestamps."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class UUIDModel(models.Model):
    """Abstract base model that uses a UUID primary key."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class SoftDeleteQuerySet(models.QuerySet):
    """QuerySet with helpers for soft-deleted models."""

    def delete(self):
        """Soft delete queryset records."""
        return super().update(is_deleted=True, updated_at=timezone.now())

    def hard_delete(self):
        """Permanently delete records."""
        return super().delete()

    def alive(self):
        return self.filter(is_deleted=False)

    def dead(self):
        return self.filter(is_deleted=True)

    def restore(self):
        return self.update(is_deleted=False, updated_at=timezone.now())


class SoftDeleteManager(models.Manager):
    """Manager that hides soft-deleted records by default."""

    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).alive()

    def with_deleted(self):
        return SoftDeleteQuerySet(self.model, using=self._db)

    def only_deleted(self):
        return self.with_deleted().dead()


class SoftDeleteModel(models.Model):
    """Abstract model providing ``is_deleted`` flag instead of hard deletes."""

    is_deleted = models.BooleanField(default=False, db_index=True)

    objects = SoftDeleteManager()
    all_objects = SoftDeleteQuerySet.as_manager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        """Mark the instance as deleted."""
        update_fields = ["is_deleted"]
        self.is_deleted = True
        if hasattr(self, "updated_at"):
            self.updated_at = timezone.now()
            update_fields.append("updated_at")
        self.save(using=using, update_fields=update_fields)

    def restore(self, using=None):
        """Restore a soft-deleted instance."""
        update_fields = ["is_deleted"]
        self.is_deleted = False
        if hasattr(self, "updated_at"):
            self.updated_at = timezone.now()
            update_fields.append("updated_at")
        self.save(using=using, update_fields=update_fields)

    def hard_delete(self, using=None, keep_parents=False):
        """Permanently delete the instance."""
        super().delete(using=using, keep_parents=keep_parents)
