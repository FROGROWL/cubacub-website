from datetime import datetime
from django.utils import timezone
from rest_framework import serializers
from .models import Patient, ClinicUnavailableSlot

class PatientSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        if self.instance is None:
            from ..treasurer_handler.models import TreasurerSettings

            if TreasurerSettings.get_solo().clinic_status != "open":
                raise serializers.ValidationError({"clinic_status": "Clinic booking is currently closed."})

        queue_date = attrs.get("queueDate", getattr(self.instance, "queueDate", None))
        slot = attrs.get("time", getattr(self.instance, "time", None))

        if queue_date:
            today = timezone.localdate()
            if queue_date < today:
                raise serializers.ValidationError({"queueDate": "Appointment date cannot be in the past."})

            if queue_date == today and slot:
                try:
                    slot_time = datetime.strptime(slot, "%I:%M %p").time()
                except ValueError:
                    raise serializers.ValidationError({"time": "Invalid appointment time format."})

                now_time = timezone.localtime().time()
                if slot_time <= now_time:
                    raise serializers.ValidationError({"time": "Appointment time cannot be in the past."})

            if slot and ClinicUnavailableSlot.objects.filter(date=queue_date, time=slot).exists():
                raise serializers.ValidationError({"time": "This appointment time is not available."})

        return attrs

    class Meta:
        model = Patient
        fields = "__all__"


class ClinicUnavailableSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicUnavailableSlot
        fields = "__all__"
