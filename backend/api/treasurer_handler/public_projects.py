from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Project
from .serializers import ProjectSerializer


@api_view(["GET"])
@permission_classes([AllowAny])
def public_projects(request):
    queryset = Project.objects.all().order_by("-startDate")
    projects = ProjectSerializer(queryset, many=True).data

    # Keep payload compatible with existing public frontend cards.
    normalized = []
    for project in projects:
        normalized.append(
            {
                **project,
                "description": project.get("description") or "No description available.",
                "image": (project.get("images") or [None])[0],
                "milestones": project.get("milestones") or [],
            }
        )

    return Response(normalized)
