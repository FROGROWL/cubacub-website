from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import Project
from .serializers import ProjectSerializer
from ..permissions import IsTreasurerOrSuperAdmin
from ..super_admin.models import AuditLog

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().order_by("-startDate")
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsTreasurerOrSuperAdmin]

    def get_queryset(self):
        queryset = Project.objects.all()

        status_value = self.request.query_params.get("status")
        category = self.request.query_params.get("category")
        contractor = self.request.query_params.get("contractor")
        search = self.request.query_params.get("search")
        min_budget = self.request.query_params.get("minBudget")
        max_budget = self.request.query_params.get("maxBudget")
        start_from = self.request.query_params.get("startDateFrom")
        end_to = self.request.query_params.get("endDateTo")
        sort_by = self.request.query_params.get("sortBy", "startDate")
        sort_direction = self.request.query_params.get("sortDirection", "desc")

        if status_value and status_value != "all":
            queryset = queryset.filter(status=status_value)
        if category and category != "all":
            queryset = queryset.filter(category=category)
        if contractor:
            queryset = queryset.filter(contractor__icontains=contractor)
        if search:
            queryset = queryset.filter(name__icontains=search)
        if min_budget:
            queryset = queryset.filter(budget__gte=min_budget)
        if max_budget:
            queryset = queryset.filter(budget__lte=max_budget)
        if start_from:
            queryset = queryset.filter(startDate__gte=start_from)
        if end_to:
            queryset = queryset.filter(endDate__lte=end_to)

        sortable = {"name", "budget", "spent", "progress", "startDate", "endDate", "status", "category", "updatedAt", "createdAt"}
        if sort_by not in sortable:
            sort_by = "startDate"
        prefix = "-" if sort_direction == "desc" else ""
        return queryset.order_by(f"{prefix}{sort_by}")

    def _actor_label(self):
        actor = self.request.user
        if not actor or not actor.is_authenticated:
            return "System"
        return f"{actor.name or actor.username} (@{actor.username})"

    def _log(self, action: str, status: str = "info"):
        actor = self.request.user if self.request.user.is_authenticated else None
        AuditLog.objects.create(user=actor, action=action, status=status)

    def _normalized_milestones(self, milestones):
        normalized = []
        for milestone in milestones or []:
            normalized.append(
                {
                    "label": str(milestone.get("label", "")).strip(),
                    "date": str(milestone.get("date", "")).strip(),
                    "done": bool(milestone.get("done", False)),
                }
            )
        return [m for m in normalized if m["label"]]

    def _progress_from_milestones(self, milestones):
        if not milestones:
            return 0
        completed = sum(1 for milestone in milestones if milestone.get("done"))
        return round((completed / len(milestones)) * 100)

    def perform_create(self, serializer):
        actor = self.request.user if self.request.user.is_authenticated else None
        milestones = self._normalized_milestones(serializer.validated_data.get("milestones", []))
        project = serializer.save(
            milestones=milestones,
            progress=self._progress_from_milestones(milestones),
            lastUpdatedBy=actor,
        )
        self._log(
            f"{self._actor_label()} created project {project.id} ({project.name}).",
            status="success",
        )

    def perform_update(self, serializer):
        previous = self.get_object()
        previous_status = previous.status
        actor = self.request.user if self.request.user.is_authenticated else None
        milestones = self._normalized_milestones(
            serializer.validated_data.get("milestones", previous.milestones)
        )
        progress = self._progress_from_milestones(milestones)
        if serializer.validated_data.get("status", previous_status) != previous_status:
            project = serializer.save(
                milestones=milestones,
                progress=progress,
                lastUpdatedBy=actor,
                statusUpdatedAt=timezone.now(),
                statusUpdatedBy=actor,
            )
        else:
            project = serializer.save(
                milestones=milestones,
                progress=progress,
                lastUpdatedBy=actor,
            )
        self._log(
            f"{self._actor_label()} updated project {project.id} ({project.name}).",
            status="info",
        )

    def perform_destroy(self, instance):
        project_id = instance.id
        project_name = instance.name
        super().perform_destroy(instance)
        self._log(
            f"{self._actor_label()} deleted project {project_id} ({project_name}).",
            status="warning",
        )
