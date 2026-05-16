from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0016_backfill_project_timestamps"),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="milestones",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
