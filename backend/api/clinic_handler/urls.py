from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .patient import PatientViewSet
from .role_header_summary import clinic_summary

router = DefaultRouter()
router.register(r"patients", PatientViewSet, basename="patients")

urlpatterns = [
    path("", include(router.urls)),
    path("clinic/summary/", clinic_summary),
]
