"""
Models for reports, cases, incidents, and lost & found based on SQL schema.
This file contains all models for the Report Handler functionality.
"""

from django.db import models
import random
from api.super_admin.models import StaffAccount



def generate_incident_id():
    """Generate sequential incident ID like RPT-001, RPT-002, etc."""
    last_incident = Incident.objects.filter(id__startswith='RPT-').order_by('-id').first()
    if last_incident:
        try:
            last_num = int(last_incident.id.split('-')[-1])
            next_num = last_num + 1
        except (ValueError, IndexError):
            next_num = 1
    else:
        next_num = 1
    return f"RPT-{next_num:03d}"


def generate_document_refund_id():
    """Generate sequential refund report ID like RDF-001, RDF-002, etc."""
    last_refund = Incident.objects.filter(id__startswith='RDF-').order_by('-id').first()
    if last_refund:
        try:
            last_num = int(last_refund.id.split('-')[-1])
            next_num = last_num + 1
        except (ValueError, IndexError):
            next_num = 1
    else:
        next_num = 1
    return f"RDF-{next_num:03d}"


def generate_case_id():
    """Generate random case ID like CASE-639271."""
    while True:
        candidate = f"CASE-{random.randint(100000, 999999)}"
        if not CaseRecord.objects.filter(id=candidate).exists():
            return candidate


def generate_lf_id():
    """Generate sequential lost & found ID like LF-001, LF-002, etc."""
    last_lf = LostFoundItem.objects.all().order_by('-id').first()
    if last_lf:
        try:
            last_num = int(last_lf.id.split('-')[-1])
            next_num = last_num + 1
        except (ValueError, IndexError):
            next_num = 1
    else:
        next_num = 1
    return f"LF-{next_num:03d}"


class Incident(models.Model):
    """
    Incident model matching incidents table.
    Represents reports and complaints from both staff and public.
    """
    
    INCIDENT_STATUS = [
        ('new', 'New'),
        ('investigating', 'Investigating'),
        ('resolved', 'Resolved'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    
    URGENCY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Critical', 'Critical'),
    ]
    
    SOURCE_CHOICES = [
        ('staff', 'Staff'),
        ('public', 'Public'),
    ]
    
    # Main fields
    id = models.CharField(max_length=20, primary_key=True)  # e.g., 'RPT-001' or 'RDF-001'
    reporter_name = models.CharField(max_length=200)
    is_anonymous = models.BooleanField(default=False)
    
    # Category fields
    category = models.CharField(max_length=100)  # e.g., 'Noise Complaint', 'Road Hazard'
    subcategory = models.CharField(max_length=100, blank=True, null=True)
    
    # Details
    details = models.TextField()
    incident_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=30, choices=INCIDENT_STATUS, default='new')
    location = models.CharField(max_length=200, blank=True, null=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    incident_time = models.CharField(max_length=20, blank=True, null=True)
    landmark = models.CharField(max_length=200, blank=True, null=True)
    
    # Suspect information
    suspect_name = models.CharField(max_length=200, blank=True, null=True)
    suspect_description = models.TextField(blank=True, null=True)
    
    # Additional fields
    urgency = models.CharField(max_length=20, choices=URGENCY_CHOICES, blank=True, null=True)
    evidence_photo_count = models.IntegerField(default=0)
    evidence_photos = models.JSONField(default=list, blank=True)
    victims_involved = models.CharField(max_length=200, blank=True, null=True)
    reporter_phone = models.CharField(max_length=20, blank=True, null=True)
    
    REPORTER_RELATION_CHOICES = [
        ('Victim', 'Victim'),
        ('Witness', 'Witness'),
        ('Concerned Neighbor', 'Concerned Neighbor'),
        ('Barangay Official', 'Barangay Official'),
        ('Other', 'Other'),
    ]
    reporter_relation = models.CharField(max_length=100, choices=REPORTER_RELATION_CHOICES, blank=True, null=True)
    
    # Source tracking
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='staff')
    
    # Relationships
    handled_by = models.ForeignKey(StaffAccount, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'incidents'
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.id:
            if self.category == 'Document Refund':
                self.id = generate_document_refund_id()
            else:
                self.id = generate_incident_id()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.id} - {self.category} - {self.status}"


class CaseRecord(models.Model):
    """
    Case record model matching case_records table.
    Formal case management for Report Handler.
    """
    
    CASE_STATUS = [
        ('open', 'Open'),
        ('investigating', 'Investigating'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]
    
    id = models.CharField(max_length=20, primary_key=True, default=generate_case_id)  # e.g., 'CASE-001'
    subject_name = models.CharField(max_length=200)
    crime_description = models.TextField()
    case_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=CASE_STATUS, default='open')
    
    # Additional details
    details = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=200, blank=True, null=True)
    
    # Legal details
    charges = models.TextField(blank=True, null=True)
    penalty = models.TextField(blank=True, null=True)
    complainant = models.CharField(max_length=200, blank=True, null=True)
    respondent = models.CharField(max_length=200, blank=True, null=True)
    mediator = models.CharField(max_length=200, blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    date_resolved = models.DateField(blank=True, null=True)
    
    # Relationships
    handled_by = models.ForeignKey(StaffAccount, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'case_records'
        ordering = ['-case_date']

    
    def save(self, *args, **kwargs):
        if not self.id:
            self.id = generate_case_id()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.id} - {self.subject_name} - {self.status}"


class CaseLinkedReport(models.Model):
    """
    Many-to-many relationship between cases and incidents.
    Matches case_linked_reports table.
    """
    
    case = models.ForeignKey(CaseRecord, on_delete=models.CASCADE)
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE)
    
    class Meta:
        db_table = 'case_linked_reports'
        unique_together = ['case', 'incident']
    
    def __str__(self):
        return f"Case {self.case.id} ↔ Report {self.incident.id}"


class CasePriorOffense(models.Model):
    """
    Prior offense history for cases.
    Matches case_prior_offenses table.
    """
    
    case = models.ForeignKey(CaseRecord, on_delete=models.CASCADE)
    description = models.TextField()
    offense_date = models.DateField(blank=True, null=True)
    
    class Meta:
        db_table = 'case_prior_offenses'
    
    def __str__(self):
        return f"Prior offense for {self.case.id}"


class LostFoundItem(models.Model):
    """
    Lost & Found items model.
    Matches lost_found_items table.
    """
    
    ITEM_TYPE_CHOICES = [
        ('lost', 'Lost'),
        ('found', 'Found'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('post', 'Post'),
        ('resolved', 'Resolved'),
        ('canceled', 'Canceled'),
    ]
    
    id = models.CharField(max_length=20, primary_key=True, default=generate_lf_id)  # e.g., 'LF-001'
    item_type = models.CharField(max_length=10, choices=ITEM_TYPE_CHOICES)
    reporter_name = models.CharField(max_length=200, blank=True, null=True)
    reporter_phone = models.CharField(max_length=20, blank=True, null=True)
    reporter_id = models.CharField(max_length=20)  # 'ANON-XXXX' or 'RPT-XXXX'
    is_anonymous = models.BooleanField(default=False)
    
    # Item details
    item_name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    location = models.CharField(max_length=200, blank=True, null=True)
    
    # Date information
    date_reported = models.DateField(auto_now_add=True)
    date_of_incident = models.DateField(blank=True, null=True)
    landmark = models.CharField(max_length=200, blank=True, null=True)
    person_involved = models.CharField(max_length=200, blank=True, null=True)
    victims_involved = models.CharField(max_length=200, blank=True, null=True)
    reporter_relation = models.CharField(max_length=100, blank=True, null=True)

    # Media
    image_url = models.TextField(blank=True, null=True)  # URL to uploaded image

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    handler_notes = models.TextField(blank=True, null=True)
    
    # Relationships
    handled_by = models.ForeignKey(StaffAccount, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'lost_found_items'
        ordering = ['-date_reported']

    
    def save(self, *args, **kwargs):
        if not self.id:
            self.id = generate_lf_id()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.id} - {self.item_type} - {self.item_name}"
