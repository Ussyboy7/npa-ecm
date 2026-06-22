"""Fix NPA template fonts to Verdana."""

from django.db import migrations


DEPARTMENTAL_HTML = """<section style="font-family: Verdana, Geneva, sans-serif; line-height: 1.5; color: #000; max-width: 800px; margin: 0 auto; padding: 40px;">

  <header style="text-align: center; margin-bottom: 32px;">
    <h1 style="margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">NIGERIAN PORTS AUTHORITY</h1>
    <h2 style="margin: 4px 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">MEDICAL DIVISION</h2>
    <h3 style="margin: 4px 0 0; font-size: 12px; font-weight: bold;">Medical Records</h3>
    <h4 style="margin: 4px 0 0; font-size: 12px; font-weight: bold;">Departmental Memorandum</h4>
  </header>

  <section style="margin-bottom: 24px;">
    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
      <tr>
        <td style="padding: 4px 0; width: 50%;"><strong>To:</strong> {{recipient.name}}</td>
        <td style="padding: 4px 0; width: 50%;"><strong>Date:</strong> {{date.today}}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;"><strong>From:</strong> {{sender.name}}</td>
        <td style="padding: 4px 0;"><strong>Ref.:</strong> {{document.reference}}</td>
      </tr>
    </table>
  </section>

  <section style="margin-bottom: 24px;">
    <p style="font-size: 12px;"><strong>RE: {{document.title}}</strong></p>
  </section>

  <section style="margin-bottom: 32px; font-size: 12px;">
    <p>Reference to the award {{document.reference}} of</p>
    <p>&nbsp;</p>
  </section>

  <footer style="margin-top: 48px; font-size: 12px;">
    <p>Yours faithfully,</p>
    <p>&nbsp;</p>
    <p>&nbsp;</p>
    <p><strong>{{sender.name}}</strong></p>
    <p>{{sender.title}}</p>
    <p>For: General Manager ICT</p>
  </footer>

</section>"""

INTERNAL_HTML = """<section style="font-family: Verdana, Geneva, sans-serif; line-height: 1.5; color: #000; max-width: 800px; margin: 0 auto; padding: 40px;">

  <header style="text-align: center; margin-bottom: 32px;">
    <h1 style="margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">NIGERIAN PORTS AUTHORITY</h1>
    <h2 style="margin: 4px 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">MEDICAL DIVISION</h2>
    <h3 style="margin: 4px 0 0; font-size: 12px; font-weight: bold;">Internal Memorandum</h3>
  </header>

  <section style="margin-bottom: 24px;">
    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
      <tr>
        <td style="padding: 4px 0; width: 50%;"><strong>To:</strong> {{recipient.name}}</td>
        <td style="padding: 4px 0; width: 50%;"><strong>Date:</strong> {{date.today}}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;"><strong>From:</strong> {{sender.name}}</td>
        <td style="padding: 4px 0;"><strong>Ref.:</strong> {{document.reference}}</td>
      </tr>
    </table>
  </section>

  <section style="margin-bottom: 24px;">
    <p style="font-size: 12px;"><strong>RE: {{document.title}}</strong></p>
  </section>

  <section style="margin-bottom: 32px; font-size: 12px;">
    <p>- <strong>REQUEST FOR PROJECT MONITORING REPORT</strong></p>
    <p>Reference to the award {{document.reference}} of</p>
  </section>

  <footer style="margin-top: 48px; font-size: 12px;">
    <p>Yours faithfully,</p>
    <p>&nbsp;</p>
    <p>&nbsp;</p>
    <p><strong>{{sender.name}}</strong></p>
    <p>{{sender.title}}</p>
  </footer>

</section>"""

DEPARTMENTAL_TEXT = "NIGERIAN PORTS AUTHORITY\nMEDICAL DIVISION\nMedical Records\nDepartmental Memorandum\n\nTo: {{recipient.name}}\nDate: {{date.today}}\nFrom: {{sender.name}}\nRef.: {{document.reference}}\n\nRE: {{document.title}}\n\nReference to the award {{document.reference}} of\n\nYours faithfully,\n\n{{sender.name}}\n{{sender.title}}\nFor: General Manager ICT"

INTERNAL_TEXT = "NIGERIAN PORTS AUTHORITY\nMEDICAL DIVISION\nInternal Memorandum\n\nTo: {{recipient.name}}\nDate: {{date.today}}\nFrom: {{sender.name}}\nRef.: {{document.reference}}\n\nRE: {{document.title}}\n\n- REQUEST FOR PROJECT MONITORING REPORT\nReference to the award {{document.reference}} of\n\nYours faithfully,\n\n{{sender.name}}\n{{sender.title}}"


def fix_fonts(apps, schema_editor):
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


def reverse_fix(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("correspondence", "0034_update_npa_templates"),
    ]

    operations = [
        migrations.RunPython(fix_fonts, reverse_fix),
    ]
