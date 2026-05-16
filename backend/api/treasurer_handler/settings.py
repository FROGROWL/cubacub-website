from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import TreasurerSettings
from .serializers import TreasurerSettingsSerializer


def _can_update(user, data):
    if not user or not user.is_authenticated:
        return False
    if user.role in {"treasurer", "super_admin"}:
        return True
    if user.role == "clinic_handler":
        return set(data.keys()).issubset({"clinic_status"})
    return False


@api_view(["GET", "PATCH"])
@permission_classes([AllowAny])
def system_settings(request):
    settings_obj = TreasurerSettings.get_solo()

    if request.method == "GET":
        return Response(TreasurerSettingsSerializer(settings_obj).data)

    if not _can_update(request.user, request.data):
        return Response({"detail": "You do not have permission to update settings."}, status=status.HTTP_403_FORBIDDEN)

    serializer = TreasurerSettingsSerializer(settings_obj, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
