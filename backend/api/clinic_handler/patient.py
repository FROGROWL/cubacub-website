from datetime import datetime
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .models import Patient, ClinicUnavailableSlot
from .serializers import PatientSerializer, ClinicUnavailableSlotSerializer

class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all().order_by("-dateBooked", "-created_at", "-queueDate")
    serializer_class = PatientSerializer


CLINIC_SLOTS = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"]


def _slot_is_past(date_value, slot):
    if date_value != timezone.localdate():
        return date_value < timezone.localdate()
    try:
        slot_time = datetime.strptime(slot, "%I:%M %p").time()
    except ValueError:
        return False
    return slot_time <= timezone.localtime().time()


@api_view(["GET"])
@permission_classes([AllowAny])
def booked_slots(request):
    date_text = request.query_params.get("date")
    if not date_text:
        return Response([], status=status.HTTP_200_OK)

    try:
        date_value = datetime.strptime(date_text, "%Y-%m-%d").date()
    except ValueError:
        return Response({"date": "Invalid date format."}, status=status.HTTP_400_BAD_REQUEST)

    booked = set(Patient.objects.filter(queueDate=date_value).exclude(status="canceled").values_list("time", flat=True))
    manually_unavailable = set(ClinicUnavailableSlot.objects.filter(date=date_value).values_list("time", flat=True))
    past = {slot for slot in CLINIC_SLOTS if _slot_is_past(date_value, slot)}
    return Response(sorted(booked | manually_unavailable | past, key=lambda slot: CLINIC_SLOTS.index(slot) if slot in CLINIC_SLOTS else 999))


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def unavailable_slots(request):
    if request.method == "GET":
        date_text = request.query_params.get("date")
        queryset = ClinicUnavailableSlot.objects.all()
        if date_text:
            queryset = queryset.filter(date=date_text)
        serializer = ClinicUnavailableSlotSerializer(queryset, many=True)
        return Response(serializer.data)

    serializer = ClinicUnavailableSlotSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def unavailable_slot_detail(request, pk):
    slot = ClinicUnavailableSlot.objects.filter(pk=pk).first()
    if not slot:
        return Response(status=status.HTTP_404_NOT_FOUND)
    slot.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
