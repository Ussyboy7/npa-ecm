"""Update NPA memo templates with two-column To/Date/From/Ref layout."""

from django.db import migrations


DEPARTMENTAL_HTML = """<section style="font-family: Verdana, Geneva, sans-serif; line-height: 1.5; color: #000;">

  <header style="text-align: center; margin-bottom: 24px;">
    <h1 style="margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">NIGERIAN PORTS AUTHORITY</h1>
    <h2 style="margin: 4px 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">{{division.name}}</h2>
    <h3 style="margin: 4px 0 0; font-size: 12px; font-weight: bold;">{{department.name}}</h3>
    <h4 style="margin: 4px 0 0; font-size: 12px; font-weight: bold;">Departmental Memorandum</h4>
  </header>

  <table style="width: 100%; font-size: 12px; margin: 24px 0; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px 0; width: 50%;"><strong>To:</strong> {{recipient.name}}</td>
      <td style="padding: 8px 0; width: 50%;"><strong>Date:</strong> {{date.today}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; width: 50%;"><strong>From:</strong> {{sender.name}}</td>
      <td style="padding: 8px 0; width: 50%;"><strong>Ref.:</strong> {{document.reference}}</td>
    </tr>
  </table>

  <section style="margin-bottom: 24px;">
    <p style="font-size: 12px; margin: 0;"><strong>RE: {{document.title}}</strong></p>
  </section>

  <section style="margin-bottom: 32px; font-size: 12px;">
    <p><strong>- [SUBTITLE]</strong></p>
    <p>[Insert body content here]</p>
  </section>

</section>"""

INTERNAL_HTML = """<section style="font-family: Verdana, Geneva, sans-serif; line-height: 1.5; color: #000;">

  <header style="text-align: center; margin-bottom: 24px;">
    <h1 style="margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">NIGERIAN PORTS AUTHORITY</h1>
    <h2 style="margin: 4px 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">{{division.name}}</h2>
    <h3 style="margin: 4px 0 0; font-size: 12px; font-weight: bold;">Internal Memorandum</h3>
  </header>

  <table style="width: 100%; font-size: 12px; margin: 24px 0; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px 0; width: 50%;"><strong>To:</strong> {{recipient.name}}</td>
      <td style="padding: 8px 0; width: 50%;"><strong>Date:</strong> {{date.today}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; width: 50%;"><strong>From:</strong> {{sender.name}}</td>
      <td style="padding: 8px 0; width: 50%;"><strong>Ref.:</strong> {{document.reference}}</td>
    </tr>
  </table>

  <section style="margin-bottom: 24px;">
    <p style="font-size: 12px; margin: 0;"><strong>RE: {{document.title}}</strong></p>
  </section>

  <section style="margin-bottom: 32px; font-size: 12px;">
    <p><strong>- [SUBTITLE]</strong></p>
    <p>[Insert body content here]</p>
  </section>

</section>"""

DEPARTMENTAL_TEXT = "NIGERIAN PORTS AUTHORITY\n{{division.name}}\n{{department.name}}\nDepartmental Memorandum\n\nTo: {{recipient.name}}\t\t\tDate: {{date.today}}\nFrom: {{sender.name}}\t\tRef.: {{document.reference}}\n\nRE: {{document.title}}\n\n- [SUBTITLE]\n\n[Insert body content here]"

INTERNAL_TEXT = "NIGERIAN PORTS AUTHORITY\n{{division.name}}\nInternal Memorandum\n\nTo: {{recipient.name}}\t\t\tDate: {{date.today}}\nFrom: {{sender.name}}\t\tRef.: {{document.reference}}\n\nRE: {{document.title}}\n\n- [SUBTITLE]\n\n[Insert body content here]"


def update_templates(apps, schema_editor):
    CorrespondenceTemplate = apps.get_model("correspondence", "CorrespondenceTemplate")

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
    CorrespondenceTemplate = apps.get_model("correspondence", "CorrespondenceTemplate")

    dept = CorrespondenceTemplate.objects.filter(title="NPA Departmental Memorandum").first()
    if dept:
        dept.content_html = DEPARTMENTAL_HTML_OLD
        dept.content_text = DEPARTMENTAL_TEXT_OLD
        dept.save(update_fields=["content_html", "content_text"])

    internal = CorrespondenceTemplate.objects.filter(title="NPA Internal Memorandum").first()
    if internal:
        internal.content_html = INTERNAL_HTML_OLD
        internal.content_text = INTERNAL_TEXT_OLD
        internal.save(update_fields=["content_html", "content_text"])


DEPARTMENTAL_HTML_OLD = """<section style="font-family: Verdana, Geneva, sans-serif; line-height: 1.5; color: #000;">

  <header style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #000;">
    <h1 style="margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">NIGERIAN PORTS AUTHORITY</h1>
    <h2 style="margin: 4px 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">MEDICAL DIVISION</h2>
    <h3 style="margin: 4px 0 0; font-size: 12px; font-weight: bold;">Medical Records</h3>
    <h4 style="margin: 4px 0 0; font-size: 12px; font-weight: bold;">Departmental Memorandum</h4>
  </header>

  <section style="margin-bottom: 24px;">
    <p style="font-size: 12px; margin: 8px 0;"><strong>Date:</strong> {{date.today}}</p>
    <p style="font-size: 12px; margin: 8px 0;"><strong>To:</strong> {{recipient.name}}</p>
    <p style="font-size: 12px; margin: 8px 0; padding-left: 24px;">{{recipient.department}}</p>
    <p style="font-size: 12px; margin: 8px 0;"><strong>From:</strong> {{sender.name}}</p>
    <p style="font-size: 12px; margin: 8px 0; padding-left: 24px;">{{sender.title}}</p>
    <p style="font-size: 12px; margin: 8px 0;"><strong>Ref.:</strong> {{document.reference}}</p>
  </section>

  <section style="margin-bottom: 24px; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 12px 0;">
    <p style="font-size: 12px; margin: 0;"><strong>RE: {{document.title}}</strong></p>
  </section>

  <section style="margin-bottom: 32px; font-size: 12px;">
    <p>Dear Colleague,</p>
    <p>&nbsp;</p>
    <p>[Insert body content here]</p>
  </section>

  <footer style="margin-top: 48px; font-size: 12px;">
    <p>Yours sincerely,</p>
    <p>&nbsp;</p>
    <p>&nbsp;</p>
    <p><strong>{{sender.name}}</strong></p>
    <p>{{sender.title}}</p>
  </footer>

</section>"""

INTERNAL_HTML_OLD = """<section style="font-family: Verdana, Geneva, sans-serif; line-height: 1.5; color: #000;">

  <header style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #000;">
    <h1 style="margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">NIGERIAN PORTS AUTHORITY</h1>
    <h2 style="margin: 4px 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">MEDICAL DIVISION</h2>
    <h3 style="margin: 4px 0 0; font-size: 12px; font-weight: bold;">Internal Memorandum</h3>
  </header>

  <section style="margin-bottom: 24px;">
    <p style="font-size: 12px; margin: 8px 0;"><strong>Date:</strong> {{date.today}}</p>
    <p style="font-size: 12px; margin: 8px 0;"><strong>To:</strong> {{recipient.name}}</p>
    <p style="font-size: 12px; margin: 8px 0; padding-left: 24px;">{{recipient.department}}</p>
    <p style="font-size: 12px; margin: 8px 0;"><strong>From:</strong> {{sender.name}}</p>
    <p style="font-size: 12px; margin: 8px 0; padding-left: 24px;">{{sender.title}}</p>
    <p style="font-size: 12px; margin: 8px 0;"><strong>Ref.:</strong> {{document.reference}}</p>
  </section>

  <section style="margin-bottom: 24px; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 12px 0;">
    <p style="font-size: 12px; margin: 0;"><strong>RE: {{document.title}}</strong></p>
  </section>

  <section style="margin-bottom: 32px; font-size: 12px;">
    <p>Dear Sir/Madam,</p>
    <p>&nbsp;</p>
    <p>[Insert body content here]</p>
  </section>

  <footer style="margin-top: 48px; font-size: 12px;">
    <p>Yours faithfully,</p>
    <p>&nbsp;</p>
    <p>&nbsp;</p>
    <p><strong>{{sender.name}}</strong></p>
    <p>{{sender.title}}</p>
  </footer>

</section>"""

DEPARTMENTAL_TEXT_OLD = "NIGERIAN PORTS AUTHORITY\nMEDICAL DIVISION\nMedical Records\nDepartmental Memorandum\n\nDate: {{date.today}}\nTo: {{recipient.name}}\nFrom: {{sender.name}}\nRef.: {{document.reference}}\n\nRE: {{document.title}}\n\nDear Colleague,\n\n[Insert body content here]\n\nYours sincerely,\n\n{{sender.name}}\n{{sender.title}}"

INTERNAL_TEXT_OLD = "NIGERIAN PORTS AUTHORITY\nMEDICAL DIVISION\nInternal Memorandum\n\nDate: {{date.today}}\nTo: {{recipient.name}}\nFrom: {{sender.name}}\nRef.: {{document.reference}}\n\nRE: {{document.title}}\n\nDear Sir/Madam,\n\n[Insert body content here]\n\nYours faithfully,\n\n{{sender.name}}\n{{sender.title}}"


class Migration(migrations.Migration):
    dependencies = [
        ("correspondence", "0036_update_npa_templates_emr_format"),
    ]

    operations = [
        migrations.RunPython(update_templates, reverse_update),
    ]
