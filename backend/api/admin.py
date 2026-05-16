#admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .super_admin.models import StaffAccount

class StaffAccountAdmin(UserAdmin):
    # Show these fields in the list view
    list_display = ("username", "name", "role", "email", "is_online", "is_staff", "is_superuser")

    # Allow editing these fields in the form
    fieldsets = UserAdmin.fieldsets + (
        (None, {"fields": ("name", "role", "is_online", "phone", "address", "birthdate", "sex")}),
    )

admin.site.register(StaffAccount, StaffAccountAdmin)