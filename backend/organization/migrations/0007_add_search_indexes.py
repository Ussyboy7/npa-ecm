# Generated migration for search indexes

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('organization', '0005_add_permissions_to_role'),
    ]

    operations = [
        # Directorate indexes
        migrations.AddIndex(
            model_name='directorate',
            index=models.Index(fields=['name'], name='org_dir_name_idx'),
        ),
        migrations.AddIndex(
            model_name='directorate',
            index=models.Index(fields=['code'], name='org_dir_code_idx'),
        ),
        migrations.AddIndex(
            model_name='directorate',
            index=models.Index(fields=['is_active'], name='org_dir_active_idx'),
        ),
        
        # Division indexes
        migrations.AddIndex(
            model_name='division',
            index=models.Index(fields=['name'], name='org_div_name_idx'),
        ),
        migrations.AddIndex(
            model_name='division',
            index=models.Index(fields=['code'], name='org_div_code_idx'),
        ),
        migrations.AddIndex(
            model_name='division',
            index=models.Index(fields=['is_active'], name='org_div_active_idx'),
        ),
        migrations.AddIndex(
            model_name='division',
            index=models.Index(fields=['directorate', 'is_active'], name='org_div_dir_active_idx'),
        ),
        
        # Department indexes
        migrations.AddIndex(
            model_name='department',
            index=models.Index(fields=['name'], name='org_dept_name_idx'),
        ),
        migrations.AddIndex(
            model_name='department',
            index=models.Index(fields=['code'], name='org_dept_code_idx'),
        ),
        migrations.AddIndex(
            model_name='department',
            index=models.Index(fields=['is_active'], name='org_dept_active_idx'),
        ),
        migrations.AddIndex(
            model_name='department',
            index=models.Index(fields=['division', 'is_active'], name='org_dept_div_active_idx'),
        ),
        
        # Role indexes
        migrations.AddIndex(
            model_name='role',
            index=models.Index(fields=['name'], name='org_role_name_idx'),
        ),
        migrations.AddIndex(
            model_name='role',
            index=models.Index(fields=['is_active'], name='org_role_active_idx'),
        ),
    ]

