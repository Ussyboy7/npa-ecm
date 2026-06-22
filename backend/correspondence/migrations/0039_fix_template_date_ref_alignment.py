"""Fix Date/Ref right-alignment and long reference handling in memo templates."""

from django.db import migrations


DEPARTMENTAL_HTML = """<section style="font-family: Verdana, Geneva, sans-serif; line-height: 1.5; color: #000;">

  <header style="text-align: center; margin-bottom: 8px;">
    <h1 style="margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">NIGERIAN PORTS AUTHORITY</h1>
    <h2 style="margin: 4px 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">{{division.name}} Division</h2>
    <h3 style="margin: 4px 0 0; font-size: 12px; font-weight: bold;">{{department.name}} Department</h3>
    <h4 style="margin: 4px 0 0; font-size: 12px; font-weight: bold;">Departmental Memorandum</h4>
  </header>

  <table style="width: 100%; font-size: 12px; margin: 16px 0; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px 0; width: 50%;"><strong>To:</strong> {{recipient.name}}</td>
      <td style="padding: 8px 0; width: 50%; text-align: right;"><strong>Date:</strong> {{date.today}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; width: 50%;"><strong>From:</strong> {{sender.name}}</td>
      <td style="padding: 8px 0; width: 50%; text-align: right; word-break: break-word;"><strong>Ref.:</strong> {{document.reference}}</td>
    </tr>
  </table>

  <section style="margin-bottom: 16px;">
    <p style="font-size: 12px; margin: 0;"><strong>RE: {{document.title}}</strong></p>
  </section>

  <section style="margin-bottom: 24px; font-size: 12px;">
    <p><strong>- [SUBTITLE]</strong></p>
    <p>[Insert body content here]</p>
  </section>

</section>"""

INTERNAL_HTML = """<section style="font-family: Verdana, Geneva, sans-serif; line-height: 1.5; color: #000;">

  <header style="text-align: center; margin-bottom: 8px;">
    <h1 style="margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">NIGERIAN PORTS AUTHORITY</h1>
    <h2 style="margin: 4px 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">{{division.name}} Division</h2>
    <h3 style="margin: 4px 0 0; font-size: 12px; font-weight: bold;">Internal Memorandum</h3>
  </header>

  <table style="width: 100%; font-size: 12px; margin: 16px 0; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px 0; width: 50%;"><strong>To:</strong> {{recipient.name}}</td>
      <td style="padding: 8px 0; width: 50%; text-align: right;"><strong>Date:</strong> {{date.today}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; width: 50%;"><strong>From:</strong> {{sender.name}}</td>
      <td style="padding: 8px 0; width: 50%; text-align: right; word-break: break-word;"><strong>Ref.:</strong> {{document.reference}}</td>
    </tr>
  </table>

  <section style="margin-bottom: 16px;">
    <p style="font-size: 12px; margin: 0;"><strong>RE: {{document.title}}</strong></p>
  </section>

  <section style="margin-bottom: 24px; font-size: 12px;">
    <p><strong>- [SUBTITLE]</strong></p>
    <p>[Insert body content here]</p>
  </section>

</section>"""

DEPARTMENTAL_TEXT = "NIGERIAN PORTS AUTHORITY\n{{division.name}}\n{{department.name}}\nDepartmental Memorandum\n\nTo: {{recipient.name}}\t\t\tDate: {{date.today}}\nFrom: {{sender.name}}\t\tRef.: {{document.reference}}\n\nRE: {{document.title}}\n\n- [SUBTITLE]\n\n[Insert body content here]"

INTERNAL_TEXT = "NIGERIAN PORTS AUTHORITY\n{{division.name}}\nInternal Memorandum\n\nTo: {{recipient.name}}\t\t\tDate: {{date.today}}\nFrom: {{sender.name}}\t\tRef.: {{document.reference}}\n\nRE: {{document.title}}\n\n- [SUBTITLE]\n\n[Insert body content here]"


def update_templates(apps, schema_editor):
    CorrespondenceTemplate = apps.get_model('correspondence', 'CorrespondenceTemplate')

    dept = CorrespondenceTemplate.objects.filter(title="NPA Departmental Memorandum").first()
    if dept:
        dept.content_html = DEPARTMENTAL_HTML
        dept.content_text = DEPARTMENTAL_TEXT
        dept.save(update_fields=["content_html", "content_text"])

    internal = CorrespondenceTemplate.objects.filter(title="NPA Internal Memorandum").first()
    if internal:
        internal.content_html = INTERNAL_HTML
        internal.content_text = INTERNAL_TEXT
        internal.save(update_fields=["content_html", "content_text"])


def reverse_update(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('correspondence', '0038_update_npa_templates_two_column'),
    ]

    operations = [
        migrations.RunPython(update_templates, reverse_update),
    ]
