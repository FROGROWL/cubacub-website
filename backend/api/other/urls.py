from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .calendar import CalendarEventViewSet
from .ping import ping
from .weather import public_weather

router = DefaultRouter()
router.register(r"events", CalendarEventViewSet, basename="event")

urlpatterns = [
    path("", include(router.urls)),
    path("ping/", ping, name="ping"),
    path("public/weather/", public_weather, name="public_weather"),
]
