from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0041_remove_caseprioroffense_case_delete_caselinkedreport_and_more"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="TreasurerSettings",
            new_name="SystemSettings",
        ),
    ]
