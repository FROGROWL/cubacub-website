from django.urls import path, include

urlpatterns = [
    path("", include("api.super_admin.urls")),
    path("", include("api.document_handler.urls")),
    path("", include("api.report_handler.urls")),
    path("", include("api.clinic_handler.urls")),
    path("", include("api.treasurer_handler.urls")),
    path("", include("api.other.urls")),
]
