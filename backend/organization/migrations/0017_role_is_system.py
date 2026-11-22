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


def _column_exists(schema_editor, table: str, column: str) -> bool:
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = %s AND column_name = %s",
            [table, column],
        )
        return cursor.fetchone() is not None


def _index_exists(schema_editor, table: str, column: str) -> bool:
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            "SELECT 1 FROM pg_indexes "
            "WHERE tablename = %s AND indexdef LIKE %s",
            [table, f"%({column})%"],
        )
        return cursor.fetchone() is not None


TABLE = "organization_role"
COLUMN = "is_system"


def add_is_system_field(apps, schema_editor):
    """Add the field, tolerating databases where it was created manually."""
    if not _column_exists(schema_editor, TABLE, COLUMN):
        schema_editor.execute(
            f'ALTER TABLE "{TABLE}" ADD COLUMN "{COLUMN}" '
            "boolean DEFAULT false NOT NULL"
        )

    if not _index_exists(schema_editor, TABLE, COLUMN):
        index_name = schema_editor._create_index_name(
            TABLE, [COLUMN], suffix=""
        )
        schema_editor.execute(
            f'CREATE INDEX IF NOT EXISTS "{index_name}" '
            f'ON "{TABLE}" ("{COLUMN}")'
        )


def remove_is_system_field(apps, schema_editor):
    schema_editor.execute(
        f'ALTER TABLE "{TABLE}" DROP COLUMN IF EXISTS "{COLUMN}"'
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
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="role",
                    name="is_system",
                    field=models.BooleanField(
                        db_index=True,
                        default=False,
                        help_text=(
                            "Seeded roles whose name and lifecycle are managed "
                            "by the application."
                        ),
                    ),
                ),
            ],
            database_operations=[
                migrations.RunPython(
                    add_is_system_field, remove_is_system_field
                ),
            ],
        ),
        migrations.RunPython(mark_system_roles, unmark_system_roles),
    ]
