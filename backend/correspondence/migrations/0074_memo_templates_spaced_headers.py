"""Keep memo To/Date and From/Ref as spaced, editable text instead of a table.

The memo header was a borderless table, which the editor renders as a grid the
author has to manage. The header is now two ordinary paragraphs: the gap is made
of non-breaking spaces so the editor's whitespace collapsing cannot pull the
Date/Ref back to the left margin, and the author can still edit or widen it.
"""

from django.db import migrations

NBSP = "\u00a0"
GAP = NBSP * 16

DEPT_HTML = f"""\
<p style="text-align: center; margin: 0; line-height: 1.07;"><strong><span style="font-size: 20pt; font-family: Verdana, Geneva, sans-serif;">NIGERIAN PORTS AUTHORITY</span></strong></p>
<p style="text-align: center; margin: 0; line-height: 1.07;"><strong><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">{{{{division.name}}}}</span></strong></p>
<p style="text-align: center; margin: 0; line-height: 1.07;"><strong><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">{{{{department.name}}}}</span></strong></p>
<p style="text-align: center; margin: 0 0 12pt 0; line-height: 1.07;"><strong><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">Departmental Memorandum</span></strong></p>
<p style="margin: 0 0 2pt 0; line-height: 1.07; font-family: Verdana, Geneva, sans-serif; font-size: 12pt;"><strong>To:</strong> {{{{recipient.name}}}}{GAP}<strong>Date:</strong> {{{{date.today}}}}</p>
<p style="margin: 0 0 12pt 0; line-height: 1.07; font-family: Verdana, Geneva, sans-serif; font-size: 12pt;"><strong>From:</strong> {{{{sender.name}}}}{GAP}<strong>Ref.:</strong> {{{{document.reference}}}}</p>
<p style="margin: 12pt 0 0 0; text-align: justify; line-height: 1.15;"><strong><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">RE: {{{{document.title}}}}</span></strong></p>
<p style="margin: 6pt 0 0 0; text-align: justify; line-height: 1.15;"><strong><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">- [SUBTITLE]</span></strong></p>
<p style="margin: 12pt 0 0 0; line-height: 1.15;"><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">[Insert body content here]</span></p>
"""

INTERNAL_HTML = f"""\
<p style="text-align: center; margin: 0; line-height: 1.07;"><strong><span style="font-size: 20pt; font-family: Verdana, Geneva, sans-serif;">NIGERIAN PORTS AUTHORITY</span></strong></p>
<p style="text-align: center; margin: 0; line-height: 1.07;"><strong><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">{{{{division.name}}}}</span></strong></p>
<p style="text-align: center; margin: 0 0 12pt 0; line-height: 1.07;"><strong><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">Internal Memorandum</span></strong></p>
<p style="margin: 0 0 2pt 0; line-height: 1.07; font-family: Verdana, Geneva, sans-serif; font-size: 12pt;"><strong>To:</strong> {{{{recipient.name}}}}{GAP}<strong>Date:</strong> {{{{date.today}}}}</p>
<p style="margin: 0 0 12pt 0; line-height: 1.07; font-family: Verdana, Geneva, sans-serif; font-size: 12pt;"><strong>From:</strong> {{{{sender.name}}}}{GAP}<strong>Ref.:</strong> {{{{document.reference}}}}</p>
<p style="margin: 12pt 0 0 0; text-align: justify; line-height: 1.15;"><strong><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">RE: {{{{document.title}}}}</span></strong></p>
<p style="margin: 6pt 0 0 0; text-align: justify; line-height: 1.15;"><strong><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">- [SUBTITLE]</span></strong></p>
<p style="margin: 12pt 0 0 0; line-height: 1.15;"><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">[Insert body content here]</span></p>
"""


def update_templates(apps, schema_editor):
    CorrespondenceTemplate = apps.get_model("correspondence", "CorrespondenceTemplate")
    for title, html in [
        ("NPA Departmental Memorandum", DEPT_HTML),
        ("NPA Internal Memorandum", INTERNAL_HTML),
    ]:
        template = CorrespondenceTemplate.objects.filter(title=title).first()
        if template:
            template.content_html = html
            template.save(update_fields=["content_html"])


def reverse_update(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("correspondence", "0073_approval_snapshot_fields"),
    ]

    operations = [
        migrations.RunPython(update_templates, reverse_update),
    ]
