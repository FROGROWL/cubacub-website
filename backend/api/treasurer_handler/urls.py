from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .project import ProjectViewSet
from .role_header_summary import treasurer_summary
from .public_projects import public_projects
from .settings import system_settings
from .analytics import budget_summary, monthly_spending

router = DefaultRouter()
router.register(r"projects", ProjectViewSet, basename="projects")

urlpatterns = [
    path("projects/public/", public_projects),
    path("", include(router.urls)),
    path("settings/", system_settings),
    path("analytics/budget-summary/", budget_summary),
    path("analytics/monthly-spending/", monthly_spending),
    path("treasurer/summary/", treasurer_summary),
]
