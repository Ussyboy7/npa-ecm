// NPA Organizational Structure - Dynamic and Extensible
// Updated: Fixed field names for consistency (generalManagerId, assistantGeneralManagerId)

export type GradeLevel = {
  code: string;
  name: string;
  level: number; // Hierarchy level (higher = more authority)
  systemRole: 'Staff' | 'Officer' | 'Senior Officer' | 'Assistant Manager' | 'Manager' | 'Senior Manager' | 'Principal Manager' | 'Assistant General Manager' | 'General Manager' | 'Executive Director' | 'Managing Director' | 'Secretary' | 'Assistant' | 'Super Admin';
  approvalAuthority: number;
};

export const GRADE_LEVELS: GradeLevel[] = [
  { code: 'JSS3', name: 'Staff III', level: 4, systemRole: 'Staff', approvalAuthority: 1 },
  { code: 'JSS2', name: 'Staff II', level: 5, systemRole: 'Staff', approvalAuthority: 1 },
  { code: 'JSS1', name: 'Staff I', level: 6, systemRole: 'Staff', approvalAuthority: 2 },
  { code: 'SSS4', name: 'Officer II', level: 8, systemRole: 'Officer', approvalAuthority: 2 },
  { code: 'SSS3', name: 'Officer I', level: 9, systemRole: 'Officer', approvalAuthority: 3 },
  { code: 'SSS2', name: 'Senior Officer', level: 10, systemRole: 'Senior Officer', approvalAuthority: 3 },
  { code: 'SSS1', name: 'Assistant Manager', level: 12, systemRole: 'Assistant Manager', approvalAuthority: 4 },
  { code: 'MSS5', name: 'Manager', level: 13, systemRole: 'Manager', approvalAuthority: 5 },
  { code: 'MSS4', name: 'Senior Manager', level: 14, systemRole: 'Senior Manager', approvalAuthority: 6 },
  { code: 'MSS3', name: 'Principal Manager', level: 15, systemRole: 'Principal Manager', approvalAuthority: 7 },
  { code: 'MSS2', name: 'Assistant General Manager', level: 16, systemRole: 'Assistant General Manager', approvalAuthority: 8 },
  { code: 'MSS1', name: 'General Manager', level: 17, systemRole: 'General Manager', approvalAuthority: 9 },
  { code: 'EDCS', name: 'Executive Director', level: 18, systemRole: 'Executive Director', approvalAuthority: 10 },
  { code: 'MDCS', name: 'Managing Director', level: 19, systemRole: 'Managing Director', approvalAuthority: 11 },
];

export type Directorate = {
  id: string;
  name: string;
  code: string;
  executiveDirector?: string;
  executiveDirectorId?: string;
  active: boolean;
};

export const DIRECTORATES: Directorate[] = [
  { id: 'dir-md', name: 'Managing Director Office', code: 'MD', executiveDirector: 'Managing Director', executiveDirectorId: 'user-md', active: true },
  { id: 'dir-edfa', name: 'Executive Director, Finance & Administration', code: 'EDFA', executiveDirector: 'Executive Director, Finance & Administration', executiveDirectorId: 'user-ed-fa', active: true },
  { id: 'dir-edmo', name: 'Executive Director, Marine & Operations', code: 'EDMO', executiveDirector: 'Executive Director, Marine & Operations', executiveDirectorId: 'user-ed-mo', active: true },
  { id: 'dir-edets', name: 'Executive Director, Engineering & Technical Services', code: 'EDETS', executiveDirector: 'Executive Director, Engineering & Technical Services', executiveDirectorId: 'user-ed-ets', active: true },
];

export type Division = {
  id: string;
  name: string;
  code: string;
  directorateId: string;
  generalManagerId?: string; // Changed from generalManager to generalManagerId for consistency
  description?: string;
  active: boolean;
};

export const DIVISIONS: Division[] = [
  // Corporate Services (Reporting to MD)
  { id: 'div-csp', name: 'Corporate & Strategic Planning', code: 'C&SP', directorateId: 'dir-md', generalManagerId: 'user-gm-csp', active: true },
  { id: 'div-csc', name: 'Corporate & Strategic Communications', code: 'C&SC', directorateId: 'dir-md', generalManagerId: 'user-gm-csc', active: true },
  { id: 'div-audit', name: 'Audit', code: 'AUDIT', directorateId: 'dir-md', generalManagerId: 'user-gm-audit', active: true },
  { id: 'div-legal', name: 'Legal Services', code: 'LEGAL', directorateId: 'dir-md', generalManagerId: 'user-gm-legal', active: true },
  { id: 'div-tariff', name: 'Tariff & Billing', code: 'TARIFF', directorateId: 'dir-md', generalManagerId: 'user-gm-tariff', active: true },
  { id: 'div-monitoring', name: 'Monitoring', code: 'MONITORING', directorateId: 'dir-md', generalManagerId: 'user-gm-monitoring', active: true },
  { id: 'div-servicom', name: 'SERVICOM', code: 'SERVICOM', directorateId: 'dir-md', generalManagerId: 'user-gm-servicom', active: true },
  { id: 'div-erm', name: 'Enterprise Risk Management', code: 'ERM', directorateId: 'dir-md', generalManagerId: 'user-gm-erm', active: true },
  { id: 'div-liaison', name: 'Administrative Support & Liaison Offices', code: 'LIAISON', directorateId: 'dir-md', generalManagerId: 'user-gm-liaison', active: true },
  { id: 'div-special-duties', name: 'Special Duties / Executive Support', code: 'SPECIAL_DUTIES', directorateId: 'dir-md', generalManagerId: 'user-gm-special-duties', active: true },
  
  // Executive Director, Finance & Administration (EDFA)
  { id: 'div-hr', name: 'Human Resources', code: 'HR', directorateId: 'dir-edfa', generalManagerId: 'user-gm-hr', active: true },
  { id: 'div-finance', name: 'Finance', code: 'FINANCE', directorateId: 'dir-edfa', generalManagerId: 'user-gm-finance', active: true },
  { id: 'div-procurement', name: 'Procurement', code: 'PROCUREMENT', directorateId: 'dir-edfa', generalManagerId: 'user-gm-procurement', active: true },
  { id: 'div-admin', name: 'Administration', code: 'ADMIN', directorateId: 'dir-edfa', generalManagerId: 'user-gm-admin', active: true },
  { id: 'div-medical', name: 'Medical Services', code: 'MEDICAL', directorateId: 'dir-edfa', generalManagerId: 'user-gm-medical', active: true },
  { id: 'div-superannuation', name: 'Superannuation', code: 'SUPERANNUATION', directorateId: 'dir-edfa', generalManagerId: 'user-gm-superannuation', active: true },
  
  // Executive Director, Marine & Operations (EDMO)
  { id: 'div-marine-ops', name: 'Marine & Operations', code: 'MARINE_OPS', directorateId: 'dir-edmo', generalManagerId: 'user-gm-marine', active: true },
  { id: 'div-security', name: 'Security', code: 'SECURITY', directorateId: 'dir-edmo', generalManagerId: 'user-gm-security', active: true },
  { id: 'div-hse', name: 'Health, Safety & Environment', code: 'HSE', directorateId: 'dir-edmo', generalManagerId: 'user-gm-hse', active: true },
  { id: 'div-regulatory', name: 'Regulatory Services', code: 'REGULATORY', directorateId: 'dir-edmo', generalManagerId: 'user-gm-regulatory', active: true },
  { id: 'div-ppp', name: 'Public-Private Partnership', code: 'PPP', directorateId: 'dir-edmo', generalManagerId: 'user-gm-ppp', active: true },
  
  // Executive Director, Engineering & Technical Services (EDETS)
  { id: 'div-engineering', name: 'Engineering & Technical Services', code: 'ENGINEERING', directorateId: 'dir-edets', generalManagerId: 'user-gm-engineering', active: true },
  { id: 'div-ict', name: 'Information & Communication Technology', code: 'ICT', directorateId: 'dir-edets', generalManagerId: 'user-gm-ict', active: true },
  { id: 'div-lands-assets', name: 'Lands & Assets Administration', code: 'LANDS_ASSETS', directorateId: 'dir-edets', generalManagerId: 'user-gm-lands-assets', active: true },
];

export type Department = {
  id: string;
  name: string;
  code: string;
  divisionId: string;
  assistantGeneralManagerId?: string; // Changed from agm to assistantGeneralManagerId for consistency
  description?: string;
  active: boolean;
};

export const DEPARTMENTS: Department[] = [
  // Corporate & Strategic Planning (C&SP)
  { id: 'dept-csp-research', name: 'Research & Statistics', code: 'CSP_RESEARCH', divisionId: 'div-csp', assistantGeneralManagerId: 'user-agm-csp-research', active: true },
  { id: 'dept-csp-planning', name: 'Planning & Monitoring', code: 'CSP_PLANNING', divisionId: 'div-csp', assistantGeneralManagerId: 'user-agm-csp-planning', active: true },
  { id: 'dept-csp-imo', name: 'Deputy Alternate, IMO London', code: 'CSP_IMO', divisionId: 'div-csp', assistantGeneralManagerId: 'user-agm-csp-imo', active: true },
  
  // Corporate & Strategic Communications (C&SC)
  { id: 'dept-csc-media', name: 'Media & Communication / Protocol', code: 'CSC_MEDIA', divisionId: 'div-csc', assistantGeneralManagerId: 'user-agm-csc-media', active: true },
  { id: 'dept-csc-csr', name: 'Corporate Social Responsibility', code: 'CSC_CSR', divisionId: 'div-csc', assistantGeneralManagerId: 'user-agm-csc-csr', active: true },
  
  // Audit
  { id: 'dept-audit-finance', name: 'Finance & Investment', code: 'AUDIT_FINANCE', divisionId: 'div-audit', assistantGeneralManagerId: 'user-agm-audit-finance', active: true },
  { id: 'dept-audit-systems', name: 'Systems / ICT', code: 'AUDIT_SYSTEMS', divisionId: 'div-audit', assistantGeneralManagerId: 'user-agm-audit-systems', active: true },
  { id: 'dept-audit-policy', name: 'Policy Compliance', code: 'AUDIT_POLICY', divisionId: 'div-audit', assistantGeneralManagerId: 'user-agm-audit-policy', active: true },
  
  // Legal Services
  { id: 'dept-legal', name: 'Legal', code: 'LEGAL', divisionId: 'div-legal', assistantGeneralManagerId: 'user-agm-legal', active: true },
  
  // Tariff & Billing
  { id: 'dept-tariff', name: 'Tariff & Billing', code: 'TARIFF', divisionId: 'div-tariff', assistantGeneralManagerId: 'user-agm-tariff', active: true },
  
  // Monitoring
  { id: 'dept-monitoring', name: 'Monitoring', code: 'MONITORING', divisionId: 'div-monitoring', assistantGeneralManagerId: 'user-agm-monitoring', active: true },
  { id: 'dept-performance', name: 'Performance Management', code: 'PERFORMANCE', divisionId: 'div-monitoring', assistantGeneralManagerId: 'user-agm-performance', active: true },
  
  // SERVICOM
  { id: 'dept-servicom', name: 'SERVICOM', code: 'SERVICOM', divisionId: 'div-servicom', assistantGeneralManagerId: 'user-agm-servicom', active: true },
  
  // Enterprise Risk Management
  { id: 'dept-erm', name: 'Risk Management', code: 'ERM', divisionId: 'div-erm', assistantGeneralManagerId: 'user-agm-erm', active: true },
  
  // Administrative Support & Liaison Offices
  { id: 'dept-abuja', name: 'Abuja Liaison Office', code: 'ABUJA', divisionId: 'div-liaison', assistantGeneralManagerId: 'user-agm-abuja', active: true },
  { id: 'dept-overseas', name: 'Overseas Liaison Office', code: 'OVERSEAS', divisionId: 'div-liaison', assistantGeneralManagerId: 'user-agm-overseas', active: true },
  
  // Special Duties / Executive Support
  { id: 'dept-md-office', name: "MD's Office", code: 'MD_OFFICE', divisionId: 'div-special-duties', active: true },
  { id: 'dept-board', name: 'Board', code: 'BOARD', divisionId: 'div-special-duties', active: true },
  { id: 'dept-special-performance', name: 'Performance Management', code: 'SPECIAL_PERFORMANCE', divisionId: 'div-special-duties', active: true },
  
  // Human Resources
  { id: 'dept-hr-operations', name: 'HR Operations', code: 'HR_OPS', divisionId: 'div-hr', assistantGeneralManagerId: 'user-agm-hr-ops', active: true },
  { id: 'dept-hr-labour', name: 'Employee & Labour Relations', code: 'HR_LABOUR', divisionId: 'div-hr', assistantGeneralManagerId: 'user-agm-hr-labour', active: true },
  { id: 'dept-hr-training', name: 'Training & Capacity Development', code: 'HR_TRAINING', divisionId: 'div-hr', assistantGeneralManagerId: 'user-agm-hr-training', active: true },
  
  // Finance
  { id: 'dept-finance', name: 'Finance', code: 'FINANCE', divisionId: 'div-finance', assistantGeneralManagerId: 'user-agm-finance', active: true },
  { id: 'dept-accounts', name: 'Accounts', code: 'ACCOUNTS', divisionId: 'div-finance', assistantGeneralManagerId: 'user-agm-accounts', active: true },
  { id: 'dept-tax', name: 'Tax', code: 'TAX', divisionId: 'div-finance', assistantGeneralManagerId: 'user-agm-tax', active: true },
  { id: 'dept-investment', name: 'Investment', code: 'INVESTMENT', divisionId: 'div-finance', assistantGeneralManagerId: 'user-agm-investment', active: true },
  
  // Procurement
  { id: 'dept-procurement', name: 'Procurement', code: 'PROCUREMENT', divisionId: 'div-procurement', assistantGeneralManagerId: 'user-agm-procurement', active: true },
  
  // Administration
  { id: 'dept-admin-archives', name: 'Archives & Records Management', code: 'ADMIN_ARCHIVES', divisionId: 'div-admin', assistantGeneralManagerId: 'user-agm-admin-archives', active: true },
  { id: 'dept-admin-facility', name: 'Facility Management', code: 'ADMIN_FACILITY', divisionId: 'div-admin', assistantGeneralManagerId: 'user-agm-admin-facility', active: true },
  { id: 'dept-admin-estate', name: 'Land & Estate', code: 'ADMIN_ESTATE', divisionId: 'div-admin', assistantGeneralManagerId: 'user-agm-admin-estate', active: true },
  
  // Medical Services
  { id: 'dept-medical', name: 'Medical Services', code: 'MEDICAL', divisionId: 'div-medical', assistantGeneralManagerId: 'user-agm-medical', active: true },
  { id: 'dept-pharmacy', name: 'Pharmacy', code: 'PHARMACY', divisionId: 'div-medical', assistantGeneralManagerId: 'user-agm-pharmacy', active: true },
  { id: 'dept-occupational', name: 'Occupational Health', code: 'OCCUPATIONAL', divisionId: 'div-medical', assistantGeneralManagerId: 'user-agm-occupational', active: true },
  
  // Superannuation
  { id: 'dept-superannuation', name: 'Superannuation', code: 'SUPERANNUATION', divisionId: 'div-superannuation', assistantGeneralManagerId: 'user-agm-superannuation', active: true },
  
  // Marine & Operations
  { id: 'dept-marine-ops', name: 'Marine Operations', code: 'MARINE_OPS', divisionId: 'div-marine-ops', assistantGeneralManagerId: 'user-agm-marine-ops', active: true },
  { id: 'dept-vessel', name: 'Vessel Management', code: 'VESSEL', divisionId: 'div-marine-ops', assistantGeneralManagerId: 'user-agm-vessel', active: true },
  { id: 'dept-hydrographic', name: 'Hydrographic', code: 'HYDROGRAPHIC', divisionId: 'div-marine-ops', assistantGeneralManagerId: 'user-agm-hydrographic', active: true },
  { id: 'dept-port-ops', name: 'Port Operations', code: 'PORT_OPS', divisionId: 'div-marine-ops', assistantGeneralManagerId: 'user-agm-port-ops', active: true },
  
  // Security
  { id: 'dept-security', name: 'Security', code: 'SECURITY', divisionId: 'div-security', assistantGeneralManagerId: 'user-agm-security', active: true },
  
  // Health, Safety & Environment (HSE)
  { id: 'dept-environment', name: 'Environment', code: 'ENVIRONMENT', divisionId: 'div-hse', assistantGeneralManagerId: 'user-agm-environment', active: true },
  { id: 'dept-safety', name: 'Safety', code: 'SAFETY', divisionId: 'div-hse', assistantGeneralManagerId: 'user-agm-safety', active: true },
  
  // Regulatory Services
  { id: 'dept-regulatory', name: 'Regulatory Services', code: 'REGULATORY', divisionId: 'div-regulatory', assistantGeneralManagerId: 'user-agm-regulatory', active: true },
  
  // Public-Private Partnership (PPP)
  { id: 'dept-ppp', name: 'PPP', code: 'PPP', divisionId: 'div-ppp', assistantGeneralManagerId: 'user-agm-ppp', active: true },
  
  // Engineering & Technical Services
  { id: 'dept-ports-eng', name: 'Ports Engineering', code: 'PORTS_ENG', divisionId: 'div-engineering', assistantGeneralManagerId: 'user-agm-ports-eng', active: true },
  { id: 'dept-electrical', name: 'Electrical & Corrosion', code: 'ELECTRICAL', divisionId: 'div-engineering', assistantGeneralManagerId: 'user-agm-electrical', active: true },
  { id: 'dept-civil', name: 'Civil Engineering', code: 'CIVIL', divisionId: 'div-engineering', assistantGeneralManagerId: 'user-agm-civil', active: true },
  
  // Information & Communication Technology (ICT)
  { id: 'dept-ict-software', name: 'Software Applications & Database Management', code: 'ICT_SOFTWARE', divisionId: 'div-ict', assistantGeneralManagerId: 'user-agm-software', active: true },
  { id: 'dept-ict-hardware', name: 'Hardware, Infrastructure & Support', code: 'ICT_HARDWARE', divisionId: 'div-ict', assistantGeneralManagerId: 'user-agm-infra', active: true },
  { id: 'dept-ict-networks', name: 'Networks & Communication', code: 'ICT_NETWORKS', divisionId: 'div-ict', assistantGeneralManagerId: 'user-agm-networks', active: true },
  { id: 'dept-ict-research', name: 'Research & Special Projects', code: 'ICT_RESEARCH', divisionId: 'div-ict', assistantGeneralManagerId: 'user-agm-research', active: true },
  
  // Lands & Assets Administration
  { id: 'dept-assets', name: 'Assets Administration', code: 'ASSETS', divisionId: 'div-lands-assets', assistantGeneralManagerId: 'user-agm-assets', active: true },
];

export type Port = {
  id: string;
  name: string;
  code: string;
  location: string;
  portManager?: string;
  active: boolean;
};

export const PORTS: Port[] = [
  { id: 'port-lagos', name: 'Lagos Port Complex', code: 'LAGOS', location: 'Apapa, Lagos', portManager: 'Adebowale Lawal Ibrahim', active: true },
  { id: 'port-tincan', name: 'Tin Can Island Port', code: 'TIN_CAN', location: 'Apapa, Lagos', portManager: 'Abubakar Sani Isa', active: true },
  { id: 'port-onne', name: 'Onne Port', code: 'ONNE', location: 'Rivers State', portManager: 'Abdulrahman Hussaini', active: true },
  { id: 'port-phc', name: 'Port Harcourt Port', code: 'PORTHARCOURT', location: 'Rivers State', portManager: 'Kenneth Edith Okezie', active: true },
  { id: 'port-calabar', name: 'Calabar Port', code: 'CALABAR', location: 'Cross River State', portManager: 'Ekine Ibifri Alex', active: true },
  { id: 'port-warri', name: 'Warri Port', code: 'WARRI', location: 'Delta State', portManager: 'Sa\'adu Dahiru Mohammed', active: true },
  { id: 'port-delta', name: 'Delta Port', code: 'DELTA', location: 'Delta State', portManager: 'Emmanuel Anda', active: true },
];

export type User = {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  gradeLevel: string;
  division?: string;
  department?: string;
  systemRole: string;
  avatar?: string;
  active: boolean;
};

export type Correspondence = {
  id: string;
  referenceNumber: string;
  subject: string;
  source: 'internal' | 'external';
  receivedDate: string;
  senderName?: string;
  senderOrganization?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  divisionId?: string;
  departmentId?: string;
  currentApproverId?: string;
  direction: 'upward' | 'downward';
  attachments?: string[];
  distribution?: DistributionRecipient[];
  archiveLevel?: 'department' | 'division' | 'directorate'; // Hierarchical archive level
  linkedDocumentIds?: string[];
};

export type DistributionRecipient = {
  type: 'division' | 'department';
  id: string;
  name: string;
  addedBy: string; // userId
  addedAt: string; // timestamp
  purpose?: 'information' | 'action' | 'comment'; // Purpose of CC
};

export type Minute = {
  id: string;
  correspondenceId: string;
  userId: string;
  gradeLevel: string;
  actionType: 'minute' | 'forward' | 'approve' | 'reject' | 'treat';
  minuteText: string;
  direction: 'upward' | 'downward';
  stepNumber: number;
  timestamp: string;
  actedBySecretary?: boolean;
  actedByAssistant?: boolean;
  assistantType?: 'TA' | 'PA';
  readAt?: string;
  mentions?: string[];
  signature?: {
    imageData: string;
    appliedAt: string;
    fileName?: string;
    templateId?: string;
    templateType?: 'approval' | 'minute' | 'forward' | 'treatment';
    renderedText?: string;
  };
};

// Helper function to generate realistic Nigerian names
const generateNigerianName = (prefix: string, firstName: string, lastName: string): string => {
  const prefixes: Record<string, string> = {
    'Mr.': 'Mr.',
    'Mrs.': 'Mrs.',
    'Miss': 'Miss',
    'Dr.': 'Dr.',
    'Engr.': 'Engr.',
    'Capt.': 'Capt.',
  };
  return `${prefixes[prefix] || prefix} ${firstName} ${lastName}`;
};

// Mock Data - Updated with real NPA names and comprehensive coverage
export const MOCK_USERS: User[] = [
  // MD Office
  { id: 'user-md', name: 'Dr. Abubakar Dantsoho', email: 'md@npa.gov.ng', employeeId: 'NPA001', gradeLevel: 'MDCS', systemRole: 'Managing Director', active: true },
  
  // Executive Directors - Real Names
  { id: 'user-ed-ets', name: 'Engr. Ibrahim Abba Umar', email: 'ed.ets@npa.gov.ng', employeeId: 'NPA002', gradeLevel: 'EDCS', division: 'div-ict', systemRole: 'Executive Director', active: true },
  { id: 'user-ed-mo', name: 'Engr. Olalekan Badmus', email: 'ed.mo@npa.gov.ng', employeeId: 'NPA003', gradeLevel: 'EDCS', division: 'div-marine-ops', systemRole: 'Executive Director', active: true },
  { id: 'user-ed-fa', name: 'Mrs. Vivian C. Richard-Edet', email: 'ed.fa@npa.gov.ng', employeeId: 'NPA004', gradeLevel: 'EDCS', division: 'div-finance', systemRole: 'Executive Director', active: true },
  
  // General Managers - Real Names
  { id: 'user-gm-ict', name: 'Gbotolorun Babatunde Ayodele', email: 'gm.ict@npa.gov.ng', employeeId: 'NPA010', gradeLevel: 'MSS1', division: 'div-ict', systemRole: 'General Manager', active: true },
  { id: 'user-gm-marine', name: 'Capt. Jerome Bitrus Angyunwe', email: 'gm.marine@npa.gov.ng', employeeId: 'NPA011', gradeLevel: 'MSS1', division: 'div-marine-ops', systemRole: 'General Manager', active: true },
  { id: 'user-gm-csp', name: 'Iyawe Seyi Akinyemi', email: 'gm.csp@npa.gov.ng', employeeId: 'NPA012', gradeLevel: 'MSS1', division: 'div-csp', systemRole: 'General Manager', active: true },
  { id: 'user-gm-security', name: 'Edosomwan A. Anthony', email: 'gm.security@npa.gov.ng', employeeId: 'NPA013', gradeLevel: 'MSS1', division: 'div-security', systemRole: 'General Manager', active: true },
  { id: 'user-gm-monitoring', name: 'Salau Razaq Adesina', email: 'gm.monitoring@npa.gov.ng', employeeId: 'NPA014', gradeLevel: 'MSS1', division: 'div-monitoring', systemRole: 'General Manager', active: true },
  { id: 'user-gm-engineering', name: 'Isa Mukhtar Umar', email: 'gm.engineering@npa.gov.ng', employeeId: 'NPA015', gradeLevel: 'MSS1', division: 'div-engineering', systemRole: 'General Manager', active: true },
  { id: 'user-gm-audit', name: 'Gofwan Victor Paul', email: 'gm.audit@npa.gov.ng', employeeId: 'NPA016', gradeLevel: 'MSS1', division: 'div-audit', systemRole: 'General Manager', active: true },
  { id: 'user-gm-finance', name: 'Mrs. Blessing Eze', email: 'gm.finance@npa.gov.ng', employeeId: 'NPA017', gradeLevel: 'MSS1', division: 'div-finance', systemRole: 'General Manager', active: true },
  { id: 'user-gm-hr', name: 'Mr. Kunle Adebayo', email: 'gm.hr@npa.gov.ng', employeeId: 'NPA018', gradeLevel: 'MSS1', division: 'div-hr', systemRole: 'General Manager', active: true },
  { id: 'user-gm-legal', name: 'Mrs. Folake Adeola', email: 'gm.legal@npa.gov.ng', employeeId: 'NPA019', gradeLevel: 'MSS1', division: 'div-legal', systemRole: 'General Manager', active: true },
  { id: 'user-gm-procurement', name: 'Mr. Chidi Okeke', email: 'gm.procurement@npa.gov.ng', employeeId: 'NPA020', gradeLevel: 'MSS1', division: 'div-procurement', systemRole: 'General Manager', active: true },
  { id: 'user-gm-admin', name: 'Mrs. Ngozi Obi', email: 'gm.admin@npa.gov.ng', employeeId: 'NPA021', gradeLevel: 'MSS1', division: 'div-admin', systemRole: 'General Manager', active: true },
  { id: 'user-gm-medical', name: 'Dr. Emeka Nwosu', email: 'gm.medical@npa.gov.ng', employeeId: 'NPA022', gradeLevel: 'MSS1', division: 'div-medical', systemRole: 'General Manager', active: true },
  { id: 'user-gm-hse', name: 'Mr. Femi Adewale', email: 'gm.hse@npa.gov.ng', employeeId: 'NPA023', gradeLevel: 'MSS1', division: 'div-hse', systemRole: 'General Manager', active: true },
  { id: 'user-gm-regulatory', name: 'Capt. Bola Williams', email: 'gm.regulatory@npa.gov.ng', employeeId: 'NPA024', gradeLevel: 'MSS1', division: 'div-regulatory', systemRole: 'General Manager', active: true },
  { id: 'user-gm-ppp', name: 'Mr. Olumide Adeyemi', email: 'gm.ppp@npa.gov.ng', employeeId: 'NPA025', gradeLevel: 'MSS1', division: 'div-ppp', systemRole: 'General Manager', active: true },
  { id: 'user-gm-lands-assets', name: 'Mrs. Chiamaka Eze', email: 'gm.lands@npa.gov.ng', employeeId: 'NPA026', gradeLevel: 'MSS1', division: 'div-lands-assets', systemRole: 'General Manager', active: true },
  { id: 'user-gm-csc', name: 'Mr. Tunde Fashola', email: 'gm.csc@npa.gov.ng', employeeId: 'NPA027', gradeLevel: 'MSS1', division: 'div-csc', systemRole: 'General Manager', active: true },
  { id: 'user-gm-tariff', name: 'Mrs. Aisha Mohammed', email: 'gm.tariff@npa.gov.ng', employeeId: 'NPA028', gradeLevel: 'MSS1', division: 'div-tariff', systemRole: 'General Manager', active: true },
  { id: 'user-gm-servicom', name: 'Mr. Ibrahim Yusuf', email: 'gm.servicom@npa.gov.ng', employeeId: 'NPA029', gradeLevel: 'MSS1', division: 'div-servicom', systemRole: 'General Manager', active: true },
  { id: 'user-gm-erm', name: 'Mrs. Fatima Adekunle', email: 'gm.erm@npa.gov.ng', employeeId: 'NPA030', gradeLevel: 'MSS1', division: 'div-erm', systemRole: 'General Manager', active: true },
  { id: 'user-gm-superannuation', name: 'Mr. Samuel Okeke', email: 'gm.superannuation@npa.gov.ng', employeeId: 'NPA031', gradeLevel: 'MSS1', division: 'div-superannuation', systemRole: 'General Manager', active: true },
  { id: 'user-gm-liaison', name: 'Mrs. Halima Suleiman', email: 'gm.liaison@npa.gov.ng', employeeId: 'NPA032', gradeLevel: 'MSS1', division: 'div-liaison', systemRole: 'General Manager', active: true },
  { id: 'user-gm-special-duties', name: 'Mr. Patrick Igbinedion', email: 'gm.specialduties@npa.gov.ng', employeeId: 'NPA033', gradeLevel: 'MSS1', division: 'div-special-duties', systemRole: 'General Manager', active: true },
  
  // AGMs - Sample for each division (using realistic Nigerian names)
  { id: 'user-agm-software', name: 'Mrs. Chiamaka Eze', email: 'agm.software@npa.gov.ng', employeeId: 'NPA040', gradeLevel: 'MSS2', division: 'div-ict', department: 'dept-ict-software', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-infra', name: 'Mr. Femi Adewale', email: 'agm.infra@npa.gov.ng', employeeId: 'NPA041', gradeLevel: 'MSS2', division: 'div-ict', department: 'dept-ict-hardware', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-networks', name: 'Engr. Adebayo Ogunleye', email: 'agm.networks@npa.gov.ng', employeeId: 'NPA042', gradeLevel: 'MSS2', division: 'div-ict', department: 'dept-ict-networks', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-marine-ops', name: 'Capt. Bola Williams', email: 'agm.marine@npa.gov.ng', employeeId: 'NPA043', gradeLevel: 'MSS2', division: 'div-marine-ops', department: 'dept-marine-ops', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-vessel', name: 'Capt. Tunde Fashola', email: 'agm.vessel@npa.gov.ng', employeeId: 'NPA044', gradeLevel: 'MSS2', division: 'div-marine-ops', department: 'dept-vessel', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-finance', name: 'Mrs. Blessing Eze', email: 'agm.finance@npa.gov.ng', employeeId: 'NPA045', gradeLevel: 'MSS2', division: 'div-finance', department: 'dept-finance', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-accounts', name: 'Mr. Chidi Okafor', email: 'agm.accounts@npa.gov.ng', employeeId: 'NPA046', gradeLevel: 'MSS2', division: 'div-finance', department: 'dept-accounts', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-hr-ops', name: 'Mrs. Ngozi Obi', email: 'agm.hr.ops@npa.gov.ng', employeeId: 'NPA047', gradeLevel: 'MSS2', division: 'div-hr', department: 'dept-hr-operations', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-hr-training', name: 'Mr. Kunle Adebayo', email: 'agm.hr.training@npa.gov.ng', employeeId: 'NPA048', gradeLevel: 'MSS2', division: 'div-hr', department: 'dept-hr-training', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-ports-eng', name: 'Engr. Olumide Adeyemi', email: 'agm.ports.eng@npa.gov.ng', employeeId: 'NPA049', gradeLevel: 'MSS2', division: 'div-engineering', department: 'dept-ports-eng', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-monitoring', name: 'Mr. Sola Adeyeye', email: 'agm.monitoring@npa.gov.ng', employeeId: 'NPA050', gradeLevel: 'MSS2', division: 'div-monitoring', department: 'dept-monitoring', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-performance', name: 'Mrs. Yetunde Okoro', email: 'agm.performance@npa.gov.ng', employeeId: 'NPA051', gradeLevel: 'MSS2', division: 'div-monitoring', department: 'dept-performance', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-servicom', name: 'Ms. Victoria Enem', email: 'agm.servicom@npa.gov.ng', employeeId: 'NPA052', gradeLevel: 'MSS2', division: 'div-servicom', department: 'dept-servicom', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-abuja', name: 'Mr. Abdullahi Musa', email: 'agm.abuja@npa.gov.ng', employeeId: 'NPA053', gradeLevel: 'MSS2', division: 'div-liaison', department: 'dept-abuja', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-overseas', name: 'Mrs. Ifeoma Nwachukwu', email: 'agm.overseas@npa.gov.ng', employeeId: 'NPA054', gradeLevel: 'MSS2', division: 'div-liaison', department: 'dept-overseas', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-hr-labour', name: 'Mr. Peter Udo', email: 'agm.hr.labour@npa.gov.ng', employeeId: 'NPA055', gradeLevel: 'MSS2', division: 'div-hr', department: 'dept-hr-labour', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-tax', name: 'Mrs. Kemi Adesina', email: 'agm.tax@npa.gov.ng', employeeId: 'NPA056', gradeLevel: 'MSS2', division: 'div-finance', department: 'dept-tax', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-investment', name: 'Mr. Tayo Balogun', email: 'agm.investment@npa.gov.ng', employeeId: 'NPA057', gradeLevel: 'MSS2', division: 'div-finance', department: 'dept-investment', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-medical', name: 'Dr. Zainab Yusuf', email: 'agm.medical@npa.gov.ng', employeeId: 'NPA058', gradeLevel: 'MSS2', division: 'div-medical', department: 'dept-medical', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-pharmacy', name: 'Pharm. Adaeze Nnamdi', email: 'agm.pharmacy@npa.gov.ng', employeeId: 'NPA059', gradeLevel: 'MSS2', division: 'div-medical', department: 'dept-pharmacy', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-occupational', name: 'Dr. Chukwudi Okeke', email: 'agm.occupational@npa.gov.ng', employeeId: 'NPA060', gradeLevel: 'MSS2', division: 'div-medical', department: 'dept-occupational', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-hydrographic', name: 'Engr. Hassan Bello', email: 'agm.hydrographic@npa.gov.ng', employeeId: 'NPA061', gradeLevel: 'MSS2', division: 'div-marine-ops', department: 'dept-hydrographic', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-port-ops', name: 'Capt. Musa Ibrahim', email: 'agm.portops@npa.gov.ng', employeeId: 'NPA062', gradeLevel: 'MSS2', division: 'div-marine-ops', department: 'dept-port-ops', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-security', name: 'Mr. Richard Obasi', email: 'agm.security@npa.gov.ng', employeeId: 'NPA063', gradeLevel: 'MSS2', division: 'div-security', department: 'dept-security', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-environment', name: 'Mrs. Bisi Alade', email: 'agm.environment@npa.gov.ng', employeeId: 'NPA064', gradeLevel: 'MSS2', division: 'div-hse', department: 'dept-environment', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-safety', name: 'Mr. Emmanuel Akpan', email: 'agm.safety@npa.gov.ng', employeeId: 'NPA065', gradeLevel: 'MSS2', division: 'div-hse', department: 'dept-safety', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-research', name: 'Ms. Grace Nnaji', email: 'agm.research@npa.gov.ng', employeeId: 'NPA066', gradeLevel: 'MSS2', division: 'div-ict', department: 'dept-ict-research', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-assets', name: 'Mr. Felix Adegoke', email: 'agm.assets@npa.gov.ng', employeeId: 'NPA067', gradeLevel: 'MSS2', division: 'div-lands-assets', department: 'dept-assets', systemRole: 'Assistant General Manager', active: true },
  
  // Additional AGMs for all departments
  { id: 'user-agm-csp-research', name: 'Dr. Adebayo Ogunleye', email: 'agm.csp.research@npa.gov.ng', employeeId: 'NPA068', gradeLevel: 'MSS2', division: 'div-csp', department: 'dept-csp-research', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-csp-planning', name: 'Mrs. Funke Adeyemi', email: 'agm.csp.planning@npa.gov.ng', employeeId: 'NPA069', gradeLevel: 'MSS2', division: 'div-csp', department: 'dept-csp-planning', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-csp-imo', name: 'Capt. John Okoro', email: 'agm.csp.imo@npa.gov.ng', employeeId: 'NPA070', gradeLevel: 'MSS2', division: 'div-csp', department: 'dept-csp-imo', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-csc-media', name: 'Mrs. Chioma Nwosu', email: 'agm.csc.media@npa.gov.ng', employeeId: 'NPA071', gradeLevel: 'MSS2', division: 'div-csc', department: 'dept-csc-media', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-csc-csr', name: 'Mr. Tunde Fashola', email: 'agm.csc.csr@npa.gov.ng', employeeId: 'NPA072', gradeLevel: 'MSS2', division: 'div-csc', department: 'dept-csc-csr', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-audit-finance', name: 'Mrs. Aisha Mohammed', email: 'agm.audit.finance@npa.gov.ng', employeeId: 'NPA073', gradeLevel: 'MSS2', division: 'div-audit', department: 'dept-audit-finance', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-audit-systems', name: 'Mr. Ibrahim Yusuf', email: 'agm.audit.systems@npa.gov.ng', employeeId: 'NPA074', gradeLevel: 'MSS2', division: 'div-audit', department: 'dept-audit-systems', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-audit-policy', name: 'Mrs. Fatima Adekunle', email: 'agm.audit.policy@npa.gov.ng', employeeId: 'NPA075', gradeLevel: 'MSS2', division: 'div-audit', department: 'dept-audit-policy', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-legal', name: 'Barr. Samuel Okeke', email: 'agm.legal@npa.gov.ng', employeeId: 'NPA076', gradeLevel: 'MSS2', division: 'div-legal', department: 'dept-legal', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-tariff', name: 'Mrs. Kemi Adesina', email: 'agm.tariff@npa.gov.ng', employeeId: 'NPA077', gradeLevel: 'MSS2', division: 'div-tariff', department: 'dept-tariff', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-ppp', name: 'Mr. Olumide Adeyemi', email: 'agm.ppp@npa.gov.ng', employeeId: 'NPA078', gradeLevel: 'MSS2', division: 'div-ppp', department: 'dept-ppp', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-regulatory', name: 'Capt. Bola Williams', email: 'agm.regulatory@npa.gov.ng', employeeId: 'NPA079', gradeLevel: 'MSS2', division: 'div-regulatory', department: 'dept-regulatory', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-electrical', name: 'Engr. Hassan Bello', email: 'agm.electrical@npa.gov.ng', employeeId: 'NPA080', gradeLevel: 'MSS2', division: 'div-engineering', department: 'dept-electrical', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-civil', name: 'Engr. Musa Ibrahim', email: 'agm.civil@npa.gov.ng', employeeId: 'NPA081', gradeLevel: 'MSS2', division: 'div-engineering', department: 'dept-civil', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-procurement', name: 'Mr. Chidi Okeke', email: 'agm.procurement@npa.gov.ng', employeeId: 'NPA082', gradeLevel: 'MSS2', division: 'div-procurement', department: 'dept-procurement', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-admin-archives', name: 'Mrs. Ngozi Obi', email: 'agm.admin.archives@npa.gov.ng', employeeId: 'NPA083', gradeLevel: 'MSS2', division: 'div-admin', department: 'dept-admin-archives', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-admin-facility', name: 'Mr. Femi Adewale', email: 'agm.admin.facility@npa.gov.ng', employeeId: 'NPA084', gradeLevel: 'MSS2', division: 'div-admin', department: 'dept-admin-facility', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-admin-estate', name: 'Mr. Emmanuel Akpan', email: 'agm.admin.estate@npa.gov.ng', employeeId: 'NPA085', gradeLevel: 'MSS2', division: 'div-admin', department: 'dept-admin-estate', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-superannuation', name: 'Mr. Samuel Okeke', email: 'agm.superannuation@npa.gov.ng', employeeId: 'NPA086', gradeLevel: 'MSS2', division: 'div-superannuation', department: 'dept-superannuation', systemRole: 'Assistant General Manager', active: true },
  { id: 'user-agm-erm', name: 'Mrs. Fatima Adekunle', email: 'agm.erm@npa.gov.ng', employeeId: 'NPA087', gradeLevel: 'MSS2', division: 'div-erm', department: 'dept-erm', systemRole: 'Assistant General Manager', active: true },
  
  // Principal Managers & Managers - Sample
  { id: 'user-pm-software', name: 'Mr. Olumide Adeyemi', email: 'pm.software@npa.gov.ng', employeeId: 'NPA050', gradeLevel: 'MSS3', division: 'div-ict', department: 'dept-ict-software', systemRole: 'Principal Manager', active: true },
  { id: 'user-manager-support', name: 'Mrs. Ngozi Obi', email: 'manager.support@npa.gov.ng', employeeId: 'NPA051', gradeLevel: 'MSS5', division: 'div-ict', department: 'dept-ict-hardware', systemRole: 'Manager', active: true },
  
  // Senior Managers (MSS4) - Sample
  { id: 'user-sm-finance', name: 'Mrs. Grace Okoro', email: 'sm.finance@npa.gov.ng', employeeId: 'NPA088', gradeLevel: 'MSS4', division: 'div-finance', department: 'dept-finance', systemRole: 'Senior Manager', active: true },
  { id: 'user-sm-hr', name: 'Mr. David Okafor', email: 'sm.hr@npa.gov.ng', employeeId: 'NPA089', gradeLevel: 'MSS4', division: 'div-hr', department: 'dept-hr-operations', systemRole: 'Senior Manager', active: true },
  
  // Officers - Sample (SSS1, SSS2, SSS3, SSS4)
  { id: 'user-officer-dev', name: 'Mr. Emeka Nwosu', email: 'officer.dev@npa.gov.ng', employeeId: 'NPA060', gradeLevel: 'SSS2', division: 'div-ict', department: 'dept-ict-software', systemRole: 'Senior Officer', active: true },
  { id: 'user-officer-support', name: 'Miss Aisha Mohammed', email: 'officer.support@npa.gov.ng', employeeId: 'NPA061', gradeLevel: 'SSS4', division: 'div-ict', department: 'dept-ict-hardware', systemRole: 'Officer', active: true },
  { id: 'user-officer-admin', name: 'Mr. James Okonkwo', email: 'officer.admin@npa.gov.ng', employeeId: 'NPA090', gradeLevel: 'SSS3', division: 'div-admin', department: 'dept-admin-archives', systemRole: 'Officer', active: true },
  { id: 'user-assistant-manager', name: 'Mrs. Maryam Ibrahim', email: 'assistant.manager@npa.gov.ng', employeeId: 'NPA091', gradeLevel: 'SSS1', division: 'div-finance', department: 'dept-accounts', systemRole: 'Assistant Manager', active: true },
  
  // Staff - Sample (JSS1, JSS2, JSS3)
  { id: 'user-staff-senior', name: 'Mr. Tunde Ojo', email: 'staff.senior@npa.gov.ng', employeeId: 'NPA092', gradeLevel: 'JSS1', division: 'div-ict', department: 'dept-ict-software', systemRole: 'Staff', active: true },
  { id: 'user-staff-mid', name: 'Miss Funke Adeyemi', email: 'staff.mid@npa.gov.ng', employeeId: 'NPA093', gradeLevel: 'JSS2', division: 'div-hr', department: 'dept-hr-operations', systemRole: 'Staff', active: true },
  { id: 'user-staff-junior', name: 'Mr. Chukwuemeka Nwankwo', email: 'staff.junior@npa.gov.ng', employeeId: 'NPA094', gradeLevel: 'JSS3', division: 'div-admin', department: 'dept-admin-facility', systemRole: 'Staff', active: true },
  
  // Special Roles: Secretary, Assistant, Super Admin
  { id: 'user-secretary-md', name: 'Mrs. Amina Bello', email: 'secretary.md@npa.gov.ng', employeeId: 'NPA095', gradeLevel: 'SSS2', division: 'div-liaison', systemRole: 'Secretary', active: true },
  { id: 'user-secretary-ed', name: 'Miss Fatima Ibrahim', email: 'secretary.ed@npa.gov.ng', employeeId: 'NPA096', gradeLevel: 'SSS2', division: 'div-ict', systemRole: 'Secretary', active: true },
  { id: 'user-assistant-md', name: 'Mr. Ibrahim Musa', email: 'assistant.md@npa.gov.ng', employeeId: 'NPA097', gradeLevel: 'SSS1', division: 'div-liaison', systemRole: 'Assistant', active: true },
  { id: 'user-assistant-gm', name: 'Mrs. Zainab Usman', email: 'assistant.gm@npa.gov.ng', employeeId: 'NPA098', gradeLevel: 'SSS1', division: 'div-ict', systemRole: 'Assistant', active: true },
  { id: 'user-super-admin', name: 'Mr. Admin System', email: 'admin@npa.gov.ng', employeeId: 'NPA099', gradeLevel: 'MSS1', systemRole: 'Super Admin', active: true },
];

export const MOCK_CORRESPONDENCE: Correspondence[] = [
  {
    id: 'corr-001',
    referenceNumber: 'NPA/MD/2024/001',
    subject: 'ICT Infrastructure Upgrade Request',
    source: 'internal',
    receivedDate: '2024-01-15T08:00:00Z',
    senderName: 'Gbotolorun Babatunde Ayodele',
    senderOrganization: 'Information & Communication Technology',
    status: 'in-progress',
    priority: 'high',
    divisionId: 'div-ict',
    currentApproverId: 'user-agm-software',
    direction: 'downward',
  },
  {
    id: 'corr-002',
    referenceNumber: 'NPA/EDMO/2024/002',
    subject: 'Marine Safety Equipment Procurement',
    source: 'external',
    receivedDate: '2024-01-10T10:00:00Z',
    senderName: 'Marine Safety Equipment Ltd',
    senderOrganization: 'Marine Safety Equipment Ltd',
    status: 'in-progress',
    priority: 'urgent',
    divisionId: 'div-marine-ops',
    currentApproverId: 'user-agm-marine-ops',
    direction: 'downward',
  },
  {
    id: 'corr-003',
    referenceNumber: 'NPA/EDFA/2024/003',
    subject: 'Q1 Budget Review and Variance Analysis',
    source: 'internal',
    receivedDate: '2024-01-20T09:00:00Z',
    senderName: 'Mrs. Blessing Eze',
    senderOrganization: 'Finance',
    status: 'in-progress',
    priority: 'high',
    divisionId: 'div-finance',
    currentApproverId: 'user-agm-finance',
    direction: 'downward',
  },
  {
    id: 'corr-004',
    referenceNumber: 'NPA/EDETS/2024/004',
    subject: 'Port Infrastructure Maintenance Schedule',
    source: 'internal',
    receivedDate: '2024-01-18T11:00:00Z',
    senderName: 'Isa Mukhtar Umar',
    senderOrganization: 'Engineering & Technical Services',
    status: 'pending',
    priority: 'medium',
    divisionId: 'div-engineering',
    currentApproverId: 'user-agm-ports-eng',
    direction: 'downward',
  },
  {
    id: 'corr-005',
    referenceNumber: 'NPA/EDETS/2024/005',
    subject: 'Cybersecurity Audit Report',
    source: 'internal',
    receivedDate: '2024-01-22T14:00:00Z',
    senderName: 'Mr. Femi Adewale',
    senderOrganization: 'Information & Communication Technology',
    status: 'completed',
    priority: 'high',
    divisionId: 'div-ict',
    currentApproverId: 'user-ed-ets',
    direction: 'upward',
  },
  {
    id: 'corr-006',
    referenceNumber: 'NPA/EDMO/2024/006',
    subject: 'Port Dredging Operations Update',
    source: 'internal',
    receivedDate: '2024-01-19T12:00:00Z',
    senderName: 'Capt. Bola Williams',
    senderOrganization: 'Marine & Operations',
    status: 'in-progress',
    priority: 'medium',
    divisionId: 'div-marine-ops',
    currentApproverId: 'user-gm-marine',
    direction: 'upward',
  },
  {
    id: 'corr-007',
    referenceNumber: 'NPA/EDFA/2024/007',
    subject: 'Staff Training Program Proposal',
    source: 'internal',
    receivedDate: '2024-01-25T10:00:00Z',
    senderName: 'Mr. Tunde Ojo',
    senderOrganization: 'Information & Communication Technology',
    status: 'in-progress',
    priority: 'normal',
    divisionId: 'div-ict',
    departmentId: 'dept-ict-software',
    currentApproverId: 'user-staff-senior',
    direction: 'upward',
  },
  {
    id: 'corr-008',
    referenceNumber: 'NPA/EDFA/2024/008',
    subject: 'HR Policy Review Request',
    source: 'internal',
    receivedDate: '2024-01-24T09:00:00Z',
    senderName: 'Miss Funke Adeyemi',
    senderOrganization: 'Human Resources',
    status: 'pending',
    priority: 'normal',
    divisionId: 'div-hr',
    departmentId: 'dept-hr-operations',
    currentApproverId: 'user-staff-mid',
    direction: 'upward',
  },
  {
    id: 'corr-009',
    referenceNumber: 'NPA/EDFA/2024/009',
    subject: 'Facility Maintenance Report',
    source: 'internal',
    receivedDate: '2024-01-23T14:00:00Z',
    senderName: 'Mr. Chukwuemeka Nwankwo',
    senderOrganization: 'Administration',
    status: 'in-progress',
    priority: 'normal',
    divisionId: 'div-admin',
    departmentId: 'dept-admin-facility',
    currentApproverId: 'user-staff-junior',
    direction: 'upward',
  },
  {
    id: 'corr-010',
    referenceNumber: 'NPA/EDFA/2024/010',
    subject: 'Budget Variance Analysis',
    source: 'internal',
    receivedDate: '2024-01-22T11:00:00Z',
    senderName: 'Mrs. Maryam Ibrahim',
    senderOrganization: 'Finance',
    status: 'in-progress',
    priority: 'high',
    divisionId: 'div-finance',
    departmentId: 'dept-accounts',
    currentApproverId: 'user-assistant-manager',
    direction: 'upward',
  },
  {
    id: 'corr-011',
    referenceNumber: 'NPA/EDFA/2024/011',
    subject: 'Records Management System Update',
    source: 'internal',
    receivedDate: '2024-01-21T13:00:00Z',
    senderName: 'Mr. James Okonkwo',
    senderOrganization: 'Administration',
    status: 'pending',
    priority: 'normal',
    divisionId: 'div-admin',
    departmentId: 'dept-admin-archives',
    currentApproverId: 'user-officer-admin',
    direction: 'upward',
  },
  {
    id: 'corr-012',
    referenceNumber: 'NPA/EDFA/2024/012',
    subject: 'Financial Reporting Standards Compliance',
    source: 'internal',
    receivedDate: '2024-01-20T15:00:00Z',
    senderName: 'Mrs. Grace Okoro',
    senderOrganization: 'Finance',
    status: 'in-progress',
    priority: 'high',
    divisionId: 'div-finance',
    departmentId: 'dept-finance',
    currentApproverId: 'user-sm-finance',
    direction: 'upward',
  },
  {
    id: 'corr-013',
    referenceNumber: 'NPA/EDETS/2024/013',
    subject: 'Digital Transformation Initiative - Budget Approval Request',
    source: 'internal',
    receivedDate: '2024-01-26T10:00:00Z',
    senderName: 'Gbotolorun Babatunde Ayodele',
    senderOrganization: 'Information & Communication Technology',
    status: 'in-progress',
    priority: 'high',
    divisionId: 'div-ict',
    currentApproverId: 'user-md',
    direction: 'upward',
  },
];

export const MOCK_MINUTES: Minute[] = [
  // Correspondence 001 - ICT Infrastructure
  {
    id: 'min-001',
    correspondenceId: 'corr-001',
    userId: 'user-md',
    gradeLevel: 'MDCS',
    actionType: 'minute',
    minuteText: 'Please review this request and provide a detailed cost analysis. Priority should be given to critical infrastructure components.',
    direction: 'downward',
    stepNumber: 1,
    timestamp: '2024-01-15T09:30:00Z',
    actedBySecretary: true,
    actedByAssistant: false,
  },
  {
    id: 'min-002',
    correspondenceId: 'corr-001',
    userId: 'user-gm-ict',
    gradeLevel: 'MSS1',
    actionType: 'minute',
    minuteText: 'AGM Software Development, please coordinate with Infrastructure team to prepare comprehensive proposal including costs, timelines, and expected benefits.',
    direction: 'downward',
    stepNumber: 2,
    timestamp: '2024-01-15T11:00:00Z',
    actedBySecretary: false,
    actedByAssistant: true,
    assistantType: 'TA',
  },
  {
    id: 'min-003',
    correspondenceId: 'corr-001',
    userId: 'user-agm-software',
    gradeLevel: 'MSS2',
    actionType: 'forward',
    minuteText: 'PM Software, please prepare the technical specifications and cost breakdown. @user-pm-software',
    direction: 'downward',
    stepNumber: 3,
    timestamp: '2024-01-15T14:00:00Z',
    actedBySecretary: false,
    actedByAssistant: false,
    mentions: ['user-pm-software'],
  },
  
  // Correspondence 002 - Marine Safety
  {
    id: 'min-004',
    correspondenceId: 'corr-002',
    userId: 'user-ed-mo',
    gradeLevel: 'EDCS',
    actionType: 'minute',
    minuteText: 'GM Marine, evaluate the equipment specifications and prepare procurement requirements. This is urgent.',
    direction: 'downward',
    stepNumber: 1,
    timestamp: '2024-01-10T15:00:00Z',
    actedBySecretary: true,
    actedByAssistant: false,
  },
  {
    id: 'min-005',
    correspondenceId: 'corr-002',
    userId: 'user-gm-marine',
    gradeLevel: 'MSS1',
    actionType: 'forward',
    minuteText: 'AGM Marine Operations, please coordinate with the safety team to review specifications and prepare cost estimates.',
    direction: 'downward',
    stepNumber: 2,
    timestamp: '2024-01-10T16:30:00Z',
    actedBySecretary: false,
    actedByAssistant: true,
    assistantType: 'TA',
  },
  
  // Correspondence 003 - Budget Review
  {
    id: 'min-006',
    correspondenceId: 'corr-003',
    userId: 'user-ed-fa',
    gradeLevel: 'EDCS',
    actionType: 'minute',
    minuteText: 'GM Finance, review the budget allocation and prepare variance analysis for Q1.',
    direction: 'downward',
    stepNumber: 1,
    timestamp: '2024-01-20T09:00:00Z',
    actedBySecretary: true,
    actedByAssistant: false,
  },
  {
    id: 'min-007',
    correspondenceId: 'corr-003',
    userId: 'user-gm-finance',
    gradeLevel: 'MSS1',
    actionType: 'minute',
    minuteText: 'Noted. Will coordinate with Budget & Planning department to analyze allocations against projected expenditure.',
    direction: 'downward',
    stepNumber: 2,
    timestamp: '2024-01-20T10:15:00Z',
    actedBySecretary: false,
    actedByAssistant: true,
    assistantType: 'PA',
  },
  
  // Correspondence 005 - Cybersecurity (Completed - Upward)
  {
    id: 'min-008',
    correspondenceId: 'corr-005',
    userId: 'user-agm-infra',
    gradeLevel: 'MSS2',
    actionType: 'treat',
    minuteText: 'Reviewed the cybersecurity audit report. All critical vulnerabilities have been addressed. System hardening completed as per recommendations.',
    direction: 'upward',
    stepNumber: 1,
    timestamp: '2024-01-22T14:00:00Z',
    actedBySecretary: false,
    actedByAssistant: false,
  },
  {
    id: 'min-009',
    correspondenceId: 'corr-005',
    userId: 'user-gm-ict',
    gradeLevel: 'MSS1',
    actionType: 'approve',
    minuteText: 'Treatment approved. Excellent work on addressing the vulnerabilities. Please forward to ED for final approval.',
    direction: 'upward',
    stepNumber: 2,
    timestamp: '2024-01-22T15:30:00Z',
    actedBySecretary: false,
    actedByAssistant: true,
    assistantType: 'TA',
  },
  {
    id: 'min-010',
    correspondenceId: 'corr-005',
    userId: 'user-ed-ets',
    gradeLevel: 'EDCS',
    actionType: 'approve',
    minuteText: 'Approved. Well done team. File for record.',
    direction: 'upward',
    stepNumber: 3,
    timestamp: '2024-01-23T09:00:00Z',
    actedBySecretary: true,
    actedByAssistant: false,
  },
  
  // Correspondence 006 - Port Dredging (Upward)
  {
    id: 'min-011',
    correspondenceId: 'corr-006',
    userId: 'user-agm-marine-ops',
    gradeLevel: 'MSS2',
    actionType: 'minute',
    minuteText: 'Dredging operations at Lagos port are 65% complete. Weather conditions have been favorable. Expected completion by end of month.',
    direction: 'upward',
    stepNumber: 1,
    timestamp: '2024-01-19T12:00:00Z',
    actedBySecretary: false,
    actedByAssistant: false,
  },
  {
    id: 'min-012',
    correspondenceId: 'corr-006',
    userId: 'user-gm-marine',
    gradeLevel: 'MSS1',
    actionType: 'forward',
    minuteText: 'Good progress. ED, please note the update. Requesting approval for additional resources to expedite completion.',
    direction: 'upward',
    stepNumber: 2,
    timestamp: '2024-01-19T14:00:00Z',
    actedBySecretary: false,
    actedByAssistant: true,
    assistantType: 'TA',
  },
  
  // Correspondence 007 - Staff Training (JSS1)
  {
    id: 'min-013',
    correspondenceId: 'corr-007',
    userId: 'user-staff-senior',
    gradeLevel: 'JSS1',
    actionType: 'minute',
    minuteText: 'Proposed training program for junior staff on software development best practices. Requesting approval for budget allocation.',
    direction: 'upward',
    stepNumber: 1,
    timestamp: '2024-01-25T10:30:00Z',
    actedBySecretary: false,
    actedByAssistant: false,
  },
  {
    id: 'min-014',
    correspondenceId: 'corr-007',
    userId: 'user-officer-dev',
    gradeLevel: 'SSS2',
    actionType: 'forward',
    minuteText: 'Good initiative. Forwarding to AGM for budget review and approval.',
    direction: 'upward',
    stepNumber: 2,
    timestamp: '2024-01-25T11:00:00Z',
    actedBySecretary: false,
    actedByAssistant: false,
  },
  
  // Correspondence 008 - HR Policy (JSS2)
  {
    id: 'min-015',
    correspondenceId: 'corr-008',
    userId: 'user-staff-mid',
    gradeLevel: 'JSS2',
    actionType: 'minute',
    minuteText: 'Requesting review of current HR policies regarding leave entitlements and remote work arrangements.',
    direction: 'upward',
    stepNumber: 1,
    timestamp: '2024-01-24T09:30:00Z',
    actedBySecretary: false,
    actedByAssistant: false,
  },
  
  // Correspondence 009 - Facility Maintenance (JSS3)
  {
    id: 'min-016',
    correspondenceId: 'corr-009',
    userId: 'user-staff-junior',
    gradeLevel: 'JSS3',
    actionType: 'minute',
    minuteText: 'Monthly facility maintenance report submitted. All systems operational. Minor repairs needed in Building A.',
    direction: 'upward',
    stepNumber: 1,
    timestamp: '2024-01-23T14:30:00Z',
    actedBySecretary: false,
    actedByAssistant: false,
  },
  {
    id: 'min-017',
    correspondenceId: 'corr-009',
    userId: 'user-officer-admin',
    gradeLevel: 'SSS3',
    actionType: 'forward',
    minuteText: 'Noted. Please prepare detailed repair estimates for Building A.',
    direction: 'upward',
    stepNumber: 2,
    timestamp: '2024-01-23T15:00:00Z',
    actedBySecretary: false,
    actedByAssistant: false,
  },
  
  // Correspondence 010 - Budget Variance (SSS1)
  {
    id: 'min-018',
    correspondenceId: 'corr-010',
    userId: 'user-assistant-manager',
    gradeLevel: 'SSS1',
    actionType: 'minute',
    minuteText: 'Q1 budget variance analysis completed. Significant variance in operational expenses. Recommend cost review meeting.',
    direction: 'upward',
    stepNumber: 1,
    timestamp: '2024-01-22T11:30:00Z',
    actedBySecretary: false,
    actedByAssistant: false,
  },
  {
    id: 'min-019',
    correspondenceId: 'corr-010',
    userId: 'user-sm-finance',
    gradeLevel: 'MSS4',
    actionType: 'forward',
    minuteText: 'Agreed. Please schedule meeting with division heads to discuss variance causes and mitigation strategies.',
    direction: 'upward',
    stepNumber: 2,
    timestamp: '2024-01-22T12:00:00Z',
    actedBySecretary: false,
    actedByAssistant: false,
  },
  
  // Correspondence 011 - Records Management (SSS3)
  {
    id: 'min-020',
    correspondenceId: 'corr-011',
    userId: 'user-officer-admin',
    gradeLevel: 'SSS3',
    actionType: 'minute',
    minuteText: 'Records management system requires update to comply with new data retention policies. Requesting approval for system upgrade.',
    direction: 'upward',
    stepNumber: 1,
    timestamp: '2024-01-21T13:30:00Z',
    actedBySecretary: false,
    actedByAssistant: false,
  },
  
  // Correspondence 012 - Financial Reporting (MSS4)
  {
    id: 'min-021',
    correspondenceId: 'corr-012',
    userId: 'user-sm-finance',
    gradeLevel: 'MSS4',
    actionType: 'minute',
    minuteText: 'Financial reporting standards compliance review completed. All departments are compliant. Recommend quarterly compliance audits.',
    direction: 'upward',
    stepNumber: 1,
    timestamp: '2024-01-20T15:30:00Z',
    actedBySecretary: false,
    actedByAssistant: false,
  },
  {
    id: 'min-022',
    correspondenceId: 'corr-012',
    userId: 'user-agm-finance',
    gradeLevel: 'MSS2',
    actionType: 'forward',
    minuteText: 'Excellent work. Forwarding to GM for final approval and implementation planning.',
    direction: 'upward',
    stepNumber: 2,
    timestamp: '2024-01-20T16:00:00Z',
    actedBySecretary: false,
    actedByAssistant: false,
  },
  
  // Correspondence 013 - Digital Transformation Initiative (GM ICT to MD)
  {
    id: 'min-023',
    correspondenceId: 'corr-013',
    userId: 'user-gm-ict',
    gradeLevel: 'MSS1',
    actionType: 'minute',
    minuteText: 'Requesting MD\'s approval for the Digital Transformation Initiative. This initiative includes upgrading our core systems, implementing cloud infrastructure, and enhancing cybersecurity measures. Total budget required: ₦2.5 billion over 3 years. Detailed proposal attached.',
    direction: 'upward',
    stepNumber: 1,
    timestamp: '2024-01-26T10:30:00Z',
    actedBySecretary: false,
    actedByAssistant: false,
  },
  {
    id: 'min-024',
    correspondenceId: 'corr-013',
    userId: 'user-ed-ets',
    gradeLevel: 'EDCS',
    actionType: 'forward',
    minuteText: 'Reviewed and endorsed. This initiative is critical for NPA\'s digital future and aligns with our strategic objectives. Forwarding to MD for final approval.',
    direction: 'upward',
    stepNumber: 2,
    timestamp: '2024-01-26T14:00:00Z',
    actedBySecretary: true,
    actedByAssistant: false,
  },
];

// Helper Functions
export const getDivisionById = (id: string) => DIVISIONS.find(d => d.id === id);
export const getDepartmentById = (id: string) => DEPARTMENTS.find(d => d.id === id);
export const getUserById = (id: string) => MOCK_USERS.find(u => u.id === id);
export const getDirectorateById = (id: string) => DIRECTORATES.find(d => d.id === id);
export const getPortById = (id: string) => PORTS.find(p => p.id === id);

export const getDivisionsByDirectorate = (directorateId: string) => 
  DIVISIONS.filter(d => d.directorateId === directorateId && d.active);

export const getDepartmentsByDivision = (divisionId: string) => 
  DEPARTMENTS.filter(d => d.divisionId === divisionId && d.active);

export const getUsersByDivision = (divisionId: string) => 
  MOCK_USERS.filter(u => u.division === divisionId && u.active);

export const getUsersByGrade = (gradeCode: string) => 
  MOCK_USERS.filter(u => u.gradeLevel === gradeCode && u.active);

export const getGradeLevelByCode = (code: string) => 
  GRADE_LEVELS.find(g => g.code === code);

export const getGradeLevelByLevel = (level: number) => 
  GRADE_LEVELS.find(g => g.level === level);

export const isManagementLevel = (gradeCode: string): boolean => {
  return ['MDCS', 'EDCS', 'MSS1', 'MSS2', 'MSS3'].includes(gradeCode);
};

export const isHigherGrade = (grade1: string, grade2: string): boolean => {
  const grade1Level = getGradeLevelByCode(grade1)?.level || 0;
  const grade2Level = getGradeLevelByCode(grade2)?.level || 0;
  return grade1Level > grade2Level;
};

export const isLowerGrade = (grade1: string, grade2: string): boolean => {
  const grade1Level = getGradeLevelByCode(grade1)?.level || 0;
  const grade2Level = getGradeLevelByCode(grade2)?.level || 0;
  return grade1Level < grade2Level;
};

export type SignatureTemplate = {
  id: string;
  name: string;
  description: string;
  templateType: 'approval' | 'minute' | 'forward' | 'treatment';
  format: string; // e.g. "APPROVED BY {name}\n{title}\n{date}"
  style: 'stamp' | 'formal' | 'minimal';
  defaultApply: boolean;
};

export const MOCK_SIGNATURE_TEMPLATES: SignatureTemplate[] = [
  {
    id: 'tmpl-approval-formal',
    name: 'Approval Stamp (Formal)',
    description: 'Official approval stamp with full details',
    templateType: 'approval',
    format: 'APPROVED BY\n{name}\n{title}\n{gradeLevel}\n{division}\n{date}',
    style: 'stamp',
    defaultApply: true,
  },
  {
    id: 'tmpl-minute-initials',
    name: 'Minute Acknowledgement',
    description: 'Initials and timestamp for minutes',
    templateType: 'minute',
    format: '{initials} • {dateTime}',
    style: 'minimal',
    defaultApply: false,
  },
  {
    id: 'tmpl-forward-brief',
    name: 'Forwarding Stamp',
    description: 'Routing stamp for forwarding',
    templateType: 'forward',
    format: 'FORWARDED BY {name}\n{division}\n{date}',
    style: 'stamp',
    defaultApply: false,
  },
  {
    id: 'tmpl-treatment-detailed',
    name: 'Treatment Confirmation',
    description: 'Detailed treatment confirmation stamp',
    templateType: 'treatment',
    format: 'TREATED & RESPONDED BY {name}\n{department}\n{date}\nRef: {referenceNumber}',
    style: 'formal',
    defaultApply: true,
  },
];
