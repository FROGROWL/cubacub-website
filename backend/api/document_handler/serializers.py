from rest_framework import serializers
from .models import DocumentRequest, DocumentCaseRecord

class DocumentRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentRequest
        fields = "__all__"

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

class DocumentCaseRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentCaseRecord
        fields = "__all__"
