"""Seed NPA default correspondence templates."""

from django.db import migrations


def seed_templates(apps, schema_editor):
    CorrespondenceTemplate = apps.get_model("correspondence", "CorrespondenceTemplate")

    # Delete any previously seeded templates (the old fake ones)
    CorrespondenceTemplate.objects.filter(created_by__isnull=True).delete()

    templates = [
        {
            "title": "NPA Departmental Memorandum",
            "description": "Standard template for inter-departmental correspondence within NPA divisions.",
            "scope": "organization",
            "scope_id": None,
            "template_type": "document",
            "action_type": None,
            "is_default": True,
            "content_html": """<section style="font-family: 'Times New Roman', Times, serif; line-height: 1.5; color: #000; max-width: 800px; margin: 0 auto; padding: 40px;">

  <header style="text-align: center; margin-bottom: 32px;">
    <h1 style="margin: 0; font-size: 22px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">NIGERIAN PORTS AUTHORITY</h1>
    <h2 style="margin: 4px 0 0; font-size: 18px; font-weight: bold; text-transform: uppercase;">MEDICAL DIVISION</h2>
    <h3 style="margin: 4px 0 0; font-size: 16px; font-weight: bold;">Medical Records</h3>
    <h4 style="margin: 4px 0 0; font-size: 16px; font-weight: bold;">Departmental Memorandum</h4>
  </header>

  <section style="margin-bottom: 24px;">
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
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
    <p style="font-size: 14px;"><strong>RE: {{document.title}}</strong></p>
  </section>

  <section style="margin-bottom: 32px; font-size: 14px;">
    <p>Reference to the award {{document.reference}} of</p>
    <p>&nbsp;</p>
  </section>

  <footer style="margin-top: 48px; font-size: 14px;">
    <p>Yours faithfully,</p>
    <p>&nbsp;</p>
    <p>&nbsp;</p>
    <p><strong>{{sender.name}}</strong></p>
    <p>{{sender.title}}</p>
    <p>For: General Manager ICT</p>
  </footer>

</section>""",
            "content_text": "NIGERIAN PORTS AUTHORITY\nMEDICAL DIVISION\nMedical Records\nDepartmental Memorandum\n\nTo: {{recipient.name}}\nDate: {{date.today}}\nFrom: {{sender.name}}\nRef.: {{document.reference}}\n\nRE: {{document.title}}\n\nReference to the award {{document.reference}} of\n\nYours faithfully,\n\n{{sender.name}}\n{{sender.title}}\nFor: General Manager ICT",
        },
        {
            "title": "NPA Internal Memorandum",
            "description": "Standard template for internal correspondence within NPA divisions.",
            "scope": "organization",
            "scope_id": None,
            "template_type": "document",
            "action_type": None,
            "is_default": False,
            "content_html": """<section style="font-family: 'Times New Roman', Times, serif; line-height: 1.5; color: #000; max-width: 800px; margin: 0 auto; padding: 40px;">

  <header style="text-align: center; margin-bottom: 32px;">
    <h1 style="margin: 0; font-size: 22px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">NIGERIAN PORTS AUTHORITY</h1>
    <h2 style="margin: 4px 0 0; font-size: 18px; font-weight: bold; text-transform: uppercase;">MEDICAL DIVISION</h2>
    <h3 style="margin: 4px 0 0; font-size: 16px; font-weight: bold;">Internal Memorandum</h3>
  </header>

  <section style="margin-bottom: 24px;">
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
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
    <p style="font-size: 14px;"><strong>RE: {{document.title}}</strong></p>
  </section>

  <section style="margin-bottom: 32px; font-size: 14px;">
    <p>- <strong>REQUEST FOR PROJECT MONITORING REPORT</strong></p>
    <p>Reference to the award {{document.reference}} of</p>
  </section>

  <footer style="margin-top: 48px; font-size: 14px;">
    <p>Yours faithfully,</p>
    <p>&nbsp;</p>
    <p>&nbsp;</p>
    <p><strong>{{sender.name}}</strong></p>
    <p>{{sender.title}}</p>
  </footer>

</section>""",
            "content_text": "NIGERIAN PORTS AUTHORITY\nMEDICAL DIVISION\nInternal Memorandum\n\nTo: {{recipient.name}}\nDate: {{date.today}}\nFrom: {{sender.name}}\nRef.: {{document.reference}}\n\nRE: {{document.title}}\n\n- REQUEST FOR PROJECT MONITORING REPORT\nReference to the award {{document.reference}} of\n\nYours faithfully,\n\n{{sender.name}}\n{{sender.title}}",
        },
    ]

    for tmpl in templates:
        CorrespondenceTemplate.objects.get_or_create(
            title=tmpl["title"],
            scope=tmpl["scope"],
            scope_id=tmpl["scope_id"],
            template_type=tmpl["template_type"],
            defaults=tmpl,
        )


def reverse_seed(apps, schema_editor):
    CorrespondenceTemplate = apps.get_model("correspondence", "CorrespondenceTemplate")
    CorrespondenceTemplate.objects.filter(
        title__in=[
            "NPA Departmental Memorandum",
            "NPA Internal Memorandum",
        ],
        created_by__isnull=True,
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("correspondence", "0032_foiarequest_foianote_foiarequestdocument_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_templates, reverse_seed),
    ]
