from django.utils.timezone import now
from datetime import timedelta
from ..super_admin.models import StaffAccount

class ActivityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith("/static/") or request.path.startswith("/media/") or request.path == "/favicon.ico":
            return response

        try:
            if request.user.is_authenticated:
                StaffAccount.objects.filter(pk=request.user.pk).update(
                    is_online=True, last_activity=now()
                )
        except Exception:
            # Never block requests if activity tracking fails.
            pass
        return response

class InactivityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith("/static/") or request.path.startswith("/media/") or request.path == "/favicon.ico":
            return response

        try:
            if request.user.is_authenticated:
                cutoff = now() - timedelta(minutes=15)
                if request.user.last_activity and request.user.last_activity < cutoff:
                    StaffAccount.objects.filter(pk=request.user.pk).update(is_online=False)
        except Exception:
            # Never block requests if inactivity checks fail.
            pass
        return response
