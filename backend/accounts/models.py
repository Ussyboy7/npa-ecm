"""Custom user model and related helpers."""

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """User model augmented with NPA-specific metadata."""

    grade_level = models.CharField(max_length=50, blank=True)
    system_role = models.CharField(max_length=100, blank=True)
    directorate = models.ForeignKey(
        "organization.Directorate",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    division = models.ForeignKey(
        "organization.Division",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    department = models.ForeignKey(
        "organization.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    is_management = models.BooleanField(default=False)
    employee_id = models.CharField(max_length=50, blank=True)

    class Meta(AbstractUser.Meta):
        ordering = ["username"]

    def __str__(self) -> str:
        return self.get_full_name() or self.username

    @property
    def display_role(self) -> str:
        """Return a human readable representation of the user's role."""

        parts = [self.system_role or ""]
        if self.grade_level:
            parts.append(self.grade_level)
        return " - ".join(filter(None, parts))
