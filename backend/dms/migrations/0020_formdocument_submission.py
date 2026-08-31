from django.db import migrations, models
import django.db.models.deletion


def backfill_formdocument_submissions(apps, schema_editor):
    FormDocument = apps.get_model("dms", "FormDocument")
    FormSignatureWorkflow = apps.get_model("forms", "FormSignatureWorkflow")

    workflows = FormSignatureWorkflow.objects.exclude(submission_id=None).values(
        "id", "submission_id"
    )
    submission_by_workflow = {row["id"]: row["submission_id"] for row in workflows}
    for form_document in FormDocument.objects.filter(
        submission_id=None,
        signature_workflow_id__isnull=False,
    ).iterator():
        submission_id = submission_by_workflow.get(form_document.signature_workflow_id)
        if submission_id:
            FormDocument.objects.filter(pk=form_document.pk).update(
                submission_id=submission_id
            )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("dms", "0019_documentaccesslog_print_actions"),
        ("forms", "0003_formserialcounter"),
    ]

    operations = [
        migrations.AddField(
            model_name="formdocument",
            name="submission",
            field=models.OneToOneField(
                blank=True,
                help_text="Canonical structured submission for this form document.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="form_document",
                to="forms.formsubmission",
            ),
        ),
        migrations.RunPython(backfill_formdocument_submissions, noop_reverse),
    ]
