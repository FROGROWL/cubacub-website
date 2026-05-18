from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0034_documentrequest_requirementtype"),
    ]

    operations = [
        migrations.AddField(
            model_name="incident",
            name="rejectionReason",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="incident",
            name="status",
            field=models.CharField(
                choices=[
                    ("new", "New"),
                    ("investigating", "Investigating"),
                    ("resolved", "Resolved"),
                    ("rejected", "Rejected"),
                ],
                default="new",
                max_length=30,
            ),
        ),
    ]
