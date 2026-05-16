# api/audit_log.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import AuditLog
from .serializers import AuditLogSerializer

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def audit_log_summary(request):
    if request.method == "GET":
        logs = AuditLog.objects.all().order_by("-timestamp")
        serializer = AuditLogSerializer(logs, many=True)
        return Response(serializer.data)

    if request.method == "POST":
        serializer = AuditLogSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)  # attach current user
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
