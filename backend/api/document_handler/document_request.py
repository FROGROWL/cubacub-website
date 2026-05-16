from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils.timezone import now
import calendar
from datetime import date
import uuid

from .models import DocumentRequest
from .serializers import DocumentRequestSerializer

class DocumentRequestViewSet(viewsets.ModelViewSet):
    queryset = DocumentRequest.objects.all().order_by("-date")
    serializer_class = DocumentRequestSerializer

    def get_queryset(self):
        _purge_expired_requests()
        _mark_unclaimed_requests()
        return DocumentRequest.objects.all().order_by("-date")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status not in {"rejected", "ready_to_pickup"}:
            return Response(
                {"detail": "Delete is only allowed for rejected or ready_to_pickup requests."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


def _subtract_months(value: date, months: int) -> date:
    year = value.year
    month = value.month - months
    while month <= 0:
        month += 12
        year -= 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _purge_expired_requests() -> None:
    cutoff = _subtract_months(now().date(), 4)
    DocumentRequest.objects.filter(date__lte=cutoff).delete()


def _mark_unclaimed_requests() -> None:
    today = now().date()
    DocumentRequest.objects.filter(
        status="ready_to_pickup",
        pickupDeadline__isnull=False,
        pickupDeadline__lt=today,
    ).update(status="unclaimed", statusUpdatedAt=now())


def _generate_tracking_id() -> str:
    prefix = "BRG-"
    while True:
        candidate = f"{prefix}{uuid.uuid4().hex[:8].upper()}"
        if not DocumentRequest.objects.filter(id=candidate).exists():
            return candidate


@api_view(["POST"])
@permission_classes([AllowAny])
def public_document_request(request):
    tracking_id = _generate_tracking_id()
    payload = {**request.data, "id": tracking_id}
    serializer = DocumentRequestSerializer(data=payload)
    if serializer.is_valid():
        serializer.save()
        return Response({"success": True, "trackingId": tracking_id}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([AllowAny])
def document_track(request):
    tracking_id = request.query_params.get("id")
    if not tracking_id:
        return Response({"found": False}, status=status.HTTP_400_BAD_REQUEST)

    _purge_expired_requests()
    _mark_unclaimed_requests()

    doc = DocumentRequest.objects.filter(id=tracking_id).first()
    if not doc:
        return Response({"found": False}, status=status.HTTP_200_OK)

    status_map = {
        "pending": 0,
        "approved": 2,
        "processing": 2,
        "ready_to_pickup": 3,
        "claimed": 4,
        "unclaimed": 3,
        "rejected": -1,
    }

    return Response({
        "found": True,
        "id": doc.id,
        "name": doc.name,
        "type": doc.type,
        "status": doc.status,
        "date": doc.date,
        "step": status_map.get(doc.status, 0),
        "pickupDeadline": doc.pickupDeadline,
        "statusUpdatedAt": doc.statusUpdatedAt,
        "rejectionReason": doc.rejectionReason,
    })
