from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils.timezone import now
from datetime import timedelta
from django.db.models import Count, Q
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import StaffAccount, AuditLog
from ..document_handler.models import DocumentRequest
from ..report_handler.models import Incident, LostFoundItem
from ..clinic_handler.models import Patient
from ..treasurer_handler.models import Project
from ..treasurer_handler.models import SystemSettings

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def superadmin_summary(request):
    visible_staff = StaffAccount.objects.filter(is_superuser=False)
    total_staff = visible_staff.count()

    # First reset stale users
    cutoff = now() - timedelta(minutes=15)
    StaffAccount.objects.filter(last_activity__lt=cutoff, is_online=True).update(is_online=False)

    # Then count online staff
    online_staff = visible_staff.filter(is_online=True).count()

    active_audit_logs = AuditLog.objects.filter(is_trashed=False)
    actions_today = active_audit_logs.filter(timestamp__date=now().date()).count()
    role_distribution = visible_staff.values("role").annotate(count=Count("id"))
    audit_actions = active_audit_logs.values("action").annotate(count=Count("id"))
    audit_status = active_audit_logs.values("status").annotate(count=Count("id"))

    documents_count = DocumentRequest.objects.count()
    document_refund_count = Incident.objects.filter(
        Q(category="Document Refund") | Q(subcategory__icontains="refund")
    ).count()
    case_management_count = Incident.objects.exclude(
        Q(category="Document Refund") | Q(subcategory__icontains="refund")
    ).count()
    clinic_count = Patient.objects.count()
    lost_found_count = LostFoundItem.objects.count()
    projects_count = Project.objects.count()

    service_volume = [
        {"label": "Documents", "value": documents_count, "color": "#1B263B"},
        {"label": "Case Management", "value": case_management_count, "color": "#008080"},
        {"label": "Document Refund", "value": document_refund_count, "color": "#7C3AED"},
        {"label": "Clinic", "value": clinic_count, "color": "#00a89d"},
        {"label": "Lost & Found", "value": lost_found_count, "color": "#FF6B6B"},
        {"label": "Total Projects", "value": projects_count, "color": "#059669"},
    ]

    doc_type_counts = list(
        DocumentRequest.objects.values("type").annotate(count=Count("id")).order_by("-count")
    )
    total_document_requests = sum(item["count"] for item in doc_type_counts)
    pie_colors = ["#1B263B", "#008080", "#00a89d", "#FF6B6B", "#FFD93D", "#7C3AED"]
    document_breakdown = []
    for index, item in enumerate(doc_type_counts):
        percentage = 0
        if total_document_requests > 0:
            percentage = round((item["count"] / total_document_requests) * 100, 2)
        document_breakdown.append(
            {
                "name": item["type"],
                "value": percentage,
                "fill": pie_colors[index % len(pie_colors)],
            }
        )

    return Response({
        "total_staff": total_staff,
        "online_staff": online_staff,
        "actions_today": actions_today,
        "role_distribution": list(role_distribution),
        "audit_actions": list(audit_actions),
        "audit_status": list(audit_status),
        "serviceVolume": service_volume,
        "documentBreakdown": document_breakdown,
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def public_landing_stats(request):
    settings_obj = SystemSettings.get_solo()
    documents_count = DocumentRequest.objects.count()
    document_refund_count = Incident.objects.filter(
        Q(category="Document Refund") | Q(subcategory__icontains="refund")
    ).count()
    case_management_count = Incident.objects.exclude(
        Q(category="Document Refund") | Q(subcategory__icontains="refund")
    ).count()
    clinic_count = Patient.objects.count()
    lost_found_count = LostFoundItem.objects.count()
    projects_count = Project.objects.count()

    return Response({
        "documents": documents_count,
        "clinic": clinic_count,
        "case_management": case_management_count,
        "document_refund": document_refund_count,
        "lost_found": lost_found_count,
        "total_projects": projects_count,
        "residents_served": documents_count + clinic_count + case_management_count + document_refund_count + lost_found_count,
        "clinic_status": settings_obj.clinic_status,
    })
