from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

import api.super_admin.models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0032_auditlog_trash_fields"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="LandingPageConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("config", models.JSONField(blank=True, default=api.super_admin.models.default_landing_page_config)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="landing_page_config_updates",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
    ]
