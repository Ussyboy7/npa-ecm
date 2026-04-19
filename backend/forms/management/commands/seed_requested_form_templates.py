"""Seed requested operational form templates."""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from forms.models import FormTemplate


class Command(BaseCommand):
    help = "Seed requested form templates (audit/procurement/completion/payment)."

    def handle(self, *args, **options):
        templates = [
            {
                "name": "Audit Monitoring & Verification Form",
                "slug": "audit-monitoring-form",
                "category": FormTemplate.Category.AUDIT,
                "description": "Verify completion, monitoring checks, acknowledgements, and audit sign-off for awarded contracts.",
                "layout": "multi-column",
                "fields": [
                    {"id": "contract_id", "name": "contract_id", "label": "Contract ID", "type": "text", "required": False, "placeholder": "Auto-generated"},
                    {"id": "procurement_ref_no", "name": "procurement_ref_no", "label": "Procurement Ref No.", "type": "text", "required": True, "placeholder": "Manual or auto-linked reference"},
                    {"id": "vendor_name", "name": "vendor_name", "label": "Vendor Name", "type": "text", "required": True, "placeholder": "Linked from metadata when available"},
                    {"id": "user_department", "name": "user_department", "label": "User Department", "type": "select", "required": True, "options": ["ICT", "Procurement", "Finance", "Operations", "Legal", "Marine & Operations", "Engineering"]},
                    {"id": "job_description", "name": "job_description", "label": "Job Description", "type": "textarea", "required": True},
                    {"id": "completion_confirmation", "name": "completion_confirmation", "label": "Completion Confirmation", "type": "radio", "required": True, "options": [{"value": "yes", "label": "Yes"}, {"value": "no", "label": "No"}]},
                    {"id": "site_verification_by", "name": "site_verification_by", "label": "Site Verification Conducted By", "type": "select", "required": True, "options": ["Audit Officer"]},
                    {"id": "verification_date", "name": "verification_date", "label": "Verification Date", "type": "date", "required": True},
                    {"id": "findings_summary", "name": "findings_summary", "label": "Findings Summary", "type": "textarea", "required": True},
                    {"id": "attachments", "name": "attachments", "label": "Attachments", "type": "file", "required": False},
                    {"id": "user_dept_ack", "name": "user_dept_ack", "label": "User Dept Acknowledgement", "type": "checkbox", "required": True},
                    {"id": "user_dept_ack_name", "name": "user_dept_ack_name", "label": "User Dept Acknowledgement - Name", "type": "text", "required": True},
                    {"id": "user_dept_ack_date", "name": "user_dept_ack_date", "label": "User Dept Acknowledgement - Date", "type": "date", "required": True},
                    {"id": "proc_officer_confirm", "name": "proc_officer_confirm", "label": "Procurement Monitoring Officer Confirmation", "type": "checkbox", "required": True},
                    {"id": "proc_officer_name", "name": "proc_officer_name", "label": "Procurement Monitoring Officer - Name", "type": "text", "required": True},
                    {"id": "proc_officer_date", "name": "proc_officer_date", "label": "Procurement Monitoring Officer - Date", "type": "date", "required": True},
                    {"id": "audit_officer_signature", "name": "audit_officer_signature", "label": "Audit Officer Signature", "type": "file", "required": True, "is_signature_field": True, "workflow_collected": True},
                    {"id": "gm_audit_signature", "name": "gm_audit_signature", "label": "GM Audit Signature", "type": "file", "required": True, "is_signature_field": True, "workflow_collected": True},
                ],
                "sections": [
                    {
                        "id": "contract_context",
                        "title": "Contract Context",
                        "fields": ["contract_id", "procurement_ref_no", "vendor_name", "user_department", "job_description"],
                    },
                    {
                        "id": "verification_findings",
                        "title": "Verification & Findings",
                        "fields": ["completion_confirmation", "site_verification_by", "verification_date", "findings_summary", "attachments"],
                    },
                    {
                        "id": "department_acknowledgement",
                        "title": "Department Acknowledgement",
                        "fields": ["user_dept_ack", "user_dept_ack_name", "user_dept_ack_date"],
                    },
                    {
                        "id": "procurement_monitoring",
                        "title": "Procurement Monitoring Confirmation",
                        "fields": ["proc_officer_confirm", "proc_officer_name", "proc_officer_date"],
                    },
                    {
                        "id": "sign_off",
                        "title": "Audit Sign-Off",
                        "fields": ["audit_officer_signature", "gm_audit_signature"],
                    },
                ],
            },
            {
                "name": "User Department Work Completion Form",
                "slug": "user-department-work-completion-form",
                "category": FormTemplate.Category.GENERAL,
                "description": "Department-level acknowledgement that assigned work has been completed and verified.",
                "fields": [
                    {"id": "contract_id", "name": "contract_id", "label": "Contract ID", "type": "text", "required": False, "placeholder": "Auto-generated"},
                    {"id": "department", "name": "department", "label": "Department", "type": "select", "required": True, "options": ["ICT", "Procurement", "Finance", "Operations", "Legal", "Engineering"]},
                    {"id": "officer_name", "name": "officer_name", "label": "Officer Name", "type": "text", "required": True},
                    {"id": "job_completion_verified", "name": "job_completion_verified", "label": "Job Completion Verified?", "type": "radio", "required": True, "options": [{"value": "yes", "label": "Yes"}, {"value": "no", "label": "No"}]},
                    {"id": "remarks", "name": "remarks", "label": "Remarks", "type": "textarea", "required": False},
                    {"id": "verification_date", "name": "verification_date", "label": "Date", "type": "date", "required": True},
                    {"id": "department_signature", "name": "department_signature", "label": "Signature", "type": "file", "required": True},
                ],
            },
            {
                "name": "Award Letter Registration Form",
                "slug": "award-letter",
                "category": FormTemplate.Category.PROCUREMENT,
                "description": "Register procurement award details and upload award/contract documents for workflow initiation.",
                "fields": [
                    {"id": "contract_id", "name": "contract_id", "label": "Contract ID", "type": "text", "required": False, "placeholder": "Auto-generated"},
                    {"id": "vendor", "name": "vendor", "label": "Vendor", "type": "text", "required": True},
                    {"id": "amount", "name": "amount", "label": "Amount", "type": "currency", "required": True},
                    {"id": "contract_type", "name": "contract_type", "label": "Contract Type", "type": "select", "required": True, "options": ["Goods", "Works", "Services", "Consultancy"]},
                    {"id": "division", "name": "division", "label": "Division", "type": "select", "required": True, "options": ["ICT", "Procurement", "Finance", "Operations", "Engineering"]},
                    {"id": "completion_period", "name": "completion_period", "label": "Completion Period", "type": "number", "required": True, "placeholder": "Enter number of days"},
                    {"id": "attach_award_letter", "name": "attach_award_letter", "label": "Attach Award Letter", "type": "file", "required": True},
                    {"id": "attach_contract_documents", "name": "attach_contract_documents", "label": "Attach Contract Documents", "type": "file", "required": False},
                    {"id": "initiate_workflow", "name": "initiate_workflow", "label": "Initiate Workflow?", "type": "radio", "required": True, "options": [{"value": "yes", "label": "Yes"}, {"value": "no", "label": "No"}]},
                ],
            },
            {
                "name": "Completion Report",
                "category": FormTemplate.Category.GENERAL,
                "description": "Summarize project/job completion status and outcomes.",
                "fields": [
                    {"id": "report_ref", "name": "report_ref", "label": "Report Reference", "type": "text", "required": True},
                    {"id": "project_title", "name": "project_title", "label": "Project/Job Title", "type": "text", "required": True},
                    {"id": "location", "name": "location", "label": "Location", "type": "text", "required": False},
                    {"id": "start_date", "name": "start_date", "label": "Start Date", "type": "date", "required": True},
                    {"id": "completion_date", "name": "completion_date", "label": "Completion Date", "type": "date", "required": True},
                    {"id": "scope_delivered", "name": "scope_delivered", "label": "Scope Delivered", "type": "textarea", "required": True},
                    {"id": "issues", "name": "issues", "label": "Issues Encountered", "type": "textarea", "required": False},
                    {"id": "recommendations", "name": "recommendations", "label": "Recommendations", "type": "textarea", "required": False},
                    {"id": "prepared_by", "name": "prepared_by", "label": "Prepared By", "type": "text", "required": True},
                    {"id": "approved_by", "name": "approved_by", "label": "Approved By", "type": "text", "required": True},
                ],
            },
            {
                "name": "Job Completion Form",
                "category": FormTemplate.Category.GENERAL,
                "description": "Confirm completion of assigned job/work item.",
                "fields": [
                    {"id": "job_no", "name": "job_no", "label": "Job Number", "type": "text", "required": True},
                    {"id": "job_title", "name": "job_title", "label": "Job Title", "type": "text", "required": True},
                    {"id": "assigned_to", "name": "assigned_to", "label": "Assigned To", "type": "text", "required": True},
                    {"id": "supervisor", "name": "supervisor", "label": "Supervisor", "type": "text", "required": True},
                    {"id": "date_assigned", "name": "date_assigned", "label": "Date Assigned", "type": "date", "required": True},
                    {"id": "date_completed", "name": "date_completed", "label": "Date Completed", "type": "date", "required": True},
                    {"id": "work_done", "name": "work_done", "label": "Work Done", "type": "textarea", "required": True},
                    {"id": "quality_check", "name": "quality_check", "label": "Quality Check", "type": "select", "required": True, "options": ["Pass", "Fail", "Conditional"]},
                    {"id": "remarks", "name": "remarks", "label": "Remarks", "type": "textarea", "required": False},
                    {"id": "verified_by", "name": "verified_by", "label": "Verified By", "type": "text", "required": True},
                ],
            },
            {
                "name": "Completion Certificate",
                "category": FormTemplate.Category.PROCUREMENT,
                "description": "Official certificate confirming completion and acceptance of work.",
                "fields": [
                    {"id": "certificate_no", "name": "certificate_no", "label": "Certificate Number", "type": "text", "required": True},
                    {"id": "contractor_name", "name": "contractor_name", "label": "Contractor Name", "type": "text", "required": True},
                    {"id": "project_name", "name": "project_name", "label": "Project Name", "type": "text", "required": True},
                    {"id": "contract_ref", "name": "contract_ref", "label": "Contract Reference", "type": "text", "required": True},
                    {"id": "commencement_date", "name": "commencement_date", "label": "Commencement Date", "type": "date", "required": True},
                    {"id": "completion_date", "name": "completion_date", "label": "Completion Date", "type": "date", "required": True},
                    {"id": "inspection_date", "name": "inspection_date", "label": "Inspection Date", "type": "date", "required": False},
                    {"id": "certificate_text", "name": "certificate_text", "label": "Certificate Statement", "type": "textarea", "required": True},
                    {"id": "issued_by", "name": "issued_by", "label": "Issued By", "type": "text", "required": True},
                    {"id": "authorized_signatory", "name": "authorized_signatory", "label": "Authorized Signatory", "type": "text", "required": True},
                ],
            },
            {
                "name": "Payment Certification Form",
                "category": FormTemplate.Category.FINANCE,
                "description": "Certify payment request based on completed and verified work.",
                "fields": [
                    {"id": "payment_ref", "name": "payment_ref", "label": "Payment Reference", "type": "text", "required": True},
                    {"id": "beneficiary_name", "name": "beneficiary_name", "label": "Beneficiary Name", "type": "text", "required": True},
                    {"id": "invoice_no", "name": "invoice_no", "label": "Invoice Number", "type": "text", "required": True},
                    {"id": "invoice_date", "name": "invoice_date", "label": "Invoice Date", "type": "date", "required": True},
                    {"id": "contract_ref", "name": "contract_ref", "label": "Contract Reference", "type": "text", "required": True},
                    {"id": "certified_amount", "name": "certified_amount", "label": "Certified Amount", "type": "currency", "required": True},
                    {"id": "retention_amount", "name": "retention_amount", "label": "Retention Amount", "type": "currency", "required": False},
                    {"id": "net_payable", "name": "net_payable", "label": "Net Payable", "type": "currency", "required": True},
                    {"id": "certification_notes", "name": "certification_notes", "label": "Certification Notes", "type": "textarea", "required": False},
                    {"id": "certified_by", "name": "certified_by", "label": "Certified By", "type": "text", "required": True},
                ],
            },
            {
                "name": "Procurement Monitoring Checklist",
                "category": FormTemplate.Category.PROCUREMENT,
                "description": "Checklist to monitor procurement compliance and milestones.",
                "fields": [
                    {"id": "checklist_ref", "name": "checklist_ref", "label": "Checklist Reference", "type": "text", "required": True},
                    {"id": "procurement_title", "name": "procurement_title", "label": "Procurement Title", "type": "text", "required": True},
                    {"id": "department", "name": "department", "label": "Requesting Department", "type": "text", "required": True},
                    {"id": "budget_available", "name": "budget_available", "label": "Budget Available", "type": "checkbox", "required": False},
                    {"id": "specification_complete", "name": "specification_complete", "label": "Specifications Complete", "type": "checkbox", "required": False},
                    {"id": "advertisement_done", "name": "advertisement_done", "label": "Advertisement Done", "type": "checkbox", "required": False},
                    {"id": "bid_opening_done", "name": "bid_opening_done", "label": "Bid Opening Done", "type": "checkbox", "required": False},
                    {"id": "evaluation_done", "name": "evaluation_done", "label": "Evaluation Done", "type": "checkbox", "required": False},
                    {"id": "approval_status", "name": "approval_status", "label": "Approval Status", "type": "select", "required": True, "options": ["Pending", "Approved", "Rejected"]},
                    {"id": "checklist_remarks", "name": "checklist_remarks", "label": "Remarks", "type": "textarea", "required": False},
                ],
            },
        ]

        created_count = 0
        updated_count = 0

        for template_data in templates:
            slug = template_data.get("slug") or slugify(template_data["name"])
            structure = {
                "layout": template_data.get("layout", "single"),
                "fields": template_data["fields"],
                "sections": template_data.get("sections") or [
                    {
                        "id": "main",
                        "title": template_data["name"],
                        "fields": [field["id"] for field in template_data["fields"]],
                    }
                ],
            }

            obj, created = FormTemplate.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": template_data["name"],
                    "description": template_data["description"],
                    "category": template_data["category"],
                    "is_active": True,
                    "structure": structure,
                },
            )

            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"Created: {obj.name}"))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f"Updated: {obj.name}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"\nCompleted. Created {created_count}, updated {updated_count} templates."
            )
        )
