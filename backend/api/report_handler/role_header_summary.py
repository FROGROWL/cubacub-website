from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils.timezone import now
from datetime import timedelta
from .models import CaseRecord, CasePriorOffense, Incident, LostFoundItem
from .cleanup import cleanup_expired_reports

@api_view(["GET"])
def report_summary(request):
    cleanup_expired_reports()
    today = now().date()
    cutoff = now() - timedelta(days=1)

    incident_total = Incident.objects.count()
    incident_pending = Incident.objects.filter(status="new", created_at__gte=cutoff).count()
    incident_investigation = Incident.objects.filter(status="investigating").count() + Incident.objects.filter(status="new", created_at__lt=cutoff).count()
    incident_resolved = Incident.objects.filter(status="resolved").count()

    lost_found_total = LostFoundItem.objects.count()
    lost_found_pending = LostFoundItem.objects.filter(status="pending").count()
    lost_found_investigation = LostFoundItem.objects.filter(status="post").count()
    lost_found_resolved = LostFoundItem.objects.filter(status="resolved").count()

    total_reports = incident_total + lost_found_total
    pending_reports = incident_pending + lost_found_pending
    investigation_reports = incident_investigation + lost_found_investigation
    resolved_reports = incident_resolved + lost_found_resolved
    return Response({
        "total_reports": total_reports,
        "new_reports": pending_reports,
        "public_reports": Incident.objects.filter(source="public").count(),
        "pending_reports": pending_reports,
        "investigation_reports": investigation_reports,
        "resolved_reports": resolved_reports,
        "incident_total": incident_total,
        "lost_found_total": lost_found_total,
        "open_cases": CaseRecord.objects.filter(status="open").count(),
        "resolved_today": CaseRecord.objects.filter(status="resolved", date_resolved=today).count(),
        "recidivists": CaseRecord.objects.filter(caseprioroffense__isnull=False).distinct().count(),
    })
