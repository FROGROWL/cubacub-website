from django.db import models

class Patient(models.Model):
    STATUS_CHOICES = [
        ("waiting", "Waiting"),
        ("in-progress", "In Progress"),
        ("completed", "Completed"),
        ("canceled", "Canceled"),
    ]

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    time = models.CharField(max_length=20)  # e.g. "10:30 AM"
    reason = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="waiting")
    phone = models.CharField(max_length=20, blank=True, null=True)
    birthdate = models.DateField(blank=True, null=True)
    sex = models.CharField(max_length=10, blank=True, null=True)
    chiefComplaint = models.TextField(blank=True, null=True)
    allergies = models.TextField(blank=True, null=True)
    medications = models.TextField(blank=True, null=True)
    conditions = models.TextField(blank=True, null=True)
    queueDate = models.DateField(blank=True, null=True)
    appointmentId = models.CharField(max_length=20, blank=True, null=True)
    dateBooked = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.status})"


class ClinicUnavailableSlot(models.Model):
    date = models.DateField()
    time = models.CharField(max_length=20)
    reason = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "clinic_unavailable_slots"
        unique_together = ("date", "time")
        ordering = ["date", "time"]

    def __str__(self):
        return f"{self.date} {self.time}"
