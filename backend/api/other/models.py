from django.db import models

class CalendarEvent(models.Model):
    date = models.DateField()
    title = models.CharField(max_length=200)
    color = models.CharField(max_length=20, default="#1B263B")
    source = models.CharField(max_length=100, blank=True, null=True)
    icon = models.CharField(max_length=50, blank=True, null=True)
    type = models.CharField(max_length=20, choices=[("event", "Event"), ("closure", "Closure")], default="event")

    def __str__(self):
        return f"{self.title} ({self.date})"
