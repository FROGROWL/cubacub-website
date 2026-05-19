from django.db import migrations


DEFAULT_CLINIC_CONSULTATION_TYPES = [
    "General Checkup",
    "Prenatal Checkup",
    "Vaccination",
    "Blood Pressure Monitoring",
    "Dental Checkup",
    "Flu / Fever Consultation",
    "Child Immunization",
    "Family Planning",
    "TB-DOTS Follow-up",
    "Wound Dressing / Minor Surgery",
]


def forwards(apps, schema_editor):
    LandingPageConfig = apps.get_model("api", "LandingPageConfig")
    for row in LandingPageConfig.objects.all():
        config = row.config or {}
        consultation_types = config.get("clinic_consultation_types")
        if not isinstance(consultation_types, list) or not consultation_types:
            config["clinic_consultation_types"] = DEFAULT_CLINIC_CONSULTATION_TYPES
            row.config = config
            row.save(update_fields=["config", "updated_at"])


def backwards(apps, schema_editor):
    LandingPageConfig = apps.get_model("api", "LandingPageConfig")
    for row in LandingPageConfig.objects.all():
        config = row.config or {}
        config.pop("clinic_consultation_types", None)
        row.config = config
        row.save(update_fields=["config", "updated_at"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0039_update_patient_status_choices"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
