"""
URL configuration for Report Handler backend.
Defines API endpoints for all modules based on SQL schema.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .incident import IncidentViewSet, public_report_view, report_track
from .case_record import CaseRecordViewSet
from .lost_found import LostFoundViewSet
from .role_header_summary import report_summary

# API endpoints structure:
# /incidents/ - Reports/complaints
# /incidents/<pk>/ - Incident detail
# /incidents/public-report/ - Public incident creation
# /incidents/filter/by-status/<status>/ - Filter by status
# /incidents/filter/by-category/<category>/ - Filter by category
# /incidents/filter/by-priority/<priority>/ - Filter by priority
# /incidents/<pk>/update-status/ - Status update
# /incidents/<pk>/assign/ - Assign to handler
#
# /cases/ - Case management
# /cases/<pk>/ - Case detail
# /cases/<pk>/update-status/ - Case status update
#
# /lost-found/ - Lost & found items
# /lost-found/<pk>/ - Item detail
# /lost-found/filter/by-type/<item_type>/ - Filter by type
# /lost-found/filter/by-status/<status>/ - Filter by status
# /lost-found/<pk>/update-status/ - Status update
#
# /reports/summary/ - Dashboard summary

router = DefaultRouter()
router.register(r"incidents", IncidentViewSet, basename="incidents")
router.register(r"cases", CaseRecordViewSet, basename="cases")
router.register(r"lost-found", LostFoundViewSet, basename="lost_found")

urlpatterns = [
    path("incidents/public-report/", public_report_view),
    path("incidents/track/", report_track),
    path("reports/summary/", report_summary),
    path("", include(router.urls)),
    
    # TODO: Implement incident endpoints
    # - IncidentListCreateView
    # - IncidentDetailView
    # - PublicIncidentCreateView
    # - Filter endpoints (status, category, priority)
    # - IncidentStatusUpdateView
    # - IncidentAssignView
    
    # TODO: Implement lost & found filter endpoints
    # - LostFoundByTypeView
    # - LostFoundByStatusView
    # - LostFoundStatusUpdateView
]
