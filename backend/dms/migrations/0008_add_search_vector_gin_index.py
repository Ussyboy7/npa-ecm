# Generated migration to add GIN index for search_vector

from django.contrib.postgres.indexes import GinIndex
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('dms', '0007_document_search_vector_and_more'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='document',
            index=GinIndex(fields=['search_vector'], name='dms_document_search_vector_gin_idx'),
        ),
    ]

