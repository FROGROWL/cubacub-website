from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .super_admin import StaffAccountViewSet, request_password_reset, confirm_password_reset
from .profile import my_profile
from .audit_log import audit_log_summary
from .role_header_summary import public_landing_stats, superadmin_summary

router = DefaultRouter()
router.register(r"staff", StaffAccountViewSet, basename="staff")

urlpatterns = [
    path("", include(router.urls)),
    path("me/", my_profile, name="my_profile"),
    path("profile/", my_profile, name="profile"),
    path("audit-log/", audit_log_summary, name="audit_log"),
    path("superadmin/summary/", superadmin_summary),
    path("public/landing-stats/", public_landing_stats),
    path("api/auth/request-reset/", request_password_reset),
    path("api/auth/confirm-reset/", confirm_password_reset),
]
