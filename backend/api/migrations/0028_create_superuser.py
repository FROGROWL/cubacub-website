import os
from django.db import migrations


def create_superuser(apps, schema_editor):
    User = apps.get_model("api", "StaffAccount")
    username = os.environ.get("DJANGO_SUPERUSER_USERNAME") or os.environ.get("SUPERUSER_USERNAME")
    email = os.environ.get("DJANGO_SUPERUSER_EMAIL") or os.environ.get("SUPERUSER_EMAIL") or ""
    password = os.environ.get("DJANGO_SUPERUSER_PASSWORD") or os.environ.get("SUPERUSER_PASSWORD")

    if not username or not password:
        return

    user, _ = User.objects.update_or_create(
        username=username,
        defaults={
            "email": email,
            "name": os.environ.get("DJANGO_SUPERUSER_NAME", "Super Admin"),
            "role": "super_admin",
            "is_staff": True,
            "is_superuser": True,
            "is_active": True,
        },
    )
    user.set_password(password)
    user.save()


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0027_backfill_patient_created_at"),
    ]

    operations = [
        migrations.RunPython(create_superuser, migrations.RunPython.noop),
    ]
