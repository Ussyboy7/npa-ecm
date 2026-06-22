from django.db import migrations


def find_office_head_cursor(cursor, office_id):
    """Find the office head user ID for a given office."""
    cursor.execute("""
        SELECT u.id FROM organization_officemembership om
        JOIN accounts_user u ON om.user_id = u.id
        WHERE om.office_id = %s
        AND om.is_active = TRUE
        ORDER BY 
            CASE om.assignment_role
                WHEN 'principal' THEN 0
                WHEN 'acting' THEN 1
                ELSE 2
            END,
            om.is_primary DESC
        LIMIT 1
    """, [office_id])
    row = cursor.fetchone()
    return row[0] if row else None


def backfill_current_approver(apps, schema_editor):
    """Set correspondence.current_approver to the office head of current_office if not correct."""
    from django.db import connection
    with connection.cursor() as cursor:
        # Get correspondence where current_office is set but current_approver doesn't match
        cursor.execute("""
            SELECT c.id, c.current_office_id, c.current_approver_id
            FROM correspondence_correspondence c
            WHERE c.current_office_id IS NOT NULL
            AND c.current_approver_id IS NOT NULL
        """)
        rows = cursor.fetchall()

        updated = 0
        for corr_id, office_id, current_approver_id in rows:
            user_id = find_office_head_cursor(cursor, office_id)
            if user_id and user_id != current_approver_id:
                cursor.execute("""
                    UPDATE correspondence_correspondence
                    SET current_approver_id = %s, updated_at = NOW()
                    WHERE id = %s
                """, [user_id, corr_id])
                updated += cursor.rowcount

        print(f"Updated current_approver for {updated} correspondence(s)")


def reverse_backfill(apps, schema_editor):
    """Reverse - no-op."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('correspondence', '0042_backfill_correspondence_current_office'),
    ]

    operations = [
        migrations.RunPython(backfill_current_approver, reverse_backfill),
    ]
