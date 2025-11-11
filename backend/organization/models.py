"""Models representing the NPA organizational hierarchy."""

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel, UUIDModel


class Directorate(UUIDModel, TimeStampedModel):
    """Top-level organizational unit led by an Executive Director."""

    name = models.CharField(max_length=255, unique=True)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    executive_director = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="directorates_led",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Division(UUIDModel, TimeStampedModel):
    """Division that belongs to a directorate."""

    directorate = models.ForeignKey(
        Directorate,
        on_delete=models.CASCADE,
        related_name="divisions",
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    general_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="divisions_led",
    )

    class Meta:
        unique_together = ("directorate", "name")
        ordering = ["directorate__name", "name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.directorate.code})"


class Department(UUIDModel, TimeStampedModel):
    """Department that belongs to a division."""

    division = models.ForeignKey(
        Division,
        on_delete=models.CASCADE,
        related_name="departments",
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    head_of_department = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="departments_led",
    )

    class Meta:
        unique_together = ("division", "name")
        ordering = ["division__name", "name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.division.code})"
