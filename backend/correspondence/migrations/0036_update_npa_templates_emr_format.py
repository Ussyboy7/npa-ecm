"""Update NPA templates to EMR-style format with print styles."""

from django.db import migrations


DEPARTMENTAL_HTML = """<section style="font-family: Verdana, Geneva, sans-serif; line-height: 1.5; color: #000;">

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

INTERNAL_HTML = """<section style="font-family: Verdana, Geneva, sans-serif; line-height: 1.5; color: #000;">

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

REFERRAL_HTML = """<section style="font-family: Verdana, Geneva, sans-serif; line-height: 1.5; color: #000;">

  <header style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #000;">
    <h1 style="margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">NIGERIAN PORTS AUTHORITY</h1>
    <h2 style="margin: 4px 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">MEDICAL SERVICES DIVISION</h2>
    <h3 style="margin: 4px 0 0; font-size: 12px; font-weight: bold;">WARD MANAGEMENT</h3>
  </header>

  <section style="text-align: center; margin-bottom: 24px; padding: 12px 0; border-top: 1px solid #000; border-bottom: 1px solid #000;">
    <h2 style="margin: 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">REFERRAL LETTER</h2>
  </section>

  <section style="margin-bottom: 24px;">
    <p style="font-size: 12px; margin: 8px 0;"><strong>Date:</strong> {{date.today}}</p>
    <p style="font-size: 12px; margin: 8px 0;"><strong>To:</strong> {{recipient.name}}</p>
    <p style="font-size: 12px; margin: 8px 0; padding-left: 24px;">Dept. of {{recipient.department}}</p>
    <p style="font-size: 12px; margin: 8px 0;"><strong>RE:</strong> {{patient.name}} · ID {{patient.id}} · {{patient.gender}} · Admission {{document.reference}}</p>
  </section>

  <section style="margin-bottom: 24px; font-size: 12px;">
    <p>Dear Colleague,</p>
    <p>&nbsp;</p>
    <p>I am referring the above-named patient to the {{recipient.department}} department on a routine basis for your kind opinion and continued management.</p>
  </section>

  <section style="margin-bottom: 24px; font-size: 12px;">
    <h3 style="color: #0066cc; font-size: 13px; font-weight: bold; margin: 16px 0 8px 0;">Brief history</h3>
    <p><strong>Admitted:</strong> {{admission.date}}</p>
    <p><strong>Length of stay:</strong> {{admission.lengthOfStay}}</p>
    <p><strong>Presenting complaint:</strong> {{admission.complaint}}</p>
    <p><strong>Working diagnosis on admission:</strong> {{admission.diagnosis}}</p>
  </section>

  <section style="margin-bottom: 24px; font-size: 12px;">
    <h3 style="color: #0066cc; font-size: 13px; font-weight: bold; margin: 16px 0 8px 0;">Treatment given</h3>
    <p><strong>Prescriptions</strong></p>
    <p>{{treatment.prescriptions}}</p>
    <p><strong>Treatments / procedures on the ward</strong></p>
    <p>{{treatment.procedures}}</p>
  </section>

  <section style="margin-bottom: 24px; font-size: 12px;">
    <h3 style="color: #0066cc; font-size: 13px; font-weight: bold; margin: 16px 0 8px 0;">Current condition</h3>
    <p><strong>Latest vitals ({{condition.vitalsDate}}):</strong> T {{condition.temperature}} · P {{condition.pulse}} · BP {{condition.bp}}</p>
    <p><strong>Current condition:</strong> {{condition.status}}</p>
    <p><strong>Working / final diagnosis:</strong> {{condition.diagnosis}}</p>
  </section>

  <section style="margin-bottom: 24px; font-size: 12px;">
    <h3 style="color: #0066cc; font-size: 13px; font-weight: bold; margin: 16px 0 8px 0;">Reason for referral</h3>
    <p><strong>Reason:</strong> {{referral.reason}}</p>
  </section>

  <section style="margin-bottom: 24px; font-size: 12px;">
    <p>Kindly continue the patient's management as you see fit. I will be glad to provide any further information you may require, and remain available for joint follow-up.</p>
    <p>&nbsp;</p>
    <p>Yours sincerely,</p>
  </section>

  <section style="margin-top: 48px; padding-top: 16px; border-top: 1px solid #000; font-size: 12px;">
    <p><strong>Referring Doctor</strong></p>
    <p>{{sender.name}}</p>
    <p style="font-size: 10px; color: #666; margin-top: 8px;">Please return any feedback or follow-up correspondence to the Ward Management department, quoting the Admission ID above.</p>
  </section>

</section>"""


DEPARTMENTAL_TEXT = "NIGERIAN PORTS AUTHORITY\nMEDICAL DIVISION\nMedical Records\nDepartmental Memorandum\n\nDate: {{date.today}}\nTo: {{recipient.name}}\nFrom: {{sender.name}}\nRef.: {{document.reference}}\n\nRE: {{document.title}}\n\nDear Colleague,\n\n[Insert body content here]\n\nYours sincerely,\n\n{{sender.name}}\n{{sender.title}}"

INTERNAL_TEXT = "NIGERIAN PORTS AUTHORITY\nMEDICAL DIVISION\nInternal Memorandum\n\nDate: {{date.today}}\nTo: {{recipient.name}}\nFrom: {{sender.name}}\nRef.: {{document.reference}}\n\nRE: {{document.title}}\n\nDear Sir/Madam,\n\n[Insert body content here]\n\nYours faithfully,\n\n{{sender.name}}\n{{sender.title}}"

REFERRAL_TEXT = "NIGERIAN PORTS AUTHORITY\nMEDICAL SERVICES DIVISION\nWARD MANAGEMENT\n\nREFERRAL LETTER\n\nDate: {{date.today}}\nTo: {{recipient.name}}\nDept. of {{recipient.department}}\nRE: {{patient.name}} · ID {{patient.id}} · {{patient.gender}} · Admission {{document.reference}}\n\nDear Colleague,\n\nI am referring the above-named patient to the {{recipient.department}} department on a routine basis for your kind opinion and continued management.\n\nBrief history\nAdmitted: {{admission.date}}\nLength of stay: {{admission.lengthOfStay}}\nPresenting complaint: {{admission.complaint}}\nWorking diagnosis on admission: {{admission.diagnosis}}\n\nTreatment given\nPrescriptions: {{treatment.prescriptions}}\nTreatments/procedures: {{treatment.procedures}}\n\nCurrent condition\nLatest vitals: T {{condition.temperature}} · P {{condition.pulse}} · BP {{condition.bp}}\nCurrent condition: {{condition.status}}\nWorking/final diagnosis: {{condition.diagnosis}}\n\nReason for referral: {{referral.reason}}\n\nKindly continue the patient's management as you see fit.\n\nYours sincerely,\n\n{{sender.name}}\nReferring Doctor"


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

    # Create referral template if it doesn't exist
    if not CorrespondenceTemplate.objects.filter(title="NPA Referral Letter").exists():
        CorrespondenceTemplate.objects.create(
            title="NPA Referral Letter",
            description="Medical referral letter template for patient transfers between departments.",
            scope="organization",
            scope_id=None,
            template_type="document",
            action_type=None,
            is_default=False,
            content_html=REFERRAL_HTML,
            content_text=REFERRAL_TEXT,
        )


def reverse_update(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("correspondence", "0035_fix_npa_template_fonts"),
    ]

    operations = [
        migrations.RunPython(update_templates, reverse_update),
    ]
