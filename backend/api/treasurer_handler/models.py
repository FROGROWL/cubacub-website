from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid

class Project(models.Model):
    STATUS_CHOICES = [
        ("completed", "Completed"),
        ("ongoing", "Ongoing"),
        ("upcoming", "Upcoming"),
    ]

    id = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="upcoming")
    budget = models.DecimalField(max_digits=12, decimal_places=2)
    spent = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    progress = models.IntegerField(default=0)  # percentage
    description = models.TextField()
    location = models.CharField(max_length=200)
    startDate = models.DateField()
    endDate = models.DateField()
    contractor = models.CharField(max_length=100)
    source = models.CharField(max_length=100)
    category = models.CharField(max_length=100)
    images = models.JSONField(default=list, blank=True)  # store image URLs
    coverImage = models.TextField(blank=True, null=True)
    otherImages = models.JSONField(default=list, blank=True)
    milestones = models.JSONField(default=list, blank=True)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
    lastUpdatedBy = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="treasury_project_updates",
    )
    statusUpdatedAt = models.DateTimeField(null=True, blank=True)
    statusUpdatedBy = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="treasury_project_status_updates",
    )

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"PRJ-{uuid.uuid4().hex[:8].upper()}"
        if self.status == "completed" and self.progress < 100:
            self.progress = 100
        if self.status == "upcoming" and self.progress > 0:
            self.progress = 0
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.status})"


class SystemSettings(models.Model):
    annual_budget = models.DecimalField(max_digits=12, decimal_places=2, default=8500000)
    clinic_status = models.CharField(max_length=20, default="open")
    pickup_deadline_days = models.IntegerField(default=5)
    refund_percentage = models.IntegerField(default=60)
    updatedAt = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "System Settings"
