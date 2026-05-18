from django.db import models
from django.utils.timezone import now

class DocumentRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("processing", "Processing"),
        ("ready_to_pickup", "Ready to Pick Up"),
        ("claimed", "Claimed"),
        ("unclaimed", "Unclaimed"),
        ("rejected", "Rejected"),
    ]

    id = models.CharField(max_length=20, primary_key=True)  # e.g. BRG-001
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=100)
    date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    history = models.CharField(max_length=20, default="clear")  # "clear" or "flagged"
    address = models.TextField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    yearsResiding = models.CharField(max_length=10, blank=True, null=True)
    purpose = models.TextField(blank=True, null=True)
    civilStatus = models.CharField(max_length=20, blank=True, null=True)
    sex = models.CharField(max_length=10, blank=True, null=True)
    birthdate = models.DateField(blank=True, null=True)
    validId = models.CharField(max_length=50, blank=True, null=True)
    validIdNo = models.CharField(max_length=50, blank=True, null=True)
    payment = models.CharField(max_length=20, blank=True, null=True)
    copies = models.CharField(max_length=10, blank=True, null=True)
    pickupDeadline = models.DateField(blank=True, null=True)
    statusUpdatedAt = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    rejectionReason = models.TextField(blank=True, null=True)
    idPhoto = models.TextField(blank=True, null=True)
    selfiePhoto = models.TextField(blank=True, null=True)
    gcashProof = models.TextField(blank=True, null=True)
    requirements = models.JSONField(default=dict, blank=True)
    requirementType = models.CharField(max_length=100, blank=True, null=True)

    def save(self, *args, **kwargs):
        if self.pk:
            original_status = DocumentRequest.objects.filter(pk=self.pk).values_list("status", flat=True).first()
            if original_status != self.status:
                self.statusUpdatedAt = now()
        else:
            self.statusUpdatedAt = now()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.id} - {self.name}"


class DocumentCaseRecord(models.Model):
    STATUS_CHOICES = [
        ("cleared", "Cleared"),
        ("flagged", "Flagged"),
        ("under_review", "Under Review"),
    ]

    id = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=100)
    date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="under_review")
    details = models.TextField()
    requestId = models.CharField(max_length=20)

    def __str__(self):
        return f"{self.name} ({self.status})"
