from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .models import LostFoundItem
from .serializers import LostFoundSerializer
from .cleanup import cleanup_expired_reports
import random


class LostFoundViewSet(viewsets.ModelViewSet):
    serializer_class = LostFoundSerializer

    def get_queryset(self):
        cleanup_expired_reports()
        return LostFoundItem.objects.all()

    def get_permissions(self):
        if self.action in ["list", "retrieve", "create"]:
            return [AllowAny()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)

        # Ensure reporter_id is present for the model
        if not data.get('reporter_id'):
            is_anon = data.get('is_anonymous')
            if isinstance(is_anon, str):
                is_anon = is_anon.lower() in ('true', '1')
            if is_anon:
                data['reporter_id'] = f"ANON-{random.randint(1000, 9999)}"
            else:
                data['reporter_id'] = f"RPT-{random.randint(1000, 9999)}"

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
