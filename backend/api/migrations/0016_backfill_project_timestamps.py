from django.db import migrations, models
from django.utils import timezone


def backfill_project_timestamps(apps, schema_editor):
    Project = apps.get_model("api", "Project")
    now = timezone.now()
    Project.objects.filter(createdAt__isnull=True).update(createdAt=now)
    Project.objects.filter(updatedAt__isnull=True).update(updatedAt=now)


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0015_project_metadata_treasurersettings"),
    ]

    operations = [
        migrations.RunPython(backfill_project_timestamps, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="project",
            name="createdAt",
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AlterField(
            model_name="project",
            name="updatedAt",
            field=models.DateTimeField(auto_now=True),
        ),
    ]
