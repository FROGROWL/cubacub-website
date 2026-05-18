from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from ..permissions import IsSuperAdmin
from .models import LandingPageConfig
from .serializers import LandingPageConfigSerializer


@api_view(["GET"])
@permission_classes([AllowAny])
def public_landing_page_config(request):
    config = LandingPageConfig.get_solo()
    serializer = LandingPageConfigSerializer(config)
    return Response(serializer.data)


@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def admin_landing_page_config(request):
    config = LandingPageConfig.get_solo()

    if request.method == "GET":
        serializer = LandingPageConfigSerializer(config)
        return Response(serializer.data)

    serializer = LandingPageConfigSerializer(config, data=request.data, partial=request.method == "PATCH")
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)
    return Response(serializer.data)
