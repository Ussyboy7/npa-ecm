from django.db import migrations


def grant_linked_document_access(apps, schema_editor):
    """Give existing correspondence participants read access to linked documents.

    Routing used to share only with ``to_user``/``to_office``. Minutes whose next
    seat was recorded only as ``current_approver`` never shared the document, so
    the person who handled the memo could not reopen it from history.
    """
    CorrespondenceDocumentLink = apps.get_model("correspondence", "CorrespondenceDocumentLink")
    Minute = apps.get_model("correspondence", "Minute")
    DocumentPermission = apps.get_model("dms", "DocumentPermission")

    links = CorrespondenceDocumentLink.objects.select_related("correspondence").all()
    for link in links.iterator():
        correspondence = link.correspondence
        user_ids = set(
            Minute.objects.filter(
                correspondence_id=link.correspondence_id,
                user_id__isnull=False,
                is_recalled=False,
            ).values_list("user_id", flat=True)
        )
        if correspondence.current_approver_id:
            user_ids.add(correspondence.current_approver_id)

        if not user_ids:
            continue

        permission = DocumentPermission.objects.filter(
            document_id=link.document_id,
            access="read",
        ).first()
        if permission is None:
            permission = DocumentPermission.objects.create(
                document_id=link.document_id,
                access="read",
                note="Auto-granted to correspondence participants",
            )

        permission.users.add(*user_ids)


class Migration(migrations.Migration):
    dependencies = [
        ("correspondence", "0068_correspondence_reference_classification"),
        ("dms", "0022_documentpermission_directorates"),
    ]

    operations = [
        migrations.RunPython(grant_linked_document_access, migrations.RunPython.noop),
    ]
