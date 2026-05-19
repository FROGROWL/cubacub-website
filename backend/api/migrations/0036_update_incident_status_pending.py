from django.db import migrations, models


def forwards_func(apps, schema_editor):
    Incident = apps.get_model('api', 'Incident')
    # Update existing rows: 'new' -> 'pending'
    Incident.objects.filter(status='new').update(status='pending')


def backwards_func(apps, schema_editor):
    Incident = apps.get_model('api', 'Incident')
    # Revert 'pending' -> 'new' if rolling back
    Incident.objects.filter(status='pending').update(status='new')


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0035_incident_rejection'),
    ]

    operations = [
        migrations.AlterField(
            model_name='incident',
            name='status',
            field=models.CharField(choices=[('pending', 'Pending'), ('investigating', 'Investigating'), ('resolved', 'Resolved'), ('rejected', 'Rejected')], default='pending', max_length=30),
        ),
        migrations.RunPython(forwards_func, backwards_func),
    ]
