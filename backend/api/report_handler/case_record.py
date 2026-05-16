from rest_framework import viewsets
from .models import CaseRecord
from .serializers import CaseRecordSerializer

class CaseRecordViewSet(viewsets.ModelViewSet):
    queryset = CaseRecord.objects.all().order_by("-case_date")
    serializer_class = CaseRecordSerializer
