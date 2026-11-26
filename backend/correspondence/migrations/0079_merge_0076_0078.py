"""Keep one leaf after the delegation migrations were committed on their own.

The delegation migrations (0077, 0078) were committed ahead of the draft
migrations (0074-0076) so that work could land separately. This merges the two
branches; it carries no operations.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("correspondence", "0076_correspondencedraft_response_type_and_document"),
        ("correspondence", "0078_link_delegation_assignments"),
    ]

    operations = []
