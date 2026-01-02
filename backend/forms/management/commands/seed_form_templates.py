"""Seed standard form templates for Procurement, Audit, and Finance."""

from django.core.management.base import BaseCommand
from forms.models import FormTemplate


class Command(BaseCommand):
    help = "Seed standard form templates"

    def handle(self, *args, **options):
        templates = [
            {
                "name": "Procurement Request Form",
                "slug": "procurement-request",
                "description": "Standard form for requesting procurement of goods or services",
                "category": FormTemplate.Category.PROCUREMENT,
                "structure": {
                    "fields": [
                        {
                            "id": "requestor_name",
                            "name": "requestor_name",
                            "label": "Requestor Name",
                            "type": "text",
                            "required": True,
                            "placeholder": "Enter requestor full name",
                        },
                        {
                            "id": "requestor_department",
                            "name": "requestor_department",
                            "label": "Department/Division",
                            "type": "text",
                            "required": True,
                            "placeholder": "Enter department or division",
                        },
                        {
                            "id": "item_description",
                            "name": "item_description",
                            "label": "Item/Service Description",
                            "type": "textarea",
                            "required": True,
                            "placeholder": "Describe the item or service being requested",
                        },
                        {
                            "id": "quantity",
                            "name": "quantity",
                            "label": "Quantity",
                            "type": "number",
                            "required": True,
                            "validation": {"min": 1},
                        },
                        {
                            "id": "unit_price",
                            "name": "unit_price",
                            "label": "Unit Price (NGN)",
                            "type": "currency",
                            "required": True,
                            "validation": {"min": 0},
                        },
                        {
                            "id": "total_amount",
                            "name": "total_amount",
                            "label": "Total Amount (NGN)",
                            "type": "currency",
                            "required": True,
                            "validation": {"min": 0},
                        },
                        {
                            "id": "justification",
                            "name": "justification",
                            "label": "Justification/Business Case",
                            "type": "textarea",
                            "required": True,
                            "placeholder": "Explain why this procurement is necessary",
                        },
                        {
                            "id": "urgency",
                            "name": "urgency",
                            "label": "Urgency Level",
                            "type": "select",
                            "required": True,
                            "options": [
                                {"value": "low", "label": "Low - Can wait 30+ days"},
                                {"value": "medium", "label": "Medium - Needed within 2-4 weeks"},
                                {"value": "high", "label": "High - Needed within 1 week"},
                                {"value": "urgent", "label": "Urgent - Needed immediately"},
                            ],
                        },
                        {
                            "id": "budget_line",
                            "name": "budget_line",
                            "label": "Budget Line Item",
                            "type": "text",
                            "required": False,
                            "placeholder": "Enter budget line item code if applicable",
                        },
                        {
                            "id": "vendor_preference",
                            "name": "vendor_preference",
                            "label": "Preferred Vendor (if any)",
                            "type": "text",
                            "required": False,
                            "placeholder": "Enter vendor name if you have a preference",
                        },
                    ],
                },
            },
            {
                "name": "Audit Checklist",
                "slug": "audit-checklist",
                "description": "Standard audit checklist for compliance and verification",
                "category": FormTemplate.Category.AUDIT,
                "structure": {
                    "fields": [
                        {
                            "id": "audit_type",
                            "name": "audit_type",
                            "label": "Audit Type",
                            "type": "select",
                            "required": True,
                            "options": [
                                {"value": "financial", "label": "Financial Audit"},
                                {"value": "compliance", "label": "Compliance Audit"},
                                {"value": "operational", "label": "Operational Audit"},
                                {"value": "it", "label": "IT/Systems Audit"},
                                {"value": "other", "label": "Other"},
                            ],
                        },
                        {
                            "id": "audit_period",
                            "name": "audit_period",
                            "label": "Audit Period",
                            "type": "text",
                            "required": True,
                            "placeholder": "e.g., Q1 2025, January 2025",
                        },
                        {
                            "id": "scope",
                            "name": "scope",
                            "label": "Audit Scope",
                            "type": "textarea",
                            "required": True,
                            "placeholder": "Describe what areas/processes will be audited",
                        },
                        {
                            "id": "documents_available",
                            "name": "documents_available",
                            "label": "Required Documents Available",
                            "type": "checkbox",
                            "required": False,
                        },
                        {
                            "id": "financial_records",
                            "name": "financial_records",
                            "label": "Financial Records Reviewed",
                            "type": "checkbox",
                            "required": False,
                        },
                        {
                            "id": "compliance_verified",
                            "name": "compliance_verified",
                            "label": "Compliance Requirements Verified",
                            "type": "checkbox",
                            "required": False,
                        },
                        {
                            "id": "findings",
                            "name": "findings",
                            "label": "Audit Findings",
                            "type": "textarea",
                            "required": False,
                            "placeholder": "Document any findings or observations",
                        },
                        {
                            "id": "recommendations",
                            "name": "recommendations",
                            "label": "Recommendations",
                            "type": "textarea",
                            "required": False,
                            "placeholder": "Provide recommendations for improvement",
                        },
                        {
                            "id": "auditor_name",
                            "name": "auditor_name",
                            "label": "Auditor Name",
                            "type": "text",
                            "required": True,
                            "placeholder": "Enter auditor full name",
                        },
                        {
                            "id": "audit_date",
                            "name": "audit_date",
                            "label": "Audit Date",
                            "type": "date",
                            "required": True,
                        },
                    ],
                },
            },
            {
                "name": "Finance Payment Request",
                "slug": "finance-payment-request",
                "description": "Standard form for requesting payments and disbursements",
                "category": FormTemplate.Category.FINANCE,
                "structure": {
                    "fields": [
                        {
                            "id": "payee_name",
                            "name": "payee_name",
                            "label": "Payee Name",
                            "type": "text",
                            "required": True,
                            "placeholder": "Enter payee full name or organization",
                        },
                        {
                            "id": "payee_account",
                            "name": "payee_account",
                            "label": "Account Number",
                            "type": "text",
                            "required": True,
                            "placeholder": "Enter bank account number",
                        },
                        {
                            "id": "payee_bank",
                            "name": "payee_bank",
                            "label": "Bank Name",
                            "type": "text",
                            "required": True,
                            "placeholder": "Enter bank name",
                        },
                        {
                            "id": "amount",
                            "name": "amount",
                            "label": "Amount (NGN)",
                            "type": "currency",
                            "required": True,
                            "validation": {"min": 0},
                        },
                        {
                            "id": "payment_type",
                            "name": "payment_type",
                            "label": "Payment Type",
                            "type": "select",
                            "required": True,
                            "options": [
                                {"value": "salary", "label": "Salary"},
                                {"value": "allowance", "label": "Allowance"},
                                {"value": "vendor", "label": "Vendor Payment"},
                                {"value": "reimbursement", "label": "Reimbursement"},
                                {"value": "contract", "label": "Contract Payment"},
                                {"value": "other", "label": "Other"},
                            ],
                        },
                        {
                            "id": "purpose",
                            "name": "purpose",
                            "label": "Purpose of Payment",
                            "type": "textarea",
                            "required": True,
                            "placeholder": "Describe the purpose of this payment",
                        },
                        {
                            "id": "invoice_number",
                            "name": "invoice_number",
                            "label": "Invoice/Reference Number",
                            "type": "text",
                            "required": False,
                            "placeholder": "Enter invoice or reference number if applicable",
                        },
                        {
                            "id": "due_date",
                            "name": "due_date",
                            "label": "Due Date",
                            "type": "date",
                            "required": False,
                        },
                        {
                            "id": "budget_code",
                            "name": "budget_code",
                            "label": "Budget Code",
                            "type": "text",
                            "required": False,
                            "placeholder": "Enter budget code if applicable",
                        },
                        {
                            "id": "approver_notes",
                            "name": "approver_notes",
                            "label": "Approver Notes",
                            "type": "textarea",
                            "required": False,
                            "placeholder": "Additional notes from approver",
                        },
                    ],
                },
            },
        ]

        created_count = 0
        for template_data in templates:
            template, created = FormTemplate.objects.get_or_create(
                slug=template_data["slug"],
                defaults={
                    "name": template_data["name"],
                    "description": template_data["description"],
                    "category": template_data["category"],
                    "structure": template_data["structure"],
                    "is_active": True,
                },
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created template: {template.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Template already exists: {template.name}')
                )

        # Add Project Monitoring Report template
        project_monitoring_template = {
            "name": "Project Monitoring Report - Audit Division",
            "slug": "project-monitoring-report-audit",
            "description": "Standard form for project monitoring and audit certification in the Audit Division",
            "category": FormTemplate.Category.AUDIT,
            "structure": {
                "fields": [
                    {
                        "id": "to",
                        "name": "to",
                        "label": "To",
                        "type": "text",
                        "required": True,
                        "placeholder": "e.g., General Manager, Audit",
                    },
                    {
                        "id": "from_field",
                        "name": "from_field",
                        "label": "From",
                        "type": "text",
                        "required": True,
                        "placeholder": "e.g., HQ",
                    },
                    {
                        "id": "date",
                        "name": "date",
                        "label": "Date",
                        "type": "date",
                        "required": True,
                    },
                    {
                        "id": "chq_no",
                        "name": "chq_no",
                        "label": "CHQ No",
                        "type": "text",
                        "required": False,
                        "placeholder": "e.g., 0000134",
                    },
                    {
                        "id": "our_ref",
                        "name": "our_ref",
                        "label": "Our Ref",
                        "type": "text",
                        "required": False,
                        "placeholder": "Reference number",
                    },
                    {
                        "id": "subject",
                        "name": "subject",
                        "label": "Subject",
                        "type": "text",
                        "required": True,
                        "placeholder": "PROJECT MONITORING REPORT - AUDIT DIVISION",
                    },
                    {
                        "id": "project",
                        "name": "project",
                        "label": "Project",
                        "type": "textarea",
                        "required": True,
                        "placeholder": "Enter full project description",
                    },
                    {
                        "id": "location",
                        "name": "location",
                        "label": "Location",
                        "type": "text",
                        "required": False,
                        "placeholder": "Project location",
                    },
                    {
                        "id": "contractor_name",
                        "name": "contractor_name",
                        "label": "Contractor's Name",
                        "type": "text",
                        "required": True,
                        "placeholder": "e.g., Messrs. Nimito Company Nigeria Limited",
                    },
                    {
                        "id": "contractor_address",
                        "name": "contractor_address",
                        "label": "Contractor's Address",
                        "type": "textarea",
                        "required": True,
                        "placeholder": "Enter full contractor address",
                    },
                    {
                        "id": "contract_sum",
                        "name": "contract_sum",
                        "label": "Contract Sum (NGN)",
                        "type": "currency",
                        "required": True,
                        "validation": {"min": 0},
                    },
                    {
                        "id": "award_ref",
                        "name": "award_ref",
                        "label": "Ref: No. & Date of Award Letter",
                        "type": "text",
                        "required": True,
                        "placeholder": "e.g., HQ/GM/PRO/CON/C.1/179THPTB/SN.44/24/220",
                    },
                    {
                        "id": "cep_no_date",
                        "name": "cep_no_date",
                        "label": "C.E.P. No. & Date",
                        "type": "text",
                        "required": True,
                        "placeholder": "e.g., 4th June, 2025",
                    },
                    {
                        "id": "project_manager",
                        "name": "project_manager",
                        "label": "Project Manager",
                        "type": "text",
                        "required": True,
                        "placeholder": "Enter project manager name",
                    },
                    {
                        "id": "audit_assignment",
                        "name": "audit_assignment",
                        "label": "Audit Assignment",
                        "type": "textarea",
                        "required": True,
                        "placeholder": "e.g., To Witness/monitor The project",
                    },
                    {
                        "id": "attach_boq",
                        "name": "attach_boq",
                        "label": "(i) Attach Bill of Quantity",
                        "type": "checkbox",
                        "required": False,
                    },
                    {
                        "id": "check_boq_extent",
                        "name": "check_boq_extent",
                        "label": "(ii) Check Bill of Quantity For Extent of Work Done",
                        "type": "checkbox",
                        "required": False,
                    },
                    {
                        "id": "review_unit_price",
                        "name": "review_unit_price",
                        "label": "(iii) Review the Unit Price of item on BOQ",
                        "type": "checkbox",
                        "required": False,
                    },
                    {
                        "id": "attach_working_papers",
                        "name": "attach_working_papers",
                        "label": "(iv) Attach all Working Papers",
                        "type": "checkbox",
                        "required": False,
                    },
                    {
                        "id": "comments",
                        "name": "comments",
                        "label": "Comments",
                        "type": "textarea",
                        "required": False,
                        "placeholder": "Enter comments",
                    },
                    {
                        "id": "observation",
                        "name": "observation",
                        "label": "Observation",
                        "type": "textarea",
                        "required": False,
                        "placeholder": "Enter observations",
                    },
                    {
                        "id": "recommendation",
                        "name": "recommendation",
                        "label": "Recommendation",
                        "type": "textarea",
                        "required": False,
                        "placeholder": "Enter recommendations",
                    },
                    {
                        "id": "pm_name",
                        "name": "pm_name",
                        "label": "Project Manager/Engineer - Name",
                        "type": "text",
                        "required": True,
                        "placeholder": "Enter name",
                    },
                    {
                        "id": "pm_pn",
                        "name": "pm_pn",
                        "label": "Project Manager/Engineer - P/N",
                        "type": "text",
                        "required": True,
                        "placeholder": "Enter personnel number",
                    },
                    {
                        "id": "pm_designation",
                        "name": "pm_designation",
                        "label": "Project Manager/Engineer - Designation",
                        "type": "text",
                        "required": True,
                        "placeholder": "e.g., SAI",
                    },
                    {
                        "id": "pm_signature",
                        "name": "pm_signature",
                        "label": "Project Manager/Engineer - Signature",
                        "type": "file",
                        "required": True,
                    },
                    {
                        "id": "pm_date",
                        "name": "pm_date",
                        "label": "Project Manager/Engineer - Date",
                        "type": "date",
                        "required": True,
                    },
                    {
                        "id": "procurement_name",
                        "name": "procurement_name",
                        "label": "Procurement - Name",
                        "type": "text",
                        "required": True,
                        "placeholder": "Enter name",
                    },
                    {
                        "id": "procurement_pn",
                        "name": "procurement_pn",
                        "label": "Procurement - P/N",
                        "type": "text",
                        "required": True,
                        "placeholder": "Enter personnel number",
                    },
                    {
                        "id": "procurement_designation",
                        "name": "procurement_designation",
                        "label": "Procurement - Designation",
                        "type": "text",
                        "required": True,
                        "placeholder": "e.g., SPO",
                    },
                    {
                        "id": "procurement_signature",
                        "name": "procurement_signature",
                        "label": "Procurement - Signature",
                        "type": "file",
                        "required": True,
                    },
                    {
                        "id": "procurement_date",
                        "name": "procurement_date",
                        "label": "Procurement - Date",
                        "type": "date",
                        "required": True,
                    },
                    {
                        "id": "audit_name",
                        "name": "audit_name",
                        "label": "Audit - Name",
                        "type": "text",
                        "required": True,
                        "placeholder": "Enter name",
                    },
                    {
                        "id": "audit_pn",
                        "name": "audit_pn",
                        "label": "Audit - P/N",
                        "type": "text",
                        "required": True,
                        "placeholder": "Enter personnel number",
                    },
                    {
                        "id": "audit_designation",
                        "name": "audit_designation",
                        "label": "Audit - Designation",
                        "type": "text",
                        "required": True,
                        "placeholder": "Enter designation",
                    },
                    {
                        "id": "audit_signature",
                        "name": "audit_signature",
                        "label": "Audit - Signature",
                        "type": "file",
                        "required": True,
                    },
                    {
                        "id": "audit_date",
                        "name": "audit_date",
                        "label": "Audit - Date",
                        "type": "date",
                        "required": True,
                    },
                    {
                        "id": "distribution",
                        "name": "distribution",
                        "label": "Distribution (Original) PV",
                        "type": "textarea",
                        "required": False,
                        "placeholder": "Enter distribution details",
                    },
                ],
                "sections": [
                    {
                        "id": "header",
                        "title": "Header Information",
                        "fields": ["to", "from_field", "date", "chq_no", "our_ref"],
                    },
                    {
                        "id": "project_details",
                        "title": "Project Details",
                        "fields": [
                            "subject",
                            "project",
                            "location",
                            "contractor_name",
                            "contractor_address",
                            "contract_sum",
                            "award_ref",
                            "cep_no_date",
                        ],
                    },
                    {
                        "id": "audit_details",
                        "title": "Audit Details",
                        "fields": [
                            "project_manager",
                            "audit_assignment",
                            "attach_boq",
                            "check_boq_extent",
                            "review_unit_price",
                            "attach_working_papers",
                            "comments",
                            "observation",
                        ],
                    },
                    {
                        "id": "recommendation",
                        "title": "Recommendation",
                        "fields": ["recommendation"],
                    },
                    {
                        "id": "certification",
                        "title": "Certification",
                        "fields": [],
                    },
                    {
                        "id": "signatures",
                        "title": "Signatures",
                        "fields": [
                            "pm_name",
                            "pm_pn",
                            "pm_designation",
                            "pm_signature",
                            "pm_date",
                            "procurement_name",
                            "procurement_pn",
                            "procurement_designation",
                            "procurement_signature",
                            "procurement_date",
                            "audit_name",
                            "audit_pn",
                            "audit_designation",
                            "audit_signature",
                            "audit_date",
                        ],
                    },
                    {
                        "id": "distribution_section",
                        "title": "Distribution",
                        "fields": ["distribution"],
                    },
                ],
                "layout": "single",
            },
        }

        template, created = FormTemplate.objects.get_or_create(
            slug=project_monitoring_template["slug"],
            defaults={
                "name": project_monitoring_template["name"],
                "description": project_monitoring_template["description"],
                "category": project_monitoring_template["category"],
                "structure": project_monitoring_template["structure"],
                "is_active": True,
            },
        )
        if created:
            created_count += 1
            self.stdout.write(
                self.style.SUCCESS(f'Created template: {template.name}')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'Template already exists: {template.name}')
            )

        # Add the three NPA-specific ECM forms from the design document
        npa_forms = [
            {
                "name": "Project Completion Validation Form",
                "slug": "project-completion-validation",
                "description": "Mandatory form for user departments to validate project completion. Required before audit review.",
                "category": FormTemplate.Category.GENERAL,
                "structure": {
                    "fields": [
                        {
                            "id": "scope_completed",
                            "name": "scope_completed",
                            "label": "1. Scope of Work Completed?",
                            "type": "radio",
                            "required": True,
                            "options": [
                                {"value": "fully", "label": "Fully Completed"},
                                {"value": "partial", "label": "Partially Completed"},
                                {"value": "not", "label": "Not Completed"},
                            ],
                        },
                        {
                            "id": "physical_inspection",
                            "name": "physical_inspection",
                            "label": "2. Physical Inspection Conducted?",
                            "type": "radio",
                            "required": True,
                            "options": [
                                {"value": "yes", "label": "Yes"},
                                {"value": "no", "label": "No"},
                            ],
                        },
                        {
                            "id": "inspection_date",
                            "name": "inspection_date",
                            "label": "Inspection Date",
                            "type": "date",
                            "required": False,
                        },
                        {
                            "id": "outstanding_issues",
                            "name": "outstanding_issues",
                            "label": "3. Any Outstanding Issues?",
                            "type": "radio",
                            "required": True,
                            "options": [
                                {"value": "no", "label": "No"},
                                {"value": "yes", "label": "Yes"},
                            ],
                        },
                        {
                            "id": "outstanding_issues_description",
                            "name": "outstanding_issues_description",
                            "label": "Describe Outstanding Issues",
                            "type": "textarea",
                            "required": False,
                            "placeholder": "Describe any outstanding issues...",
                        },
                        {
                            "id": "completion_report_attached",
                            "name": "completion_report_attached",
                            "label": "4. Supporting Documents Attached - Completion Report",
                            "type": "checkbox",
                            "required": False,
                        },
                        {
                            "id": "site_photos_attached",
                            "name": "site_photos_attached",
                            "label": "Site Photos",
                            "type": "checkbox",
                            "required": False,
                        },
                        {
                            "id": "engineers_confirmation_attached",
                            "name": "engineers_confirmation_attached",
                            "label": "Engineer's Confirmation",
                            "type": "checkbox",
                            "required": False,
                        },
                        {
                            "id": "declarant_name",
                            "name": "declarant_name",
                            "label": "Name",
                            "type": "text",
                            "required": True,
                            "placeholder": "Enter full name",
                        },
                        {
                            "id": "declarant_designation",
                            "name": "declarant_designation",
                            "label": "Designation",
                            "type": "text",
                            "required": True,
                            "placeholder": "Enter designation",
                        },
                        {
                            "id": "declarant_signature",
                            "name": "declarant_signature",
                            "label": "Digital Signature",
                            "type": "file",
                            "required": True,
                        },
                    ],
                    "sections": [
                        {
                            "id": "completion_details",
                            "title": "Completion Details",
                            "fields": ["scope_completed", "physical_inspection", "inspection_date", "outstanding_issues", "outstanding_issues_description"],
                        },
                        {
                            "id": "supporting_documents",
                            "title": "Supporting Documents",
                            "fields": ["completion_report_attached", "site_photos_attached", "engineers_confirmation_attached"],
                        },
                        {
                            "id": "declaration",
                            "title": "Declaration",
                            "fields": ["declarant_name", "declarant_designation", "declarant_signature"],
                        },
                    ],
                    "layout": "single",
                },
            },
            {
                "name": "Audit Monitoring & Clearance Form",
                "slug": "audit-monitoring-clearance",
                "description": "Critical control form for audit department. Must be approved before payment certification can proceed.",
                "category": FormTemplate.Category.AUDIT,
                "structure": {
                    "fields": [
                        {
                            "id": "contract_award_compliance",
                            "name": "contract_award_compliance",
                            "label": "1. Contract Award Compliance Verified?",
                            "type": "radio",
                            "required": True,
                            "options": [
                                {"value": "yes", "label": "Yes"},
                                {"value": "no", "label": "No"},
                            ],
                        },
                        {
                            "id": "procurement_process_reviewed",
                            "name": "procurement_process_reviewed",
                            "label": "2. Procurement Process Reviewed?",
                            "type": "radio",
                            "required": True,
                            "options": [
                                {"value": "yes", "label": "Yes"},
                                {"value": "no", "label": "No"},
                            ],
                        },
                        {
                            "id": "user_dept_completion_attached",
                            "name": "user_dept_completion_attached",
                            "label": "3. User Department Completion Acknowledgment Attached?",
                            "type": "radio",
                            "required": True,
                            "options": [
                                {"value": "yes", "label": "Yes"},
                                {"value": "no", "label": "No"},
                            ],
                        },
                        {
                            "id": "procurement_monitoring_confirmation",
                            "name": "procurement_monitoring_confirmation",
                            "label": "4. Procurement Monitoring Officer Confirmation?",
                            "type": "radio",
                            "required": True,
                            "options": [
                                {"value": "yes", "label": "Yes"},
                                {"value": "no", "label": "No"},
                            ],
                        },
                        {
                            "id": "audit_observations",
                            "name": "audit_observations",
                            "label": "5. Any Audit Observations?",
                            "type": "radio",
                            "required": True,
                            "options": [
                                {"value": "none", "label": "None"},
                                {"value": "yes", "label": "Yes"},
                            ],
                        },
                        {
                            "id": "audit_observations_description",
                            "name": "audit_observations_description",
                            "label": "Describe Audit Observations",
                            "type": "textarea",
                            "required": False,
                            "placeholder": "Describe any audit observations...",
                        },
                        {
                            "id": "risk_level",
                            "name": "risk_level",
                            "label": "6. Risk Level",
                            "type": "select",
                            "required": True,
                            "options": [
                                {"value": "low", "label": "Low"},
                                {"value": "medium", "label": "Medium"},
                                {"value": "high", "label": "High"},
                            ],
                        },
                        {
                            "id": "audit_recommendation",
                            "name": "audit_recommendation",
                            "label": "Audit Recommendation",
                            "type": "radio",
                            "required": True,
                            "options": [
                                {"value": "clear", "label": "Clear for Payment"},
                                {"value": "clear_with_observations", "label": "Clear with Observations"},
                                {"value": "not_cleared", "label": "Not Cleared"},
                            ],
                        },
                        {
                            "id": "audit_officer_name",
                            "name": "audit_officer_name",
                            "label": "Audit Officer - Name",
                            "type": "text",
                            "required": True,
                            "placeholder": "Enter audit officer name",
                        },
                        {
                            "id": "audit_officer_signature",
                            "name": "audit_officer_signature",
                            "label": "Audit Officer - Signature",
                            "type": "file",
                            "required": True,
                        },
                        {
                            "id": "gm_audit_name",
                            "name": "gm_audit_name",
                            "label": "GM Audit Approval - Name",
                            "type": "text",
                            "required": True,
                            "placeholder": "Enter GM Audit name",
                        },
                        {
                            "id": "gm_audit_signature",
                            "name": "gm_audit_signature",
                            "label": "GM Audit Approval - Signature",
                            "type": "file",
                            "required": True,
                        },
                    ],
                    "sections": [
                        {
                            "id": "compliance_verification",
                            "title": "Compliance Verification",
                            "fields": ["contract_award_compliance", "procurement_process_reviewed", "user_dept_completion_attached", "procurement_monitoring_confirmation"],
                        },
                        {
                            "id": "audit_assessment",
                            "title": "Audit Assessment",
                            "fields": ["audit_observations", "audit_observations_description", "risk_level", "audit_recommendation"],
                        },
                        {
                            "id": "approvals",
                            "title": "Approvals",
                            "fields": ["audit_officer_name", "audit_officer_signature", "gm_audit_name", "gm_audit_signature"],
                        },
                    ],
                    "layout": "single",
                },
            },
            {
                "name": "Payment Certification Form",
                "slug": "payment-certification",
                "description": "Finance department form for payment certification. Locked until audit clearance is approved.",
                "category": FormTemplate.Category.FINANCE,
                "structure": {
                    "fields": [
                        {
                            "id": "invoice_amount",
                            "name": "invoice_amount",
                            "label": "Invoice Amount (NGN)",
                            "type": "currency",
                            "required": True,
                            "validation": {"min": 0},
                        },
                        {
                            "id": "certified_amount",
                            "name": "certified_amount",
                            "label": "Certified Amount (NGN)",
                            "type": "currency",
                            "required": True,
                            "validation": {"min": 0},
                        },
                        {
                            "id": "payment_recommendation",
                            "name": "payment_recommendation",
                            "label": "Payment Recommendation",
                            "type": "radio",
                            "required": True,
                            "options": [
                                {"value": "pay_full", "label": "Pay Full Amount"},
                                {"value": "pay_adjusted", "label": "Pay Adjusted Amount"},
                                {"value": "withhold", "label": "Withhold Payment"},
                            ],
                        },
                        {
                            "id": "remarks",
                            "name": "remarks",
                            "label": "Remarks",
                            "type": "textarea",
                            "required": False,
                            "placeholder": "Enter payment remarks...",
                        },
                        {
                            "id": "finance_officer_name",
                            "name": "finance_officer_name",
                            "label": "Prepared By (Finance Officer) - Name",
                            "type": "text",
                            "required": True,
                            "placeholder": "Enter finance officer name",
                        },
                        {
                            "id": "finance_officer_signature",
                            "name": "finance_officer_signature",
                            "label": "Finance Officer - Signature",
                            "type": "file",
                            "required": True,
                        },
                        {
                            "id": "approver_level",
                            "name": "approver_level",
                            "label": "Approved By",
                            "type": "select",
                            "required": True,
                            "options": [
                                {"value": "gm_finance", "label": "GM Finance"},
                                {"value": "ed_finance", "label": "ED Finance"},
                            ],
                        },
                        {
                            "id": "final_authorization",
                            "name": "final_authorization",
                            "label": "Final Authorization (if threshold exceeded)",
                            "type": "checkbox",
                            "required": False,
                        },
                        {
                            "id": "md_authorization",
                            "name": "md_authorization",
                            "label": "MD Authorization Required",
                            "type": "checkbox",
                            "required": False,
                        },
                    ],
                    "sections": [
                        {
                            "id": "payment_details",
                            "title": "Payment Details",
                            "fields": ["invoice_amount", "certified_amount", "payment_recommendation", "remarks"],
                        },
                        {
                            "id": "preparation",
                            "title": "Preparation",
                            "fields": ["finance_officer_name", "finance_officer_signature"],
                        },
                        {
                            "id": "approval",
                            "title": "Approval",
                            "fields": ["approver_level", "final_authorization", "md_authorization"],
                        },
                    ],
                    "layout": "single",
                },
            },
        ]

        for form_data in npa_forms:
            template, created = FormTemplate.objects.get_or_create(
                slug=form_data["slug"],
                defaults={
                    "name": form_data["name"],
                    "description": form_data["description"],
                    "category": form_data["category"],
                    "structure": form_data["structure"],
                    "is_active": True,
                },
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created template: {template.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Template already exists: {template.name}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'\nSuccessfully seeded {created_count} form templates.')
        )

