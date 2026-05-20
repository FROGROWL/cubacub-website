from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils.timezone import now
from .models import DocumentRequest

@api_view(["GET"])
def document_summary(request):
    today = now().date()
    year = today.year
    month = today.month

    pending = DocumentRequest.objects.filter(status="pending").count()
    approved_this_month = DocumentRequest.objects.filter(status="approved", date__year=year, date__month=month).count()
    total_this_month = DocumentRequest.objects.filter(
        status__in=["rejected", "unclaimed", "claimed"],
        date__year=year,
        date__month=month,
    ).count()

    return Response({
        "pending": pending,
        "approved_today": approved_this_month,
        "approved_this_month": approved_this_month,
        "total_this_month": total_this_month,
    })
