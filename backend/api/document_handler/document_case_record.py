from rest_framework import viewsets
from .models import DocumentCaseRecord
from .serializers import DocumentCaseRecordSerializer

class DocumentCaseRecordViewSet(viewsets.ModelViewSet):
    queryset = DocumentCaseRecord.objects.all().order_by("-date")
    serializer_class = DocumentCaseRecordSerializer
