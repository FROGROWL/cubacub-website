from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .patient import PatientViewSet, booked_slots, unavailable_slots, unavailable_slot_detail, clinic_track
from .role_header_summary import clinic_summary

router = DefaultRouter()
router.register(r"patients", PatientViewSet, basename="patients")

urlpatterns = [
    path("patients/booked-slots/", booked_slots),
    path("patients/track/", clinic_track),
    path("clinic/unavailable-slots/", unavailable_slots),
    path("clinic/unavailable-slots/<int:pk>/", unavailable_slot_detail),
    path("", include(router.urls)),
    path("clinic/summary/", clinic_summary),
]
