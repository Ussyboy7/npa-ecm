# Generated manually to sync ActionType choices (role_* actions).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("audit", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="activitylog",
            name="action",
            field=models.CharField(
                choices=[
                    ("document_created", "Document Created"),
                    ("document_updated", "Document Updated"),
                    ("document_deleted", "Document Deleted"),
                    ("document_viewed", "Document Viewed"),
                    ("document_downloaded", "Document Downloaded"),
                    ("document_shared", "Document Shared"),
                    ("document_version_uploaded", "Document Version Uploaded"),
                    ("document_comment_added", "Document Comment Added"),
                    ("document_comment_resolved", "Document Comment Resolved"),
                    ("correspondence_created", "Correspondence Created"),
                    ("correspondence_updated", "Correspondence Updated"),
                    ("correspondence_routed", "Correspondence Routed"),
                    ("correspondence_minuted", "Correspondence Minuted"),
                    ("correspondence_approved", "Correspondence Approved"),
                    ("correspondence_rejected", "Correspondence Rejected"),
                    ("correspondence_completed", "Correspondence Completed"),
                    ("user_login", "User Login"),
                    ("user_logout", "User Logout"),
                    ("user_impersonated", "User Impersonated"),
                    ("user_created", "User Created"),
                    ("user_updated", "User Updated"),
                    ("user_deleted", "User Deleted"),
                    ("permission_granted", "Permission Granted"),
                    ("permission_revoked", "Permission Revoked"),
                    ("workflow_started", "Workflow Started"),
                    ("workflow_completed", "Workflow Completed"),
                    ("workflow_approved", "Workflow Approved"),
                    ("workflow_rejected", "Workflow Rejected"),
                    ("role_created", "Role Created"),
                    ("role_updated", "Role Updated"),
                    ("role_deleted", "Role Deleted"),
                    ("system_config_changed", "System Configuration Changed"),
                    ("system_backup", "System Backup"),
                    ("system_restore", "System Restore"),
                ],
                max_length=50,
            ),
        ),
    ]
