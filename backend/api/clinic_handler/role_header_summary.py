from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils.timezone import now
from .models import Patient

@api_view(["GET"])
def clinic_summary(request):
    today = now().date()
    return Response({
        "in_queue": Patient.objects.filter(status="waiting").count(),
        "served_today": Patient.objects.filter(status="completed", queueDate=today).count(),
        "next_vaccination": Patient.objects.filter(reason__icontains="vaccination").order_by("queueDate").first().queueDate if Patient.objects.filter(reason__icontains="vaccination").exists() else None,
    })
