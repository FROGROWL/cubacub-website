from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import uuid


class StaffAccount(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ROLE_CHOICES = [
        ("super_admin", "Super Admin"),
        ("document_handler", "Document Handler"),
        ("report_handler", "Report Handler"),
        ("clinic_handler", "Clinic Handler"),
        ("treasurer", "Treasurer"),
    ]

    name = models.CharField(max_length=100)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default="document_handler")
    is_online = models.BooleanField(default=False)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.CharField(max_length=200, blank=True, null=True)
    birthdate = models.DateField(blank=True, null=True)
    sex = models.CharField(max_length=10, blank=True, null=True)
    last_activity = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class PasswordResetCode(models.Model):
    user = models.ForeignKey(StaffAccount, on_delete=models.CASCADE)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        return timezone.now() < self.created_at + timedelta(minutes=10)


class AuditLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs"
    )
    action = models.TextField()
    status = models.CharField(max_length=50, default="info")
    timestamp = models.DateTimeField(auto_now_add=True)
    is_trashed = models.BooleanField(default=False)
    trashed_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.user.username if self.user else 'Deleted User'} - {self.action}"


def default_landing_page_config():
    return {
        "report_categories": [
            {"name": "Noise Complaint", "subcategories": ["Karaoke / Loud Music", "Construction Noise", "Animal Noise", "Vehicle Noise", "Other"]},
            {"name": "Road Hazard", "subcategories": ["Pothole", "Fallen Tree / Post", "Flooding", "Broken Signage", "Open Manhole", "Other"]},
            {"name": "Public Disturbance", "subcategories": ["Loitering / Intimidation", "Street Brawl", "Vandalism", "Drunken Behavior", "Other"]},
            {"name": "Illegal Activity", "subcategories": ["Gambling", "Drug-related", "Theft / Robbery", "Illegal Vending", "Other"]},
            {"name": "Domestic Dispute", "subcategories": ["Verbal Abuse", "Physical Abuse", "Property Dispute", "Other"]},
            {"name": "Environmental", "subcategories": ["Garbage Dumping", "Smoke / Air Pollution", "Stagnant Water / Mosquito Breeding", "Other"]},
            {"name": "Lost Item", "subcategories": ["Personal Belongings", "Electronics", "Documents / IDs", "Jewelry", "Cash / Wallet", "Pets / Animals", "Other"]},
            {"name": "Found Item", "subcategories": ["Personal Belongings", "Electronics", "Documents / IDs", "Jewelry", "Cash / Wallet", "Pets / Animals", "Other"]},
            {"name": "Document Refund", "subcategories": ["Expired Pickup Deadline", "Other"]},
            {"name": "Other", "subcategories": ["Other"]},
        ],
        "document_types": [
            {
                "name": "Barangay Clearance",
                "price": 0,
                "info": "Requires a valid government-issued ID, 1x1 or 2x2 photo (white background), and must be a resident of the barangay. Used for employment, travel, or legal transactions.",
                "requirements": [{"label": "1x1 or 2x2 Photo", "note": "Recent, white background"}],
            },
            {
                "name": "Certificate of Residency",
                "price": 0,
                "info": "Requires proof of residence such as utility bill, lease contract, or land title. Must have been residing in the barangay for at least 6 months.",
                "requirements": [{"label": "Proof of Residence", "note": "Utility bill, lease contract, or land title"}],
            },
            {
                "name": "Certificate of Indigency",
                "price": 0,
                "info": "Requires proof of residency and supporting documents depending on purpose. Must be verified as indigent by the barangay.",
                "requirements": [
                    {"label": "Proof of Residency", "note": "Must be a resident of the barangay"},
                    {"label": "Supporting Documents", "note": "Depending on purpose, such as medical abstract or school enrollment form"},
                ],
            },
            {
                "name": "Business Clearance / Permit",
                "price": 0,
                "info": "Requires DTI registration or SEC registration, valid government ID, lease contract or land title of business location, sketch/location map, and Cedula.",
                "requirements": [
                    {"label": "DTI Business Name Registration", "note": "For sole proprietorship"},
                    {"label": "SEC Registration", "note": "For corporations/partnerships"},
                    {"label": "Valid Government ID", "note": "Owner or authorized representative"},
                    {"label": "Lease Contract or Land Title", "note": "Proof of business location"},
                    {"label": "Sketch or Location Map", "note": "Some barangays require this"},
                    {"label": "Cedula (Community Tax Certificate)", "note": "Required for all applicants"},
                ],
            },
            {
                "name": "First-Time Jobseeker Certification",
                "price": 0,
                "info": "Must be a resident for at least 6 months and a first-time job seeker. Requires proof of education and a signed Oath of Undertaking.",
                "requirements": [
                    {"label": "Proof of Residency", "note": "Must be a resident for at least 6 months"},
                    {"label": "Proof of Education / Training", "note": "Diploma, TOR, or certificate of completion"},
                    {"label": "Signed Oath of Undertaking", "note": "Form provided at the barangay hall"},
                ],
            },
            {
                "name": "Certificate of Good Moral Character",
                "price": 0,
                "info": "Requires Cedula, Barangay Clearance, and a recent photo. Commonly needed for employment, scholarship, or school applications.",
                "requirements": [
                    {"label": "Cedula (Community Tax Certificate)", "note": "Must be current year"},
                    {"label": "Barangay Clearance", "note": "Some barangays require this first"},
                    {"label": "1x1 or 2x2 Photo", "note": "Recent, white background"},
                ],
            },
            {
                "name": "Cedula (Community Tax Certificate)",
                "price": 20,
                "info": "Choose the Cedula type that applies to you. Only the requirements for that selected type must be uploaded.",
                "requirements": [],
                "requirementGroups": [
                    {"name": "Individual", "requirements": [{"label": "Valid Government ID", "note": "For unemployed or non-business individual applicants"}]},
                    {"name": "Business", "requirements": [{"label": "Business Permit", "note": "Current year barangay or city business permit"}]},
                    {"name": "Employee", "requirements": [{"label": "Proof of Income", "note": "Payslip, ITR, or employer certificate"}]},
                ],
            },
            {"name": "Barangay ID", "price": 50, "info": "Requires a valid government-issued ID and proof of residency. Must be a current resident of the barangay.", "requirements": []},
            {"name": "Certificate of No Income", "price": 50, "info": "Requires an affidavit of no income or certification from the barangay captain.", "requirements": []},
            {"name": "Certificate of Late Registration", "price": 100, "info": "Requires supporting documents for the late registration. Must coordinate with the local civil registrar.", "requirements": []},
            {"name": "Barangay Protection Order", "price": 0, "info": "Filed by a victim of domestic violence or abuse. Free of charge. Must provide a sworn statement of facts.", "requirements": []},
        ],
    }


class LandingPageConfig(models.Model):
    config = models.JSONField(default=default_landing_page_config, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="landing_page_config_updates",
    )

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "Landing Page Configuration"
