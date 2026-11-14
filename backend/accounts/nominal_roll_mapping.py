"""Deterministic role and office mapping rules for the NPA nominal roll.

The roll provides grade and designation, not a system role or office. These
rules map the authoritative grade bands to roles and use high-confidence unit
keywords in the designation to choose an office. Anything without a confident
unit mapping is left as a review exception.
"""

from __future__ import annotations

import re

ROLE_BY_GRADE = {
    "MDCS": "Managing Director",
    "EDCS": "Executive Director",
    "MSS1": "General Manager",
    "MSS2": "Assistant General Manager",
    "MSS3": "Principal Manager",
    "MSS4": "Senior Manager",
    "MSS5": "Manager",
    "SSS1": "Assistant Manager",
    "SSS2": "Senior Officer",
    "SSS3": "Officer I",
    "SSS4": "Officer II",
    "JSS1": "Staff I",
    "JSS2": "Staff II",
    "JSS3": "Staff III",
}

# Ordered most-specific first: (designation regex, division office, department office)
UNIT_RULES: tuple[tuple[str, str | None, str | None], ...] = (
    (r"SYSTEM\s*&\s*ICT", "OFF_DIV_AUDIT", "OFF_DEPT_AUDIT_SYSTEMS"),
    (r"FINANCE\s*&\s*INVESTMENT", "OFF_DIV_AUDIT", "OFF_DEPT_AUDIT_FINANCE"),
    (r"POLICY\s*COMPLIANCE", "OFF_DIV_AUDIT", "OFF_DEPT_AUDIT_POLICY"),
    (r"BIDS?\b", "OFF_DIV_PROCUREMENT", "OFF_DEPT_BMS"),
    (r"COMPLIANCE\s*&\s*RECORDS", "OFF_DIV_PROCUREMENT", "OFF_DEPT_C_R"),
    (r"PROJECTS?\b", "OFF_DIV_PROCUREMENT", "OFF_DEPT_PROJECTS"),
    (r"ACCOUNTS?", "OFF_DIV_FINANCE", "OFF_DEPT_ACCOUNTS"),
    (r"BUDGET", "OFF_DIV_FINANCE", "OFF_DEPT_BUDGET"),
    (r"\bTAX\b", "OFF_DIV_FINANCE", "OFF_DEPT_TAX"),
    (r"LEARNING|TRAINING|L\s*&\s*AD", "OFF_DIV_HR", "OFF_DEPT_HR_LD"),
    (r"PERF(?:ORMANCE)?\s*\.?\s*MGT", "OFF_DIV_HR", "OFF_DEPT_PERFORMANCE"),
    (r"E\s*&\s*LR|E\s*&\s*L\b|LABOUR", "OFF_DIV_HR", "OFF_DEPT_HR_LABOUR"),
    (r"WELFARE", "OFF_DIV_HR", "OFF_DEPT_HR_MGT"),
    (r"HR\s*OPERATIONS|HUMAN\s*RESOURCES|HRO|\bHR\b", "OFF_DIV_HR", "OFF_DEPT_HR_MGT"),
    (r"NETWORKS?\s*&\s*COMMUNICATION|ICT\s*N\s*&\s*C", "OFF_DIV_ICT", "OFF_DEPT_ICT_NETWORKS"),
    (r"SOFTWARE|SYSTEM\s*ANALYST|PROGRAMMER|DATA\s*PROCES", "OFF_DIV_ICT", "OFF_DEPT_ICT_SOFTWARE"),
    (r"NETWORK|RADIO|SIGNAL|TELECOM", "OFF_DIV_ICT", "OFF_DEPT_ICT_NETWORKS"),
    (r"HARDWARE|INFRASTRUCTURE", "OFF_DIV_ICT", "OFF_DEPT_ICT_HARDWARE"),
    (r"RESEARCH\s*&\s*SPECIAL|ICT\s*R\s*&\s*SP", "OFF_DIV_ICT", "OFF_DEPT_ICT_RESEARCH"),
    (r"\bICT\b", "OFF_DIV_ICT", None),
    (r"CIVIL", "OFF_DIV_ENGINEERING", "OFF_DEPT_CIVIL"),
    (r"ELECTRICAL|ELECT\.?|CORROSION", "OFF_DIV_ENGINEERING", "OFF_DEPT_ELECTRICAL"),
    (r"PORTS?\s*ENGINEER", "OFF_DIV_ENGINEERING", "OFF_DEPT_PORTS_ENG"),
    (r"HYDRO|DREDG|CARTOGRAPH", "OFF_DIV_ENGINEERING", "OFF_DEPT_HYDROGRAPHIC"),
    (r"PHYSICAL\s*PLANNING", "OFF_DIV_LANDS_ASSETS", "OFF_DEPT_PPD"),
    (r"LANDS?|ESTATE", "OFF_DIV_LANDS_ASSETS", "OFF_DEPT_LE"),
    (r"QUANTITY|QUTY|ARCHITECT", "OFF_DIV_PROCUREMENT", "OFF_DEPT_PROJECTS"),
    (r"FIRE|RESCUE", "OFF_DIV_HSE", "OFF_DEPT_FIRE_RESCUE"),
    (r"SAFETY", "OFF_DIV_HSE", "OFF_DEPT_SAFETY"),
    (r"ENVIRONMENT|ENVIRONMEMT|POLLUTION", "OFF_DIV_HSE", "OFF_DEPT_ENVIRONMENT"),
    (r"NURSING|NURSE", "OFF_DIV_MEDICAL", "OFF_DEPT_NURSING"),
    (r"PHARMA|PHYMA", "OFF_DIV_MEDICAL", "OFF_DEPT_PHARMACY"),
    (r"RADIOLOG", "OFF_DIV_MEDICAL", "OFF_DEPT_RADIOLOGY"),
    (r"OCCUPATIONAL", "OFF_DIV_MEDICAL", "OFF_DEPT_OCCUPATIONAL"),
    (r"PHYSIOTHERAP|LAB\s*SCIENTIST", "OFF_DIV_MEDICAL", "OFF_DEPT_MEDICAL"),
    (r"MEDICAL|HEALTH", "OFF_DIV_MEDICAL", "OFF_DEPT_MEDICAL"),
    (r"BOARD", "OFF_DIV_LEGAL", "OFF_DEPT_BOARD_SECRETARY"),
    (r"PROTOCOL|EVENTS", "OFF_DIV_CANDSC", "OFF_DEPT_CSC_PEM"),
    (r"CORPORATE\s*SOCIAL|CSR", "OFF_DIV_CANDSC", "OFF_DEPT_CSC_CSR"),
    (r"CORPORATE\s*AFFAIRS", "OFF_DIV_CANDSC", None),
    (r"CORPORATE\s*&\s*STRATEGIC\s*COMMUNICATION|C\s*&\s*SC|COMMUNICATION", "OFF_DIV_CANDSC", None),
    (r"PLANNING\s*&\s*MONITORING", "OFF_DIV_CANDSP", "OFF_DEPT_CSP_PLANNING"),
    (r"RESEARCH\s*&\s*STATISTICS|STATISTIC", "OFF_DIV_CANDSP", "OFF_DEPT_CSP_RESEARCH"),
    (r"CORPORATE\s*&\s*STRATEGIC\s*PLANNING|C\s*&\s*SP|\bPLANNING\b", "OFF_DIV_CANDSP", "OFF_DEPT_CSP_PLANNING"),
    (r"INVESTMENT", "OFF_DIV_SANDI", "OFF_DEPT_INVESTMENT"),
    (r"SUPERANNUATION", "OFF_DIV_SANDI", "OFF_DEPT_SUPERANNUATION"),
    (r"VESSEL", "OFF_DIV_MARINE", "OFF_DEPT_VESSEL"),
    (r"HARBOUR", "OFF_DIV_MARINE", "OFF_DEPT_HARBOURS"),
    (r"AIDS?\s*TO\s*NAV|ATON|VTS", "OFF_DIV_MARINE", "OFF_DEPT_ATONS_VTS"),
    (r"MARINE|MOORING|PILOT|BERTHING|DECK|DOCKYARD|ABLESEAMAN|BEACHMASTER", "OFF_DIV_MARINE", None),
    (r"TARIFF|BILLING|TRAFFIC", "OFF_DIV_TARIFF", "OFF_DEPT_TARIFF"),
    (r"OPERATIONS?|OPERATIONAL", "OFF_DIV_OPERATIONS", "OFF_DEPT_OPERATIONS"),
    (r"SECURITY|PATROL|SUB\s*OFFICER", "OFF_DIV_SECURITY", "OFF_DEPT_SECURITY"),
    (r"AUDIT", "OFF_DIV_AUDIT", None),
    (r"CPPO|PROCUREMENT", "OFF_DIV_PROCUREMENT", None),
    (r"LEGAL", "OFF_DIV_LEGAL", "OFF_DEPT_LEGAL"),
    (r"REGULATORY", "OFF_DIV_REGULATORY", "OFF_DEPT_REGULATORY"),
    (r"SERVICOM", "OFF_DIV_SERVICOM", "OFF_DEPT_SERVICOM"),
    (r"PPP|PUBLIC[-\s]*PRIVATE|NEW[-\s]*BUSINESS", "OFF_DIV_PPP", "OFF_DEPT_PPP"),
    (r"SEAVIEW", "OFF_DIV_SEAVIEW_PROPERTIES", "OFF_DEPT_SEAVIEW"),
    (r"SPECIAL\s*DUTIES", "OFF_DIV_SPECIAL_DUTIES", None),
    (r"ABUJA", "OFF_DIV_ABUJA", "OFF_DEPT_ABUJA"),
    (r"OVERSEA|OVERSEAS", "OFF_DIV_OVERSEA", None),
    (r"MONITORING", "OFF_DIV_MONITORING", "OFF_DEPT_MONITORING"),
    (r"FINANCE", "OFF_DIV_FINANCE", None),
    (r"ARCHIV", "OFF_DIV_ADMIN", "OFF_DEPT_ADMIN_ARCHIVES"),
    (r"ADMINISTRATION|ADMIN|FACILITY|TRANSPORT|DRIVER|TYPIST|CANTEEN|CATEEN|CLERICAL", "OFF_DIV_ADMIN", "OFF_DEPT_ADMIN_GENERAL"),
    (r"MD'?S?\s*OFFICE|MD\s*OFFICE", "OFF_DIV_GM_MD_OFFICE", None),
    (r"ENGINEERING|TECHNICAL|TECHNICIAN|FOREMAN|\bTECH\b", "OFF_DIV_ENGINEERING", None),
    (r"ENTERPRISE\s*RISK|\bERM\b", None, "OFF_DEPT_ERM"),
)

ED_OFFICE_RULES = (
    (r"ENGINEER|TECH", "OFF_DIR_EDETS"),
    (r"MARINE|OPERATION", "OFF_DIR_EDMO"),
    (r"FINANCE|ADMIN", "OFF_DIR_EDFA"),
)


def normalize_designation(value) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().upper())


def resolve_role(grade: str, designation: str) -> str | None:
    designation = normalize_designation(designation)
    if "SECRETARY" in designation:
        return "Secretary"
    if "PERSONAL ASSISTANT" in designation:
        return "Personal Assistant"
    return ROLE_BY_GRADE.get((grade or "").strip().upper())


def resolve_office_code(grade: str, designation: str) -> str | None:
    grade = (grade or "").strip().upper()
    designation = normalize_designation(designation)
    if grade == "MDCS":
        return "OFF_MD"
    if grade == "EDCS":
        for pattern, code in ED_OFFICE_RULES:
            if re.search(pattern, designation):
                return code
        return None
    for pattern, division_code, department_code in UNIT_RULES:
        if not re.search(pattern, designation):
            continue
        if grade == "MSS1" and division_code:
            return division_code
        return department_code or division_code
    return None
