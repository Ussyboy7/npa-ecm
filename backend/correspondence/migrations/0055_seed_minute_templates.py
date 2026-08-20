"""Seed organization-scope minute templates for common NPA routing phrases."""

from django.db import migrations


MINUTE_TEMPLATES = [
    {
        "title": "For necessary action",
        "description": "Route correspondence for action by the recipient office.",
        "action_type": "minute",
        "is_default": True,
        "content_text": (
            "Please take necessary action on the attached correspondence and "
            "revert with progress within the stipulated timeline."
        ),
    },
    {
        "title": "For your information",
        "description": "Circulate correspondence for awareness without requiring action.",
        "action_type": "minute",
        "is_default": False,
        "content_text": (
            "Forwarded for your information and guidance. No further action is "
            "required unless otherwise directed."
        ),
    },
    {
        "title": "For comments please",
        "description": "Request comments or technical input before further routing.",
        "action_type": "minute",
        "is_default": False,
        "content_text": (
            "Please review the attached and provide your comments to guide "
            "further action on this matter."
        ),
    },
    {
        "title": "Please process and revert",
        "description": "Ask the recipient to process and report back.",
        "action_type": "minute",
        "is_default": False,
        "content_text": (
            "Kindly process as appropriate and revert with your findings or "
            "recommendation for my further directive."
        ),
    },
    {
        "title": "Treat as urgent",
        "description": "Flag correspondence for priority treatment.",
        "action_type": "minute",
        "is_default": False,
        "content_text": (
            "Please treat this as urgent. Process promptly and revert with "
            "status update as soon as practicable."
        ),
    },
    {
        "title": "Investigate and report",
        "description": "Request investigation with a written report.",
        "action_type": "minute",
        "is_default": False,
        "content_text": (
            "Please investigate the issues raised in the attached correspondence "
            "and submit a concise report with recommendations."
        ),
    },
    {
        "title": "For concurrence",
        "description": "Seek formal concurrence before proceeding.",
        "action_type": "minute",
        "is_default": False,
        "content_text": (
            "Submitted for your concurrence to enable further processing of "
            "this matter."
        ),
    },
    {
        "title": "Returned for clarification",
        "description": "Return a file when more information is needed.",
        "action_type": "minute",
        "is_default": False,
        "content_text": (
            "Returned for clarification. Kindly provide the outstanding "
            "information/documents indicated and re-minute for further action."
        ),
    },
    {
        "title": "Noted — please proceed",
        "description": "Acknowledge and authorize continuation of work.",
        "action_type": "minute",
        "is_default": False,
        "content_text": (
            "Noted. Please proceed as proposed and keep this office informed "
            "of progress."
        ),
    },
    {
        "title": "Recommended for approval",
        "description": "Minute recommending approval to a higher authority.",
        "action_type": "minute",
        "is_default": False,
        "content_text": (
            "Having reviewed the submission, I recommend approval as requested. "
            "Submitted for your kind consideration and approval."
        ),
    },
    {
        "title": "Approved as recommended",
        "description": "Standard executive approval minute.",
        "action_type": "approve",
        "is_default": True,
        "content_text": (
            "Approved as recommended. Please proceed with implementation and "
            "ensure compliance with applicable regulations and procedures."
        ),
    },
    {
        "title": "Approved with conditions",
        "description": "Approval that carries conditions the recipient must meet.",
        "action_type": "approve",
        "is_default": False,
        "content_text": (
            "Approved subject to the conditions stated in the recommendation. "
            "Please ensure all conditions are satisfied before implementation "
            "and report compliance."
        ),
    },
    {
        "title": "Not approved — rework",
        "description": "Decline approval and request a revised submission.",
        "action_type": "approve",
        "is_default": False,
        "content_text": (
            "Not approved in its present form. Please address the observations "
            "raised and re-submit for further consideration."
        ),
    },
    {
        "title": "Seen and filed",
        "description": "Close out when no further routing is required.",
        "action_type": "minute",
        "is_default": False,
        "content_text": (
            "Seen. Please file for record purposes. No further action is "
            "required at this time."
        ),
    },
]


def _html_from_text(text: str) -> str:
    escaped = (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
    return f"<p>{escaped}</p>"


def seed_minute_templates(apps, schema_editor):
    CorrespondenceTemplate = apps.get_model("correspondence", "CorrespondenceTemplate")

    for tmpl in MINUTE_TEMPLATES:
        content_text = tmpl["content_text"]
        CorrespondenceTemplate.objects.update_or_create(
            title=tmpl["title"],
            scope="organization",
            scope_id=None,
            template_type="minute",
            defaults={
                "description": tmpl["description"],
                "action_type": tmpl["action_type"],
                "content_text": content_text,
                "content_html": _html_from_text(content_text),
                "is_default": tmpl["is_default"],
                "is_active": True,
                "created_by": None,
                "updated_by": None,
            },
        )


def reverse_seed(apps, schema_editor):
    CorrespondenceTemplate = apps.get_model("correspondence", "CorrespondenceTemplate")
    CorrespondenceTemplate.objects.filter(
        title__in=[t["title"] for t in MINUTE_TEMPLATES],
        scope="organization",
        template_type="minute",
        created_by__isnull=True,
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("correspondence", "0054_acting_appointment"),
    ]

    operations = [
        migrations.RunPython(seed_minute_templates, reverse_seed),
    ]
