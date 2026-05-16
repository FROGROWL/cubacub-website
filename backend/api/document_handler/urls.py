from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .document_request import DocumentRequestViewSet, public_document_request, document_track
from .document_case_record import DocumentCaseRecordViewSet
from .role_header_summary import document_summary

router = DefaultRouter()
router.register(r"documents", DocumentRequestViewSet, basename="documents")
router.register(r"doc-cases", DocumentCaseRecordViewSet, basename="doc_cases")

urlpatterns = [
    path("documents/public-request/", public_document_request),
    path("documents/track/", document_track),
    path("documents/summary/", document_summary),
    path("", include(router.urls)),
]
