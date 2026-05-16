from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils.timezone import now
from .models import DocumentRequest

@api_view(["GET"])
def document_summary(request):
    today = now().date()
    month = today.month

    pending = DocumentRequest.objects.filter(status="pending").count()
    approved_today = DocumentRequest.objects.filter(status="approved", date=today).count()
    total_this_month = DocumentRequest.objects.filter(date__month=month).count()

    return Response({
        "pending": pending,
        "approved_today": approved_today,
        "total_this_month": total_this_month,
    })
