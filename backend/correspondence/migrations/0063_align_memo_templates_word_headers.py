"""Align NPA memo templates to Memo Headers.docx (Verdana 20pt/12pt).

Word reference (Memo Headers.docx):
- NIGERIAN PORTS AUTHORITY: Verdana 20pt bold, centered
- Division / Department / memo type: Verdana 12pt bold, centered
- To/Date and From/Ref: Verdana 12pt, labels bold, two-column (tabbed in Word)
- RE + subtitle: Verdana 12pt bold
- Body: Verdana 12pt

TipTap strips most styles from h1–h4, so templates use paragraphs + spans.
"""

from django.db import migrations

DEPT_HTML = """\
<p style="text-align: center; margin: 0; line-height: 1.07;"><strong><span style="font-size: 20pt; font-family: Verdana, Geneva, sans-serif;">NIGERIAN PORTS AUTHORITY</span></strong></p>
<p style="text-align: center; margin: 0; line-height: 1.07;"><strong><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">{{division.name}}</span></strong></p>
<p style="text-align: center; margin: 0; line-height: 1.07;"><strong><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">{{department.name}}</span></strong></p>
<p style="text-align: center; margin: 0 0 12pt 0; line-height: 1.07;"><strong><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">Departmental Memorandum</span></strong></p>
<table style="width: 100%; border: none; border-collapse: collapse; table-layout: fixed; margin: 0 0 12pt 0; font-family: Verdana, Geneva, sans-serif; font-size: 12pt;">
  <tbody>
    <tr>
      <td style="width: 55%; border: none; padding: 0 8pt 4pt 0; vertical-align: top;"><strong>To:</strong> {{recipient.name}}</td>
      <td style="width: 45%; border: none; padding: 0 0 4pt 0; text-align: right; vertical-align: top;"><strong>Date:</strong> {{date.today}}</td>
    </tr>
    <tr>
      <td style="border: none; padding: 0 8pt 0 0; vertical-align: top;"><strong>From:</strong> {{sender.name}}</td>
      <td style="border: none; padding: 0; text-align: right; vertical-align: top; word-break: break-word;"><strong>Ref.:</strong> {{document.reference}}</td>
    </tr>
  </tbody>
</table>
<p style="margin: 12pt 0 0 0; text-align: justify; line-height: 1.15;"><strong><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">RE: {{document.title}}</span></strong></p>
<p style="margin: 6pt 0 0 0; text-align: justify; line-height: 1.15;"><strong><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">- [SUBTITLE]</span></strong></p>
<p style="margin: 12pt 0 0 0; line-height: 1.15;"><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">[Insert body content here]</span></p>
"""

DEPT_TEXT = """NIGERIAN PORTS AUTHORITY
{{division.name}}
{{department.name}}
Departmental Memorandum

To: {{recipient.name}}\t\tDate: {{date.today}}
From: {{sender.name}}\t\tRef.: {{document.reference}}

RE: {{document.title}}

- [SUBTITLE]

[Insert body content here]"""

INTERNAL_HTML = """\
<p style="text-align: center; margin: 0; line-height: 1.07;"><strong><span style="font-size: 20pt; font-family: Verdana, Geneva, sans-serif;">NIGERIAN PORTS AUTHORITY</span></strong></p>
<p style="text-align: center; margin: 0; line-height: 1.07;"><strong><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">{{division.name}}</span></strong></p>
<p style="text-align: center; margin: 0 0 12pt 0; line-height: 1.07;"><strong><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">Internal Memorandum</span></strong></p>
<table style="width: 100%; border: none; border-collapse: collapse; table-layout: fixed; margin: 0 0 12pt 0; font-family: Verdana, Geneva, sans-serif; font-size: 12pt;">
  <tbody>
    <tr>
      <td style="width: 55%; border: none; padding: 0 8pt 4pt 0; vertical-align: top;"><strong>To:</strong> {{recipient.name}}</td>
      <td style="width: 45%; border: none; padding: 0 0 4pt 0; text-align: right; vertical-align: top;"><strong>Date:</strong> {{date.today}}</td>
    </tr>
    <tr>
      <td style="border: none; padding: 0 8pt 0 0; vertical-align: top;"><strong>From:</strong> {{sender.name}}</td>
      <td style="border: none; padding: 0; text-align: right; vertical-align: top; word-break: break-word;"><strong>Ref.:</strong> {{document.reference}}</td>
    </tr>
  </tbody>
</table>
<p style="margin: 12pt 0 0 0; text-align: justify; line-height: 1.15;"><strong><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">RE: {{document.title}}</span></strong></p>
<p style="margin: 6pt 0 0 0; text-align: justify; line-height: 1.15;"><strong><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">- [SUBTITLE]</span></strong></p>
<p style="margin: 12pt 0 0 0; line-height: 1.15;"><span style="font-size: 12pt; font-family: Verdana, Geneva, sans-serif;">[Insert body content here]</span></p>
"""

INTERNAL_TEXT = """NIGERIAN PORTS AUTHORITY
{{division.name}}
Internal Memorandum

To: {{recipient.name}}\t\tDate: {{date.today}}
From: {{sender.name}}\t\tRef.: {{document.reference}}

RE: {{document.title}}

- [SUBTITLE]

[Insert body content here]"""


def update_templates(apps, schema_editor):
    CorrespondenceTemplate = apps.get_model("correspondence", "CorrespondenceTemplate")
    for title, html, text in [
        ("NPA Departmental Memorandum", DEPT_HTML, DEPT_TEXT),
        ("NPA Internal Memorandum", INTERNAL_HTML, INTERNAL_TEXT),
    ]:
        tmpl = CorrespondenceTemplate.objects.filter(title=title).first()
        if tmpl:
            tmpl.content_html = html
            tmpl.content_text = text
            tmpl.save(update_fields=["content_html", "content_text"])


def reverse_update(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("correspondence", "0062_add_correspondence_access_log"),
    ]

    operations = [
        migrations.RunPython(update_templates, reverse_update),
    ]
