from django.db import migrations, models


def backfill_image_urls(apps, schema_editor):
    LostFoundItem = apps.get_model("api", "LostFoundItem")
    for item in LostFoundItem.objects.exclude(image_url__isnull=True).exclude(image_url=""):
        if not item.image_urls:
            item.image_urls = [item.image_url]
            item.save(update_fields=["image_urls"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0029_clinicunavailableslot"),
    ]

    operations = [
        migrations.AddField(
            model_name="lostfounditem",
            name="image_urls",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(backfill_image_urls, migrations.RunPython.noop),
    ]
