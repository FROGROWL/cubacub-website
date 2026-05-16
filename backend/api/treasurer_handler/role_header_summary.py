from rest_framework.decorators import api_view
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import models
from .models import Project, TreasurerSettings
from ..permissions import IsTreasurerOrSuperAdmin

@api_view(["GET"])
@permission_classes([IsAuthenticated, IsTreasurerOrSuperAdmin])
def treasurer_summary(request):
    settings_obj, _ = TreasurerSettings.objects.get_or_create(id=1)
    return Response({
        "total_budget": settings_obj.annual_budget,
        "allocated": Project.objects.aggregate(total=models.Sum("budget"))["total"] or 0,
        "active_projects": Project.objects.filter(status="ongoing").count(),
    })
