#permission.py 
from rest_framework import permissions

class IsSuperAdmin(permissions.BasePermission):
    """
    Allow access only to users with role='super_admin'.
    """

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and getattr(request.user, "role", None) == "super_admin"
        )


class IsTreasurerOrSuperAdmin(permissions.BasePermission):
    """
    Allow access to treasurer and super admin roles.
    """

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and getattr(request.user, "role", None) in {"treasurer", "super_admin"}
        )
