from django.db import migrations, models
from django.utils import timezone


def backfill_patient_created_at(apps, schema_editor):
    Patient = apps.get_model("api", "Patient")
    Patient.objects.filter(created_at__isnull=True).update(created_at=timezone.now())


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0026_patient_appointment_fields"),
    ]

    operations = [
        migrations.RunPython(backfill_patient_created_at, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="patient",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True),
        ),
    ]
