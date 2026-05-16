from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0025_alter_incident_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="patient",
            name="appointmentId",
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name="patient",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, null=True),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="patient",
            name="dateBooked",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
