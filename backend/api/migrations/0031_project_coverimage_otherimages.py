from django.db import migrations, models


def backfill_project_images(apps, schema_editor):
    Project = apps.get_model("api", "Project")
    for project in Project.objects.all():
        images = project.images if isinstance(project.images, list) else []
        if images and not project.coverImage:
            project.coverImage = images[0]
        if images and not project.otherImages:
            project.otherImages = images[1:]
        project.save(update_fields=["coverImage", "otherImages"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0030_lostfounditem_image_urls"),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="coverImage",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="project",
            name="otherImages",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(backfill_project_images, migrations.RunPython.noop),
    ]
