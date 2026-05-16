from rest_framework import serializers
from .models import Incident, CaseRecord, LostFoundItem

class IncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = "__all__"

class LostFoundSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get("status") == "solved":
            data["status"] = "resolved"
        return data

    def validate_status(self, value):
        if value == "solved":
            return "resolved"
        return value

    class Meta:
        model = LostFoundItem
        fields = "__all__"

class CaseRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseRecord
        fields = "__all__"
