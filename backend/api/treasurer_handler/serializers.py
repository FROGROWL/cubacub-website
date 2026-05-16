from rest_framework import serializers
from .models import Project, TreasurerSettings

class ProjectSerializer(serializers.ModelSerializer):
    budget = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    spent = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    lastUpdatedByName = serializers.SerializerMethodField(read_only=True)
    statusUpdatedByName = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Project
        fields = "__all__"
        read_only_fields = [
            "id",
            "progress",
            "createdAt",
            "updatedAt",
            "lastUpdatedBy",
            "statusUpdatedAt",
            "statusUpdatedBy",
        ]

    def validate_milestones(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Milestones must be a list.")
        cleaned = []
        for milestone in value:
            if not isinstance(milestone, dict):
                raise serializers.ValidationError("Each milestone must be an object.")
            label = str(milestone.get("label", "")).strip()
            date_value = str(milestone.get("date", "")).strip()
            done = bool(milestone.get("done", False))
            if not label:
                raise serializers.ValidationError("Milestone label is required.")
            cleaned.append({"label": label, "date": date_value, "done": done})
        return cleaned

    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        budget = attrs.get("budget", getattr(instance, "budget", 0))
        spent = attrs.get("spent", getattr(instance, "spent", 0))
        milestones = attrs.get("milestones", getattr(instance, "milestones", []))
        start_date = attrs.get("startDate", getattr(instance, "startDate", None))
        end_date = attrs.get("endDate", getattr(instance, "endDate", None))

        if budget is not None and budget < 0:
            raise serializers.ValidationError({"budget": "Budget cannot be negative."})

        if spent is not None and spent < 0:
            raise serializers.ValidationError({"spent": "Spent amount cannot be negative."})

        if budget is not None and spent is not None and spent > budget:
            raise serializers.ValidationError({"spent": "Spent amount cannot exceed project budget."})

        if not milestones:
            raise serializers.ValidationError({"milestones": "At least one milestone is required."})

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({"endDate": "End date cannot be earlier than start date."})

        return attrs

    def get_lastUpdatedByName(self, obj):
        if not obj.lastUpdatedBy:
            return None
        return obj.lastUpdatedBy.name or obj.lastUpdatedBy.username

    def get_statusUpdatedByName(self, obj):
        if not obj.statusUpdatedBy:
            return None
        return obj.statusUpdatedBy.name or obj.statusUpdatedBy.username


class TreasurerSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreasurerSettings
        fields = [
            "annual_budget",
            "clinic_status",
            "pickup_deadline_days",
            "refund_percentage",
            "updatedAt",
        ]
        read_only_fields = ["updatedAt"]

    def validate_pickup_deadline_days(self, value):
        if value < 1 or value > 30:
            raise serializers.ValidationError("Pickup deadline days must be between 1 and 30.")
        return value

    def validate_refund_percentage(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("Refund percentage must be between 0 and 100.")
        return value
