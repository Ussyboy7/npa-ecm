/**
 * NPA Organizational Structure
 * Official departments, divisions, ports, and roles for the ECM system
 */

export const NPA_PORTS = [
  { code: "LPC", name: "Lagos Port Complex", location: "Lagos" },
  { code: "ONNE", name: "Onne Port", location: "Rivers State" },
  { code: "LEKKI", name: "Lekki Deep Sea Port", location: "Lagos" },
  { code: "TCIPC", name: "Tin Can Island Port Complex", location: "Lagos" },
  { code: "PHC", name: "Port Harcourt Port", location: "Rivers State" },
  { code: "WARRI", name: "Warri Port", location: "Delta State" },
  { code: "CALABAR", name: "Calabar Port", location: "Cross River State" },
  { code: "HQ", name: "Headquarters", location: "Lagos" },
];

export const NPA_DIVISIONS = {
  // Finance & Administration ED
  FINANCE_ADMIN: [
    { code: "HR", name: "Human Resources" },
    { code: "FIN", name: "Finance" },
    { code: "PROC", name: "Procurement" },
    { code: "ADMIN", name: "Administration" },
    { code: "MED", name: "Medical Services" },
    { code: "SUPER", name: "Superannuation" },
  ],
  
  // Marine & Operations ED
  MARINE_OPS: [
    { code: "MAR-OPS", name: "Marine & Operations" },
    { code: "SEC", name: "Security" },
    { code: "HSE", name: "Health, Safety & Environment" },
    { code: "REG", name: "Regulatory Services" },
    { code: "PPP", name: "Public-Private Partnership" },
  ],
  
  // Engineering & Technical Services ED
  ENGINEERING: [
    { code: "ENG", name: "Engineering & Technical Services" },
    { code: "ICT", name: "Information & Communication Technology" },
    { code: "LANDS", name: "Lands & Assets Administration" },
  ],
  
  // Corporate Services (Direct to MD)
  CORPORATE: [
    { code: "CSP", name: "Corporate & Strategic Planning" },
    { code: "CSC", name: "Corporate & Strategic Communications" },
    { code: "AUDIT", name: "Audit" },
    { code: "LEGAL", name: "Legal Services" },
    { code: "TARIFF", name: "Tariff & Billing" },
    { code: "MON", name: "Monitoring" },
    { code: "SERVICOM", name: "SERVICOM" },
    { code: "ERM", name: "Enterprise Risk Management" },
    { code: "LIAISON", name: "Administrative Support & Liaison" },
    { code: "SPECIAL", name: "Special Duties" },
  ],
};

export const NPA_DEPARTMENTS = [
  // HR
  { code: "HR", name: "Human Resources", parent: null },
  { code: "HR-OPS", name: "HR Operations", parent: "HR" },
  { code: "HR-ELR", name: "Employee & Labour Relations", parent: "HR" },
  { code: "HR-TCD", name: "Training & Capacity Development", parent: "HR" },
  
  // Finance
  { code: "FIN", name: "Finance", parent: null },
  { code: "FIN-OPS", name: "Finance Operations", parent: "FIN" },
  { code: "FIN-ACC", name: "Accounts", parent: "FIN" },
  { code: "FIN-TAX", name: "Tax", parent: "FIN" },
  { code: "FIN-INV", name: "Investment", parent: "FIN" },
  
  // Procurement
  { code: "PROC", name: "Procurement", parent: null },
  
  // Administration
  { code: "ADMIN", name: "Administration", parent: null },
  { code: "ADMIN-ARM", name: "Archives & Records Management", parent: "ADMIN" },
  { code: "ADMIN-FM", name: "Facility Management", parent: "ADMIN" },
  { code: "ADMIN-LE", name: "Land & Estate", parent: "ADMIN" },
  
  // Medical Services
  { code: "MED", name: "Medical Services", parent: null },
  { code: "MED-SVC", name: "Medical Services", parent: "MED" },
  { code: "MED-PHM", name: "Pharmacy", parent: "MED" },
  { code: "MED-OH", name: "Occupational Health", parent: "MED" },
  
  // Superannuation
  { code: "SUPER", name: "Superannuation", parent: null },
  
  // Marine & Operations
  { code: "MAR-OPS", name: "Marine & Operations", parent: null },
  { code: "MAR-MOPS", name: "Marine Operations", parent: "MAR-OPS" },
  { code: "MAR-VM", name: "Vessel Management", parent: "MAR-OPS" },
  { code: "MAR-HYD", name: "Hydrographic", parent: "MAR-OPS" },
  { code: "MAR-POPS", name: "Port Operations", parent: "MAR-OPS" },
  
  // Security
  { code: "SEC", name: "Security", parent: null },
  
  // HSE
  { code: "HSE", name: "Health, Safety & Environment", parent: null },
  { code: "HSE-ENV", name: "Environment", parent: "HSE" },
  { code: "HSE-SAF", name: "Safety", parent: "HSE" },
  
  // Regulatory
  { code: "REG", name: "Regulatory Services", parent: null },
  
  // PPP
  { code: "PPP", name: "Public-Private Partnership", parent: null },
  
  // Engineering
  { code: "ENG", name: "Engineering & Technical Services", parent: null },
  { code: "ENG-PE", name: "Ports Engineering", parent: "ENG" },
  { code: "ENG-EC", name: "Electrical & Corrosion", parent: "ENG" },
  { code: "ENG-CE", name: "Civil Engineering", parent: "ENG" },
  
  // ICT
  { code: "ICT", name: "Information & Communication Technology", parent: null },
  { code: "ICT-SADM", name: "Software Applications & Database Management", parent: "ICT" },
  { code: "ICT-HIS", name: "Hardware, Infrastructure & Support", parent: "ICT" },
  { code: "ICT-NC", name: "Networks & Communication", parent: "ICT" },
  { code: "ICT-RSP", name: "Research & Special Projects", parent: "ICT" },
  
  // Lands
  { code: "LANDS", name: "Lands & Assets Administration", parent: null },
  { code: "LANDS-AA", name: "Assets Administration", parent: "LANDS" },
  
  // Corporate Services
  { code: "CSP", name: "Corporate & Strategic Planning", parent: null },
  { code: "CSP-RS", name: "Research & Statistics", parent: "CSP" },
  { code: "CSP-PM", name: "Planning & Monitoring", parent: "CSP" },
  { code: "CSP-IMO", name: "IMO London Office", parent: "CSP" },
  
  { code: "CSC", name: "Corporate & Strategic Communications", parent: null },
  { code: "CSC-MC", name: "Media & Communication", parent: "CSC" },
  { code: "CSC-CSR", name: "Corporate Social Responsibility", parent: "CSC" },
  
  { code: "AUDIT", name: "Audit", parent: null },
  { code: "AUDIT-FI", name: "Finance & Investment Audit", parent: "AUDIT" },
  { code: "AUDIT-ICT", name: "Systems & ICT Audit", parent: "AUDIT" },
  { code: "AUDIT-PC", name: "Policy Compliance Audit", parent: "AUDIT" },
  
  { code: "LEGAL", name: "Legal Services", parent: null },
  { code: "TARIFF", name: "Tariff & Billing", parent: null },
  
  { code: "MON", name: "Monitoring", parent: null },
  { code: "MON-OPS", name: "Monitoring Operations", parent: "MON" },
  { code: "MON-PM", name: "Performance Management", parent: "MON" },
  
  { code: "SERVICOM", name: "SERVICOM", parent: null },
  { code: "ERM", name: "Enterprise Risk Management", parent: null },
  
  { code: "LIAISON", name: "Administrative Support & Liaison", parent: null },
  { code: "LIAISON-ABJ", name: "Abuja Liaison Office", parent: "LIAISON" },
  { code: "LIAISON-OVS", name: "Overseas Liaison Office", parent: "LIAISON" },
  
  { code: "SPECIAL", name: "Special Duties", parent: null },
  { code: "SPECIAL-MD", name: "MD's Office", parent: "SPECIAL" },
  { code: "SPECIAL-BOARD", name: "Board Secretariat", parent: "SPECIAL" },
];

export const NPA_ROLES = [
  { code: "MD", name: "Managing Director", level: 1 },
  { code: "ED", name: "Executive Director", level: 2 },
  { code: "GM", name: "General Manager", level: 3 },
  { code: "AGM", name: "Assistant General Manager", level: 4 },
  { code: "PM", name: "Port Manager", level: 4 },
  { code: "PRINCIPAL", name: "Principal Manager", level: 5 },
  { code: "SENIOR", name: "Senior Manager", level: 6 },
  { code: "MANAGER", name: "Manager", level: 7 },
  { code: "OFFICER", name: "Officer", level: 8 },
  { code: "STAFF", name: "Staff", level: 9 },
];

export const NPA_DOCUMENT_TYPES = [
  { code: "MEMO", name: "Official Memo", requires_approval: true },
  { code: "CIRCULAR", name: "Circular", requires_approval: true },
  { code: "POLICY", name: "Policy Document", requires_approval: true },
  { code: "REPORT", name: "Report", requires_approval: true },
  { code: "CONTRACT", name: "Contract", requires_approval: true },
  { code: "CORRESPONDENCE", name: "Correspondence", requires_approval: false },
  { code: "MINUTES", name: "Meeting Minutes", requires_approval: true },
  { code: "BUDGET", name: "Budget Document", requires_approval: true },
  { code: "FINANCIAL", name: "Financial Report", requires_approval: true },
  { code: "TECHNICAL", name: "Technical Document", requires_approval: false },
  { code: "OPERATIONAL", name: "Operational Document", requires_approval: false },
  { code: "LEGAL", name: "Legal Document", requires_approval: true },
  { code: "HR", name: "HR Document", requires_approval: true },
  { code: "AUDIT", name: "Audit Report", requires_approval: true },
  { code: "BOARD", name: "Board Paper", requires_approval: true },
];

// Helper functions
export function getDepartmentByCode(code: string) {
  return NPA_DEPARTMENTS.find(dept => dept.code === code);
}

export function getPortByCode(code: string) {
  return NPA_PORTS.find(port => port.code === code);
}

export function getRoleByCode(code: string) {
  return NPA_ROLES.find(role => role.code === code);
}

export function getSubDepartments(parentCode: string) {
  return NPA_DEPARTMENTS.filter(dept => dept.parent === parentCode);
}

export function getTopLevelDepartments() {
  return NPA_DEPARTMENTS.filter(dept => dept.parent === null);
}

