from django.db import migrations, models


SYSTEM_ROLE_NAMES = (
    "Assistant",
    "Assistant General Manager",
    "Assistant Manager",
    "Executive Director",
    "General Manager",
    "Manager",
    "Managing Director",
    "Officer",
    "Officer I",
    "Officer II",
    "Personal Assistant",
    "Principal Manager",
    "Registry Officer",
    "Secretary",
    "Senior Manager",
    "Senior Officer",
    "Staff",
    "Staff I",
    "Staff II",
    "Staff III",
    "Super Admin",
    "System Administrator",
)


def mark_system_roles(apps, schema_editor):
    Role = apps.get_model("organization", "Role")
    Role.objects.filter(name__in=SYSTEM_ROLE_NAMES).update(is_system=True)


def unmark_system_roles(apps, schema_editor):
    Role = apps.get_model("organization", "Role")
    Role.objects.update(is_system=False)


class Migration(migrations.Migration):

    dependencies = [
        ("organization", "0016_use_sa_dm_reference_segment"),
    ]

    operations = [
        migrations.AddField(
            model_name="role",
            name="is_system",
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text="Seeded roles whose name and lifecycle are managed by the application.",
            ),
        ),
        migrations.RunPython(mark_system_roles, unmark_system_roles),
    ]