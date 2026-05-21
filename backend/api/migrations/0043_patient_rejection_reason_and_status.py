from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0042_rename_treasurer_settings_to_system_settings"),
    ]

    operations = [
        migrations.AddField(
            model_name="patient",
            name="rejectionReason",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AlterField(
            model_name="patient",
            name="status",
            field=models.CharField(
                choices=[
                    ("waiting", "Waiting"),
                    ("in-progress", "In Progress"),
                    ("completed", "Completed"),
                    ("canceled", "Canceled"),
                    ("rejected", "Rejected"),
                ],
                default="waiting",
                max_length=20,
            ),
        ),
    ]