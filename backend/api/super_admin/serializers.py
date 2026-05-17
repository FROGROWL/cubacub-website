# serializers.py

from rest_framework import serializers
from .models import StaffAccount, AuditLog

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
