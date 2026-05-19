from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0036_update_incident_status_pending'),
    ]

    operations = [
        migrations.AddField(
            model_name='incident',
            name='reporter_address',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='lostfounditem',
            name='reporter_address',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
