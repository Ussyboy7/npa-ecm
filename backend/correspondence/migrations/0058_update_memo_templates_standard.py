"""Standardize NPA memo templates to Verdana 22/18/16 with table To/From."""

from django.db import migrations


def update_templates(apps, schema_editor):
    CorrespondenceTemplate = apps.get_model("correspondence", "CorrespondenceTemplate")

    dept_html = """<section style="font-family: Verdana, Geneva, sans-serif; line-height: 1.5; color: #000; max-width: 800px; margin: 0 auto; padding: 40px;">
  <header style="text-align: center; margin-bottom: 32px;">
    <h1 style="margin: 0; font-size: 22px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; font-family: Verdana, Geneva, sans-serif;">NIGERIAN PORTS AUTHORITY</h1>
    <h2 style="margin: 4px 0 0; font-size: 18px; font-weight: bold; text-transform: uppercase; font-family: Verdana, Geneva, sans-serif;">{{division.name}}</h2>
    <h3 style="margin: 4px 0 0; font-size: 16px; font-weight: bold; font-family: Verdana, Geneva, sans-serif;">{{department.name}}</h3>
    <h4 style="margin: 4px 0 0; font-size: 18px; font-weight: bold; font-family: Verdana, Geneva, sans-serif;">Departmental Memorandum</h4>
  </header>
  <section style="margin-bottom: 24px;">
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; font-family: Verdana, Geneva, sans-serif;">
      <tr>
        <td style="padding: 4px 0; width: 50%;"><strong>To:</strong> {{recipient.name}}</td>
        <td style="padding: 4px 0; width: 50%; text-align: right;"><strong>Date:</strong> {{date.today}}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;"><strong>From:</strong> {{sender.name}}</td>
        <td style="padding: 4px 0; text-align: right; word-break: break-word;"><strong>Ref.:</strong> {{document.reference}}</td>
      </tr>
    </table>
  </section>
  <section style="margin-bottom: 24px;">
    <p style="font-size: 14px; font-family: Verdana, Geneva, sans-serif;"><strong>RE: {{document.title}}</strong></p>
  </section>
  <section style="margin-bottom: 32px; font-size: 14px; font-family: Verdana, Geneva, sans-serif;">
    <p><strong>- [SUBTITLE]</strong></p>
    <p>[Insert body content here]</p>
  </section>
</section>"""
    dept_text = """NIGERIAN PORTS AUTHORITY
{{division.name}}
{{department.name}}
Departmental Memorandum

To: {{recipient.name}}\t\tDate: {{date.today}}
From: {{sender.name}}\t\tRef.: {{document.reference}}

RE: {{document.title}}

- [SUBTITLE]
[Insert body content here]"""

    internal_html = """<section style="font-family: Verdana, Geneva, sans-serif; line-height: 1.5; color: #000; max-width: 800px; margin: 0 auto; padding: 40px;">
  <header style="text-align: center; margin-bottom: 32px;">
    <h1 style="margin: 0; font-size: 22px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; font-family: Verdana, Geneva, sans-serif;">NIGERIAN PORTS AUTHORITY</h1>
    <h2 style="margin: 4px 0 0; font-size: 18px; font-weight: bold; text-transform: uppercase; font-family: Verdana, Geneva, sans-serif;">{{division.name}}</h2>
    <h3 style="margin: 4px 0 0; font-size: 18px; font-weight: bold; font-family: Verdana, Geneva, sans-serif;">Internal Memorandum</h3>
  </header>
  <section style="margin-bottom: 24px;">
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; font-family: Verdana, Geneva, sans-serif;">
      <tr>
        <td style="padding: 4px 0; width: 50%;"><strong>To:</strong> {{recipient.name}}</td>
        <td style="padding: 4px 0; width: 50%; text-align: right;"><strong>Date:</strong> {{date.today}}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;"><strong>From:</strong> {{sender.name}}</td>
        <td style="padding: 4px 0; text-align: right; word-break: break-word;"><strong>Ref.:</strong> {{document.reference}}</td>
      </tr>
    </table>
  </section>
  <section style="margin-bottom: 24px;">
    <p style="font-size: 14px; font-family: Verdana, Geneva, sans-serif;"><strong>RE: {{document.title}}</strong></p>
  </section>
  <section style="margin-bottom: 32px; font-size: 14px; font-family: Verdana, Geneva, sans-serif;">
    <p><strong>- [SUBTITLE]</strong></p>
    <p>[Insert body content here]</p>
  </section>
</section>"""
    internal_text = """NIGERIAN PORTS AUTHORITY
{{division.name}}
Internal Memorandum

To: {{recipient.name}}\t\tDate: {{date.today}}
From: {{sender.name}}\t\tRef.: {{document.reference}}

RE: {{document.title}}

- [SUBTITLE]
[Insert body content here]"""

    for title, html, text in [
        ("NPA Departmental Memorandum", dept_html, dept_text),
        ("NPA Internal Memorandum", internal_html, internal_text),
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
        ("correspondence", "0057_fix_memo_header_suffixes"),
    ]

    operations = [
        migrations.RunPython(update_templates, reverse_update),
    ]
