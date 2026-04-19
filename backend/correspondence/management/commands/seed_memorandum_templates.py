"""
Seed Departmental Memorandum and Internal Memorandum templates.

Run: python manage.py seed_memorandum_templates

Creates NPA-style memorandum templates for document creation.
Uses tokens: {{document.title}}, {{document.reference}}, {{preparedBy.name}},
{{division.name}}, {{department.name}}, {{date.today}}.
"""
from django.core.management.base import BaseCommand
from correspondence.models import CorrespondenceTemplate


DEPARTMENTAL_MEMORANDUM_HTML = """<p style="text-align: center; font-weight: bold; font-size: 18pt; margin-bottom: 10px;">NIGERIAN PORTS AUTHORITY</p>
<p style="text-align: center; font-weight: bold; font-size: 11pt; margin-bottom: 4px;">{{division.name}}</p>
<p style="text-align: center; font-weight: bold; font-size: 11pt; margin-bottom: 24px;">{{department.name}}</p>
<p style="text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 28px;">Departmental Memorandum</p>

<p style="font-size: 11pt; margin-bottom: 8px;">
  <strong>To:</strong> [Recipient Name/Title]
  <span style="float: right;"><strong>Date:</strong> {{date.today}}</span>
</p>
<p style="font-size: 11pt; margin-bottom: 28px; clear: both;">
  <strong>From:</strong> {{preparedBy.name}}
  <span style="float: right;"><strong>Ref.:</strong> {{document.reference}}</span>
</p>

<p style="font-weight: bold; font-size: 11pt; text-transform: uppercase; margin-bottom: 12px;">RE: {{document.title}}</p>

<p style="font-size: 11pt;">Reference to the memo [memo reference].</p>

<p style="font-size: 11pt;">Start typing the body of the memorandum here. Include background, justification, action items, and timelines as appropriate.</p>

<p style="font-size: 11pt;">Thank you.</p>"""


INTERNAL_MEMORANDUM_HTML = """<p style="text-align: center; font-weight: bold; font-size: 18pt; margin-bottom: 10px;">NIGERIAN PORTS AUTHORITY</p>
<p style="text-align: center; font-weight: bold; font-size: 11pt; margin-bottom: 24px;">{{division.name}}</p>
<p style="text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 28px;">Internal Memorandum</p>

<p style="font-size: 11pt; margin-bottom: 8px;">
  <strong>To:</strong> [Recipient Name/Title]
  <span style="float: right;"><strong>Date:</strong> {{date.today}}</span>
</p>
<p style="font-size: 11pt; margin-bottom: 28px; clear: both;">
  <strong>From:</strong> {{preparedBy.name}}
  <span style="float: right;"><strong>Ref.:</strong> {{document.reference}}</span>
</p>

<p style="font-weight: bold; font-size: 11pt; text-transform: uppercase; margin-bottom: 12px;">RE: {{document.title}}</p>

<p style="font-size: 11pt;">Reference to the memo [memo reference].</p>

<p style="font-size: 11pt;">Start typing the body of the memorandum here. Include background, justification, action items, and timelines as appropriate.</p>

<p style="font-size: 11pt;">Thank you.</p>"""


def _plain_text(html: str) -> str:
    import re
    return re.sub(r"<[^>]+>", " ", html).replace("&nbsp;", " ").replace("\n", " ").replace("  ", " ").strip()


class Command(BaseCommand):
    help = "Seed Departmental Memorandum and Internal Memorandum templates."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Overwrite existing templates with same title (default: skip if exists)",
        )

    def handle(self, *args, **options):
        force = options.get("force", False)
        templates = [
            {
                "title": "Departmental Memorandum",
                "description": "NPA departmental memorandum format. Division + Department. Use for inter-department communication.",
                "content_html": DEPARTMENTAL_MEMORANDUM_HTML,
            },
            {
                "title": "Internal Memorandum",
                "description": "NPA internal memorandum format. Division only (no department). Use for intra-division communication.",
                "content_html": INTERNAL_MEMORANDUM_HTML,
            },
        ]

        for t in templates:
            qs = CorrespondenceTemplate.objects.filter(
                scope="organization",
                scope_id__isnull=True,
                template_type="document",
                title=t["title"],
            )
            if qs.exists() and not force:
                self.stdout.write(self.style.WARNING(f"  Skip (exists): {t['title']}"))
                continue

            content_text = _plain_text(t["content_html"])
            if qs.exists() and force:
                obj = qs.first()
                obj.content_html = t["content_html"]
                obj.content_text = content_text
                obj.description = t["description"]
                obj.save()
                self.stdout.write(self.style.SUCCESS(f"  Updated: {t['title']}"))
            else:
                CorrespondenceTemplate.objects.create(
                    title=t["title"],
                    description=t["description"],
                    scope="organization",
                    scope_id=None,
                    template_type="document",
                    action_type=None,
                    content_html=t["content_html"],
                    content_text=content_text,
                    is_default=True,
                    is_active=True,
                    created_by=None,
                    updated_by=None,
                )
                self.stdout.write(self.style.SUCCESS(f"  Created: {t['title']}"))

        self.stdout.write(self.style.SUCCESS("\nDone."))
