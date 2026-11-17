"""Signal wiring that keeps sidebar counts fresh after record changes."""

from __future__ import annotations

from django.db.models.signals import post_delete, post_save

from .sidebar_counts_cache import invalidate_sidebar_counts_cache


def _invalidate_sidebar_counts_cache(sender, instance, **kwargs) -> None:
    invalidate_sidebar_counts_cache()


def connect_sidebar_counts_invalidation() -> None:
    """Connect relevant model writes to the sidebar-count cache version."""
    from django.apps import apps

    model_labels = (
        ("correspondence", "Correspondence"),
        ("correspondence", "Minute"),
        ("correspondence", "ReadReceipt"),
        ("correspondence", "DispatchRecord"),
        ("correspondence", "CorrespondenceDistribution"),
        ("correspondence", "CorrespondenceDelegation"),
        ("correspondence", "CorrespondenceDraft"),
        ("correspondence", "Case"),
        ("dms", "Document"),
        ("dms", "FormDocument"),
        ("forms", "FormSignature"),
    )

    for app_label, model_name in model_labels:
        model = apps.get_model(app_label, model_name)
        dispatch_id = f"sidebar_counts_{app_label}_{model_name}"
        post_save.connect(
            _invalidate_sidebar_counts_cache,
            sender=model,
            dispatch_uid=f"{dispatch_id}_save",
            weak=False,
        )
        post_delete.connect(
            _invalidate_sidebar_counts_cache,
            sender=model,
            dispatch_uid=f"{dispatch_id}_delete",
            weak=False,
        )
