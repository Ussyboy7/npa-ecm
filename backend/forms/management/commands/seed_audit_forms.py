"""Seed the three NPA Internal Audit Division form templates."""

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from forms.models import FormTemplate


PROJECT_MONITORING_SCHEMA = {
    "fields": [
        {"id": "to", "name": "to", "label": "To", "type": "text", "required": True},
        {"id": "from_field", "name": "from_field", "label": "From", "type": "text", "required": True},
        {"id": "subject", "name": "subject", "label": "Subject", "type": "text", "required": True},
        {"id": "project", "name": "project", "label": "Project", "type": "text", "required": True},
        {"id": "date", "name": "date", "label": "Date", "type": "date", "required": True},
        {"id": "our_ref", "name": "our_ref", "label": "Our Ref", "type": "text", "required": True},
        {
            "id": "chq_no",
            "name": "chq_no",
            "label": "CHQ No",
            "type": "text",
            "placeholder": "Auto-issued on PDF generate if left blank",
        },
        {"id": "location", "name": "location", "label": "Location", "type": "text", "required": True},
        {"id": "contractor_name", "name": "contractor_name", "label": "Contractor's Name", "type": "text", "required": True},
        {"id": "contractor_address", "name": "contractor_address", "label": "Address", "type": "text"},
        {"id": "contract_sum", "name": "contract_sum", "label": "Contract Sum", "type": "currency", "required": True},
        {"id": "award_ref", "name": "award_ref", "label": "Ref. No. & Date of Award Letter", "type": "text"},
        {"id": "cep_no_date", "name": "cep_no_date", "label": "C.E.P. No. & Date", "type": "text"},
        {"id": "project_manager", "name": "project_manager", "label": "Project Manager", "type": "text", "required": True},
        {"id": "audit_assignment", "name": "audit_assignment", "label": "Audit Assignment", "type": "textarea"},
        {"id": "attach_boq", "name": "attach_boq", "label": "(i) Attach Bill of Quantity", "type": "checkbox"},
        {"id": "check_boq_extent", "name": "check_boq_extent", "label": "(ii) Check Bill of Quantity For Extent of Work Done", "type": "checkbox"},
        {"id": "review_unit_price", "name": "review_unit_price", "label": "(iii) Review the Unit Price of item on BOQ", "type": "checkbox"},
        {"id": "attach_working_papers", "name": "attach_working_papers", "label": "(iv) Attach all Working Papers", "type": "checkbox"},
        {"id": "comments", "name": "comments", "label": "Comments", "type": "textarea"},
        {"id": "observation", "name": "observation", "label": "Observation", "type": "textarea"},
        {"id": "recommendation", "name": "recommendation", "label": "Recommendation", "type": "textarea"},
    ],
    "sections": [
        {"id": "header", "title": "Header", "fields": ["to", "from_field", "subject", "project", "date", "our_ref", "chq_no"]},
        {"id": "project_details", "title": "Project Details", "fields": ["location", "contractor_name", "contractor_address", "contract_sum", "award_ref", "cep_no_date"]},
        {"id": "audit_details", "title": "Audit Details", "fields": ["project_manager", "audit_assignment"]},
        {"id": "audit_checklist", "title": "Audit Checklist", "fields": ["attach_boq", "check_boq_extent", "review_unit_price", "attach_working_papers"]},
        {"id": "findings", "title": "Findings", "fields": ["comments", "observation", "recommendation"]},
    ],
    "signatures": {
        "type": "sequential",
        "roles": [
            {"key": "pm", "label": "Project Manager/Engineer", "fields": ["pm_name", "pm_pn", "pm_designation"]},
            {"key": "procurement", "label": "Procurement", "fields": ["procurement_name", "procurement_pn", "procurement_designation"]},
            {"key": "audit", "label": "Audit", "fields": ["audit_name", "audit_pn", "audit_designation"]},
        ],
    },
}

WITNESSING_DELIVERIES_SCHEMA = {
    "fields": [
        {
            "id": "form_no",
            "name": "form_no",
            "label": "Form / Serial No",
            "type": "text",
            "placeholder": "Auto-issued on PDF generate if left blank",
        },
        {"id": "date", "name": "date", "label": "Date", "type": "date", "required": True},
        {"id": "location", "name": "location", "label": "Location", "type": "text", "required": True},
        {"id": "contractor_name", "name": "contractor_name", "label": "Contractor's Name", "type": "text", "required": True},
        {"id": "contractor_address", "name": "contractor_address", "label": "Address", "type": "text"},
        {"id": "award_ref", "name": "award_ref", "label": "Letter of Award Ref. No", "type": "text", "required": True},
        {"id": "vehicle_reg", "name": "vehicle_reg", "label": "Vehicle Regn. No", "type": "text"},
        {"id": "items", "name": "items", "label": "Items", "type": "table", "defaultRows": 10, "columns": [
            {"key": "sn", "label": "S/N", "type": "number"},
            {"key": "qty", "label": "QTY", "type": "number"},
            {"key": "description", "label": "DESCRIPTION", "type": "text"},
            {"key": "unit_price", "label": "UNIT PRICE (\u20a6)", "type": "currency"},
            {"key": "amount", "label": "AMOUNT (\u20a6)", "type": "calculated", "formula": "qty * unit_price"},
        ]},
        {"id": "sub_total", "name": "sub_total", "label": "SUB TOTAL", "type": "currency", "readOnly": True},
        {"id": "vat", "name": "vat", "label": "VAT", "type": "currency"},
        {"id": "grand_total", "name": "grand_total", "label": "GRAND TOTAL", "type": "currency", "readOnly": True},
        {"id": "supplier_name", "name": "supplier_name", "label": "Supplier Name", "type": "text"},
        {"id": "supplier_signature", "name": "supplier_signature", "label": "Supplier Signature", "type": "file", "accept": "image/*"},
        {"id": "supplier_date", "name": "supplier_date", "label": "Supplier Date", "type": "date"},
    ],
    "sections": [
        {
            "id": "header",
            "title": "Header",
            "fields": ["form_no", "date", "location", "contractor_name", "contractor_address", "award_ref", "vehicle_reg"],
        },
        {"id": "items_supplied", "title": "Items Supplied", "fields": ["items"]},
        {"id": "totals", "title": "Totals", "fields": ["sub_total", "vat", "grand_total"]},
        {"id": "supplier_certification", "title": "Supplier Certification", "fields": ["supplier_name", "supplier_signature", "supplier_date"]},
    ],
    "signatures": {
        "type": "sequential",
        "roles": [
            {"key": "supplier", "label": "Supplier", "fields": ["supplier_name", "supplier_signature", "supplier_date"]},
            {"key": "user_dept", "label": "User Department", "fields": ["user_dept_name", "user_dept_pn", "user_dept_designation"]},
            {"key": "procurement", "label": "Procurement", "fields": ["procurement_name", "procurement_pn", "procurement_designation"]},
            {"key": "audit", "label": "Audit", "fields": ["audit_name", "audit_pn", "audit_designation"]},
        ],
    },
}

AUDIT_QUERY_SCHEMA = {
    "fields": [
        {
            "id": "hq_serial",
            "name": "hq_serial",
            "label": "HQ Serial No",
            "type": "text",
            "placeholder": "Auto-issued on PDF generate if left blank",
        },
        {"id": "to", "name": "to", "label": "TO", "type": "text", "required": True},
        {"id": "from", "name": "from", "label": "FROM: GENERAL MANAGER AUDIT, HQ.", "type": "text"},
        {"id": "date", "name": "date", "label": "Date", "type": "date", "required": True},
        {"id": "ref", "name": "ref", "label": "REF: HQ/GMA/OP/A.13/", "type": "text", "required": True},
        {"id": "subject", "name": "subject", "label": "SUBJECT: AUDIT QUERY - BILLS FOR CERTIFICATION", "type": "text", "required": True},
        {"id": "payee", "name": "payee", "label": "Payee", "type": "text", "required": True},
        {"id": "pv_no", "name": "pv_no", "label": "P. V. No", "type": "text", "required": True},
        {"id": "pv_date", "name": "pv_date", "label": "P. V. Dated", "type": "date", "required": True},
        {"id": "amount_naira", "name": "amount_naira", "label": "Amount (\u20a6)", "type": "currency", "required": True},
        {"id": "amount_kobo", "name": "amount_kobo", "label": "Amount (Kobo)", "type": "number"},
        {"id": "reasons", "name": "reasons", "label": "Reasons for query", "type": "textarea", "required": True},
        {"id": "response_deadline", "name": "response_deadline", "label": "Response deadline (hours)", "type": "number", "default": 48},
    ],
    "sections": [
        {"id": "header", "title": "Header", "fields": ["hq_serial", "to", "from", "date", "ref", "subject"]},
        {"id": "payment_details", "title": "Payment Details", "fields": ["payee", "pv_no", "pv_date", "amount_naira", "amount_kobo"]},
        {"id": "query_reasons", "title": "Query Reasons", "fields": ["reasons", "response_deadline"]},
    ],
    "signatures": {
        "type": "single",
        "roles": [
            {"key": "gm_audit", "label": "General Manager Audit", "fields": ["gm_name", "gm_designation"]},
        ],
    },
}

TEMPLATES = [
    {
        "name": "Project Monitoring Report - Audit Division",
        "slug": "project-monitoring-report-audit",
        "description": "NPA Internal Audit Division form for monitoring project execution. Requires sign-off by Project Manager/Engineer, Procurement, and Audit.",
        "category": FormTemplate.Category.AUDIT,
        "structure": PROJECT_MONITORING_SCHEMA,
    },
    {
        "name": "Witnessing of Deliveries Form",
        "slug": "witnessing-of-deliveries",
        "description": "NPA Internal Audit Division form for witnessing deliveries of goods. Requires sign-off by Supplier, User Department, Procurement, and Audit.",
        "category": FormTemplate.Category.AUDIT,
        "structure": WITNESSING_DELIVERIES_SCHEMA,
    },
    {
        "name": "Audit Query - Bills for Certification",
        "slug": "audit-query-bills-certification",
        "description": "NPA Internal Audit Division form for querying bills submitted for certification. Signed by General Manager Audit.",
        "category": FormTemplate.Category.AUDIT,
        "structure": AUDIT_QUERY_SCHEMA,
    },
]


class Command(BaseCommand):
    help = "Seed the three NPA Internal Audit Division form templates"

    def handle(self, *args, **options):
        created = 0
        updated = 0

        for tmpl in TEMPLATES:
            obj, was_created = FormTemplate.objects.update_or_create(
                slug=tmpl["slug"],
                defaults={
                    "name": tmpl["name"],
                    "description": tmpl["description"],
                    "category": tmpl["category"],
                    "structure": tmpl["structure"],
                    "is_active": True,
                },
            )
            if was_created:
                created += 1
                self.stdout.write(f"  Created: {obj.name}")
            else:
                updated += 1
                self.stdout.write(f"  Updated: {obj.name}")

        self.stdout.write(self.style.SUCCESS(f"Done. {created} created, {updated} updated."))
