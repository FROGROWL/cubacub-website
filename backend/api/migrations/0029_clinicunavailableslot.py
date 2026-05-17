from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0028_create_superuser"),
    ]

    operations = [
        migrations.CreateModel(
            name="ClinicUnavailableSlot",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField()),
                ("time", models.CharField(max_length=20)),
                ("reason", models.CharField(blank=True, default="", max_length=200)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "db_table": "clinic_unavailable_slots",
                "ordering": ["date", "time"],
                "unique_together": {("date", "time")},
            },
        ),
    ]
