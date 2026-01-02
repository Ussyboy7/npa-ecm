# Generated manually for case enhancements
# Date: 2025-01-XX

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('correspondence', '0018_add_case_management'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Create CaseTemplate model FIRST (before adding ForeignKey)
        migrations.CreateModel(
            name='CaseTemplate',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('name', models.CharField(help_text='Template name', max_length=255)),
                ('slug', models.SlugField(help_text='Unique template identifier', max_length=255, unique=True)),
                ('description', models.TextField(blank=True, help_text='Template description')),
                ('case_type', models.CharField(
                    choices=[
                        ('complaint', 'Complaint'),
                        ('request', 'Request'),
                        ('inquiry', 'Inquiry'),
                        ('project', 'Project'),
                        ('legal', 'Legal'),
                        ('audit', 'Audit'),
                        ('general', 'General'),
                    ],
                    default='general',
                    help_text='Default case type for this template',
                    max_length=32,
                )),
                ('is_active', models.BooleanField(default=True, help_text='Whether this template is active')),
                ('default_priority', models.CharField(default='medium', help_text='Default priority for cases created from this template', max_length=20)),
                ('structure', models.JSONField(default=dict, help_text='Template structure and configuration')),
                ('usage_count', models.IntegerField(default=0, help_text='Number of times this template has been used')),
                ('created_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='created_case_templates',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['case_type', 'name'],
            },
        ),
        
        # Create indexes for CaseTemplate
        migrations.AddIndex(
            model_name='casetemplate',
            index=models.Index(fields=['case_type', 'is_active'], name='correspond_case_t_123abc_idx'),
        ),
        migrations.AddIndex(
            model_name='casetemplate',
            index=models.Index(fields=['slug'], name='correspond_slug_123abc_idx'),
        ),
        
        # Create CaseComment model
        migrations.CreateModel(
            name='CaseComment',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('content', models.TextField(help_text='Comment content')),
                ('is_resolved', models.BooleanField(default=False, help_text='Whether this comment/thread is resolved')),
                ('resolved_at', models.DateTimeField(blank=True, null=True)),
                ('author', models.ForeignKey(
                    blank=True,
                    help_text='User who wrote this comment',
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='case_comments',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('case', models.ForeignKey(
                    help_text='Case this comment belongs to',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='comments',
                    to='correspondence.case',
                )),
                ('mentions', models.ManyToManyField(
                    blank=True,
                    help_text='Users mentioned in this comment',
                    related_name='mentioned_in_case_comments',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('parent', models.ForeignKey(
                    blank=True,
                    help_text='Parent comment if this is a reply',
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='replies',
                    to='correspondence.casecomment',
                )),
                ('resolved_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='resolved_case_comments',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        
        # Create indexes for CaseComment
        migrations.AddIndex(
            model_name='casecomment',
            index=models.Index(fields=['case', 'created_at'], name='correspond_case_c_123abc_idx'),
        ),
        migrations.AddIndex(
            model_name='casecomment',
            index=models.Index(fields=['parent'], name='correspond_parent_123abc_idx'),
        ),
        
        # Create CaseWorkflowRule model
        migrations.CreateModel(
            name='CaseWorkflowRule',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(help_text='Rule name', max_length=255)),
                ('description', models.TextField(blank=True, help_text='Rule description')),
                ('case_type', models.CharField(
                    blank=True,
                    choices=[
                        ('complaint', 'Complaint'),
                        ('request', 'Request'),
                        ('inquiry', 'Inquiry'),
                        ('project', 'Project'),
                        ('legal', 'Legal'),
                        ('audit', 'Audit'),
                        ('general', 'General'),
                    ],
                    help_text='Apply to specific case type (leave blank for all)',
                    max_length=32,
                    null=True,
                )),
                ('priority', models.CharField(
                    blank=True,
                    choices=[
                        ('low', 'Low'),
                        ('medium', 'Medium'),
                        ('high', 'High'),
                        ('urgent', 'Urgent'),
                    ],
                    help_text='Apply to specific priority (leave blank for all)',
                    max_length=20,
                    null=True,
                )),
                ('trigger_type', models.CharField(
                    choices=[
                        ('status_change', 'Status Change'),
                        ('time_elapsed', 'Time Elapsed'),
                        ('priority_change', 'Priority Change'),
                        ('assignment_change', 'Assignment Change'),
                        ('link_added', 'Link Added'),
                        ('form_completed', 'Form Completed'),
                    ],
                    max_length=30,
                )),
                ('trigger_conditions', models.JSONField(
                    blank=True,
                    default=dict,
                    help_text="JSON conditions for triggering (e.g., {'days': 7, 'status': 'open'})",
                )),
                ('action_type', models.CharField(
                    choices=[
                        ('change_status', 'Change Status'),
                        ('assign_to', 'Assign To'),
                        ('send_notification', 'Send Notification'),
                        ('escalate', 'Escalate'),
                        ('auto_close', 'Auto Close'),
                    ],
                    max_length=30,
                )),
                ('action_config', models.JSONField(
                    blank=True,
                    default=dict,
                    help_text="JSON configuration for action (e.g., {'status': 'in_progress', 'assign_to_role': 'manager'})",
                )),
                ('is_active', models.BooleanField(default=True, help_text='Whether this rule is active')),
                ('priority_order', models.IntegerField(default=0, help_text='Order for rule evaluation (lower = higher priority)')),
            ],
            options={
                'ordering': ['priority_order', 'name'],
            },
        ),
        
        # Create indexes for CaseWorkflowRule
        migrations.AddIndex(
            model_name='caseworkflowrule',
            index=models.Index(fields=['case_type', 'is_active'], name='correspond_case_t_456def_idx'),
        ),
        migrations.AddIndex(
            model_name='caseworkflowrule',
            index=models.Index(fields=['trigger_type', 'is_active'], name='correspond_trigger_456def_idx'),
        ),
        
        # Create CaseSLA model
        migrations.CreateModel(
            name='CaseSLA',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('target_days', models.PositiveIntegerField(help_text='Target days to resolve')),
                ('target_date', models.DateTimeField(help_text='Target resolution date')),
                ('warning_threshold_percent', models.PositiveIntegerField(
                    default=75,
                    help_text='Percentage of SLA time elapsed to trigger warning',
                )),
                ('critical_threshold_percent', models.PositiveIntegerField(
                    default=90,
                    help_text='Percentage of SLA time elapsed to trigger critical alert',
                )),
                ('warning_sent', models.BooleanField(default=False, help_text='Whether warning notification was sent')),
                ('critical_sent', models.BooleanField(default=False, help_text='Whether critical notification was sent')),
                ('breached', models.BooleanField(default=False, help_text='Whether SLA was breached')),
                ('breached_at', models.DateTimeField(blank=True, help_text='When SLA was breached', null=True)),
                ('case', models.OneToOneField(
                    help_text='Case this SLA applies to',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='sla',
                    to='correspondence.case',
                )),
            ],
        ),
        
        # Create indexes for CaseSLA
        migrations.AddIndex(
            model_name='casesla',
            index=models.Index(fields=['case', 'target_date'], name='correspond_case_t_789ghi_idx'),
        ),
        migrations.AddIndex(
            model_name='casesla',
            index=models.Index(fields=['breached', 'target_date'], name='correspond_breache_789ghi_idx'),
        ),
    ]

