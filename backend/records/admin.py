from django.contrib import admin

from .models import DisposalRequest, LegalHold, RetentionSchedule

admin.site.register(RetentionSchedule)
admin.site.register(LegalHold)
admin.site.register(DisposalRequest)
