import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create or update a super admin account from environment variables."

    def handle(self, *args, **options):
        username = os.environ.get("DJANGO_SUPERUSER_USERNAME") or os.environ.get("SUPERUSER_USERNAME")
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL") or os.environ.get("SUPERUSER_EMAIL") or ""
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD") or os.environ.get("SUPERUSER_PASSWORD")
        name = os.environ.get("DJANGO_SUPERUSER_NAME", "Super Admin")

        if not username:
            raise CommandError("Set DJANGO_SUPERUSER_USERNAME in the environment.")
        if not password:
            raise CommandError("Set DJANGO_SUPERUSER_PASSWORD in the environment.")

        User = get_user_model()
        user, created = User.objects.update_or_create(
            username=username,
            defaults={
                "email": email,
                "name": name,
                "role": "super_admin",
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            },
        )
        user.set_password(password)
        user.save()

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{action} superuser '{username}'."))
