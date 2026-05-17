# api/audit_log.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from .models import AuditLog
from .serializers import AuditLogSerializer


def cleanup_expired_audit_logs():
    cutoff = timezone.now() - timedelta(days=30)
    AuditLog.objects.filter(timestamp__lt=cutoff).delete()


def parse_ids(request):
    ids = request.data.get("ids", [])
    if not isinstance(ids, list):
        return []
    return [item for item in ids if item is not None]


@api_view(["GET", "POST", "PATCH"])
@permission_classes([IsAuthenticated])
def audit_log_summary(request):
    cleanup_expired_audit_logs()

    if request.method == "GET":
        show_trash = request.query_params.get("trash", "").lower() in ["1", "true", "yes"]
        logs = AuditLog.objects.filter(is_trashed=show_trash).order_by("-timestamp")
        serializer = AuditLogSerializer(logs, many=True)
        return Response(serializer.data)

    if request.method == "POST":
        serializer = AuditLogSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)  # attach current user
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == "PATCH":
        ids = parse_ids(request)
        action = request.data.get("action")
        if action not in ["trash", "restore"]:
            return Response({"detail": "Action must be 'trash' or 'restore'."}, status=status.HTTP_400_BAD_REQUEST)
        if not ids:
            return Response({"detail": "No audit log ids were provided."}, status=status.HTTP_400_BAD_REQUEST)

        updates = {
            "is_trashed": action == "trash",
            "trashed_at": timezone.now() if action == "trash" else None,
        }
        updated = AuditLog.objects.filter(id__in=ids).update(**updates)
        return Response({"updated": updated})
