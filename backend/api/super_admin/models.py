from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import uuid


class StaffAccount(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ROLE_CHOICES = [
        ("super_admin", "Super Admin"),
        ("document_handler", "Document Handler"),
        ("report_handler", "Report Handler"),
        ("clinic_handler", "Clinic Handler"),
        ("treasurer", "Treasurer"),
    ]

    name = models.CharField(max_length=100)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default="document_handler")
    is_online = models.BooleanField(default=False)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.CharField(max_length=200, blank=True, null=True)
    birthdate = models.DateField(blank=True, null=True)
    sex = models.CharField(max_length=10, blank=True, null=True)
    last_activity = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class PasswordResetCode(models.Model):
    user = models.ForeignKey(StaffAccount, on_delete=models.CASCADE)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        return timezone.now() < self.created_at + timedelta(minutes=10)


class AuditLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs"
    )
    action = models.TextField()
    status = models.CharField(max_length=50, default="info")
    timestamp = models.DateTimeField(auto_now_add=True)
    is_trashed = models.BooleanField(default=False)
    trashed_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.user.username if self.user else 'Deleted User'} - {self.action}"
