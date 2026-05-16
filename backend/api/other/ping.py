from django.utils.timezone import now
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ..super_admin.models import StaffAccount

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ping(request):
    StaffAccount.objects.filter(pk=request.user.pk).update(
        is_online=True, last_activity=now()
    )
    return Response({"status": "ok"})
