# api/signals.py
from django.dispatch import receiver
from .models import StaffAccount, AuditLog
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.utils.timezone import now

@receiver(user_logged_in)
def mark_user_active(sender, request, user, **kwargs):
    print(f"Signal fired: {user.username} logged in")
    StaffAccount.objects.filter(pk=user.pk).update(is_online=True, last_activity=now())
    AuditLog.objects.create(
        user=user,
        action=f"{user.name} (@{user.username}) signed in.",
        status="success",
    )

@receiver(user_logged_out)
def mark_user_inactive(sender, request, user, **kwargs):
    print(f"Signal fired: {user.username} logged out")
    StaffAccount.objects.filter(pk=user.pk).update(is_online=False)
    AuditLog.objects.create(
        user=user,
        action=f"{user.name} (@{user.username}) signed out.",
        status="info",
    )
