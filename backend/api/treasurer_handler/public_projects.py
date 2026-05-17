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
        legacy_images = project.get("images") or []
        cover_image = project.get("coverImage") or (legacy_images[0] if legacy_images else None)
        other_images = project.get("otherImages") or (legacy_images[1:] if len(legacy_images) > 1 else [])
        normalized.append(
            {
                **project,
                "description": project.get("description") or "No description available.",
                "coverImage": cover_image,
                "otherImages": other_images,
                "image": cover_image,
                "milestones": project.get("milestones") or [],
            }
        )

    return Response(normalized)
