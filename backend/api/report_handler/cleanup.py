from datetime import timedelta
from django.utils.timezone import now
from .models import CaseRecord, Incident, LostFoundItem

EXPIRE_DAYS = 120


def cleanup_expired_reports() -> None:
    cutoff = now() - timedelta(days=EXPIRE_DAYS)
    Incident.objects.filter(created_at__lt=cutoff).delete()
    CaseRecord.objects.filter(created_at__lt=cutoff).delete()
    LostFoundItem.objects.filter(created_at__lt=cutoff).delete()
