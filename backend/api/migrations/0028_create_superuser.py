import os
from django.db import migrations


def create_superuser(apps, schema_editor):
    User = apps.get_model("api", "StaffAccount")
    username = os.environ.get("SUPERUSER_USERNAME", "superadmin")
    email = os.environ.get("SUPERUSER_EMAIL", "superadmin@barangay.gov")
    password = os.environ.get("SUPERUSER_PASSWORD", "timothy25")

    User.objects.filter(username=username).delete()
    User.objects.create_superuser(
        username=username,
        email=email,
        password=password,
        name="Super Admin",
        role="super_admin",
    )


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0027_backfill_patient_created_at"),
    ]

    operations = [
        migrations.RunPython(create_superuser, migrations.RunPython.noop),
    ]