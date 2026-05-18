from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0033_landingpageconfig"),
    ]

    operations = [
        migrations.AddField(
            model_name="documentrequest",
            name="requirementType",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
