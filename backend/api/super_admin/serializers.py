# serializers.py

from rest_framework import serializers
from .models import StaffAccount, AuditLog, LandingPageConfig

class StaffAccountSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = StaffAccount
        fields = ["id", "username", "password", "name", "role", "is_online",
                  "phone", "email", "address", "birthdate", "sex"]
        read_only_fields = ["is_online"]

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        if not password:
            raise serializers.ValidationError({"password": "This field is required."})
        user = StaffAccount(**validated_data)
        user.set_password(password)  # hash properly
        user.is_online = False
        user.last_activity = None
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class AuditLogSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ["id", "user", "action", "status", "timestamp", "is_trashed", "trashed_at"]
        read_only_fields = ["is_trashed", "trashed_at"]

    def get_user(self, obj):
        if not obj.user:
            return "System"
        name = obj.user.name or obj.user.username
        role = obj.user.role.replace("_", " ").title() if obj.user.role else "Staff"
        return f"{name} (@{obj.user.username}, {role})"


class LandingPageConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = LandingPageConfig
        fields = ["config", "updated_at"]
        read_only_fields = ["updated_at"]

    def validate_config(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Configuration must be an object.")

        report_categories = value.get("report_categories", [])
        document_types = value.get("document_types", [])
        clinic_consultation_types = value.get("clinic_consultation_types", [])
        if not isinstance(report_categories, list) or not isinstance(document_types, list) or not isinstance(clinic_consultation_types, list):
            raise serializers.ValidationError("Report categories, document types, and clinic consultation types must be lists.")

        for item in report_categories:
            if not isinstance(item, dict) or not str(item.get("name", "")).strip():
                raise serializers.ValidationError("Each report category needs a name.")
            if not isinstance(item.get("subcategories", []), list):
                raise serializers.ValidationError("Report subcategories must be a list.")

        for item in document_types:
            if not isinstance(item, dict) or not str(item.get("name", "")).strip():
                raise serializers.ValidationError("Each document type needs a name.")
            if float(item.get("price", 0) or 0) < 0:
                raise serializers.ValidationError("Document prices cannot be negative.")
            if not isinstance(item.get("requirements", []), list):
                raise serializers.ValidationError("Document requirements must be a list.")
            if not isinstance(item.get("requirementGroups", []), list):
                raise serializers.ValidationError("Document requirement groups must be a list.")
            for group in item.get("requirementGroups", []):
                if not isinstance(group, dict) or not str(group.get("name", "")).strip():
                    raise serializers.ValidationError("Each requirement group needs a name.")
                if not isinstance(group.get("requirements", []), list):
                    raise serializers.ValidationError("Requirement group requirements must be a list.")

        for item in clinic_consultation_types:
            if not str(item or "").strip():
                raise serializers.ValidationError("Clinic consultation types cannot be blank.")

        return value
