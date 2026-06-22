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


def backfill_current_office_and_approver(apps, schema_editor):
    """Set correspondence.current_office and current_approver to the latest minute's target."""
    from django.db import connection
    with connection.cursor() as cursor:
        # Get all correspondence where current_office IS NULL but there's a minute with to_office
        cursor.execute("""
            SELECT DISTINCT ON (m.correspondence_id)
                m.correspondence_id,
                m.to_office_id
            FROM correspondence_minute m
            JOIN correspondence_correspondence c ON c.id = m.correspondence_id
            WHERE m.to_office_id IS NOT NULL
            AND c.current_office_id IS NULL
            ORDER BY m.correspondence_id, m.timestamp DESC
        """)
        rows = cursor.fetchall()

        updated_office = 0
        updated_approver = 0

        for corr_id, office_id in rows:
            # Set current_office
            cursor.execute("""
                UPDATE correspondence_correspondence
                SET current_office_id = %s, updated_at = NOW()
                WHERE id = %s AND current_office_id IS NULL
            """, [office_id, corr_id])
            updated_office += cursor.rowcount

            # Find and set current_approver to office head
            user_id = find_office_head_cursor(cursor, office_id)
            if user_id:
                cursor.execute("""
                    UPDATE correspondence_correspondence
                    SET current_approver_id = %s, updated_at = NOW()
                    WHERE id = %s
                    AND current_approver_id != %s
                """, [user_id, corr_id, user_id])
                updated_approver += cursor.rowcount

        print(f"Backfilled current_office for {updated_office} correspondence(s)")
        print(f"Backfilled current_approver for {updated_approver} correspondence(s)")


def reverse_backfill(apps, schema_editor):
    """Reverse - no-op."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('correspondence', '0041_backfill_minute_dispatched_at'),
    ]

    operations = [
        migrations.RunPython(backfill_current_office_and_approver, reverse_backfill),
    ]
