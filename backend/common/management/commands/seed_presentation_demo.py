"""Seed end-to-end presentation demo data: SecureNet Lagos Port Network Upgrade."""

from __future__ import annotations

import json
import re
from datetime import date, timedelta
from io import BytesIO
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from reportlab.lib.pagesizes import letter

from correspondence.models import (
    Case,
    CaseComment,
    CaseCorrespondenceLink,
    CaseDocumentLink,
    Correspondence,
    CorrespondenceAttachment,
    CorrespondenceDistribution,
    CorrespondenceDocumentLink,
    DispatchRecord,
    Minute,
    PhysicalDocument,
)
from dms.models import (
    Document,
    DocumentAccessLog,
    DocumentPermission,
    DocumentRightsPolicy,
    DocumentVersion,
)
from organization.models import Department, Directorate, Division, Office
from workflow.models import ApprovalTask, TaskAction, WorkflowTemplate

User = get_user_model()

TODAY = date.today()
NOW = timezone.now()

DRM_POLICY_SPECS = [
    {
        "name": "Confidential — View Only",
        "description": "Document is view-only; download and print are disabled.",
        "allow_download": False,
        "allow_print": False,
        "allow_external_share": False,
        "view_only": True,
        "watermark_text": "CONFIDENTIAL",
        "expires_after_days": None,
    },
    {
        "name": "Internal — Download Allowed",
        "description": "Standard internal document. Download allowed; PDF downloads are watermarked.",
        "allow_download": True,
        "allow_print": True,
        "allow_external_share": False,
        "view_only": False,
        "watermark_text": "INTERNAL USE ONLY",
        "expires_after_days": None,
    },
    {
        "name": "Strictly Confidential — Time-Limited",
        "description": "View-only, watermarked, expires after 30 days.",
        "allow_download": False,
        "allow_print": False,
        "allow_external_share": False,
        "view_only": True,
        "watermark_text": "STRICTLY CONFIDENTIAL",
        "expires_after_days": 30,
    },
    {
        "name": "External Sharing — Controlled",
        "description": "Download allowed; external sharing restricted; expires after 180 days.",
        "allow_download": True,
        "allow_print": True,
        "allow_external_share": False,
        "view_only": False,
        "watermark_text": "",
        "expires_after_days": 180,
    },
    {
        "name": "Public Record",
        "description": "No restrictions.",
        "allow_download": True,
        "allow_print": True,
        "allow_external_share": True,
        "view_only": False,
        "watermark_text": "",
        "expires_after_days": None,
    },
]


class Command(BaseCommand):
    help = "Seed rich end-to-end presentation demo data (SecureNet Lagos Port scenario)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Delete existing SecureNet scenario data before seeding",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("Seeding Presentation Demo Data"))
        self._load_reference_data()

        with transaction.atomic():
            if options.get("force"):
                self._clean_existing()
            self._ensure_org_units()
            self._ensure_users()
            self._ensure_offices()
            self._ensure_delegations()
            self._ensure_external_entity()
            self.drm_policies = self._ensure_drm_policies()
            data = self._build_scenario()
            self._ensure_physical_documents(data)
            self._ensure_case(data)
            self._ensure_workflow_tasks(data)

        self.stdout.write(self.style.SUCCESS("Presentation demo data seeded successfully."))
        self.stdout.write("  DRM: architecture (view-only + CONFIDENTIAL stamp) and completion (download + INTERNAL USE ONLY stamp).")
        self.stdout.write("  Case: search Lagos Port / SecureNet under /cases.")

    def _ensure_drm_policies(self) -> dict[str, DocumentRightsPolicy]:
        self.stdout.write(self.style.MIGRATE_HEADING("\nEnsuring DRM policies…"))
        out: dict[str, DocumentRightsPolicy] = {}
        for data in DRM_POLICY_SPECS:
            obj, _ = DocumentRightsPolicy.objects.update_or_create(
                name=data["name"],
                defaults={**data, "is_active": True},
            )
            out[obj.name] = obj
        self.stdout.write(self.style.SUCCESS(f"  {len(out)} DRM policies ready."))
        return out
    # ------------------------------------------------------------------
    # Reference data loading
    # ------------------------------------------------------------------
    def _load_reference_data(self):
        data_path = Path(__file__).resolve().parents[3] / "scripts" / "organization_data.json"
        content = data_path.read_text()
        lines = content.split("\n")
        cleaned = []
        for line in lines:
            stripped = line.strip()
            if re.match(r"^[A-Z][A-Z\s&()]+$", stripped) and not any(
                c in stripped for c in ["{", "}", "[", "]", '"', ",", ":"]
            ):
                continue
            cleaned.append(line)
        cleaned_content = "\n".join(cleaned)
        if not cleaned_content.strip().startswith("{"):
            cleaned_content = "{" + cleaned_content
        self.structure = json.loads(cleaned_content)

    # ------------------------------------------------------------------
    # Clean existing scenario data
    # ------------------------------------------------------------------
    def _clean_existing(self):
        self.stdout.write("Removing existing SecureNet scenario data…")
        for ref in [
            "NPA/CORR/2025/SECURENET-001",
            "NPA/CORR/2025/SECURENET-002",
            "NPA/PROC/2025/SECURENET",
        ]:
            Correspondence.objects.filter(reference_number=ref).delete()
        for ref in [
            "NPA/DMS/TECHEVAL/2025/001",
            "NPA/DMS/AWARD/2025/001",
            "NPA/ICT/DIAG/2026/003",
            "NPA/ICT/COMP/2026/008",
            "SNT/INV/2026/044",
        ]:
            Document.objects.filter(reference_number=ref).delete()
        Case.objects.filter(case_number="NPA/PROC/2025/SECURENET").delete()
        self.stdout.write(self.style.WARNING("Cleanup complete."))

    # ------------------------------------------------------------------
    # Org units (reuse existing)
    # ------------------------------------------------------------------
    def _ensure_org_units(self):
        self.stdout.write("Resolving organisation units…")
        self.dir_md = Directorate.objects.get(code="MD")
        self.dir_edets = Directorate.objects.get(code="EDETS")
        self.dir_edfa = Directorate.objects.get(code="EDFA")
        self.div_ict = Division.objects.get(code="ICT")
        self.div_procurement = Division.objects.get(code="PROCUREMENT")
        self.div_legal = Division.objects.get(code="LEGAL")
        self.dept_software = Department.objects.get(code="ICT_SOFTWARE")
        self.dept_networks = Department.objects.get(code="ICT_NETWORKS")
        self.stdout.write(self.style.SUCCESS("  Organisation units resolved."))

    # ------------------------------------------------------------------
    # Users
    # ------------------------------------------------------------------
    def _ensure_users(self):
        self.stdout.write("Resolving users…")
        alias = {
            "user-md": "md",
            "user-ed-fa": "edfa",
            "user-ed-mo": "edmo",
            "user-ed-ets": "edets",
            "user-gm-ict": "gmict",
            "user-pa-md": "pamd",
            "user-agm-software": "agmsoftware",
            "user-agm-infra": "agminfra",
            "user-agm-networks": "agmnetworks",
            "user-gm-procurement": "gmprocurement",
            "user-gm-finance": "gmfinance",
            "user-gm-legal": "gmlegal",
            "user-gm-audit": "gmaudit",
            "user-sm-hr": "smhr",
            "user-sm-finance": "smfinance",
            "user-agm-ports-eng": "agmportseng",
        }
        for entry in self.structure.get("MOCK_USERS", []):
            src_key = entry.get("id") or entry.get("username")
            if not src_key:
                continue
            username = alias.get(src_key, src_key)
            user = User.objects.filter(username=username).first()
            if not user:
                user = User.objects.create_user(
                    username=username,
                    email=entry.get("email", f"{username}@npa.gov.ng"),
                    password="ChangeMe123!",
                    first_name=(entry.get("name") or "").split()[0] if entry.get("name") else username,
                    last_name=" ".join((entry.get("name") or "").split()[1:]) if entry.get("name") else "",
                )
            setattr(self, username.replace("-", "_"), user)

        # Fallback: users created by main seed but not in MOCK_USERS
        for fallback_key, fallback_username in [("pamd", "pamd")]:
            if not hasattr(self, fallback_key):
                fallback_user = User.objects.filter(username=fallback_username).first()
                if fallback_user:
                    setattr(self, fallback_key, fallback_user)

        self.md = getattr(self, "md")
        self.edets = getattr(self, "edets")
        self.edfa = getattr(self, "edfa")
        self.gmict = getattr(self, "gmict")
        self.pamd = getattr(self, "pamd")
        self.agmsoftware = getattr(self, "agmsoftware")
        self.gmprocurement = getattr(self, "gmprocurement")
        self.gmfinance = getattr(self, "gmfinance")
        self.gmlegal = getattr(self, "gmlegal")
        self.gmaudit = getattr(self, "gmaudit")

        self.stdout.write(
            self.style.SUCCESS(f"  Users resolved: MD={self.md}, EDETS={self.edets}, GMICT={self.gmict}, …")
        )

    # ------------------------------------------------------------------
    # Offices
    # ------------------------------------------------------------------
    def _ensure_offices(self):
        self.office_md = Office.objects.get(code="OFF_MD")
        self.office_edets = Office.objects.get(code="OFF_DIR_EDETS")
        self.office_gm_ict = Office.objects.get(code="OFF_DIV_ICT")
        self.office_agm_software = Office.objects.get(code="OFF_DEPT_ICT_SOFTWARE")
        self.office_gm_procurement = Office.objects.get(code="OFF_DIV_PROCUREMENT")
        self.stdout.write(self.style.SUCCESS("  Offices resolved."))

    # ------------------------------------------------------------------
    # Delegations
    # ------------------------------------------------------------------
    def _ensure_delegations(self):
        from correspondence.models import Delegation
        Delegation.objects.get_or_create(
            principal=self.md,
            assistant=self.pamd,
            defaults={"can_approve": True, "can_minute": True, "can_forward": True, "active": True},
        )
        self.stdout.write(self.style.SUCCESS("  Delegation: MD → PA created."))

    # ------------------------------------------------------------------
    # External entity (vendor)
    # ------------------------------------------------------------------
    def _ensure_external_entity(self):
        from correspondence.models import ExternalEntity
        self.securenet, _ = ExternalEntity.objects.update_or_create(
            name="SecureNet Technologies Limited",
            defaults={
                "acronym": "SECURENET",
                "entity_type": ExternalEntity.EntityType.COMPANY,
                "contact_email": "info@securenet.ng",
                "contact_phone": "+234-1-271-6000",
                "address": "42, Awolowo Road, Ikoyi, Lagos",
                "is_active": True,
            },
        )
        self.stdout.write(self.style.SUCCESS(f"  External entity: {self.securenet}"))

    # ------------------------------------------------------------------
    # Main scenario builder
    # ------------------------------------------------------------------
    def _build_scenario(self):
        self.stdout.write(self.style.MIGRATE_HEADING("\nBuilding SecureNet scenario…"))

        # ── Step 1: Inward Correspondence ──────────────────────────
        corr_securenet, _ = Correspondence.objects.update_or_create(
            reference_number="NPA/CORR/2025/SECURENET-001",
            defaults={
                "subject": "Proposal for Procurement of Network Infrastructure Upgrade for Lagos Port Complex",
                "body_html": """
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
    <h2 style="text-align: center; color: #1a3a5c;">PROPOSAL FOR NETWORK INFRASTRUCTURE UPGRADE</h2>
    <p style="text-align: center; color: #666;">Lagos Port Complex — Apapa, Lagos</p>
    <hr style="margin: 30px 0;">

    <p><strong>Date:</strong> {prop_date}</p>
    <p><strong>To:</strong> The Managing Director, Nigerian Ports Authority</p>
    <p><strong>From:</strong> SecureNet Technologies Limited</p>

    <p style="margin-top: 20px; line-height: 1.6;">
        Dear Dr. Dantsoho,
    </p>

    <p style="line-height: 1.6;">
        We are pleased to submit our proposal for the comprehensive upgrade of network infrastructure
        at the Lagos Port Complex. This proposal addresses the critical need for modernisation of
        the port's communication and data infrastructure to support the Authority's digital
        transformation agenda.
    </p>

    <h3 style="margin-top: 30px; color: #1a3a5c;">Executive Summary</h3>
    <p style="line-height: 1.6;">
        The current network infrastructure at Lagos Port Complex is operating beyond its designed
        capacity, resulting in latency issues, intermittent connectivity, and security vulnerabilities.
        Our proposed upgrade encompasses:
    </p>
    <ul style="line-height: 1.8;">
        <li>Deployment of gigabit-capable fibre optic backbone across the port complex</li>
        <li>Implementation of next-generation firewall and intrusion detection systems</li>
        <li>Upgrade of wireless access points to Wi-Fi 6 standard</li>
        <li>Centralised network management and monitoring platform</li>
        <li>Redundant failover architecture for critical systems</li>
        <li>Comprehensive cybersecurity framework alignment with NIST standards</li>
    </ul>

    <h3 style="margin-top: 30px; color: #1a3a5c;">Proposed Budget</h3>
    <div style="background: #f0f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 2px solid #c0d0e0;">
                <th style="text-align: left; padding: 8px;">Item</th>
                <th style="text-align: right; padding: 8px;">Amount (₦)</th>
            </tr>
            <tr><td style="padding: 8px;">Fibre Optic Backbone Installation</td><td style="text-align: right; padding: 8px;">850,000,000.00</td></tr>
            <tr><td style="padding: 8px;">Network Security Infrastructure</td><td style="text-align: right; padding: 8px;">420,000,000.00</td></tr>
            <tr><td style="padding: 8px;">Wireless Access Points &amp; Controllers</td><td style="text-align: right; padding: 8px;">180,000,000.00</td></tr>
            <tr><td style="padding: 8px;">Network Management Platform</td><td style="text-align: right; padding: 8px;">95,000,000.00</td></tr>
            <tr><td style="padding: 8px;">Installation &amp; Commissioning</td><td style="text-align: right; padding: 8px;">250,000,000.00</td></tr>
            <tr><td style="padding: 8px;">Training &amp; Handover</td><td style="text-align: right; padding: 8px;">45,000,000.00</td></tr>
            <tr style="border-top: 2px solid #1a3a5c; font-weight: bold;">
                <td style="padding: 8px;">TOTAL</td><td style="text-align: right; padding: 8px;">1,840,000,000.00</td>
            </tr>
        </table>
    </div>

    <h3 style="margin-top: 30px; color: #1a3a5c;">Timeline</h3>
    <p style="line-height: 1.6;">
        The project is estimated to be completed within <strong>18 months</strong> from the date
        of contract award, subject to timely site access and deployment conditions.
    </p>

    <p style="margin-top: 30px; line-height: 1.6;">
        We look forward to the opportunity to partner with the Nigerian Ports Authority in this
        transformative initiative.
    </p>

    <p style="margin-top: 40px;">
        Yours faithfully,<br><br>
        <strong>Adebayo Ogunlesi</strong><br>
        Executive Director, SecureNet Technologies Ltd
    </p>
</div>
""".format(prop_date=(TODAY - timedelta(days=45)).strftime("%B %d, %Y")),
                "source": Correspondence.Source.EXTERNAL,
                "priority": Correspondence.Priority.HIGH,
                "direction": Correspondence.Direction.UPWARD,
                "status": Correspondence.Status.COMPLETED,
                "document_type": Correspondence.DocumentType.REQUEST,
                "division": self.div_ict,
                "department": self.dept_networks,
                "tags": ["network", "infrastructure", "lagos-port", "securenet", "proposal"],
                "sender_name": "Adebayo Ogunlesi",
                "sender_organization": "SecureNet Technologies Ltd",
                "sender_reference": "SN/LAG/2025/001",
                "recipient_name": "Dr. Abubakar Dantsoho",
                "letter_date": TODAY - timedelta(days=45),
                "received_date": TODAY - timedelta(days=44),
                "owning_office": self.office_md,
                "current_office": self.office_md,
                "created_by": self.pamd,
                "current_approver": self.md,
                "completed_at": NOW - timedelta(days=5),
                "has_physical_copy": True,
                "remarks": "Hardcopy received and scanned. Physical file tracked in registry.",
            },
        )
        self.stdout.write(f"  1. Inward correspondence: {corr_securenet.reference_number}")

        # Attachments (fuller PDFs for MD presentation preview)
        proposal_url, proposal_size = self._write_demo_pdf(
            "demo/presentation/SecureNet-Proposal-Network-Upgrade-Lagos-Port.pdf",
            "Network Infrastructure Upgrade Proposal",
            subtitle="Lagos Port Complex · Submitted by SecureNet Technologies Ltd · Ref: SNT/PROP/2025/LPC-01",
            sections=[
                (
                    "1. Executive Summary",
                    [
                        "SecureNet Technologies Ltd proposes a structured upgrade of the Lagos Port Complex "
                        "network infrastructure covering core, distribution, and access layers. The solution "
                        "improves resilience, throughput, and manageability in line with NPA ICT standards.",
                        "Estimated commercial envelope: ₦1.84 billion (exclusive of VAT), with phased delivery "
                        "over twenty-six (26) weeks from contract effectiveness.",
                    ],
                ),
                (
                    "2. Scope of Work",
                    [
                        "• Core layer — dual redundant aggregation switches and backbone fibre refresh",
                        "• Distribution layer — campus distribution switches for terminal and admin blocks",
                        "• Access layer — edge switching for operations, CCTV, and office LAN segments",
                        "• Security — next-generation firewalls, segmentation, and monitoring integration",
                        "• Services — design, supply, installation, testing, training, and handover",
                    ],
                ),
                (
                    "3. Technical Approach",
                    [
                        "The design follows a hierarchical campus model with clear failure domains. Existing "
                        "fibre pathways are reused where viable; new runs are proposed only for capacity gaps "
                        "identified during the site survey. Management plane integration with NPA NOC tools "
                        "is included under the operations acceptance criteria.",
                    ],
                ),
                (
                    "4. Delivery & Acceptance",
                    [
                        "Milestones: (i) detailed design approval, (ii) equipment delivery, (iii) installation "
                        "and cutover windows, (iv) UAT and training, (v) final acceptance. All works are subject "
                        "to NPA ICT supervision and security clearance for port access.",
                    ],
                ),
                (
                    "5. Commercial Offer",
                    [
                        "Validity: 90 days from submission date. Payment terms: as per NPA procurement policy. "
                        "Warranty: 36 months on active equipment; 12 months on installation workmanship.",
                    ],
                ),
            ],
        )
        CorrespondenceAttachment.objects.update_or_create(
            correspondence=corr_securenet,
            file_name="SecureNet-Proposal-Network-Upgrade-Lagos-Port.pdf",
            defaults={
                "file_type": "application/pdf",
                "file_size": proposal_size,
                "file_url": proposal_url,
            },
        )
        profile_url, profile_size = self._write_demo_pdf(
            "demo/presentation/SecureNet-Company-Profile-2025.pdf",
            "SecureNet Technologies Ltd — Company Profile 2025",
            subtitle="Corporate overview · Network & security systems integrator · Lagos, Nigeria",
            sections=[
                (
                    "About SecureNet",
                    [
                        "SecureNet Technologies Ltd is a Nigerian ICT infrastructure company specialising in "
                        "enterprise and industrial networking, cybersecurity, and managed connectivity for "
                        "public-sector and critical-infrastructure clients.",
                        "Registered office: 42, Awolowo Road, Ikoyi, Lagos. Primary contact for this engagement: "
                        "Adebayo Ogunlesi, Business Development Director.",
                    ],
                ),
                (
                    "Capabilities",
                    [
                        "• Campus and data-centre networking (switching, routing, wireless)",
                        "• Network security (NGFW, segmentation, SOC integration)",
                        "• Structured cabling and fibre backbone delivery",
                        "• Design, implementation, and lifecycle support",
                    ],
                ),
                (
                    "Selected Experience",
                    [
                        "Recent relevant works include port-terminal LAN upgrades, multi-site WAN refresh for "
                        "government agencies, and secure segmentation projects for operational technology "
                        "environments. Project teams are cleared for controlled-site mobilisation where required.",
                    ],
                ),
                (
                    "Quality & Compliance",
                    [
                        "Delivery follows documented design-control and change-management procedures. Equipment "
                        "is sourced from approved OEMs with local warranty support. HSE and site-access "
                        "requirements for port operations are observed on all mobilisations.",
                    ],
                ),
            ],
        )
        CorrespondenceAttachment.objects.update_or_create(
            correspondence=corr_securenet,
            file_name="SecureNet-Company-Profile-2025.pdf",
            defaults={
                "file_type": "application/pdf",
                "file_size": profile_size,
                "file_url": profile_url,
            },
        )

        # Distribution: inform Procurement and Finance
        dist_data = [
            (CorrespondenceDistribution.RecipientType.DIVISION, self.div_procurement, "For Information"),
            (CorrespondenceDistribution.RecipientType.DIVISION, self.div_legal, "For Information"),
        ]
        for rtype, recipient, purpose in dist_data:
            CorrespondenceDistribution.objects.update_or_create(
                correspondence=corr_securenet,
                recipient_type=rtype,
                division=recipient,
                defaults={
                    "purpose": CorrespondenceDistribution.Purpose.INFORMATION,
                    "added_by": self.pamd,
                },
            )

        self._create_minute(
            corr_securenet, self.md, self.edets, "approval",
            "Please evaluate the attached proposal from SecureNet Technologies Ltd regarding network "
            "infrastructure upgrade for Lagos Port Complex. Conduct a thorough technical and financial "
            "assessment and revert with your recommendation within 7 working days.",
            step=1, direction=Minute.Direction.DOWNWARD,
            purpose="action",
        )

        # ── Step 2: ED E&TS → GM ICT ──────────────────────────────
        self._create_minute(
            corr_securenet, self.edets, self.gmict, "forward",
            "GM ICT — kindly conduct a detailed technical evaluation of this proposal. Assess the "
            "proposed solution against our current infrastructure requirements and provide a "
            "comprehensive recommendation. Engage your software and infrastructure teams as needed.",
            step=2, direction=Minute.Direction.DOWNWARD,
            purpose="action",
        )

        # ── Step 3: GM ICT → AGM Software ──────────────────────────
        self._create_minute(
            corr_securenet, self.gmict, self.agmsoftware, "forward",
            "AGM Software — please review the technical aspects of the SecureNet proposal. Evaluate "
            "the proposed architecture, compatibility with our existing systems, and alignment with "
            "our digital transformation roadmap. Provide a detailed technical assessment report.",
            step=3, direction=Minute.Direction.DOWNWARD,
            purpose="action",
        )

        # ── Step 4: AGM Software — Technical Evaluation Report ────
        tech_report_doc, _ = Document.objects.update_or_create(
            reference_number="NPA/DMS/TECHEVAL/2025/001",
            defaults={
                "title": "Technical Evaluation Report — SecureNet Network Infrastructure Proposal",
                "description": "Detailed technical assessment of SecureNet's proposal for Lagos Port network upgrade",
                "document_type": Document.DocumentType.REPORT,
                "status": Document.DocumentStatus.PUBLISHED,
                "sensitivity": Document.Sensitivity.INTERNAL,
                "author": self.agmsoftware,
                "division": self.div_ict,
                "department": self.dept_networks,
                "tags": ["tech-evaluation", "securenet", "network"],
                "drm_policy": self.drm_policies.get("Internal — Download Allowed"),
            },
        )
        DocumentVersion.objects.update_or_create(
            document=tech_report_doc,
            version_number=1,
            defaults={
                "file_name": "Technical-Evaluation-Report-SecureNet-Proposal.html",
                "file_type": "text/html",
                "file_size": 2_097_152,
                "file_url": "",
                "content_html": """
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
    <h1 style="text-align: center; color: #1a3a5c;">TECHNICAL EVALUATION REPORT</h1>
    <p style="text-align: center; color: #666;">
        Proposal: Network Infrastructure Upgrade for Lagos Port Complex<br>
        Vendor: SecureNet Technologies Ltd<br>
        Date: {eval_date}
    </p>

    <h2 style="color: #1a3a5c; margin-top: 30px;">1. Evaluation Summary</h2>
    <p style="line-height: 1.6;">
        The proposal submitted by SecureNet Technologies Ltd has undergone a comprehensive technical
        evaluation by the Software Applications &amp; Database Management Department. The evaluation
        assessed the proposal across six core criteria: architectural compatibility, security posture,
        scalability, vendor capability, implementation methodology, and total cost of ownership.
    </p>

    <h2 style="color: #1a3a5c; margin-top: 30px;">2. Scoring</h2>
    <div style="background: #f0f4f8; padding: 20px; border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 2px solid #c0d0e0;">
                <th style="text-align: left; padding: 8px;">Criterion</th>
                <th style="text-align: center; padding: 8px;">Score (/10)</th>
                <th style="text-align: left; padding: 8px;">Remarks</th>
            </tr>
            <tr><td style="padding: 8px;">Architectural Compatibility</td><td style="text-align: center;">9</td><td>Strong alignment with existing infrastructure</td></tr>
            <tr><td style="padding: 8px;">Security Posture</td><td style="text-align: center;">8</td><td>NIST-compliant, needs minor enhancements</td></tr>
            <tr><td style="padding: 8px;">Scalability</td><td style="text-align: center;">9</td><td>Future-proof design with modular expansion</td></tr>
            <tr><td style="padding: 8px;">Vendor Capability</td><td style="text-align: center;">8</td><td>Proven track record; reference checks positive</td></tr>
            <tr><td style="padding: 8px;">Implementation Methodology</td><td style="text-align: center;">7</td><td>Sound approach; recommended phased rollout</td></tr>
            <tr><td style="padding: 8px;">Total Cost of Ownership</td><td style="text-align: center;">6</td><td>Competitive but within approved budget range</td></tr>
            <tr style="border-top: 2px solid #1a3a5c; font-weight: bold;">
                <td style="padding: 8px;">OVERALL</td><td style="text-align: center;">7.8</td><td>Technically compliant — RECOMMENDED</td>
            </tr>
        </table>
    </div>

    <h2 style="color: #1a3a5c; margin-top: 30px;">3. Recommendation</h2>
    <p style="line-height: 1.6;">
        The proposal is <strong>technically compliant</strong> and is recommended for approval subject
        to the following conditions:
    </p>
    <ol style="line-height: 1.8;">
        <li>Phased implementation to minimise operational disruption</li>
        <li>Enhanced SLAs for critical system uptime (99.9%)</li>
        <li>Quarterly security audits post-deployment</li>
        <li>Knowledge transfer and local capacity building</li>
    </ol>
</div>
""".format(eval_date=(TODAY - timedelta(days=20)).strftime("%B %d, %Y")),
                "content_text": "Technical Evaluation Report - SecureNet Proposal. Overall score: 7.8/10. RECOMMENDED.",
                "summary": "Technical evaluation recommends SecureNet's proposal with conditions",
                "uploaded_by": self.agmsoftware,
            },
        )
        DocumentPermission.objects.update_or_create(
            document=tech_report_doc,
            access=DocumentPermission.AccessLevel.ADMIN,
            defaults={},
        )
        CorrespondenceDocumentLink.objects.update_or_create(
            correspondence=corr_securenet,
            document=tech_report_doc,
            defaults={"notes": "Technical Evaluation Report"},
        )

        # AGM Software minutes up to GM ICT
        self._create_minute(
            corr_securenet, self.agmsoftware, self.gmict, "forward",
            "GM — please find attached the Technical Evaluation Report. SecureNet's proposal scores "
            "7.8/10 overall and is technically compliant. I recommend approval subject to the "
            "conditions outlined in the report. The phased implementation approach is particularly "
            "important to maintain operational continuity at the port.",
            step=4, direction=Minute.Direction.UPWARD,
            purpose="approval",
        )

        # ── Step 5: GM ICT approves → ED E&TS ─────────────────────
        self._create_minute(
            corr_securenet, self.gmict, self.edets, "forward",
            "ED — I have reviewed the technical evaluation conducted by my team. The proposal is "
            "sound and aligns with our digital transformation objectives. I recommend approval with "
            "the conditions specified in the technical evaluation report. The project budget of "
            "₦1,840,000,000 falls within the ICT capital expenditure allocation for this fiscal year.",
            step=5, direction=Minute.Direction.UPWARD,
            purpose="approval",
        )

        # ── Step 6: ED E&TS approves → MD ─────────────────────────
        self._create_minute(
            corr_securenet, self.edets, self.md, "forward",
            "MD — The technical evaluation is positive (score: 7.8/10). GM ICT and his team have "
            "conducted a thorough assessment. I support the recommendation for approval. Kindly "
            "review and give final approval to proceed with the procurement process.",
            step=6, direction=Minute.Direction.UPWARD,
            purpose="approval",
        )

        # ── Step 7: MD final executive approval (with seal) ────────
        md_approve = self._create_minute(
            corr_securenet, self.md, None, Minute.ActionType.APPROVE,
            "Approved. I have reviewed the proposal, the technical evaluation report, and the "
            "recommendations from ED E&TS and GM ICT. The proposal is approved subject to the "
            "conditions outlined. Well-done to all teams involved.",
            step=7, direction=Minute.Direction.DOWNWARD,
            purpose="approval",
        )
        self._apply_executive_seal(md_approve, corr_securenet)

        # ── Step 8–9: MD action-to ED E&TS and GM Procurement ─────
        # Real routing recipients (to_user / to_office), not prose-only mentions.
        self._create_minute(
            corr_securenet, self.md, self.edets, Minute.ActionType.MINUTE,
            "ED E&TS — please proceed with the formal procurement process for the approved "
            "SecureNet network infrastructure upgrade. Coordinate with GM Procurement on "
            "tender/award formalities and keep this office informed of progress.",
            step=8, direction=Minute.Direction.DOWNWARD,
            purpose="action",
        )
        self._create_minute(
            corr_securenet, self.md, self.gmprocurement, Minute.ActionType.MINUTE,
            "GM Procurement — take lead on the formal procurement process for the approved "
            "SecureNet Lagos Port network upgrade. Work with ED E&TS on technical requirements "
            "and proceed to award/contract documentation.",
            step=9, direction=Minute.Direction.DOWNWARD,
            purpose="action",
        )

        # Mark inward correspondence as completed after action routing
        corr_securenet.status = Correspondence.Status.COMPLETED
        corr_securenet.completed_at = NOW - timedelta(days=8)
        corr_securenet.current_office = self.office_gm_procurement
        corr_securenet.current_approver = self.gmprocurement
        corr_securenet.save(
            update_fields=["status", "completed_at", "current_office", "current_approver"]
        )

        # ── Step 8: Outward Correspondence (Award Letter) ──────────
        award_letter, _ = Document.objects.update_or_create(
            reference_number="NPA/DMS/AWARD/2025/001",
            defaults={
                "title": "Letter of Award — Network Infrastructure Upgrade for Lagos Port Complex",
                "description": "Official letter of award to SecureNet Technologies Ltd",
                "document_type": Document.DocumentType.LETTER,
                "status": Document.DocumentStatus.PUBLISHED,
                "sensitivity": Document.Sensitivity.CONFIDENTIAL,
                "author": self.gmict,
                "division": self.div_ict,
                "department": self.dept_networks,
                "tags": ["award", "securenet", "network"],
                "drm_policy": self.drm_policies.get("Strictly Confidential — Time-Limited")
                or self.drm_policies.get("Confidential — View Only"),
            },
        )
        DocumentVersion.objects.update_or_create(
            document=award_letter,
            version_number=1,
            defaults={
                "file_name": "Letter-of-Award-SecureNet-Network-Upgrade.html",
                "file_type": "text/html",
                "file_size": 1_048_576,
                "file_url": "",
                "content_html": """
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
    <h1 style="text-align: center; color: #1a3a5c;">LETTER OF AWARD</h1>
    <p style="text-align: center; color: #666;">Reference: NPA/PROC/2025/SECURENET</p>
    <hr style="margin: 30px 0;">

    <p><strong>Date:</strong> {award_date}</p>

    <p><strong>To:</strong><br>
    SecureNet Technologies Ltd<br>
    42, Awolowo Road, Ikoyi, Lagos</p>

    <p style="margin-top: 30px; line-height: 1.6;">
        Dear Sir,
    </p>

    <p style="line-height: 1.6;">
        <strong>RE: AWARD OF CONTRACT FOR NETWORK INFRASTRUCTURE UPGRADE<br>
        LAGOS PORT COMPLEX — APAPA</strong>
    </p>

    <p style="margin-top: 20px; line-height: 1.6;">
        Following the evaluation of your proposal and the approval of the Nigerian Ports Authority,
        I am pleased to inform you that your company has been awarded the contract for the above
        referenced project.
    </p>

    <div style="background: #f0f4f8; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <h3 style="margin-top: 0; color: #1a3a5c;">Contract Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 6px;"><strong>Project:</strong></td><td>Network Infrastructure Upgrade, Lagos Port Complex</td></tr>
            <tr><td style="padding: 6px;"><strong>Contract Value:</strong></td><td>₦1,840,000,000.00</td></tr>
            <tr><td style="padding: 6px;"><strong>Duration:</strong></td><td>18 Months</td></tr>
            <tr><td style="padding: 6px;"><strong>Implementation:</strong></td><td>Phased (4 phases)</td></tr>
        </table>
    </div>

    <h3 style="color: #1a3a5c;">Conditions Precedent</h3>
    <ol style="line-height: 1.8;">
        <li>Acceptance of award within 14 days of receipt</li>
        <li>Submission of performance bond (10% of contract value)</li>
        <li>Signing of formal contract agreement within 30 days</li>
        <li>Compliance with all NPA safety and security protocols</li>
        <li>Quarterly progress reporting to the Project Steering Committee</li>
    </ol>

    <p style="margin-top: 40px; line-height: 1.6;">
        Please sign and return the attached duplicate of this letter as acknowledgment of your
        acceptance of the award.
    </p>

    <p style="margin-top: 40px;">
        Yours faithfully,<br><br>
        <strong>Dr. Abubakar Dantsoho</strong><br>
        Managing Director<br>
        Nigerian Ports Authority
    </p>
</div>
""".format(award_date=(TODAY - timedelta(days=7)).strftime("%B %d, %Y")),
                "content_text": "Letter of Award for Network Infrastructure Upgrade at Lagos Port Complex to SecureNet Technologies Ltd.",
                "summary": "Official award letter for SecureNet network upgrade contract",
                "uploaded_by": self.gmict,
            },
        )
        DocumentPermission.objects.update_or_create(
            document=award_letter,
            access=DocumentPermission.AccessLevel.ADMIN,
            defaults={},
        )

        # Outward correspondence
        corr_outward, _ = Correspondence.objects.update_or_create(
            reference_number="NPA/CORR/2025/SECURENET-002",
            defaults={
                "subject": "Letter of Award — Network Infrastructure Upgrade for Lagos Port Complex",
                "body_html": "<p>Letter of Award dispatched to SecureNet Technologies Ltd.</p>",
                "source": Correspondence.Source.INTERNAL,
                "priority": Correspondence.Priority.HIGH,
                "direction": Correspondence.Direction.DOWNWARD,
                "status": Correspondence.Status.DISPATCHED,
                "document_type": Correspondence.DocumentType.LETTER,
                "division": self.div_ict,
                "department": self.dept_networks,
                "tags": ["award", "outward", "securenet", "dispatch"],
                "recipient_name": "SecureNet Technologies Ltd",
                "sender_name": "Dr. Abubakar Dantsoho",
                "letter_date": TODAY - timedelta(days=7),
                "received_date": TODAY - timedelta(days=7),
                "dispatch_date": TODAY - timedelta(days=6),
                "owning_office": self.office_md,
                "current_office": self.office_md,
                "created_by": self.gmict,
                "completed_at": NOW - timedelta(days=6),
            },
        )
        self.stdout.write(f"  8. Outward correspondence: {corr_outward.reference_number}")

        CorrespondenceDocumentLink.objects.update_or_create(
            correspondence=corr_outward,
            document=award_letter,
            defaults={"notes": "Award letter"},
        )

        # Dispatch record
        DispatchRecord.objects.update_or_create(
            correspondence=corr_outward,
            tracking_number="NPA/DISP/2025/001",
            defaults={
                "dispatch_mode": DispatchRecord.DispatchMode.COURIER,
                "dispatched_date": TODAY - timedelta(days=6),
                "dispatched_by": self.pamd,
                "courier_name": "DHL Nigeria",
                "recipient_name": "Adebayo Ogunlesi, SecureNet Technologies Ltd",
                "recipient_address": "42, Awolowo Road, Ikoyi, Lagos",
                "acknowledged_date": TODAY - timedelta(days=4),
                "notes": "Dispatched via DHL express service. Tracking: DHL-NG-7842-1",
            },
        )

        self.stdout.write(self.style.SUCCESS("  SecureNet scenario built."))

        # DRM demo docs: architecture (view-only), completion, invoice
        architecture_doc, _ = Document.objects.update_or_create(
            reference_number="NPA/ICT/DIAG/2026/003",
            defaults={
                "title": "Proposed Architecture Diagram – Lagos Port Network Upgrade",
                "description": "Sensitive architecture overview. DRM view-only for MD presentation.",
                "document_type": Document.DocumentType.REPORT,
                "status": Document.DocumentStatus.PUBLISHED,
                "sensitivity": Document.Sensitivity.CONFIDENTIAL,
                "author": self.agmsoftware,
                "division": self.div_ict,
                "department": self.dept_networks,
                "tags": ["architecture", "lagos-port", "confidential", "drm"],
                "drm_policy": self.drm_policies.get("Confidential — View Only"),
            },
        )
        arch_url, arch_size = self._write_demo_pdf(
            "demo/presentation/Proposed_Architecture_Diagram.pdf",
            "Proposed Architecture Diagram – Lagos Port Network Upgrade",
            subtitle="CONFIDENTIAL · DRM View Only · SecureNet / NPA ICT",
            sections=[
                (
                    "Architecture Overview",
                    [
                        "This diagram summarises the proposed hierarchical design for Lagos Port Complex: "
                        "Core · Distribution · Access. It is issued under Confidential — View Only DRM for "
                        "executive review.",
                    ],
                ),
                (
                    "Core Layer",
                    [
                        "• Dual redundant core/aggregation switches in the primary ICT room",
                        "• Diverse fibre uplinks to distribution blocks",
                        "• Centralised policy and telemetry for NOC visibility",
                    ],
                ),
                (
                    "Distribution & Access",
                    [
                        "• Distribution switches serving terminal, admin, and operations campuses",
                        "• Access switches for office LAN, CCTV, and industrial edge segments",
                        "• Firewall and segmentation boundaries between corporate and OT zones",
                    ],
                ),
                (
                    "Notes for Reviewers",
                    [
                        "Vendor: SecureNet Technologies Ltd. Design is subject to detailed survey and NPA ICT "
                        "acceptance. Do not redistribute outside authorised NPA recipients.",
                    ],
                ),
            ],
        )
        DocumentVersion.objects.update_or_create(
            document=architecture_doc,
            version_number=1,
            defaults={
                "file_name": "Proposed_Architecture_Diagram.pdf",
                "file_type": "application/pdf",
                "file_size": arch_size,
                "file_url": arch_url,
                "content_html": "",
                "content_text": "Proposed Architecture Diagram - Lagos Port. CONFIDENTIAL.",
                "summary": "Architecture diagram under Confidential View Only DRM",
                "uploaded_by": self.agmsoftware,
            },
        )
        CorrespondenceDocumentLink.objects.update_or_create(
            correspondence=corr_securenet,
            document=architecture_doc,
            defaults={"notes": "Architecture diagram (DRM view-only)"},
        )
        CorrespondenceDocumentLink.objects.update_or_create(
            correspondence=corr_securenet,
            document=tech_report_doc,
            defaults={"notes": "Technical evaluation report"},
        )

        completion_doc, _ = Document.objects.update_or_create(
            reference_number="NPA/ICT/COMP/2026/008",
            defaults={
                "title": "Job Completion Report – Lagos Port Network Upgrade",
                "description": "Vendor completion report acknowledged by ICT.",
                "document_type": Document.DocumentType.REPORT,
                "status": Document.DocumentStatus.PUBLISHED,
                "sensitivity": Document.Sensitivity.INTERNAL,
                "author": self.gmict,
                "division": self.div_ict,
                "department": self.dept_networks,
                "tags": ["completion", "lagos-port"],
                "drm_policy": self.drm_policies.get("Internal — Download Allowed"),
            },
        )
        completion_url, completion_size = self._write_demo_pdf(
            "demo/presentation/Job_Completion_Report_Lagos_Network.pdf",
            "Job Completion Report – Lagos Port Network Upgrade",
            subtitle="Internal use · Download permitted · Watermark: INTERNAL USE ONLY",
            sections=[
                (
                    "Project Summary",
                    [
                        "Network Infrastructure Upgrade – Lagos Port Complex has been completed in accordance "
                        "with the approved design and award letter. Works were supervised by ICT (Networks & "
                        "Communication) with SecureNet Technologies Ltd as the implementing vendor.",
                    ],
                ),
                (
                    "Deliverables Accepted",
                    [
                        "• Core and distribution switching installed and commissioned",
                        "• Access-layer cutovers completed for scoped buildings",
                        "• Security appliances integrated and handed over to operations",
                        "• As-built documentation and training records filed",
                    ],
                ),
                (
                    "Acceptance",
                    [
                        "User Department (ICT) confirms practical completion. Outstanding snags, if any, are "
                        "tracked under the warranty period. Linked invoice SNT/INV/2026/044 supports payment "
                        "processing subject to finance clearance.",
                    ],
                ),
            ],
        )
        DocumentVersion.objects.update_or_create(
            document=completion_doc,
            version_number=1,
            defaults={
                "file_name": "Job_Completion_Report_Lagos_Network.pdf",
                "file_type": "application/pdf",
                "file_size": completion_size,
                "file_url": completion_url,
                "content_html": "",
                "content_text": "Job Completion Report - Lagos Port Network Upgrade.",
                "summary": "Completion report for SecureNet Lagos Port project",
                "uploaded_by": self.gmict,
            },
        )

        invoice_doc, _ = Document.objects.update_or_create(
            reference_number="SNT/INV/2026/044",
            defaults={
                "title": "Invoice – SecureNet Network Infrastructure Upgrade",
                "description": "Invoice linked to award and completion evidence.",
                "document_type": Document.DocumentType.OTHER,
                "status": Document.DocumentStatus.PUBLISHED,
                "sensitivity": Document.Sensitivity.CONFIDENTIAL,
                "author": self.gmict,
                "division": self.div_ict,
                "department": self.dept_networks,
                "tags": ["invoice", "securenet", "finance"],
                "drm_policy": self.drm_policies.get("Strictly Confidential — Time-Limited")
                or self.drm_policies.get("Confidential — View Only"),
            },
        )
        DocumentVersion.objects.update_or_create(
            document=invoice_doc,
            version_number=1,
            defaults={
                "file_name": "SNT_INV_2026_044.pdf",
                "file_type": "text/html",
                "file_size": 2048,
                "file_url": "",
                "content_html": (
                    "<h1>INVOICE</h1>"
                    "<p>Ref: SNT/INV/2026/044</p>"
                    "<p>Amount: <strong>₦1,840,000,000.00</strong></p>"
                    "<p>Project: Lagos Port Network Infrastructure Upgrade</p>"
                ),
                "content_text": "Invoice SNT/INV/2026/044 for Lagos Port Network Upgrade.",
                "summary": "SecureNet invoice for network upgrade",
                "uploaded_by": self.gmict,
            },
        )

        # Access activity samples for DRM demo
        for doc in (architecture_doc, award_letter):
            if not DocumentAccessLog.objects.filter(
                document=doc, user=self.gmict, action=DocumentAccessLog.AccessAction.VIEW
            ).exists():
                DocumentAccessLog.objects.create(
                    document=doc,
                    user=self.gmict,
                    action=DocumentAccessLog.AccessAction.VIEW,
                    sensitivity=doc.sensitivity,
                )

        return {
            "inward": corr_securenet,
            "outward": corr_outward,
            "tech_report": tech_report_doc,
            "award_letter": award_letter,
            "architecture": architecture_doc,
            "completion": completion_doc,
            "invoice": invoice_doc,
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _write_demo_pdf(
        self,
        relative_path: str,
        title: str,
        lines: list[str] | None = None,
        *,
        subtitle: str = "",
        sections: list[tuple[str, list[str]]] | None = None,
    ) -> tuple[str, int]:
        """Write a presentation-ready multi-section demo PDF; return (/media/…, size)."""
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import inch
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

        buf = BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=letter,
            leftMargin=0.85 * inch,
            rightMargin=0.85 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch,
        )
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "DemoTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            spaceAfter=6,
            textColor="#1a3a5c",
        )
        subtitle_style = ParagraphStyle(
            "DemoSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            textColor="#555555",
            spaceAfter=14,
        )
        heading_style = ParagraphStyle(
            "DemoHeading",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            spaceBefore=12,
            spaceAfter=6,
            textColor="#1a3a5c",
        )
        body_style = ParagraphStyle(
            "DemoBody",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            spaceAfter=6,
        )
        bullet_style = ParagraphStyle(
            "DemoBullet",
            parent=body_style,
            leftIndent=14,
            bulletIndent=0,
            spaceAfter=3,
        )

        story = [Paragraph(title.replace("&", "&amp;"), title_style)]
        if subtitle:
            story.append(Paragraph(subtitle.replace("&", "&amp;"), subtitle_style))
        story.append(Spacer(1, 4))

        if sections:
            for heading, paragraphs in sections:
                story.append(Paragraph(heading.replace("&", "&amp;"), heading_style))
                for para in paragraphs:
                    text = para.replace("&", "&amp;")
                    if text.startswith("• ") or text.startswith("- "):
                        story.append(Paragraph(text, bullet_style))
                    else:
                        story.append(Paragraph(text, body_style))
        else:
            for line in lines or []:
                story.append(Paragraph(line.replace("&", "&amp;"), body_style))

        story.append(Spacer(1, 18))
        story.append(
            Paragraph(
                "<i>NPA ECM presentation demo document — generated for walkthrough.</i>",
                subtitle_style,
            )
        )
        doc.build(story)
        data = buf.getvalue()
        if default_storage.exists(relative_path):
            default_storage.delete(relative_path)
        stored = default_storage.save(relative_path, ContentFile(data))
        return f"/media/{stored}", len(data)

    def _user_office(self, user):
        office_map = {
            self.md: self.office_md,
            self.edets: self.office_edets,
            self.gmict: self.office_gm_ict,
            self.agmsoftware: self.office_agm_software,
            self.gmprocurement: self.office_gm_procurement,
        }
        return office_map.get(user) or (
            Office.objects.filter(division=user.division).first() if user.division else self.office_md
        )

    def _create_minute(
        self, correspondence, user, to_user, action_type, minute_text, *,
        step=1, direction="downward", purpose="action",
    ):
        to_office = self._user_office(to_user) if to_user else None
        defaults = {
            "minute_text": minute_text,
            "action_type": action_type,
            "direction": direction,
            "step_number": step,
            "grade_level": user.grade_level or "",
            "purpose": purpose,
            "requires_response": action_type != Minute.ActionType.APPROVE,
            "to_user": to_user,
            "to_office": to_office,
            "from_office": self._user_office(user),
        }
        minute, _ = Minute.objects.update_or_create(
            correspondence=correspondence,
            user=user,
            step_number=step,
            defaults=defaults,
        )
        return minute

    def _ensure_md_signature(self):
        """Ensure MD has an active executive signature for seal demos."""
        from django.core.files.base import ContentFile
        from accounts.models import ExecutiveSignature

        existing = ExecutiveSignature.objects.filter(user=self.md).first()
        if existing and existing.is_active:
            return existing

        # Minimal transparent PNG (1x1) — enough for seal generation in demos
        png_bytes = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
            b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        signature, _ = ExecutiveSignature.objects.update_or_create(
            user=self.md,
            defaults={
                "original_filename": "md-demo-signature.png",
                "file_hash": "demo",
                "seal_office_name": "NIGERIAN PORTS AUTHORITY",
                "seal_office_title": "OFFICE OF THE MANAGING DIRECTOR",
                "seal_prefix": "NPA-MD",
                "require_2fa": False,
                "is_active": True,
            },
        )
        if not signature.signature_image:
            signature.signature_image.save(
                "md-demo-signature.png",
                ContentFile(png_bytes),
                save=True,
            )
        return signature

    def _apply_executive_seal(self, minute, correspondence):
        """Attach an MD digital seal to an approve minute for executive approvals demo."""
        from accounts.services import SealGenerationService

        if minute.action_type != Minute.ActionType.APPROVE:
            return
        if minute.seal_applied_id:
            return

        try:
            self._ensure_md_signature()
            seal, _ = SealGenerationService.generate_seal(
                user=self.md,
                correspondence=correspondence,
                request=None,
            )
            minute.seal_applied = seal
            minute.save(update_fields=["seal_applied"])
            self.stdout.write(self.style.SUCCESS(f"  MD seal applied: {seal.serial_number}"))
        except Exception as exc:
            self.stdout.write(self.style.WARNING(f"  Could not apply MD seal: {exc}"))

    def _ensure_physical_documents(self, data):
        PhysicalDocument.objects.update_or_create(
            tracking_number="NPA/PHY/2025/SECURENET-001",
            defaults={
                "correspondence": data["inward"],
                "document": data["tech_report"],
                "status": PhysicalDocument.Status.FILED,
                "description": "SecureNet Proposal — Network Infrastructure Upgrade (Physical File)",
                "location": None,
            },
        )
        self.stdout.write(self.style.SUCCESS("  Physical document created."))

    def _ensure_case(self, data):
        case, _ = Case.objects.update_or_create(
            case_number="NPA/PROC/2025/SECURENET",
            defaults={
                "title": "Procurement — Network Infrastructure Upgrade (Lagos Port Complex)",
                "description": (
                    "End-to-end procurement case for network infrastructure upgrade at Lagos Port "
                    "Complex. Vendor: SecureNet Technologies Ltd. Contract Value: ₦1,840,000,000.00."
                ),
                "case_type": Case.CaseType.PROJECT,
                "status": Case.Status.IN_PROGRESS,
                "division": self.div_ict,
                "department": self.dept_networks,
                "owning_office": self.office_edets,
                "current_office": self.office_gm_ict,
                "created_by": self.gmict,
                "assigned_to": self.agmsoftware,
                "tags": ["network", "infrastructure", "lagos-port", "securenet", "procurement"],
                "metadata": {
                    "vendor": "SecureNet Technologies Ltd",
                    "contract_value": 1840000000,
                    "duration_months": 18,
                    "project_type": "network_infrastructure",
                    "approval_date": (TODAY - timedelta(days=8)).isoformat(),
                },
            },
        )
        CaseCorrespondenceLink.objects.get_or_create(case=case, correspondence=data["inward"])
        CaseCorrespondenceLink.objects.get_or_create(case=case, correspondence=data["outward"])
        for key, notes in (
            ("tech_report", "Technical evaluation"),
            ("award_letter", "Award letter"),
            ("architecture", "Architecture diagram (DRM view-only)"),
            ("completion", "Completion report"),
            ("invoice", "Invoice"),
        ):
            doc = data.get(key)
            if doc:
                CaseDocumentLink.objects.update_or_create(
                    case=case,
                    document=doc,
                    defaults={"notes": notes},
                )
        CaseComment.objects.get_or_create(
            case=case,
            author=self.gmict,
            content=(
                "Technical evaluation accepted. Architecture diagram protected with Confidential "
                "View Only DRM. Award letter issued; invoice and completion evidence linked."
            ),
        )
        self.stdout.write(self.style.SUCCESS(f"  Case: {case.case_number}"))

    def _ensure_workflow_tasks(self, data):
        template = WorkflowTemplate.objects.filter(slug="md-directorate-approval").first()
        if not template:
            self.stdout.write(self.style.WARNING("  Workflow template not found — skipping tasks."))
            return
        steps = list(template.steps.order_by("order"))
        if not steps:
            return

        task_map = {
            "agm_software": (steps[0], self.agmsoftware),
            "gm_ict": (steps[1], self.gmict) if len(steps) > 1 else None,
            "md": (steps[-1], self.md) if steps else None,
        }

        tasks_created = 0
        for step, assignee in task_map.values():
            if step and assignee:
                task, created = ApprovalTask.objects.update_or_create(
                    template=template,
                    step=step,
                    correspondence=data["inward"],
                    assignee=assignee,
                    defaults={
                        "status": ApprovalTask.Status.COMPLETED,
                        "remarks": "Approved — proceed with procurement",
                    },
                )
                TaskAction.objects.update_or_create(
                    task=task,
                    action=TaskAction.Action.COMPLETED,
                    defaults={
                        "actor": assignee,
                        "notes": f"Step completed by {assignee.get_full_name() or assignee.username}",
                    },
                )
                tasks_created += 1

        self.stdout.write(self.style.SUCCESS(f"  Workflow tasks: {tasks_created} completed."))
