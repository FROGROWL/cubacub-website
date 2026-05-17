# api/super_admin/super_admin.py

from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import StaffAccount, AuditLog, PasswordResetCode
from .serializers import StaffAccountSerializer
from ..permissions import IsSuperAdmin


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from django.core.mail import send_mail
import random


def _actor_label(user):
    if not user or not getattr(user, "is_authenticated", False):
        return "System"
    name = getattr(user, "name", "") or user.username
    return f"{name} (@{user.username})"


def _target_label(user):
    return f"{user.name} (@{user.username}, {user.role})"


def _write_audit(actor, action, status="info"):
    AuditLog.objects.create(user=actor if getattr(actor, "is_authenticated", False) else None, action=action, status=status)

@api_view(["POST"])
def request_password_reset(request):
    identifier = request.data.get("identifier")  # email or phone
    try:
        user = StaffAccount.objects.get(email=identifier)
    except StaffAccount.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    code = str(random.randint(1000, 9999))
    PasswordResetCode.objects.create(user=user, code=code)

    # send via email (or SMS integration)
    send_mail("Your reset code", f"Code: {code}", "noreply@barangay.gov", [user.email])

    return Response({"success": True})


@api_view(["POST"])
@permission_classes([IsSuperAdmin])  # only superadmin can reset others
def confirm_password_reset(request):
    username = request.data.get("username")
    code = request.data.get("code")
    new_password = request.data.get("new_password")

    try:
        user = StaffAccount.objects.get(username=username)
        reset = PasswordResetCode.objects.filter(user=user, code=code).last()
        if not reset or not reset.is_valid():
            return Response({"error": "Invalid or expired code"}, status=400)
    except StaffAccount.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    user.set_password(new_password)
    user.save()
    return Response({"success": True})

class StaffAccountViewSet(viewsets.ModelViewSet):
    queryset = StaffAccount.objects.filter(is_superuser=False)
    serializer_class = StaffAccountSerializer
    permission_classes = [IsSuperAdmin]

    def perform_create(self, serializer):
        account = serializer.save()
        actor = self.request.user
        _write_audit(
            actor,
            f"{_actor_label(actor)} created staff account for {_target_label(account)}.",
            status="success",
        )

    def perform_update(self, serializer):
        instance = serializer.instance
        old_values = {
            "name": instance.name,
            "role": instance.role,
            "email": instance.email,
            "phone": instance.phone,
            "address": instance.address,
            "birthdate": str(instance.birthdate) if instance.birthdate else "",
            "sex": instance.sex,
        }
        updated = serializer.save()
        actor = self.request.user

        changed_fields = []
        for field, old_value in old_values.items():
            new_value = getattr(updated, field)
            new_value = str(new_value) if new_value is not None else ""
            old_value = old_value if old_value is not None else ""
            if new_value != old_value:
                changed_fields.append(field)

        if changed_fields:
            changed_list = ", ".join(changed_fields)
            _write_audit(
                actor,
                f"{_actor_label(actor)} updated {_target_label(updated)}. Changed fields: {changed_list}.",
                status="info",
            )
        else:
            _write_audit(
                actor,
                f"{_actor_label(actor)} saved {_target_label(updated)} with no field changes.",
                status="info",
            )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        target = _target_label(instance)

        # Capture actor before deletion
        actor = request.user if request.user.is_authenticated else None

        self.perform_destroy(instance)

        # If actor is the same as the deleted instance, nullify to avoid FK violation
        if actor == instance:
            actor = None

        # Log deletion with actor (super admin), not the deleted staff
        _write_audit(
            actor,
            f"{_actor_label(actor)} deleted staff account {target}.",
            status="warning",
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
