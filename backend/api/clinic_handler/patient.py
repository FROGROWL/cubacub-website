from rest_framework import viewsets
from .models import Patient
from .serializers import PatientSerializer

class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all().order_by("-dateBooked", "-created_at", "-queueDate")
    serializer_class = PatientSerializer
