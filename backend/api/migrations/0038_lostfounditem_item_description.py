from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0037_reporter_address_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="lostfounditem",
            name="item_description",
            field=models.TextField(blank=True, null=True),
        ),
    ]
