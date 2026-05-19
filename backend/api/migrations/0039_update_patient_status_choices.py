from django.db import migrations, models


def forwards(apps, schema_editor):
    Patient = apps.get_model("api", "Patient")
    Patient.objects.filter(status="served").update(status="completed")


def backwards(apps, schema_editor):
    Patient = apps.get_model("api", "Patient")
    Patient.objects.filter(status="completed").update(status="served")


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0038_lostfounditem_item_description"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
        migrations.AlterField(
            model_name="patient",
            name="status",
            field=models.CharField(
                choices=[
                    ("waiting", "Waiting"),
                    ("in-progress", "In Progress"),
                    ("completed", "Completed"),
                    ("canceled", "Canceled"),
                ],
                default="waiting",
                max_length=20,
            ),
        ),
    ]
