from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0011_merge_20260425_1320"),
    ]

    operations = [
        migrations.AddField(
            model_name="documentrequest",
            name="rejectionReason",
            field=models.TextField(blank=True, null=True),
        ),
    ]
