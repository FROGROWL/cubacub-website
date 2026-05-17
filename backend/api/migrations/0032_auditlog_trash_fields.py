from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0031_project_coverimage_otherimages"),
    ]

    operations = [
        migrations.AlterField(
            model_name="auditlog",
            name="action",
            field=models.TextField(),
        ),
        migrations.AddField(
            model_name="auditlog",
            name="is_trashed",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="auditlog",
            name="trashed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
