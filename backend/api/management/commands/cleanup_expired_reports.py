from django.core.management.base import BaseCommand
from api.report_handler.cleanup import cleanup_expired_reports


class Command(BaseCommand):
    help = "Delete incidents, cases, and lost & found items older than 120 days."

    def handle(self, *args, **options):
        cleanup_expired_reports()
        self.stdout.write(self.style.SUCCESS("Expired reports cleaned up successfully."))
