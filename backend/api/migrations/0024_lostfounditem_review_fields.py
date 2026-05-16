from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0023_alter_lostfounditem_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='lostfounditem',
            name='landmark',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AddField(
            model_name='lostfounditem',
            name='person_involved',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AddField(
            model_name='lostfounditem',
            name='victims_involved',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AddField(
            model_name='lostfounditem',
            name='reporter_relation',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
