"""Remove redundant Division/Department suffixes from NPA memo templates."""

from django.db import migrations

TITLE_FIXES = (
    "NPA Departmental Memorandum",
    "NPA Internal Memorandum",
)


def fix_templates(apps, schema_editor):
    CorrespondenceTemplate = apps.get_model("correspondence", "CorrespondenceTemplate")
    for template in CorrespondenceTemplate.objects.filter(title__in=TITLE_FIXES):
        html = template.content_html or ""
        text = template.content_text or ""
        updated_html = (
            html.replace("{{division.name}} Division", "{{division.name}}")
            .replace("{{department.name}} Department", "{{department.name}}")
        )
        updated_text = text  # plain text variants already omit the suffixes
        if updated_html != html or updated_text != text:
            template.content_html = updated_html
            template.content_text = updated_text
            template.save(update_fields=["content_html", "content_text", "updated_at"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("correspondence", "0056_dedupe_document_templates"),
    ]

    operations = [
        migrations.RunPython(fix_templates, noop_reverse),
    ]
