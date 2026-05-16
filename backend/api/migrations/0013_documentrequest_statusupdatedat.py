from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0012_documentrequest_rejectionreason"),
    ]

    operations = [
        migrations.AddField(
            model_name="documentrequest",
            name="statusUpdatedAt",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
