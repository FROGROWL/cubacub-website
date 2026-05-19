from rest_framework import serializers
from django.utils import timezone
from .models import Incident, CaseRecord, LostFoundItem

class IncidentSerializer(serializers.ModelSerializer):
    def validate_incident_date(self, value):
        if value and value > timezone.localdate():
            raise serializers.ValidationError("Date of incident cannot be in the future.")
        return value

    def validate(self, attrs):
        status_value = attrs.get("status", getattr(self.instance, "status", None))
        rejection_reason = attrs.get("rejectionReason", getattr(self.instance, "rejectionReason", ""))

        if status_value == "rejected" and not rejection_reason:
            raise serializers.ValidationError({
                "rejectionReason": "Rejection reason is required when status is rejected."
            })

        if status_value != "rejected" and "status" in attrs:
            attrs["rejectionReason"] = None

        return attrs

    class Meta:
        model = Incident
        fields = "__all__"

class LostFoundSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request") if hasattr(self, "context") else None

        if instance.is_anonymous and not (getattr(request, "user", None) and request.user.is_authenticated):
            data["reporter_name"] = "Anonymous"
            data["reporter_phone"] = ""
            data["reporter_relation"] = None

        if data.get("status") == "solved":
            data["status"] = "resolved"
        return data

    def validate_status(self, value):
        if value == "solved":
            return "resolved"
        return value

    def validate_date_of_incident(self, value):
        if value and value > timezone.localdate():
            raise serializers.ValidationError("Date of incident cannot be in the future.")
        return value

    class Meta:
        model = LostFoundItem
        fields = "__all__"

class CaseRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseRecord
        fields = "__all__"
