import { useEffect, useMemo, useRef, useState } from 'react'
import { additionalNotificationsSeed } from '../data/notifications'
import { BankDetailsFormFields } from './BankDetailsFormFields'
import {
  bankFormFromDetails,
  countryNameToCode,
  EMPTY_BANK_FORM,
  validateBankForm,
  getBankDisplayFields,
  getCountryLabel,
  type BankCountryCode,
  type BankFormValues,
} from '../utils/bankValidation'

type UserType = 'employee' | 'admin' | 'client'
type Module = 'dashboard' | 'time-entry' | 'leave' | 'my-pay' | 'documents' | 'profile' | 'notifications' | 'admin-dashboard' | 'admin-reconciliation' | 'admin-payslips' | 'admin-access' | 'admin-reports' | 'client-dashboard' | 'client-payroll-control' | 'client-payroll-period' | 'client-offcycles' | 'client-lock' | 'client-reports'

type TimeEntryStatus = 'submitted' | 'draft' | 'returned' | 'none'

interface EmployeePortalFlowProps {
  userType: UserType
  notifications: any[]
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>
  isNotificationDrawerOpen: boolean
  setIsNotificationDrawerOpen: (open: boolean) => void
}

interface ModuleStep {
  title: string
  tag: string
  content: string
}

interface TimeEntryDay {
  key: string
  label: string
  dateLabel: string
  status: TimeEntryStatus
  hours: number
  regularHours: number
  overtimeHours: number
  startTime: string
  endTime: string
  breakDuration: string
  workLocation: string
  notes: string
  isLeave?: boolean
  leaveType?: LeaveTypeId
}

interface TimeEntryRangeData {
  fromDateISO: string
  toDateISO: string
  days: TimeEntryDay[]
  lastSaved: string
  approvalStatus?: ApprovalStatus
  submittedOnISO?: string
  approvedOnISO?: string
}

interface TimeEntryStore {
  activeRangeKey: string
  ranges: Record<string, TimeEntryRangeData>
}

interface TimeEntryEditForm {
  startTime: string
  endTime: string
  breakMinutes: number
  workLocation: string
  notes: string
  isLeave?: boolean
  leaveType?: LeaveTypeId
  timeType: 'regular' | LeaveTypeId
  timeSpentHours: number
}

interface TimeEntryWarning {
  title: string
  message: string
}

type TimeHistoryStatus = 'approved' | 'draft' | 'returned'
type ApprovalStatus = 'pending' | 'approved' | 'returned'

interface ApprovalDayDetail {
  key: string
  label: string
  dateLabel: string
  hours: number
  regularHours: number
  overtimeHours: number
}

interface ApprovalItem {
  key: string
  employeeName: string
  employeeRole: string
  fromDateISO: string
  toDateISO: string
  totalHours: number
  regularHours: number
  overtimeHours: number
  leaveHours: number
  submittedOnISO: string
  status: ApprovalStatus
  details: ApprovalDayDetail[]
}

interface TimeHistoryItem {
  key: string
  fromDateISO: string
  toDateISO: string
  totalHours: number
  regularHours: number
  overtimeHours: number
  leaveHours: number
  status: TimeHistoryStatus
  submittedOnISO: string
  approvedOnISO: string
}

type LeaveStatus = 'pending' | 'approved' | 'returned' | 'cancelled'
type LeaveTypeId = 'annual' | 'sick' | 'casual' | 'comp' | 'maternity' | 'paternity' | 'lwp' | 'adoption' | 'vacation' | 'jury' | 'std' | 'ltd' | 'bereavement'

interface LeaveBalanceItem {
  id: LeaveTypeId
  name: string
  entitlement: number
  used: number
  pending: number
  color: string
}

interface LeaveRequestItem {
  id: string
  leaveType: LeaveTypeId
  fromDateISO: string
  toDateISO: string
  durationDays: number
  status: LeaveStatus
  appliedOnISO: string
  reason: string
  handoverTo: string
  contactDuringLeave: string
}

interface TeamLeaveApprovalItem {
  id: string
  employeeName: string
  employeeRole: string
  leaveType: LeaveTypeId
  fromDateISO: string
  toDateISO: string
  durationDays: number
  status: LeaveStatus
}

// interface LeaveApplyForm {
//   leaveType: LeaveTypeId
//   fromDateISO: string
//   toDateISO: string
//   reason: string
//   handoverTo: string
//   contactDuringLeave: string
// }

interface LeaveWarning {
  title: string
  message: string
}

const TIME_ENTRY_STORE_KEY = 'portalTimeEntryRangeStoreV2'
const MAX_RANGE_DAYS = 31

const timeEntryTabs = ['My Timesheet', 'Calendar', 'Leave', 'Approvals'] as const
const leaveTabs = ['Leave Balance', 'Leave History'] as const
const myPayTabs = ['Overview', 'Payslips', 'Salary Breakdown', 'Tax Documents', 'Bank Details', 'Payment History'] as const
type MyPayTab = (typeof myPayTabs)[number]

const documentTabs = ['My Documents', 'Expiring Documents'] as const
type DocumentTab = (typeof documentTabs)[number]

const profileTabs = [
  'Overview',
  'Personal',
  'Contact',
  'Employment',
  'Emergency',
  'Bank',
  'Documents & IDs',
  'Skills',
  'Preferences',
  'Change Requests'
] as const
type ProfileTab = (typeof profileTabs)[number]

// ── Profile Types ──
interface PersonalInfo {
  firstName: string
  middleName: string
  lastName: string
  preferredName: string
  dateOfBirth: string
  gender: string
  maritalStatus: string
  nationality: string
  panNumber: string
  aadhaarNumber: string
}

interface ContactDetails {
  workEmail: string
  personalEmail: string
  mobileNumber: string
  alternateNumber: string
  address: string
  city: string
  state: string
  country: string
  pinCode: string
}

interface EmergencyContact {
  id: string
  name: string
  relationship: string
  phone: string
  email: string
}

interface NotificationItem {
  id: string
  category: 'payroll' | 'leave' | 'time-entry' | 'documents' | 'profile' | 'system'
  title: string
  description: string
  timestamp: string
  isRead: boolean
  actionText?: string
  module: Module
}

interface ProfileChangeRequest {
  id: string
  type: string
  description: string
  requestedDate: string
  status: 'Pending' | 'Approved' | 'Rejected'
  comments: string
}

interface IdentityDocument {
  id: string
  name: string
  number: string
  issueDate: string
  expiryDate: string
  status: 'Verified' | 'Pending' | 'Rejected'
}

interface ProfileSkill {
  id: string
  name: string
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
  experience: number
}

interface ProfileEducation {
  id: string
  degree: string
  institution: string
  fieldOfStudy: string
  yearOfPassing: string
}

interface ProfileCertification {
  id: string
  name: string
  issuingOrg: string
  issueDate: string
  expiryDate: string
  credentialId: string
}

interface ProfileLanguage {
  id: string
  name: string
  proficiency: 'Beginner' | 'Conversational' | 'Professional' | 'Fluent' | 'Native / Bilingual'
}

interface ProfilePreferences {
  preferredLanguage: string
  timeZone: string
  dateFormat: string
  timeFormat: string
  emailNotifications: {
    leaveAttendance: boolean
    payslipPayroll: boolean
    companyAnnouncements: boolean
    policyUpdates: boolean
  }
  theme: 'Light' | 'Dark' | 'System Default'
}



// ── Documents Types ──
interface PortalDocument {
  id: string
  name: string
  description?: string
  issuedOn?: string
  monthYear?: string
  financialYear?: string
  uploadedOn?: string
  status: 'Available' | 'Pending Verification' | 'Verified'
  size: string
  category?: string
  verifiedOn?: string
}


// ── My Pay Types ──
interface Payslip {
  id: string
  month: string
  payDate: string
  grossSalary: number
  netSalary: number
  status: 'Paid' | 'Pending' | 'Processing'
}

interface SalaryEarning {
  label: string
  amount: number
  color: string
}

interface SalaryDeduction {
  label: string
  amount: number
  color: string
}

interface TaxDocument {
  id: string
  name: string
  financialYear: string
  description: string
}

interface BankDetails {
  bankName: string
  branch: string
  accountNumber: string
  ifscCode: string
  routingNumber: string
  sortCode: string
  swiftCode: string
  iban: string
  accountHolderName: string
  verified: boolean
}

type BankUpdateForm = BankFormValues

interface PaymentHistoryItem {
  id: string
  month: string
  payDate: string
  grossSalary: number
  netSalary: number
  paymentMode: string
  transactionId: string
  status: 'Credited' | 'Pending' | 'Failed'
}

interface AdminEmployee {
  id: string
  name: string
  clientName: string
  role: string
  paygroup: string
  paymentMode: 'Direct Deposit' | 'Wire Transfer' | 'Check'
  prevGross: number
  currGross: number
  hasEmployeeView: boolean
  hasAdminView: boolean
  hasClientView: boolean
  hasPayrollControlAccess?: boolean
  isBlocked?: boolean
}

const adminEmployeesSeed: AdminEmployee[] = [
  { id: 'EMP-001', name: 'John Doe', clientName: 'Acme Corp', role: 'Senior Developer', paygroup: 'Engineering', paymentMode: 'Direct Deposit', prevGross: 98500, currGross: 98500, hasEmployeeView: true, hasAdminView: false, hasClientView: false, hasPayrollControlAccess: false },
  { id: 'EMP-002', name: 'Jane Smith', clientName: 'Acme Corp', role: 'UI/UX Designer', paygroup: 'Design', paymentMode: 'Direct Deposit', prevGross: 78000, currGross: 82000, hasEmployeeView: true, hasAdminView: false, hasClientView: false, hasPayrollControlAccess: false },
  { id: 'EMP-003', name: 'Robert Brown', clientName: 'Stark Industries', role: 'Security Architect', paygroup: 'Engineering', paymentMode: 'Direct Deposit', prevGross: 120000, currGross: 125000, hasEmployeeView: true, hasAdminView: false, hasClientView: false, hasPayrollControlAccess: false },
  { id: 'EMP-004', name: 'Emily Johnson', clientName: 'Stark Industries', role: 'QA Lead', paygroup: 'QA', paymentMode: 'Direct Deposit', prevGross: 85000, currGross: 85000, hasEmployeeView: true, hasAdminView: false, hasClientView: false, hasPayrollControlAccess: false },
  { id: 'EMP-005', name: 'Bruce Wayne', clientName: 'Wayne Enterprises', role: 'Director', paygroup: 'Management', paymentMode: 'Wire Transfer', prevGross: 250000, currGross: 250000, hasEmployeeView: true, hasAdminView: true, hasClientView: true, hasPayrollControlAccess: true },
  { id: 'EMP-006', name: 'Clark Kent', clientName: 'Globex Corp', role: 'Reporter', paygroup: 'Editorial', paymentMode: 'Check', prevGross: 55000, currGross: 55000, hasEmployeeView: true, hasAdminView: false, hasClientView: false, hasPayrollControlAccess: false },
  { id: 'EMP-007', name: 'Diana Prince', clientName: 'Globex Corp', role: 'Research Analyst', paygroup: 'Operations', paymentMode: 'Direct Deposit', prevGross: 95000, currGross: 97000, hasEmployeeView: true, hasAdminView: false, hasClientView: true, hasPayrollControlAccess: true },
  { id: 'EMP-008', name: 'Peter Parker', clientName: 'Acme Corp', role: 'Photographer', paygroup: 'Editorial', paymentMode: 'Check', prevGross: 45000, currGross: 46000, hasEmployeeView: true, hasAdminView: false, hasClientView: false, hasPayrollControlAccess: false },
  { id: 'EMP-009', name: 'Tony Stark', clientName: 'Stark Industries', role: 'Chief Engineer', paygroup: 'Management', paymentMode: 'Wire Transfer', prevGross: 300000, currGross: 300000, hasEmployeeView: true, hasAdminView: true, hasClientView: true, hasPayrollControlAccess: true },
  { id: 'EMP-010', name: 'Steve Rogers', clientName: 'Wayne Enterprises', role: 'Operations Manager', paygroup: 'Operations', paymentMode: 'Direct Deposit', prevGross: 110000, currGross: 110000, hasEmployeeView: true, hasAdminView: false, hasClientView: false, hasPayrollControlAccess: false }
]

export interface PayrollConfigRow {
  employeeId: string
  employeeName: string
  rateCode: string
  hours: number
  fullSalary: number
}
interface ClientOffcyclePayment {
  id: string
  employeeId: string
  employeeName: string
  clientName: string
  code: string
  amount: number
  date: string
  remarks: string
}

const clientOffcyclesSeed: ClientOffcyclePayment[] = [
  { id: 'off-001', employeeId: 'EMP-001', employeeName: 'John Doe', clientName: 'Acme Corp', code: 'Performance Incentive', amount: 8000, date: '10 July 2025', remarks: 'Q2 Performance Bonus' },
  { id: 'off-002', employeeId: 'EMP-002', employeeName: 'Jane Smith', clientName: 'Acme Corp', code: 'Referral Bonus', amount: 5000, date: '08 July 2025', remarks: 'Referred developer candidate' },
  { id: 'off-003', employeeId: 'EMP-003', employeeName: 'Robert Brown', clientName: 'Stark Industries', code: 'Shift Bonus', amount: 3500, date: '11 July 2025', remarks: 'Weekend overnight shifts' }
]

type ClientEmployeeStatus = 'Active' | 'Terminated' | 'Onboarding in Progress'

interface ClientPersonnel {
  id: string
  name: string
  role: string
  paygroup: string
  paymentMethod: string
  clientName: string
  status: ClientEmployeeStatus
}

const clientPersonnelSeed: ClientPersonnel[] = [
  { id: 'EMP-001', name: 'John Doe', role: 'Senior Developer', paygroup: 'Engineering', paymentMethod: 'Direct Deposit', clientName: 'Acme Corp', status: 'Active' },
  { id: 'EMP-002', name: 'Jane Smith', role: 'UI/UX Designer', paygroup: 'Design', paymentMethod: 'Direct Deposit', clientName: 'Acme Corp', status: 'Active' },
  { id: 'EMP-003', name: 'Robert Brown', role: 'Security Architect', paygroup: 'Engineering', paymentMethod: 'Direct Deposit', clientName: 'Stark Industries', status: 'Onboarding in Progress' },
  { id: 'EMP-004', name: 'Emily Johnson', role: 'QA Lead', paygroup: 'QA', paymentMethod: 'Direct Deposit', clientName: 'Stark Industries', status: 'Active' },
  { id: 'EMP-008', name: 'Peter Parker', role: 'Photographer', paygroup: 'Editorial', paymentMethod: 'Check', clientName: 'Acme Corp', status: 'Terminated' },
]

const clientStatusPillClass: Record<ClientEmployeeStatus, string> = {
  Active: 'active',
  Terminated: 'terminated',
  'Onboarding in Progress': 'onboarding',
}

const currentYear = new Date().getFullYear()

const clientDashboardPayPeriods = [
  { value: `${currentYear}-07`, label: `July ${currentYear}` },
  { value: `${currentYear}-06`, label: `June ${currentYear}` },
  { value: `${currentYear}-05`, label: `May ${currentYear}` },
  { value: `${currentYear}-04`, label: `April ${currentYear}` },
]

type ClientDashboardPayPeriod = string

function getClientEmployeeGrossUsd(employeeId: string, payPeriod: ClientDashboardPayPeriod): number {
  const emp = adminEmployeesSeed.find((e) => e.id === employeeId)
  if (!emp) return 0
  const cYear = new Date().getFullYear()
  if (payPeriod === `${cYear}-07`) return emp.currGross
  if (payPeriod === `${cYear}-06`) return emp.prevGross
  if (payPeriod === `${cYear}-05`) return Math.round(emp.prevGross * 0.98)
  return Math.round(emp.prevGross * 0.96)
}

const formatUsdCurrency = (amount: number) =>
  `$ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

interface PortalAccessLog {
  id: string
  username: string
  role: string
  action: string
  timestamp: string
  ipAddress: string
}

const portalAccessLogsSeed: PortalAccessLog[] = [
  { id: 'log-001', username: 'admin_user', role: 'admin', action: 'Accessed Reconciliation Tab', timestamp: '13 July 2026 14:12:15', ipAddress: '192.168.1.45' },
  { id: 'log-002', username: 'stark_client', role: 'client', action: 'Approved Stark Timesheets', timestamp: '13 July 2026 11:45:22', ipAddress: '192.168.1.102' },
  { id: 'log-003', username: 'john_doe', role: 'employee', action: 'Downloaded June Payslip', timestamp: '12 July 2026 18:22:10', ipAddress: '10.0.0.8' },
  { id: 'log-004', username: 'admin_user', role: 'admin', action: 'Granted Stark Manager Client Access', timestamp: '11 July 2026 15:30:00', ipAddress: '192.168.1.45' },
  { id: 'log-005', username: 'wayne_client', role: 'client', action: 'Downloaded Payroll Variance CSV', timestamp: '10 July 2026 09:12:35', ipAddress: '172.16.254.1' }
]


// ── My Pay Seed Data ──
const payslipSeedData: Payslip[] = [
  { id: 'ps-001', month: 'June 2025', payDate: '30 Jun 2025', grossSalary: 98500, netSalary: 68750, status: 'Paid' },
  { id: 'ps-002', month: 'May 2025', payDate: '31 May 2025', grossSalary: 98500, netSalary: 68750, status: 'Paid' },
  { id: 'ps-003', month: 'April 2025', payDate: '30 Apr 2025', grossSalary: 98500, netSalary: 68750, status: 'Paid' },
  { id: 'ps-004', month: 'March 2025', payDate: '31 Mar 2025', grossSalary: 95000, netSalary: 66300, status: 'Paid' },
  { id: 'ps-005', month: 'February 2025', payDate: '28 Feb 2025', grossSalary: 95000, netSalary: 66300, status: 'Paid' },
  { id: 'ps-006', month: 'January 2025', payDate: '31 Jan 2025', grossSalary: 95000, netSalary: 66300, status: 'Paid' },
  { id: 'ps-007', month: 'December 2024', payDate: '31 Dec 2024', grossSalary: 95000, netSalary: 66300, status: 'Paid' },
  { id: 'ps-008', month: 'November 2024', payDate: '30 Nov 2024', grossSalary: 92000, netSalary: 64100, status: 'Paid' },
  { id: 'ps-009', month: 'October 2024', payDate: '31 Oct 2024', grossSalary: 92000, netSalary: 64100, status: 'Paid' },
  { id: 'ps-010', month: 'September 2024', payDate: '30 Sep 2024', grossSalary: 92000, netSalary: 64100, status: 'Paid' },
  { id: 'ps-011', month: 'August 2024', payDate: '31 Aug 2024', grossSalary: 90000, netSalary: 62500, status: 'Paid' },
  { id: 'ps-012', month: 'July 2024', payDate: '31 Jul 2024', grossSalary: 90000, netSalary: 62500, status: 'Paid' },
]

const salaryEarnings: SalaryEarning[] = [
  { label: 'Basic Salary', amount: 45000, color: '#5a7dff' },
  { label: 'House Rent Allowance (HRA)', amount: 18000, color: '#8f63ff' },
  { label: 'Special Allowance', amount: 15000, color: '#f48e3f' },
  { label: 'Conveyance Allowance', amount: 3200, color: '#f4723f' },
  { label: 'Performance Bonus', amount: 5000, color: '#48b36a' },
  { label: 'Employer PF Contribution', amount: 7500, color: '#56c2d6' },
]

const salaryDeductions: SalaryDeduction[] = [
  { label: 'Employee PF Contribution', amount: 4000, color: '#8f63ff' },
  { label: 'Professional Tax', amount: 200, color: '#f48e3f' },
  { label: 'Income Tax (TDS)', amount: 9000, color: '#f4b03f' },
  { label: 'Health Insurance', amount: 1500, color: '#e74c3c' },
  { label: 'Other Deductions', amount: 15050, color: '#5a4fbf' },
]

const taxDocumentSeedData: TaxDocument[] = [
  { id: 'td-w4', name: 'W-4', financialYear: '2024-25', description: "Employee's Withholding Certificate for federal income tax withholding." },
  { id: 'td-i9', name: 'I-9', financialYear: '2024-25', description: 'Employment Eligibility Verification form to verify identity and work authorization.' },
  { id: 'td-w2', name: 'W-2', financialYear: '2024-25', description: 'Wage and Tax Statement reporting annual wages and taxes withheld.' },
  { id: 'td-w2c', name: 'W-2C', financialYear: '2024-25', description: 'Corrected Wage and Tax Statement to rectify errors on previously filed W-2 forms.' },
  { id: 'td-w3', name: 'W-3', financialYear: '2024-25', description: 'Transmittal of Wage and Tax Statements summarizing W-2 forms.' },
  { id: 'td-t4', name: 'T-4', financialYear: '2024-25', description: 'Statement of Remuneration Paid for Canadian tax reporting.' },
  { id: 'td-garn', name: 'Garnishment - Court order', financialYear: '2024-25', description: 'Court order details regarding garnishment of wages or salary withholding.' },
  { id: 'td-001', name: 'Form 16', financialYear: '2024-25', description: 'Annual tax statement as per income tax act.' },
  { id: 'td-004', name: 'Investment Proof Declaration', financialYear: '2024-25', description: 'Proof of your declared investments.' },
]

const bankDetailsSeed: BankDetails = {
  bankName: 'HDFC Bank Limited',
  branch: 'Koramangala 4th Block',
  accountNumber: 'XXXX XXXX 4589',
  ifscCode: 'HDFC0001234',
  routingNumber: '',
  sortCode: '',
  swiftCode: '',
  iban: '',
  accountHolderName: 'John Doe',
  verified: true,
}

const secondaryBankDetailsSeed: (BankDetails & { label: string }) | null = null

const paymentHistorySeed: PaymentHistoryItem[] = [
  { id: 'ph-001', month: 'June 2025', payDate: '30 Jun 2025', grossSalary: 98500, netSalary: 68750, paymentMode: 'NEFT', transactionId: 'NEFT202506300001', status: 'Credited' },
  { id: 'ph-002', month: 'May 2025', payDate: '31 May 2025', grossSalary: 98500, netSalary: 68750, paymentMode: 'NEFT', transactionId: 'NEFT202505310001', status: 'Credited' },
  { id: 'ph-003', month: 'April 2025', payDate: '30 Apr 2025', grossSalary: 98500, netSalary: 68750, paymentMode: 'NEFT', transactionId: 'NEFT202504300001', status: 'Credited' },
  { id: 'ph-004', month: 'March 2025', payDate: '31 Mar 2025', grossSalary: 95000, netSalary: 66300, paymentMode: 'NEFT', transactionId: 'NEFT202503310001', status: 'Credited' },
  { id: 'ph-005', month: 'February 2025', payDate: '28 Feb 2025', grossSalary: 95000, netSalary: 66300, paymentMode: 'NEFT', transactionId: 'NEFT202502280001', status: 'Credited' },
  { id: 'ph-006', month: 'January 2025', payDate: '31 Jan 2025', grossSalary: 95000, netSalary: 66300, paymentMode: 'NEFT', transactionId: 'NEFT202501310001', status: 'Credited' },
]

// ── Documents Seed Data ──
// const employmentDocsSeed: PortalDocument[] = [
//   { id: 'ed-003', name: 'Appointment Letter', description: 'Your appointment confirmation letter', issuedOn: '12 Jun 2023', status: 'Available', size: '300 KB' },
//   // { id: 'ed-004', name: 'Promotion Letter', description: 'Promotion to Senior Product Designer', issuedOn: '15 Jan 2025', status: 'Available', size: '210 KB' },
//   { id: 'ed-005', name: 'Experience Letter', description: 'Experience letter for previous employment', issuedOn: '20 Dec 2024', status: 'Available', size: '150 KB' },
// ]



const taxDocsSeed: PortalDocument[] = [
  { id: 'td-001', name: 'Form 16', description: 'Annual tax statement', financialYear: '2024-25', status: 'Available', size: '1.1 MB' },
  { id: 'td-004', name: 'Investment Declaration', description: 'Proof of your declared investments', financialYear: '2024-25', status: 'Available', size: '2.5 MB' },
]

const uploadedDocsSeed: PortalDocument[] = [
  { id: 'ud-001', name: 'Passport', category: 'Identity Proof', uploadedOn: '10 Jan 2025', status: 'Verified', verifiedOn: '11 Jan 2025', size: '450 KB' },
  { id: 'ud-002', name: 'Visa', category: 'Work Authorization', uploadedOn: '05 Jan 2025', status: 'Pending Verification', verifiedOn: '-', size: '1.5 MB' },
  { id: 'ud-003', name: 'Aadhaar Card', category: 'Identity Proof', uploadedOn: '10 Jan 2025', status: 'Verified', verifiedOn: '11 Jan 2025', size: '300 KB' },
  { id: 'ud-004', name: 'PAN Card', category: 'Tax Document', uploadedOn: '10 Jan 2025', status: 'Verified', verifiedOn: '11 Jan 2025', size: '250 KB' },
  { id: 'ud-005', name: 'Bank Proof', category: 'Bank Details', uploadedOn: '10 Jan 2025', status: 'Verified', verifiedOn: '11 Jan 2025', size: '180 KB' },
  { id: 'ud-006', name: 'Degree Certificate', category: 'Qualification', uploadedOn: '10 Jan 2025', status: 'Verified', verifiedOn: '11 Jan 2025', size: '800 KB' },
]

const personalInfoSeed: PersonalInfo = {
  firstName: 'John',
  middleName: 'Michael',
  lastName: 'Doe',
  preferredName: 'John',
  dateOfBirth: '1992-05-14',
  gender: 'Male',
  maritalStatus: 'Single',
  nationality: 'Indian',
  panNumber: 'ABCDE1234F',
  aadhaarNumber: 'XXXX XXXX 4589',
}

const contactDetailsSeed: ContactDetails = {
  workEmail: 'john.doe@abc.com',
  personalEmail: 'john.doe@gmail.com',
  mobileNumber: '+91 98765 43210',
  alternateNumber: '+91 91234 56789',
  address: '123, 4th Cross, Koramangala',
  city: 'Bangalore',
  state: 'Karnataka',
  country: 'India',
  pinCode: '560034',
}

const emergencyContactsSeed: EmergencyContact[] = [
  { id: 'ec-001', name: 'Jane Doe', relationship: 'Sister', phone: '+91 98765 11111', email: 'jane.doe@gmail.com' },
  { id: 'ec-002', name: 'Robert Doe', relationship: 'Father', phone: '+91 98765 22222', email: 'robert.doe@gmail.com' },
  { id: 'ec-003', name: 'Mary Doe', relationship: 'Mother', phone: '+91 98765 33333', email: 'mary.doe@gmail.com' },
]

const profileChangeRequestsSeed: ProfileChangeRequest[] = [
  { id: 'cr-001', type: 'Bank Account Change', description: 'Change account ending with 1234', requestedDate: '10 Jun 2025', status: 'Pending', comments: 'Awaiting HR approval' },
  { id: 'cr-002', type: 'Personal Email Change', description: 'Update personal email address', requestedDate: '05 May 2025', status: 'Approved', comments: 'Email updated successfully' },
  { id: 'cr-003', type: 'Address Change', description: 'Update permanent address', requestedDate: '20 Apr 2025', status: 'Approved', comments: 'Address updated' },
  { id: 'cr-004', type: 'PAN Update', description: 'Update PAN number', requestedDate: '15 Mar 2025', status: 'Rejected', comments: 'Invalid PAN document' },
]

const identityDocumentsSeed: IdentityDocument[] = [
  { id: 'id-001', name: 'Passport', number: 'P1234567', issueDate: '10 Jan 2023', expiryDate: '09 Jan 2033', status: 'Verified' },
  { id: 'id-002', name: 'Aadhaar Card', number: 'XXXX XXXX 4589', issueDate: '10 Jan 2020', expiryDate: '-', status: 'Verified' },
  { id: 'id-003', name: 'PAN Card', number: 'ABCDE1234F', issueDate: '15 Feb 2019', expiryDate: '-', status: 'Verified' },
  { id: 'id-004', name: 'Driving License', number: 'KA05 20190012345', issueDate: '20 Mar 2021', expiryDate: '19 Mar 2031', status: 'Verified' },
  { id: 'id-005', name: 'Work Permit', number: 'WP123456', issueDate: '01 Apr 2023', expiryDate: '31 Mar 2026', status: 'Verified' },
  { id: 'id-006', name: 'Visa', number: 'V1234567', issueDate: '01 Apr 2023', expiryDate: '31 Mar 2026', status: 'Verified' },
]

const profileSkillsSeed: ProfileSkill[] = [
  { id: 'sk-001', name: 'JavaScript', proficiency: 'Expert', experience: 5 },
  { id: 'sk-002', name: 'React', proficiency: 'Expert', experience: 4 },
  { id: 'sk-003', name: 'Node.js', proficiency: 'Advanced', experience: 3 },
  { id: 'sk-004', name: 'SQL', proficiency: 'Advanced', experience: 4 },
  { id: 'sk-005', name: 'AWS', proficiency: 'Intermediate', experience: 2 },
]

const profileEducationSeed: ProfileEducation[] = [
  { id: 'edu-001', degree: 'Bachelor of Engineering', institution: 'Visvesvaraya Technological University (VTU)', fieldOfStudy: 'Computer Science', yearOfPassing: '2014' },
]

const profileCertificationsSeed: ProfileCertification[] = [
  { id: 'cert-001', name: 'AWS Certified Solutions Architect', issuingOrg: 'Amazon Web Services', issueDate: '12 Dec 2024', expiryDate: '12 Dec 2027', credentialId: 'AWS-12345' },
]

const profileLanguagesSeed: ProfileLanguage[] = [
  { id: 'lang-001', name: 'English', proficiency: 'Native / Bilingual' },
  { id: 'lang-002', name: 'Hindi', proficiency: 'Fluent' },
]

const profilePreferencesSeed: ProfilePreferences = {
  preferredLanguage: 'English',
  timeZone: '(GMT+05:30) Asia/Kolkata',
  dateFormat: 'DD MMM YYYY',
  timeFormat: '12 Hour',
  emailNotifications: {
    leaveAttendance: true,
    payslipPayroll: true,
    companyAnnouncements: true,
    policyUpdates: true,
  },
  theme: 'Light',
}




const formatCurrency = (amount: number) =>
  `$ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

const maskAccountNumber = (num: string) => num

const statusLabel: Record<TimeEntryStatus, string> = {
  submitted: 'Submitted',
  draft: 'Draft',
  returned: 'Returned',
  none: '-',
}

const timeHistoryStatusLabel: Record<TimeHistoryStatus, string> = {
  approved: 'Approved',
  draft: 'Draft',
  returned: 'Returned',
}

const approvalStatusLabel: Record<ApprovalStatus, string> = {
  pending: 'Pending Approval',
  approved: 'Approved',
  returned: 'Returned',
}

const leaveStatusLabel: Record<LeaveStatus, string> = {
  pending: 'Pending Approval',
  approved: 'Approved',
  returned: 'Returned',
  cancelled: 'Cancelled',
}

const leaveTypeLabel: Record<LeaveTypeId, string> = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  casual: 'Casual Leave',
  comp: 'Comp Off',
  maternity: 'Maternity Leave',
  paternity: 'Paternity Leave',
  lwp: 'Leave Without Pay (LWP)',
  adoption: 'Adoption Leave',
  vacation: 'Vacation Time Off',
  jury: 'Jury Duty Leave',
  std: 'Short-term disability (STD)',
  ltd: 'Long-term disability (LTD)',
  bereavement: 'Bereavement Leave',
}

const leaveTypeDescriptions: Record<LeaveTypeId, string> = {
  annual: 'Paid time off for vacation.',
  sick: 'Leave for medical reasons.',
  casual: 'Short-term personal leave.',
  comp: 'Compensatory time off.',
  maternity: 'Maternity benefit leave.',
  paternity: 'Paternity leave benefit.',
  lwp: 'Unpaid leave of absence.',
  adoption: 'Leave for parents adopting a child.',
  vacation: 'Vacation or personal time off.',
  jury: 'Time off for serving on a jury.',
  std: 'Leave due to short-term illness or injury.',
  ltd: 'Leave due to long-term illness or injury.',
  bereavement: 'Leave following the loss of a loved one.',
}

const leaveSeedBalances: LeaveBalanceItem[] = [
  { id: 'annual', name: 'Annual Leave', entitlement: 24, used: 6, pending: 0, color: '#5a7dff' },
  { id: 'sick', name: 'Sick Leave', entitlement: 12, used: 2, pending: 0, color: '#48b36a' },
  { id: 'casual', name: 'Casual Leave', entitlement: 12, used: 4, pending: 2, color: '#8f63ff' },
  { id: 'comp', name: 'Comp Off', entitlement: 6, used: 2, pending: 1, color: '#f4ac3f' },
  { id: 'maternity', name: 'Maternity Leave', entitlement: 180, used: 0, pending: 0, color: '#ff7da8' },
  { id: 'paternity', name: 'Paternity Leave', entitlement: 15, used: 0, pending: 0, color: '#56c2d6' },
  { id: 'lwp', name: 'Leave Without Pay (LWP)', entitlement: 30, used: 0, pending: 0, color: '#94a3b8' },
  { id: 'adoption', name: 'Adoption Leave', entitlement: 42, used: 0, pending: 0, color: '#ec4899' },
  { id: 'vacation', name: 'Vacation Time Off', entitlement: 15, used: 0, pending: 0, color: '#eab308' },
  { id: 'jury', name: 'Jury Duty Leave', entitlement: 10, used: 0, pending: 0, color: '#10b981' },
  { id: 'std', name: 'Short-term disability (STD)', entitlement: 90, used: 0, pending: 0, color: '#3b82f6' },
  { id: 'ltd', name: 'Long-term disability (LTD)', entitlement: 180, used: 0, pending: 0, color: '#6366f1' },
  { id: 'bereavement', name: 'Bereavement Leave', entitlement: 5, used: 0, pending: 0, color: '#a855f7' }
]

const leaveSeedRequests: LeaveRequestItem[] = [
  {
    id: 'lv-001',
    leaveType: 'annual',
    fromDateISO: '2025-07-21',
    toDateISO: '2025-07-22',
    durationDays: 2,
    status: 'pending',
    appliedOnISO: '2025-07-18',
    reason: 'Family trip',
    handoverTo: 'Robert Brown',
    contactDuringLeave: '9876543210',
  },
  {
    id: 'lv-002',
    leaveType: 'sick',
    fromDateISO: '2025-07-10',
    toDateISO: '2025-07-10',
    durationDays: 1,
    status: 'approved',
    appliedOnISO: '2025-07-10',
    reason: 'Fever and rest advised',
    handoverTo: 'Nina Rao',
    contactDuringLeave: '9876543210',
  },
  {
    id: 'lv-003',
    leaveType: 'casual',
    fromDateISO: '2025-06-25',
    toDateISO: '2025-06-25',
    durationDays: 1,
    status: 'approved',
    appliedOnISO: '2025-06-24',
    reason: 'Personal errand',
    handoverTo: 'Jane Smith',
    contactDuringLeave: '9876543210',
  },
  {
    id: 'lv-004',
    leaveType: 'comp',
    fromDateISO: '2025-06-05',
    toDateISO: '2025-06-05',
    durationDays: 1,
    status: 'approved',
    appliedOnISO: '2025-06-05',
    reason: 'Comp off for release weekend',
    handoverTo: 'Emily Johnson',
    contactDuringLeave: '9876543210',
  },
  {
    id: 'lv-005',
    leaveType: 'sick',
    fromDateISO: '2025-05-20',
    toDateISO: '2025-05-20',
    durationDays: 1,
    status: 'cancelled',
    appliedOnISO: '2025-05-20',
    reason: 'Recovered quickly and resumed work',
    handoverTo: 'Michael Lee',
    contactDuringLeave: '9876543210',
  },
]

const leaveSeedApprovals: TeamLeaveApprovalItem[] = [
  {
    id: 'ap-001',
    employeeName: 'Jane Smith',
    employeeRole: 'UI/UX Designer',
    leaveType: 'annual',
    fromDateISO: '2025-07-22',
    toDateISO: '2025-07-23',
    durationDays: 2,
    status: 'pending',
  },
  {
    id: 'ap-002',
    employeeName: 'Robert Brown',
    employeeRole: 'Frontend Dev',
    leaveType: 'sick',
    fromDateISO: '2025-07-21',
    toDateISO: '2025-07-21',
    durationDays: 1,
    status: 'pending',
  },
  {
    id: 'ap-003',
    employeeName: 'Emily Johnson',
    employeeRole: 'QA Engineer',
    leaveType: 'casual',
    fromDateISO: '2025-07-21',
    toDateISO: '2025-07-21',
    durationDays: 1,
    status: 'returned',
  },
]

const toIso = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const fromIso = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const getTodayDate = () => {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate())
}

const getTodayIso = () => toIso(getTodayDate())

const isOlderThan5Days = (dayKey: string) => {
  const today = getTodayDate()
  const date = fromIso(dayKey)
  const diffTime = today.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 5
}

const formatDateShort = (date: Date) =>
  date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })

const formatDateLong = (iso: string) => {
  const date = fromIso(iso)
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatDateWithYear = (iso: string) =>
  fromIso(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const getRangeLabel = (fromDateISO: string, toDateISO: string) => {
  const start = fromIso(fromDateISO)
  const end = fromIso(toDateISO)
  return `${formatDateShort(start)} - ${formatDateShort(end)} ${end.getFullYear()}`
}

const makeRangeKey = (fromDateISO: string, toDateISO: string) => `${fromDateISO}_${toDateISO}`

const isWeekdayIso = (iso: string) => {
  const day = fromIso(iso).getDay()
  return day >= 1 && day <= 5
}

const formatHours = (value: number) => value.toFixed(1)

const parseTime12To24 = (value: string) => {
  if (value === '--') return ''
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return ''
  const hours = Number(match[1]) % 12
  const minutes = Number(match[2])
  const period = match[3].toUpperCase()
  const finalHours = period === 'PM' ? hours + 12 : hours
  return `${String(finalHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

const formatTime24To12 = (value: string) => {
  if (!value) return '--'
  const [hStr, mStr] = value.split(':')
  const hours = Number(hStr)
  const minutes = Number(mStr)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return '--'
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 === 0 ? 12 : hours % 12
  return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`
}

const parseBreakDurationToMinutes = (value: string) => {
  if (value === '--') return 0
  const match = value.match(/^(\d{2}):(\d{2})\s*hr$/i)
  if (!match) return 0
  return Number(match[1]) * 60 + Number(match[2])
}

const formatBreakMinutes = (minutes: number) => {
  const safe = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safe / 60)
  const mins = safe % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} hr`
}

const minutesFromTime = (value: string) => {
  const [hStr, mStr] = value.split(':')
  const hours = Number(hStr)
  const mins = Number(mStr)
  if (Number.isNaN(hours) || Number.isNaN(mins)) return null
  return hours * 60 + mins
}

const dayLabelFromIso = (iso: string) =>
  fromIso(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
  })

const dateLabelFromIso = (iso: string) =>
  fromIso(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)

const startOfWeek = (date: Date) => {
  const weekday = date.getDay()
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday
  return addDays(date, mondayOffset)
}

const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1)

const isSameMonth = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth()

const formatMonthYear = (date: Date) =>
  date.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

const calendarWeekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const buildCalendarGrid = (monthDate: Date) => {
  const monthStart = startOfMonth(monthDate)
  const mondayOffset = (monthStart.getDay() + 6) % 7
  const gridStart = addDays(monthStart, -mondayOffset)

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
}

const isFutureIso = (iso: string) => fromIso(iso).getTime() > getTodayDate().getTime()

// const countWeekdaysInclusive = (fromDateISO: string, toDateISO: string) => {
//   const from = fromIso(fromDateISO)
//   const to = fromIso(toDateISO)
//   if (from > to) return 0

//   let count = 0
//   const cursor = new Date(from)
//   while (cursor.getTime() <= to.getTime()) {
//     const weekday = cursor.getDay()
//     if (weekday >= 1 && weekday <= 5) {
//       count += 1
//     }
//     cursor.setDate(cursor.getDate() + 1)
//   }

//   return count
// }

// const doesDateRangeOverlap = (
//   leftFromISO: string,
//   leftToISO: string,
//   rightFromISO: string,
//   rightToISO: string,
// ) => {
//   const leftFrom = fromIso(leftFromISO).getTime()
//   const leftTo = fromIso(leftToISO).getTime()
//   const rightFrom = fromIso(rightFromISO).getTime()
//   const rightTo = fromIso(rightToISO).getTime()

//   return leftFrom <= rightTo && rightFrom <= leftTo
// }

const deriveLeaveBalances = (balances: LeaveBalanceItem[], requests: LeaveRequestItem[]) => {
  const usage = requests.reduce(
    (acc, request) => {
      if (request.status === 'approved') {
        acc[request.leaveType].used += request.durationDays
      }
      if (request.status === 'pending') {
        acc[request.leaveType].pending += request.durationDays
      }
      return acc
    },
    Object.fromEntries(
      balances.map((item) => [item.id, { used: 0, pending: 0 }]),
    ) as Record<LeaveTypeId, { used: number; pending: number }>,
  )

  return balances.map((item) => ({
    ...item,
    used: usage[item.id].used,
    pending: usage[item.id].pending,
  }))
}

const getCurrentTimeEntryBounds = () => {
  const today = getTodayDate()
  const fromDate = startOfWeek(today)

  return {
    fromDateISO: toIso(fromDate),
    toDateISO: toIso(today),
  }
}

const getPreferredSelectedDayKey = (days: TimeEntryDay[], todayIso: string) =>
  days.find((day) => day.key === todayIso)?.key
  ?? days.find((day) => !isFutureIso(day.key))?.key
  ?? days[0]?.key
  ?? ''

const seedRangeData = (range: TimeEntryRangeData) => {
  const seeded: Array<Partial<TimeEntryDay>> = [
    { status: 'draft', hours: 8, regularHours: 8, overtimeHours: 0, notes: '' },
    { status: 'draft', hours: 8, regularHours: 8, overtimeHours: 0, notes: '' },
    { status: 'submitted', hours: 8, regularHours: 8, overtimeHours: 0, notes: '' },
    { status: 'draft', hours: 7.5, regularHours: 7.5, overtimeHours: 0, endTime: '05:30 PM', notes: '' },
    { status: 'draft', hours: 7, regularHours: 7, overtimeHours: 0, endTime: '05:00 PM', notes: '' },
  ]

  range.days = range.days.map((day, idx) => {
    if (!isWeekdayIso(day.key)) {
      return day
    }

    return { ...day, ...seeded[idx] }
  })

  return range
}

const createCurrentRangeData = () => {
  const { fromDateISO, toDateISO } = getCurrentTimeEntryBounds()
  return seedRangeData(buildRangeData(fromDateISO, toDateISO))
}

const buildApprovalDetailsFromDays = (days: TimeEntryDay[]): ApprovalDayDetail[] =>
  days.map((day) => ({
    key: day.key,
    label: day.label,
    dateLabel: day.dateLabel,
    hours: day.hours,
    regularHours: day.regularHours,
    overtimeHours: day.overtimeHours,
  }))

const distributeHoursAcrossWeek = (totalHours: number, regularHours: number, overtimeHours: number) => {
  const regularPerDay = Array.from({ length: 5 }, () => 0)
  let remainingRegular = regularHours

  regularPerDay.forEach((_, index) => {
    const allocation = Math.min(8, remainingRegular)
    regularPerDay[index] = Number(allocation.toFixed(1))
    remainingRegular = Number((remainingRegular - allocation).toFixed(1))
  })

  const hoursPerDay = [...regularPerDay]
  if (overtimeHours > 0) {
    hoursPerDay[4] = Number((hoursPerDay[4] + overtimeHours).toFixed(1))
  }

  const consumed = hoursPerDay.reduce((sum, value) => sum + value, 0)
  if (consumed < totalHours) {
    hoursPerDay[4] = Number((hoursPerDay[4] + (totalHours - consumed)).toFixed(1))
  }

  return { regularPerDay, hoursPerDay }
}

const buildSeedApprovalDetails = (fromDateISO: string, totalHours: number, regularHours: number, overtimeHours: number) => {
  const weekStart = fromIso(fromDateISO)
  const { regularPerDay, hoursPerDay } = distributeHoursAcrossWeek(totalHours, regularHours, overtimeHours)

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index)
    const iso = toIso(date)
    const weekdayIndex = index < 5 ? index : -1
    const regular = weekdayIndex >= 0 ? regularPerDay[weekdayIndex] : 0
    const hours = weekdayIndex >= 0 ? hoursPerDay[weekdayIndex] : 0
    const overtime = Number(Math.max(0, hours - regular).toFixed(1))

    return {
      key: iso,
      label: dayLabelFromIso(iso),
      dateLabel: dateLabelFromIso(iso),
      hours,
      regularHours: regular,
      overtimeHours: overtime,
    }
  })
}

const buildApprovalItemFromRange = (range: TimeEntryRangeData): ApprovalItem => {
  const totalHours = Number(range.days.reduce((sum, day) => sum + day.hours, 0).toFixed(1))
  const regularHours = Number(range.days.reduce((sum, day) => sum + day.regularHours, 0).toFixed(1))
  const overtimeHours = Number(range.days.reduce((sum, day) => sum + day.overtimeHours, 0).toFixed(1))

  return {
    key: makeRangeKey(range.fromDateISO, range.toDateISO),
    employeeName: 'John Doe',
    employeeRole: 'Product Designer',
    fromDateISO: range.fromDateISO,
    toDateISO: range.toDateISO,
    totalHours,
    regularHours,
    overtimeHours,
    leaveHours: 0,
    submittedOnISO: range.submittedOnISO ?? range.toDateISO,
    status: range.approvalStatus ?? (range.days.some((day) => day.status === 'returned') ? 'returned' : 'pending'),
    details: buildApprovalDetailsFromDays(range.days),
  }
}

const createSeedApprovalItems = (today: Date): ApprovalItem[] => {
  return createSeedHistoryItems(today)
    .filter((item) => item.status !== 'draft')
    .map((item) => ({
      key: `approval-${item.key}`,
      employeeName: 'John Doe',
      employeeRole: 'Product Designer',
      fromDateISO: item.fromDateISO,
      toDateISO: item.toDateISO,
      totalHours: item.totalHours,
      regularHours: item.regularHours,
      overtimeHours: item.overtimeHours,
      leaveHours: item.leaveHours,
      submittedOnISO: item.submittedOnISO,
      status: item.status === 'approved' ? 'approved' : 'returned',
      details: buildSeedApprovalDetails(item.fromDateISO, item.totalHours, item.regularHours, item.overtimeHours),
    }))
}

const mapRangeStatusToHistoryStatus = (range: TimeEntryRangeData): TimeHistoryStatus => {
  if (range.approvalStatus === 'approved') {
    return 'approved'
  }
  if (range.approvalStatus === 'returned') {
    return 'returned'
  }
  if (range.days.some((day) => day.status === 'returned')) {
    return 'returned'
  }
  if (range.days.some((day) => day.status === 'draft')) {
    return 'draft'
  }
  return 'approved'
}

const buildHistoryItemFromRange = (range: TimeEntryRangeData): TimeHistoryItem => {
  const totals = range.days.reduce(
    (acc, day) => {
      acc.totalHours += day.hours
      acc.regularHours += day.regularHours
      acc.overtimeHours += day.overtimeHours
      return acc
    },
    { totalHours: 0, regularHours: 0, overtimeHours: 0 },
  )

  const status = mapRangeStatusToHistoryStatus(range)
  const weekEnd = fromIso(range.toDateISO)
  const submittedOnISO = status === 'draft' ? '' : range.toDateISO
  const approvedOnISO = status === 'approved' ? toIso(addDays(weekEnd, 1)) : ''

  return {
    key: makeRangeKey(range.fromDateISO, range.toDateISO),
    fromDateISO: range.fromDateISO,
    toDateISO: range.toDateISO,
    totalHours: Number(totals.totalHours.toFixed(1)),
    regularHours: Number(totals.regularHours.toFixed(1)),
    overtimeHours: Number(totals.overtimeHours.toFixed(1)),
    leaveHours: 0,
    status,
    submittedOnISO,
    approvedOnISO,
  }
}

const createSeedHistoryItems = (today: Date) => {
  const currentWeekStart = startOfWeek(today)

  const seedRows: Array<{
    weeksAgo: number
    totalHours: number
    regularHours: number
    overtimeHours: number
    leaveHours: number
    status: TimeHistoryStatus
    submittedOffset: number
    approvedOffset: number | null
  }> = [
      { weeksAgo: 0, totalHours: 38.5, regularHours: 36, overtimeHours: 2.5, leaveHours: 0, status: 'draft', submittedOffset: 0, approvedOffset: null },
      { weeksAgo: 1, totalHours: 42, regularHours: 40, overtimeHours: 2, leaveHours: 0, status: 'approved', submittedOffset: 6, approvedOffset: 6 },
      { weeksAgo: 2, totalHours: 39, regularHours: 38, overtimeHours: 1, leaveHours: 0, status: 'approved', submittedOffset: 6, approvedOffset: 7 },
      { weeksAgo: 3, totalHours: 41, regularHours: 40, overtimeHours: 1, leaveHours: 0, status: 'returned', submittedOffset: 6, approvedOffset: null },
      { weeksAgo: 4, totalHours: 40, regularHours: 40, overtimeHours: 0, leaveHours: 0, status: 'approved', submittedOffset: 6, approvedOffset: 7 },
      { weeksAgo: 5, totalHours: 40, regularHours: 40, overtimeHours: 0, leaveHours: 0, status: 'approved', submittedOffset: 6, approvedOffset: 7 },
    ]

  return seedRows.map((item) => {
    const fromDate = addDays(currentWeekStart, item.weeksAgo * -7)
    const toDate = item.weeksAgo === 0 ? today : addDays(fromDate, 6)
    const submittedOnISO = item.status === 'draft' ? '' : toIso(addDays(fromDate, item.submittedOffset))
    const approvedOnISO = item.approvedOffset === null ? '' : toIso(addDays(fromDate, item.approvedOffset))

    return {
      key: makeRangeKey(toIso(fromDate), toIso(toDate)),
      fromDateISO: toIso(fromDate),
      toDateISO: toIso(toDate),
      totalHours: item.totalHours,
      regularHours: item.regularHours,
      overtimeHours: item.overtimeHours,
      leaveHours: item.leaveHours,
      status: item.status,
      submittedOnISO,
      approvedOnISO,
    } satisfies TimeHistoryItem
  })
}

function buildRangeData(fromDateISO: string, toDateISO: string, templateDays?: TimeEntryDay[]): TimeEntryRangeData {
  const fromDate = fromIso(fromDateISO)
  const toDate = fromIso(toDateISO)

  const days: TimeEntryDay[] = []
  let current = new Date(fromDate)
  let index = 0

  while (current <= toDate && index < MAX_RANGE_DAYS) {
    const iso = toIso(current)
    const template = templateDays?.[index]
    const weekday = isWeekdayIso(iso)

    const baseHours = template?.hours ?? (weekday ? 8 : 0)
    const baseRegular = template?.regularHours ?? Math.min(8, baseHours)
    const baseOvertime = template?.overtimeHours ?? Math.max(0, baseHours - 8)

    days.push({
      key: iso,
      label: dayLabelFromIso(iso),
      dateLabel: dateLabelFromIso(iso),
      status: weekday ? (baseHours > 0 ? 'draft' : 'none') : 'none',
      hours: baseHours,
      regularHours: baseRegular,
      overtimeHours: baseOvertime,
      startTime: template?.startTime ?? (weekday ? '09:00 AM' : '--'),
      endTime: template?.endTime ?? (weekday ? '06:00 PM' : '--'),
      breakDuration: template?.breakDuration ?? (weekday ? '01:00 hr' : '--'),
      workLocation: template?.workLocation ?? (weekday ? 'Remote' : 'Off'),
      notes: template?.notes ?? (weekday ? '' : 'Weekend.'),
    })

    current = addDays(current, 1)
    index += 1
  }

  return {
    fromDateISO,
    toDateISO,
    days,
    lastSaved: 'Today, 10:30 AM',
  }
}

function getDefaultStore(): TimeEntryStore {
  const range = createCurrentRangeData()
  const key = makeRangeKey(range.fromDateISO, range.toDateISO)
  return {
    activeRangeKey: key,
    ranges: { [key]: range },
  }
}

function loadTimeEntryStore(): TimeEntryStore {
  try {
    const raw = localStorage.getItem(TIME_ENTRY_STORE_KEY)
    if (!raw) {
      return getDefaultStore()
    }

    const parsed = JSON.parse(raw) as TimeEntryStore
    if (!parsed.ranges || !parsed.activeRangeKey) {
      return getDefaultStore()
    }

    const active = parsed.ranges[parsed.activeRangeKey]
    if (!active || !active.days || active.days.length === 0) {
      return getDefaultStore()
    }

    const todayIso = getTodayIso()
    const activeContainsToday = active.days.some((day) => day.key === todayIso)
    if (activeContainsToday) {
      return parsed
    }

    const currentRange = createCurrentRangeData()
    const currentRangeKey = makeRangeKey(currentRange.fromDateISO, currentRange.toDateISO)

    return {
      ...parsed,
      activeRangeKey: currentRangeKey,
      ranges: {
        ...parsed.ranges,
        [currentRangeKey]: parsed.ranges[currentRangeKey] ?? currentRange,
      },
    }
  } catch {
    return getDefaultStore()
  }
}

const getEditFormFromDay = (day: TimeEntryDay): TimeEntryEditForm => {
  const timeType: 'regular' | LeaveTypeId = day.isLeave ? (day.leaveType || 'annual') : 'regular'
  const timeSpentHours = day.isLeave ? 8 : (day.hours || 0)
  return {
    startTime: parseTime12To24(day.startTime),
    endTime: parseTime12To24(day.endTime),
    breakMinutes: parseBreakDurationToMinutes(day.breakDuration),
    workLocation: day.workLocation === 'Off' ? 'Remote' : (day.workLocation || 'Remote'),
    notes: day.notes,
    isLeave: day.isLeave || false,
    leaveType: day.leaveType || 'annual',
    timeType,
    timeSpentHours,
  }
}

const moduleSteps: Record<Module, ModuleStep[]> = {
  dashboard: [
    {
      title: 'Welcome to Dashboard',
      tag: 'Overview',
      content: 'Your personalized dashboard showing quick actions and important updates',
    },
    {
      title: 'Quick Actions',
      tag: 'Actions',
      content: 'Submit timesheet, apply leave, view payslip - all from one place',
    },
  ],
  'time-entry': [
    { title: 'My Timesheet', tag: 'View', content: 'View and manage your time entries' },
    { title: 'Weekly View', tag: 'Hours', content: 'See your hours in weekly format' },
    { title: 'Daily View', tag: 'Details', content: 'View daily time entry details' },
    { title: 'Submit Timesheet', tag: 'Action', content: 'Submit your timesheet for approval' },
    { title: 'Approval Status', tag: 'Status', content: 'Track approval status' },
  ],
  leave: [
    { title: 'Apply Leave', tag: 'Request', content: 'Submit a new leave request' },
    { title: 'Leave Balance', tag: 'Available', content: 'Check your remaining leave balance' },
    { title: 'Leave Calendar', tag: 'Schedule', content: 'View leave calendar' },
    { title: 'Leave History', tag: 'History', content: 'View past leave requests' },
  ],
  'my-pay': [
    { title: 'Payslips', tag: 'Download', content: 'Download and view your payslips' },
    { title: 'Salary Breakdown', tag: 'Details', content: 'Detailed salary breakdown' },
    { title: 'Tax Documents', tag: 'Forms', content: 'View tax forms and documents' },
    { title: 'Payment History', tag: 'Record', content: 'Payment history and details' },
  ],
  documents: [
    { title: 'Visa Documents', tag: 'Travel', content: 'Access visa-related documents' },
    { title: 'Tax Forms', tag: 'Taxes', content: 'Download tax forms' },
    { title: 'Company Policies', tag: 'Policies', content: 'Review company policies' },
  ],
  profile: [
    { title: 'Personal Information', tag: 'Edit', content: 'Update your personal details' },
    { title: 'Contact Details', tag: 'Contact', content: 'Manage your contact information' },
    { title: 'Bank Details', tag: 'Banking', content: 'Update banking information' },
    { title: 'Emergency Contact', tag: 'Safety', content: 'Add emergency contacts' },
  ],
  notifications: [
    { title: 'All Notifications', tag: 'Feed', content: 'View all your notifications' },
    { title: 'Payroll Updates', tag: 'Salary', content: 'Payroll-related notifications' },
    { title: 'Leave Updates', tag: 'Time Off', content: 'Leave request updates' },
    { title: 'Document Alerts', tag: 'Files', content: 'New document notifications' },
  ],
  'admin-dashboard': [],
  'admin-reconciliation': [],
  'admin-payslips': [],
  'admin-access': [],
  'admin-reports': [],
  'client-dashboard': [],
  'client-payroll-control': [],
  'client-payroll-period': [],
  'client-offcycles': [],
  'client-lock': [],
  'client-reports': [],
}

const notificationFilterTabs = ['All', 'Unread', 'Payroll', 'Leave', 'Time Entry', 'Documents', 'System'] as const

function getCategoryIcon(category: string) {
  switch (category) {
    case 'payroll':
      return (
        <span className="notification-card-icon notification-icon-payroll">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        </span>
      )
    case 'leave':
      return (
        <span className="notification-card-icon notification-icon-leave">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </span>
      )
    case 'time-entry':
      return (
        <span className="notification-card-icon notification-icon-time-entry">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </span>
      )
    case 'documents':
      return (
        <span className="notification-card-icon notification-icon-documents">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </span>
      )
    case 'profile':
      return (
        <span className="notification-card-icon notification-icon-profile">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </span>
      )
    case 'system':
    default:
      return (
        <span className="notification-card-icon notification-icon-system">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </span>
      )
  }
}

export function EmployeePortalFlow({
  userType,
  notifications,
  setNotifications,
  isNotificationDrawerOpen,
  setIsNotificationDrawerOpen
}: EmployeePortalFlowProps) {
  const [previewRoleMode, setPreviewRoleMode] = useState<UserType | null>(null)
  const [simulatedEmployeeId, setSimulatedEmployeeId] = useState<string>('EMP-001')
  const [simulatedClientName, setSimulatedClientName] = useState<string>('Acme Corp')

  const currentYear = new Date().getFullYear()
  const [clientPeriodStartDate, setClientPeriodStartDate] = useState(`${currentYear}-07-01`)
  const [clientPeriodEndDate, setClientPeriodEndDate] = useState(`${currentYear}-07-15`)

  const formatPeriodRange = (startStr: string, endStr: string) => {
    try {
      const start = new Date(startStr)
      const end = new Date(endStr)
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return ''
      const pad = (num: number) => num.toString().padStart(2, '0')
      return `${pad(start.getMonth() + 1)}/${pad(start.getDate())}/${start.getFullYear()} - ${pad(end.getMonth() + 1)}/${pad(end.getDate())}/${end.getFullYear()}`
    } catch {
      return ''
    }
  }

  const activeUserType = previewRoleMode || userType

  const [currentModule, setCurrentModule] = useState<Module>(() => {
    if (userType === 'admin') return 'admin-dashboard'
    if (userType === 'client') return 'client-dashboard'
    return 'dashboard'
  })
  const [stepIndex, setStepIndex] = useState(0)

  // Admin Portal States
  const [adminEmployees, setAdminEmployees] = useState<AdminEmployee[]>(adminEmployeesSeed)
  const [payrollConfigRows, setPayrollConfigRows] = useState<PayrollConfigRow[]>(() => {
    const rows: PayrollConfigRow[] = []
    adminEmployeesSeed.forEach((emp) => {
      rows.push({
        employeeId: emp.id,
        employeeName: emp.name,
        rateCode: 'REG',
        hours: emp.id === 'EMP-003' ? 100 : 160,
        fullSalary: emp.currGross,
      })
      if (emp.id === 'EMP-003') {
        rows.push({
          employeeId: emp.id,
          employeeName: emp.name,
          rateCode: 'sick',
          hours: 40,
          fullSalary: 0,
        })
        rows.push({
          employeeId: emp.id,
          employeeName: emp.name,
          rateCode: 'holiday',
          hours: 40,
          fullSalary: 0,
        })
      } else if (emp.id === 'EMP-001' || emp.id === 'EMP-005') {
        rows.push({
          employeeId: emp.id,
          employeeName: emp.name,
          rateCode: 'sick',
          hours: 24,
          fullSalary: 0,
        })
      }
    })
    return rows
  })
  const [reconciliationDimension, setReconciliationDimension] = useState<'client' | 'employee' | 'paygroup' | 'payment'>('client')

  const currentEmployeeInfo = useMemo(() => {
    const emp = adminEmployees.find(e => e.id === simulatedEmployeeId)
    if (!emp) return { name: 'John Doe', preferredName: 'John', clientName: 'Acme Corp', role: 'Senior Developer', id: 'EMP-001', paygroup: 'Engineering' }
    const firstName = emp.name.split(' ')[0]
    return {
      name: emp.name,
      preferredName: firstName,
      clientName: emp.clientName,
      role: emp.role,
      id: emp.id,
      paygroup: emp.paygroup
    }
  }, [adminEmployees, simulatedEmployeeId])

  useEffect(() => {
    setSelectedReconcileKeys(new Set())
    setSubmittedReconcileKeys(new Set())
  }, [reconciliationDimension])

  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState('')
  const [filterClientName, setFilterClientName] = useState('All')
  const [isPayrollSubmitted, setIsPayrollSubmitted] = useState(false)
  const [isSecondApprovalNotified, setIsSecondApprovalNotified] = useState(false)
  const [selectedEmployeeForPayslipModal, setSelectedEmployeeForPayslipModal] = useState<AdminEmployee | null>(null)
  const [successToastMessage, setSuccessToastMessage] = useState<string | null>(null)
  const [alertModal, setAlertModal] = useState<{ type: 'success' | 'info' | 'warning' | 'error', title: string, message: string } | null>(null)

  const showToast = (msg: string) => {
    setSuccessToastMessage(msg)
  }


  // Client Portal States

  const [clientPayGroupFilter, setClientPayGroupFilter] = useState<'Monthly' | 'Weekly' | 'Bi-Weekly' | 'Semi-Monthly'>('Monthly')
  const [clientDashboardPayPeriod, setClientDashboardPayPeriod] = useState<ClientDashboardPayPeriod>(`${new Date().getFullYear()}-07`)
  const [offcyclePaymentsList, setOffcyclePaymentsList] = useState<ClientOffcyclePayment[]>(clientOffcyclesSeed)
  const [portalAccessLogs] = useState<PortalAccessLog[]>(portalAccessLogsSeed)
  const [isPeriodLocked, setIsPeriodLocked] = useState(false)
  const [approvedEmployeeIds, setApprovedEmployeeIds] = useState<Set<string>>(new Set())
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set())
  const [showApproveConfirmModal, setShowApproveConfirmModal] = useState(false)
  const [isBulkUploading, setIsBulkUploading] = useState(false)
  const [payrollEditCounts, setPayrollEditCounts] = useState<Record<string, number>>({})
  const [showSavePayrollConfirmModal, setShowSavePayrollConfirmModal] = useState(false)

  // Alert Modal Dismissal States
  const [dismissedAllApproved, setDismissedAllApproved] = useState(false)
  const [dismissedApprovedCount, setDismissedApprovedCount] = useState(false)
  const [dismissedPendingClient, setDismissedPendingClient] = useState(false)
  const [dismissedPeriodLocked, setDismissedPeriodLocked] = useState(false)
  const [dismissedPeriodOpen, setDismissedPeriodOpen] = useState(false)
  const [dismissedPayrollSubmitted, setDismissedPayrollSubmitted] = useState(false)
  const [dismissedPayrollWarning, setDismissedPayrollWarning] = useState(false)
  const [dismissedSecondApprovalNotified, setDismissedSecondApprovalNotified] = useState(false)
  const [dismissedSecondApprovalRequired, setDismissedSecondApprovalRequired] = useState(false)

  // Client Offcycle Modal
  const [isOffcycleModalOpen, setIsOffcycleModalOpen] = useState(false)
  const [isRefreshingLock, setIsRefreshingLock] = useState(false)
  const [activeOffcycleDetailsModal, setActiveOffcycleDetailsModal] = useState<{ employeeName: string; payments: ClientOffcyclePayment[] } | null>(null)
  const [lockedEmployeeIds, setLockedEmployeeIds] = useState<Set<string>>(new Set())
  const [selectedLockEmployeeIds, setSelectedLockEmployeeIds] = useState<Set<string>>(new Set())
  const [showLockConfirmModal, setShowLockConfirmModal] = useState(false)
  const [showPayrollSubmitConfirmModal, setShowPayrollSubmitConfirmModal] = useState(false)
  const [selectedReconcileKeys, setSelectedReconcileKeys] = useState<Set<string>>(new Set())
  const [submittedReconcileKeys, setSubmittedReconcileKeys] = useState<Set<string>>(new Set())
  const [showReconcileConfirmModal, setShowReconcileConfirmModal] = useState(false)
  const [reconcileClientFilter, setReconcileClientFilter] = useState<string>('All')
  const [reconcileSearchQuery, setReconcileSearchQuery] = useState<string>('')
  const [offcycleForm, setOffcycleForm] = useState({
    employeeId: 'EMP-001',
    code: 'Monthly Bonus',
    amount: '',
    remarks: ''
  })

  // Shared Reports State
  const [activeReportType, setActiveReportType] = useState<'timesheet' | 'costs' | 'variance' | 'access' | 'payroll_register' | 'payment_ledger'>('timesheet')
  const [reportFilterEmployee, setReportFilterEmployee] = useState('All')
  const [reportFilterClient, setReportFilterClient] = useState('All')
  const [reportDateFrom, setReportDateFrom] = useState('2025-07-01')
  const [reportDateTo, setReportDateTo] = useState('2025-07-15')

  useEffect(() => {
    if (currentModule === 'client-reports') {
      if (activeReportType === 'variance' || activeReportType === 'access') {
        setActiveReportType('timesheet')
      }
    } else if (currentModule === 'admin-reports') {
      if (activeReportType === 'payroll_register' || activeReportType === 'payment_ledger') {
        setActiveReportType('timesheet')
      }
    }
  }, [currentModule, activeReportType])


  const [activeTimeEntryTab, setActiveTimeEntryTab] = useState<(typeof timeEntryTabs)[number]>('My Timesheet')
  const [activeLeaveTab, setActiveLeaveTab] = useState<(typeof leaveTabs)[number]>('Leave Balance')
  const [activePayTab, setActivePayTab] = useState<MyPayTab>('Overview')

  // Profile state
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>('Overview')
  const [personalInfo] = useState<PersonalInfo>(personalInfoSeed)
  const [contactDetails, setContactDetails] = useState<ContactDetails>(contactDetailsSeed)
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(emergencyContactsSeed)
  const [profileChangeRequests, setProfileChangeRequests] = useState<ProfileChangeRequest[]>(profileChangeRequestsSeed)

  // Notification states
  const [activeNotificationFilter, setActiveNotificationFilter] = useState<string>('All')
  const [visibleNotificationsCount, setVisibleNotificationsCount] = useState(5)
  const [isNotificationsLoadingMore, setIsNotificationsLoadingMore] = useState(false)

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications])

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeNotificationFilter === 'All') return true
      if (activeNotificationFilter === 'Unread') return !n.isRead
      // Normalize 'Time Entry' to 'time-entry' for categories matching
      const categoryKey = activeNotificationFilter.toLowerCase().replace(' ', '-')
      return n.category === categoryKey
    })
  }, [notifications, activeNotificationFilter])

  const displayedNotifications = useMemo(() => {
    return filteredNotifications.slice(0, visibleNotificationsCount)
  }, [filteredNotifications, visibleNotificationsCount])

  const hasMoreNotifications = filteredNotifications.length > displayedNotifications.length

  // Remaining Profile Tabs States
  const [bankDetails] = useState<BankDetails>({
    bankName: 'HDFC Bank Limited',
    branch: 'Koramangala 4th Block',
    accountNumber: 'XXXX XXXX 4589',
    ifscCode: 'HDFC0001234',
    routingNumber: '',
    sortCode: '',
    swiftCode: '',
    iban: '',
    accountHolderName: 'John Doe',
    verified: true,
  })
  const employmentCountryCode = useMemo<BankCountryCode>(
    () => countryNameToCode(contactDetails.country),
    [contactDetails.country],
  )
  const [identityDocs] = useState<IdentityDocument[]>(identityDocumentsSeed)
  const [profileSkills, setProfileSkills] = useState<ProfileSkill[]>(profileSkillsSeed)
  const [profileEducation, setProfileEducation] = useState<ProfileEducation[]>(profileEducationSeed)
  const [profileCertifications, setProfileCertifications] = useState<ProfileCertification[]>(profileCertificationsSeed)
  const [profileLanguages, setProfileLanguages] = useState<ProfileLanguage[]>(profileLanguagesSeed)
  const [profilePreferences, setProfilePreferences] = useState<ProfilePreferences>(profilePreferencesSeed)

  // Active sub-tab states
  const [activeSkillsSubTab, setActiveSkillsSubTab] = useState<'Skills' | 'Education' | 'Certifications' | 'Languages'>('Skills')
  const [activeChangeRequestsSubTab, setActiveChangeRequestsSubTab] = useState<'All Requests' | 'Pending' | 'Approved' | 'Rejected'>('All Requests')

  // Bank Change Modal
  const [isBankChangeModalOpen, setIsBankChangeModalOpen] = useState(false)
  const [bankChangeForm, setBankChangeForm] = useState<BankUpdateForm>(EMPTY_BANK_FORM)
  const [bankChangeError, setBankChangeError] = useState('')
  const [bankChangeSuccess, setBankChangeSuccess] = useState(false)

  // Skills Modal
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false)
  const [skillModalMode, setSkillModalMode] = useState<'add' | 'edit'>('add')
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null)
  const [skillForm, setSkillForm] = useState<Omit<ProfileSkill, 'id'>>({
    name: '',
    proficiency: 'Intermediate',
    experience: 2,
  })
  const [skillError, setSkillError] = useState('')

  // Education Modal
  const [isEducationModalOpen, setIsEducationModalOpen] = useState(false)
  const [educationModalMode, setEducationModalMode] = useState<'add' | 'edit'>('add')
  const [editingEducationId, setEditingEducationId] = useState<string | null>(null)
  const [educationForm, setEducationForm] = useState<Omit<ProfileEducation, 'id'>>({
    degree: '',
    institution: '',
    fieldOfStudy: '',
    yearOfPassing: '',
  })
  const [educationError, setEducationError] = useState('')

  // Certification Modal
  const [isCertificationModalOpen, setIsCertificationModalOpen] = useState(false)
  const [certificationModalMode, setCertificationModalMode] = useState<'add' | 'edit'>('add')
  const [editingCertificationId, setEditingCertificationId] = useState<string | null>(null)
  const [certificationForm, setCertificationForm] = useState<Omit<ProfileCertification, 'id'>>({
    name: '',
    issuingOrg: '',
    issueDate: '',
    expiryDate: '',
    credentialId: '',
  })
  const [certificationError, setCertificationError] = useState('')

  // Language Modal
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false)
  const [languageModalMode, setLanguageModalMode] = useState<'add' | 'edit'>('add')
  const [editingLanguageId, setEditingLanguageId] = useState<string | null>(null)
  const [languageForm, setLanguageForm] = useState<Omit<ProfileLanguage, 'id'>>({
    name: '',
    proficiency: 'Conversational',
  })
  const [languageError, setLanguageError] = useState('')

  // Preferences feedback
  const [preferencesSaveSuccess, setPreferencesSaveSuccess] = useState(false)



  // Profile temporary/edit states
  const [isEditingContact, setIsEditingContact] = useState(false)
  const [contactEditForm, setContactEditForm] = useState<ContactDetails>(contactDetailsSeed)
  const [contactEditError, setContactEditError] = useState('')
  const [contactEditSuccess, setContactEditSuccess] = useState(false)

  // Emergency contact modals state
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false)
  const [emergencyModalMode, setEmergencyModalMode] = useState<'add' | 'edit'>('add')
  const [editingEmergencyContactId, setEditingEmergencyContactId] = useState<string | null>(null)
  const [emergencyForm, setEmergencyForm] = useState<Omit<EmergencyContact, 'id'>>({
    name: '',
    relationship: '',
    phone: '',
    email: '',
  })
  const [emergencyError, setEmergencyError] = useState('')

  // Personal info change request modal state
  const [isRequestChangeModalOpen, setIsRequestChangeModalOpen] = useState(false)
  const [requestChangeField, setRequestChangeField] = useState('First Name')
  const [requestChangeNewValue, setRequestChangeNewValue] = useState('')
  const [requestChangeReason, setRequestChangeReason] = useState('')
  const [requestChangeError, setRequestChangeError] = useState('')
  const [requestChangeSuccess, setRequestChangeSuccess] = useState('')

  // Documents state
  const [activeDocTab, setActiveDocTab] = useState<DocumentTab>('My Documents')
  const [docSearchQuery, setDocSearchQuery] = useState('')
  const [docCurrentPage, setDocCurrentPage] = useState(1)
  // const [taxYearFilter, setTaxYearFilter] = useState('2024-25')
  const [docStatusFilter, setDocStatusFilter] = useState('All')

  const [uploadedDocsState, setUploadedDocsState] = useState<PortalDocument[]>(uploadedDocsSeed)
  const [isDocUploadModalOpen, setIsDocUploadModalOpen] = useState(false)
  const [docUploadName, setDocUploadName] = useState('')
  const [docUploadCategory, setDocUploadCategory] = useState('')
  const [docUploadFile, setDocUploadFile] = useState<File | null>(null)
  const [docUploadError, setDocUploadError] = useState('')

  const [docPreview, setDocPreview] = useState<PortalDocument | null>(null)
  const [docNotification, setDocNotification] = useState<string | null>(null)

  const DOCS_PER_PAGE = 5

  const handleDownloadDoc = (doc: PortalDocument) => {
    setDocNotification(`Downloading ${doc.name}...`)
    setTimeout(() => setDocNotification(null), 3000)
  }

  // ── Profile Handlers ──
  const handleEditContactClick = () => {
    setContactEditForm(contactDetails)
    setIsEditingContact(true)
    setContactEditError('')
    setContactEditSuccess(false)
  }

  const handleSaveContact = () => {
    if (
      !contactEditForm.personalEmail ||
      !contactEditForm.mobileNumber ||
      !contactEditForm.address ||
      !contactEditForm.city ||
      !contactEditForm.state ||
      !contactEditForm.country ||
      !contactEditForm.pinCode
    ) {
      setContactEditError('All fields are required.')
      return
    }
    if (!/\S+@\S+\.\S+/.test(contactEditForm.personalEmail)) {
      setContactEditError('Please enter a valid personal email.')
      return
    }
    setContactDetails(contactEditForm)
    setIsEditingContact(false)
    setContactEditSuccess(true)
    setTimeout(() => setContactEditSuccess(false), 3000)
  }

  const handleOpenAddEmergency = () => {
    setEmergencyForm({
      name: '',
      relationship: '',
      phone: '',
      email: '',
    })
    setEmergencyModalMode('add')
    setEditingEmergencyContactId(null)
    setEmergencyError('')
    setIsEmergencyModalOpen(true)
  }

  const handleOpenEditEmergency = (contact: EmergencyContact) => {
    setEmergencyForm({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
      email: contact.email,
    })
    setEmergencyModalMode('edit')
    setEditingEmergencyContactId(contact.id)
    setEmergencyError('')
    setIsEmergencyModalOpen(true)
  }

  const handleSaveEmergencyContact = () => {
    if (!emergencyForm.name || !emergencyForm.relationship || !emergencyForm.phone || !emergencyForm.email) {
      setEmergencyError('All fields are required.')
      return
    }
    if (!/\S+@\S+\.\S+/.test(emergencyForm.email)) {
      setEmergencyError('Please enter a valid email address.')
      return
    }

    if (emergencyModalMode === 'add') {
      const newContact: EmergencyContact = {
        id: `ec-${Date.now()}`,
        ...emergencyForm,
      }
      setEmergencyContacts((prev) => [...prev, newContact])
    } else {
      setEmergencyContacts((prev) =>
        prev.map((c) => (c.id === editingEmergencyContactId ? { ...c, ...emergencyForm } : c))
      )
    }
    setIsEmergencyModalOpen(false)
  }

  const handleDeleteEmergencyContact = (id: string) => {
    if (window.confirm('Are you sure you want to delete this emergency contact?')) {
      setEmergencyContacts((prev) => prev.filter((c) => c.id !== id))
    }
  }

  const handleOpenRequestChange = () => {
    setRequestChangeField('First Name')
    setRequestChangeNewValue('')
    setRequestChangeReason('')
    setRequestChangeError('')
    setRequestChangeSuccess('')
    setIsRequestChangeModalOpen(true)
  }

  const handleSubmitChangeRequest = () => {
    if (!requestChangeNewValue || !requestChangeReason) {
      setRequestChangeError('Both new value and reason are required.')
      return
    }

    const newRequest: ProfileChangeRequest = {
      id: `cr-${Date.now()}`,
      type: `${requestChangeField} Change`,
      description: `Update ${requestChangeField.toLowerCase()} to "${requestChangeNewValue}"`,
      requestedDate: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      status: 'Pending',
      comments: 'Awaiting HR approval',
    }

    setProfileChangeRequests((prev) => [newRequest, ...prev])
    setRequestChangeNewValue('')
    setRequestChangeReason('')
    setRequestChangeError('')
    setRequestChangeSuccess('Change request submitted successfully! HR will review and update you.')
    setTimeout(() => {
      setIsRequestChangeModalOpen(false)
      setRequestChangeSuccess('')
    }, 2000)
  }

  // Remaining Profile Action Handlers
  const handleOpenBankChange = () => {
    setBankChangeForm(bankFormFromDetails(bankDetails))
    setBankChangeError('')
    setBankChangeSuccess(false)
    setIsBankChangeModalOpen(true)
  }

  const handleSaveBankChange = () => {
    const validationError = validateBankForm(bankChangeForm, employmentCountryCode)
    if (validationError) {
      setBankChangeError(validationError)
      return
    }
    const newRequest: ProfileChangeRequest = {
      id: `cr-${Date.now()}`,
      type: 'Bank Account Change',
      description: `Change account ending with ${bankChangeForm.accountNumber.slice(-4)}`,
      requestedDate: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      status: 'Pending',
      comments: 'Awaiting HR approval',
    }
    setProfileChangeRequests((prev) => [newRequest, ...prev])
    setBankChangeSuccess(true)
    setTimeout(() => {
      setIsBankChangeModalOpen(false)
      setBankChangeSuccess(false)
    }, 1800)
  }

  const handleOpenAddSkill = () => {
    setSkillForm({ name: '', proficiency: 'Intermediate', experience: 2 })
    setSkillModalMode('add')
    setEditingSkillId(null)
    setSkillError('')
    setIsSkillModalOpen(true)
  }

  const handleOpenEditSkill = (skill: ProfileSkill) => {
    setSkillForm({ name: skill.name, proficiency: skill.proficiency, experience: skill.experience })
    setSkillModalMode('edit')
    setEditingSkillId(skill.id)
    setSkillError('')
    setIsSkillModalOpen(true)
  }

  const handleSaveSkill = () => {
    if (!skillForm.name.trim() || skillForm.experience < 0) {
      setSkillError('Please enter a valid skill name and experience.')
      return
    }
    if (skillModalMode === 'add') {
      const newSkill: ProfileSkill = {
        id: `sk-${Date.now()}`,
        name: skillForm.name,
        proficiency: skillForm.proficiency,
        experience: skillForm.experience,
      }
      setProfileSkills((prev) => [...prev, newSkill])
    } else {
      setProfileSkills((prev) => prev.map((s) => s.id === editingSkillId ? { ...s, ...skillForm } : s))
    }
    setIsSkillModalOpen(false)
  }

  const handleDeleteSkill = (id: string) => {
    if (window.confirm('Are you sure you want to delete this skill?')) {
      setProfileSkills((prev) => prev.filter((s) => s.id !== id))
    }
  }

  const handleOpenAddEducation = () => {
    setEducationForm({ degree: '', institution: '', fieldOfStudy: '', yearOfPassing: '' })
    setEducationModalMode('add')
    setEditingEducationId(null)
    setEducationError('')
    setIsEducationModalOpen(true)
  }

  const handleOpenEditEducation = (edu: ProfileEducation) => {
    setEducationForm({ degree: edu.degree, institution: edu.institution, fieldOfStudy: edu.fieldOfStudy, yearOfPassing: edu.yearOfPassing })
    setEducationModalMode('edit')
    setEditingEducationId(edu.id)
    setEducationError('')
    setIsEducationModalOpen(true)
  }

  const handleSaveEducation = () => {
    if (!educationForm.degree.trim() || !educationForm.institution.trim() || !educationForm.fieldOfStudy.trim() || !educationForm.yearOfPassing.trim()) {
      setEducationError('All fields are required.')
      return
    }
    if (educationModalMode === 'add') {
      const newEdu: ProfileEducation = {
        id: `edu-${Date.now()}`,
        degree: educationForm.degree,
        institution: educationForm.institution,
        fieldOfStudy: educationForm.fieldOfStudy,
        yearOfPassing: educationForm.yearOfPassing,
      }
      setProfileEducation((prev) => [...prev, newEdu])
    } else {
      setProfileEducation((prev) => prev.map((e) => e.id === editingEducationId ? { ...e, ...educationForm } : e))
    }
    setIsEducationModalOpen(false)
  }

  const handleDeleteEducation = (id: string) => {
    if (window.confirm('Are you sure you want to delete this education record?')) {
      setProfileEducation((prev) => prev.filter((e) => e.id !== id))
    }
  }

  const handleOpenAddCertification = () => {
    setCertificationForm({ name: '', issuingOrg: '', issueDate: '', expiryDate: '', credentialId: '' })
    setCertificationModalMode('add')
    setEditingCertificationId(null)
    setCertificationError('')
    setIsCertificationModalOpen(true)
  }

  const handleOpenEditCertification = (cert: ProfileCertification) => {
    setCertificationForm({ name: cert.name, issuingOrg: cert.issuingOrg, issueDate: cert.issueDate, expiryDate: cert.expiryDate, credentialId: cert.credentialId })
    setCertificationModalMode('edit')
    setEditingCertificationId(cert.id)
    setCertificationError('')
    setIsCertificationModalOpen(true)
  }

  const handleSaveCertification = () => {
    if (!certificationForm.name.trim() || !certificationForm.issuingOrg.trim() || !certificationForm.issueDate.trim()) {
      setCertificationError('Certification Name, Issuing Org, and Issue Date are required.')
      return
    }
    if (certificationModalMode === 'add') {
      const newCert: ProfileCertification = {
        id: `cert-${Date.now()}`,
        name: certificationForm.name,
        issuingOrg: certificationForm.issuingOrg,
        issueDate: certificationForm.issueDate,
        expiryDate: certificationForm.expiryDate || '-',
        credentialId: certificationForm.credentialId || '-',
      }
      setProfileCertifications((prev) => [...prev, newCert])
    } else {
      setProfileCertifications((prev) => prev.map((c) => c.id === editingCertificationId ? { ...c, ...certificationForm } : c))
    }
    setIsCertificationModalOpen(false)
  }

  const handleDeleteCertification = (id: string) => {
    if (window.confirm('Are you sure you want to delete this certification?')) {
      setProfileCertifications((prev) => prev.filter((c) => c.id !== id))
    }
  }

  const handleOpenAddLanguage = () => {
    setLanguageForm({ name: '', proficiency: 'Conversational' })
    setLanguageModalMode('add')
    setEditingLanguageId(null)
    setLanguageError('')
    setIsLanguageModalOpen(true)
  }

  const handleOpenEditLanguage = (lang: ProfileLanguage) => {
    setLanguageForm({ name: lang.name, proficiency: lang.proficiency })
    setLanguageModalMode('edit')
    setEditingLanguageId(lang.id)
    setLanguageError('')
    setIsLanguageModalOpen(true)
  }

  const handleSaveLanguage = () => {
    if (!languageForm.name.trim()) {
      setLanguageError('Language Name is required.')
      return
    }
    if (languageModalMode === 'add') {
      const newLang: ProfileLanguage = {
        id: `lang-${Date.now()}`,
        name: languageForm.name,
        proficiency: languageForm.proficiency,
      }
      setProfileLanguages((prev) => [...prev, newLang])
    } else {
      setProfileLanguages((prev) => prev.map((l) => l.id === editingLanguageId ? { ...l, ...languageForm } : l))
    }
    setIsLanguageModalOpen(false)
  }

  const handleDeleteLanguage = (id: string) => {
    if (window.confirm('Are you sure you want to delete this language?')) {
      setProfileLanguages((prev) => prev.filter((l) => l.id !== id))
    }
  }

  const handleSavePreferences = () => {
    setPreferencesSaveSuccess(true)
    setTimeout(() => setPreferencesSaveSuccess(false), 3000)
  }

  // Notification Center Action Handlers
  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const handleToggleRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    )
  }

  const handleDeleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const handleLoadMoreNotifications = () => {
    if (isNotificationsLoadingMore) return
    setIsNotificationsLoadingMore(true)
    setTimeout(() => {
      setNotifications((prev) => {
        const currentIds = new Set(prev.map((n) => n.id))
        const itemsToAdd = additionalNotificationsSeed.filter((item) => !currentIds.has(item.id))
        return [...prev, ...itemsToAdd]
      })
      setVisibleNotificationsCount((prev) => prev + 5)
      setIsNotificationsLoadingMore(false)
    }, 800)
  }

  const handleNotificationClick = (item: NotificationItem) => {
    // 1. Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    )

    // 2. Navigate to corresponding module
    setCurrentModule(item.module)

    // 3. Navigate to specific tab within the module if appropriate
    if (item.module === 'my-pay') {
      if (item.title.toLowerCase().includes('payslip')) {
        setActivePayTab('Payslips')
      } else if (item.title.toLowerCase().includes('tax')) {
        setActivePayTab('Tax Documents')
      } else if (item.title.toLowerCase().includes('bank')) {
        setActivePayTab('Bank Details')
      }
    } else if (item.module === 'documents') {
      if (item.title.toLowerCase().includes('expiry')) {
        setActiveDocTab('Expiring Documents')
      }
      // else if (item.title.toLowerCase().includes('verification')) {
      //   setActiveDocTab('Uploaded Documents')
      // }
    } else if (item.module === 'profile') {
      if (item.title.toLowerCase().includes('bank')) {
        setActiveProfileTab('Bank')
      }
    } else if (item.module === 'leave') {
      if (item.title.toLowerCase().includes('history')) {
        setActiveLeaveTab('Leave History')
      }
    }

    // 4. Close notification drawer
    setIsNotificationDrawerOpen(false)
  }



  // My Pay state
  const [payslipYear, setPayslipYear] = useState('2025')
  const [payslipSearchMonth, setPayslipSearchMonth] = useState('')
  const [payslipPage, setPayslipPage] = useState(1)
  const [selectedPayslipForView, setSelectedPayslipForView] = useState<Payslip | null>(null)
  const [salaryBreakdownMonth, setSalaryBreakdownMonth] = useState('June 2025')
  const [bankUpdateModalOpen, setBankUpdateModalOpen] = useState(false)
  const [bankUpdateForm, setBankUpdateForm] = useState<BankUpdateForm>(EMPTY_BANK_FORM)
  const [bankUpdateError, setBankUpdateError] = useState('')
  const [bankUpdateSuccess, setBankUpdateSuccess] = useState(false)
  const [bankUpdateRequestSent, setBankUpdateRequestSent] = useState(false)
  const [payHistoryStatusFilter, setPayHistoryStatusFilter] = useState<'All' | 'Credited' | 'Pending' | 'Failed'>('All')
  const payTabRef = useRef<HTMLDivElement>(null)
  const [timeEntryStore, setTimeEntryStore] = useState<TimeEntryStore>(() => loadTimeEntryStore())
  const activeRange = timeEntryStore.ranges[timeEntryStore.activeRangeKey]
  const [calendarMonthDate, setCalendarMonthDate] = useState(() => startOfMonth(fromIso(activeRange.fromDateISO)))
  const [isCalendarFiltersOpen, setIsCalendarFiltersOpen] = useState(false)
  const [calendarVisibleStatuses, setCalendarVisibleStatuses] = useState<TimeEntryStatus[]>([
    'submitted',
    'draft',
    'returned',
    'none',
  ])
  const [isTimeHistoryFiltersOpen, setIsTimeHistoryFiltersOpen] = useState(false)

  const [fromDateInput, setFromDateInput] = useState(activeRange.fromDateISO)
  const [toDateInput, setToDateInput] = useState(activeRange.toDateISO)
  const [historyFromDateInput, setHistoryFromDateInput] = useState(() => toIso(addDays(startOfWeek(getTodayDate()), -35)))
  const [historyToDateInput, setHistoryToDateInput] = useState(getTodayIso())
  const [appliedHistoryFromDate, setAppliedHistoryFromDate] = useState(() => toIso(addDays(startOfWeek(getTodayDate()), -35)))
  const [appliedHistoryToDate, setAppliedHistoryToDate] = useState(getTodayIso())
  const [historyStatusFilter, setHistoryStatusFilter] = useState<TimeHistoryStatus | 'all'>('all')
  const [approvalFilter, setApprovalFilter] = useState<ApprovalStatus | 'all'>('pending')
  const [expandedApprovalKey, setExpandedApprovalKey] = useState<string | null>(null)
  const [isApprovalsFilterOpen, setIsApprovalsFilterOpen] = useState(false)
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => getPreferredSelectedDayKey(activeRange.days, getTodayIso()))
  const [dateRangeError, setDateRangeError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [historyFilterError, setHistoryFilterError] = useState('')
  const [confirmAction, setConfirmAction] = useState<'clock' | 'copy' | null>(null)
  const [selectedCopySource, setSelectedCopySource] = useState<string>('default')
  const [warningModal, setWarningModal] = useState<TimeEntryWarning | null>(null)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState<TimeEntryEditForm>({
    startTime: '',
    endTime: '',
    breakMinutes: 60,
    workLocation: 'Remote',
    notes: '',
    isLeave: false,
    leaveType: 'annual',
    timeType: 'regular',
    timeSpentHours: 0,
  })
  const [editError, setEditError] = useState('')
  const todayIso = getTodayIso()

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>(leaveSeedRequests)
  const [leaveApprovals, setLeaveApprovals] = useState<TeamLeaveApprovalItem[]>(leaveSeedApprovals)
  // const [leaveForm, setLeaveForm] = useState<LeaveApplyForm>({
  //   leaveType: 'annual',
  //   fromDateISO: todayIso,
  //   toDateISO: todayIso,
  //   reason: '',
  //   handoverTo: '',
  //   contactDuringLeave: '',
  // })
  // const [leaveFormError, setLeaveFormError] = useState('')
  // const [leaveFormSuccess, setLeaveFormSuccess] = useState('')
  const [leaveWarning, setLeaveWarning] = useState<LeaveWarning | null>(null)
  const [leaveHistoryStatusFilter, setLeaveHistoryStatusFilter] = useState<LeaveStatus | 'all'>('all')
  const [leaveHistoryFromInput, setLeaveHistoryFromInput] = useState(() => toIso(addDays(getTodayDate(), -120)))
  const [leaveHistoryToInput, setLeaveHistoryToInput] = useState(todayIso)
  const [appliedLeaveHistoryFrom, setAppliedLeaveHistoryFrom] = useState(() => toIso(addDays(getTodayDate(), -120)))
  const [appliedLeaveHistoryTo, setAppliedLeaveHistoryTo] = useState(todayIso)
  const [leaveHistoryError, setLeaveHistoryError] = useState('')
  const [leaveApprovalFilter, setLeaveApprovalFilter] = useState<LeaveStatus | 'all'>('pending')

  const modules = useMemo(() => {
    if (activeUserType === 'admin') {
      return [
        { id: 'admin-dashboard' as Module, label: 'Admin Dashboard', icon: '📊' },
        { id: 'admin-reconciliation' as Module, label: 'Reconciliation', icon: '⚖️' },
        { id: 'admin-payslips' as Module, label: 'Employee Payslips', icon: '📄' },
        { id: 'admin-access' as Module, label: 'Access Control', icon: '🔐' },
        { id: 'admin-reports' as Module, label: 'Reports', icon: '📈' },
      ]
    }
    if (activeUserType === 'client') {
      const matchingClient = adminEmployees.find(
        (e) => e.hasClientView && e.clientName === simulatedClientName
      )
      const showPayrollControl = !matchingClient || matchingClient.hasPayrollControlAccess !== false

      const clientMenu = [
        { id: 'client-dashboard' as Module, label: 'Client Dashboard', icon: '📊' },
      ]

      if (showPayrollControl) {
        clientMenu.push({ id: 'client-payroll-control' as Module, label: 'Payroll Control', icon: '⚙️' })
      }

      clientMenu.push(
        { id: 'client-offcycles' as Module, label: 'Offcycles / Bonus', icon: '💸' },
        { id: 'client-payroll-period' as Module, label: 'Payroll Period', icon: '📅' },
        { id: 'client-lock' as Module, label: 'Approval & Lock', icon: '🔒' },
        { id: 'client-reports' as Module, label: 'Reports', icon: '📈' },
      )
      return clientMenu
    }
    return [
      { id: 'dashboard' as Module, label: 'Dashboard', icon: '📊' },
      { id: 'time-entry' as Module, label: 'Time Entry', icon: '⏱️' },
      { id: 'my-pay' as Module, label: 'My Pay', icon: '💰' },
      { id: 'documents' as Module, label: 'Documents', icon: '📄' },
      // { id: 'profile' as Module, label: 'Profile', icon: '👤' },
    ]
  }, [activeUserType, adminEmployees, simulatedClientName])

  useEffect(() => {
    if (activeUserType === 'client') {
      const matchingClient = adminEmployees.find(
        (e) => e.hasClientView && e.clientName === simulatedClientName
      )
      const showPayrollControl = !matchingClient || matchingClient.hasPayrollControlAccess !== false
      if (!showPayrollControl && currentModule === 'client-payroll-control') {
        setCurrentModule('client-dashboard')
      }
    }
  }, [activeUserType, adminEmployees, simulatedClientName, currentModule])

  const steps = moduleSteps[currentModule] || []
  const currentStep = steps[stepIndex] || { title: '', tag: '', content: '' }
  const isLast = steps.length === 0 || stepIndex === steps.length - 1

  useEffect(() => {
    localStorage.setItem(TIME_ENTRY_STORE_KEY, JSON.stringify(timeEntryStore))
  }, [timeEntryStore])

  useEffect(() => {
    setFromDateInput(activeRange.fromDateISO)
    setToDateInput(activeRange.toDateISO)
    const hasSelectedDay = activeRange.days.some((day) => day.key === selectedDayKey)
    if (!hasSelectedDay || isFutureIso(selectedDayKey)) {
      setSelectedDayKey(getPreferredSelectedDayKey(activeRange.days, todayIso))
    }
  }, [activeRange.fromDateISO, activeRange.toDateISO, activeRange.days, selectedDayKey, todayIso])

  const selectedDay = activeRange.days.find((day) => day.key === selectedDayKey) ?? activeRange.days[0]
  const selectedDayIndex = Math.max(0, activeRange.days.findIndex((day) => day.key === selectedDay.key))
  const dateProgressPct = activeRange.days.length > 0
    ? Math.round(((selectedDayIndex + 1) / activeRange.days.length) * 100)
    : 0

  useEffect(() => {
    if (activeTimeEntryTab === 'Calendar' && selectedDay) {
      setCalendarMonthDate(startOfMonth(fromIso(selectedDay.key)))
    }
  }, [activeTimeEntryTab, selectedDay])

  const totals = useMemo(() => {
    return activeRange.days.reduce(
      (acc, day) => {
        if (day.isLeave) {
          acc.leaveHours += 8
        } else {
          acc.totalHours += day.hours
          acc.regularHours += day.regularHours
          acc.overtimeHours += day.overtimeHours
        }
        return acc
      },
      { totalHours: 0, regularHours: 0, overtimeHours: 0, leaveHours: 0 },
    )
  }, [activeRange.days])

  const leaveHours = totals.leaveHours
  const completionPct = Math.min(100, Math.round((totals.totalHours / 40) * 100))
  const isCalendarTab = activeTimeEntryTab === 'Calendar'
  const isTimeHistoryTab = null
  const isApprovalsTab = activeTimeEntryTab === 'Approvals'
  const isLeaveTab = activeTimeEntryTab === 'Leave'
  const rangeStatus: 'Draft' | 'Submitted' | 'Returned' =
    activeRange.days.some((day) => day.status === 'returned')
      ? 'Returned'
      : activeRange.days.some((day) => day.status === 'draft')
        ? 'Draft'
        : 'Submitted'

  const entryMap = useMemo(() => new Map(activeRange.days.map((day) => [day.key, day])), [activeRange.days])

  const visibleMonthDays = useMemo(
    () => activeRange.days.filter((day) => isSameMonth(fromIso(day.key), calendarMonthDate)),
    [activeRange.days, calendarMonthDate],
  )

  const visibleMonthTotals = useMemo(() => {
    return visibleMonthDays.reduce(
      (acc, day) => {
        if (day.isLeave) {
          acc.leave += 1
          acc.leaveHours += 8
        } else {
          acc.totalHours += day.hours
          acc.regularHours += day.regularHours
          acc.overtimeHours += day.overtimeHours
          acc[day.status] += 1
        }
        return acc
      },
      {
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        leaveHours: 0,
        submitted: 0,
        draft: 0,
        returned: 0,
        none: 0,
        leave: 0,
      },
    )
  }, [visibleMonthDays])

  const calendarDays = useMemo(() => {
    return buildCalendarGrid(calendarMonthDate).map((date) => {
      const iso = toIso(date)
      const entry = entryMap.get(iso)
      return {
        iso,
        date,
        entry,
        isCurrentMonth: isSameMonth(date, calendarMonthDate),
        isSelected: selectedDay?.key === iso,
        isToday: iso === todayIso,
        isVisible: entry ? calendarVisibleStatuses.includes(entry.status) : calendarVisibleStatuses.includes('none'),
      }
    })
  }, [calendarMonthDate, entryMap, selectedDay?.key, todayIso, calendarVisibleStatuses])

  const timeHistoryItems = useMemo(() => {
    const seededItems = createSeedHistoryItems(getTodayDate())
    const derivedItems = Object.values(timeEntryStore.ranges).map(buildHistoryItemFromRange)
    const merged = new Map<string, TimeHistoryItem>()

    seededItems.forEach((item) => {
      merged.set(item.key, item)
    })

    derivedItems.forEach((item) => {
      merged.set(item.key, item)
    })

    return Array.from(merged.values()).sort(
      (left, right) => fromIso(right.fromDateISO).getTime() - fromIso(left.fromDateISO).getTime(),
    )
  }, [timeEntryStore.ranges])

  const filteredTimeHistoryItems = useMemo(() => {
    const fromFilter = appliedHistoryFromDate ? fromIso(appliedHistoryFromDate).getTime() : null
    const toFilter = appliedHistoryToDate ? fromIso(appliedHistoryToDate).getTime() : null

    return timeHistoryItems.filter((item) => {
      const startsAt = fromIso(item.fromDateISO).getTime()
      const endsAt = fromIso(item.toDateISO).getTime()
      const matchesStatus = historyStatusFilter === 'all' || item.status === historyStatusFilter
      const matchesFrom = fromFilter === null || endsAt >= fromFilter
      const matchesTo = toFilter === null || startsAt <= toFilter

      return matchesStatus && matchesFrom && matchesTo
    })
  }, [appliedHistoryFromDate, appliedHistoryToDate, historyStatusFilter, timeHistoryItems])

  const approvalItems = useMemo(() => {
    const rangeItems = Object.values(timeEntryStore.ranges)
      .filter((range) => range.days.some((day) => day.hours > 0))
      .map(buildApprovalItemFromRange)

    const merged = new Map<string, ApprovalItem>()
    createSeedApprovalItems(getTodayDate()).forEach((item) => merged.set(item.key, item))
    rangeItems.forEach((item) => merged.set(item.key, item))

    return Array.from(merged.values()).sort(
      (left, right) => fromIso(right.fromDateISO).getTime() - fromIso(left.fromDateISO).getTime(),
    )
  }, [timeEntryStore.ranges])

  const filteredApprovalItems = useMemo(() => {
    return approvalFilter === 'all'
      ? approvalItems
      : approvalItems.filter((item) => item.status === approvalFilter)
  }, [approvalFilter, approvalItems])

  const approvalCounts = useMemo(() => {
    return approvalItems.reduce(
      (acc, item) => {
        acc[item.status] += 1
        acc.all += 1
        return acc
      },
      { pending: 0, approved: 0, returned: 0, all: 0 },
    )
  }, [approvalItems])

  const appliedHistoryRangeLabel = `${formatDateWithYear(appliedHistoryFromDate)} - ${formatDateWithYear(appliedHistoryToDate)}`
  const appliedLeaveHistoryRangeLabel = `${formatDateWithYear(appliedLeaveHistoryFrom)} - ${formatDateWithYear(appliedLeaveHistoryTo)}`
  // const leaveRequestedDaysPreview = useMemo(
  //   () => countWeekdaysInclusive(leaveForm.fromDateISO, leaveForm.toDateISO),
  //   [leaveForm.fromDateISO, leaveForm.toDateISO],
  // )
  const leaveBalances = useMemo(() => deriveLeaveBalances(leaveSeedBalances, leaveRequests), [leaveRequests])

  // const leaveAvailableByType = useMemo(
  //   () => Object.fromEntries(
  //     leaveBalances.map((item) => [item.id, Math.max(0, item.entitlement - item.used - item.pending)]),
  //   ) as Record<LeaveTypeId, number>,
  //   [leaveBalances],
  // )

  const leaveSummary = useMemo(() => {
    const pending = leaveRequests.filter((item) => item.status === 'pending').length
    const approved = leaveRequests.filter((item) => item.status === 'approved').length
    const returned = leaveRequests.filter((item) => item.status === 'returned').length
    const cancelled = leaveRequests.filter((item) => item.status === 'cancelled').length
    const upcoming = leaveRequests.filter(
      (item) => item.status !== 'cancelled' && fromIso(item.fromDateISO).getTime() >= fromIso(todayIso).getTime(),
    ).length

    return {
      pending,
      approved,
      returned,
      cancelled,
      upcoming,
    }
  }, [leaveRequests, todayIso])

  const filteredLeaveHistory = useMemo(() => {
    const fromFilter = appliedLeaveHistoryFrom ? fromIso(appliedLeaveHistoryFrom).getTime() : null
    const toFilter = appliedLeaveHistoryTo ? fromIso(appliedLeaveHistoryTo).getTime() : null

    return leaveRequests
      .filter((item) => {
        const startsAt = fromIso(item.fromDateISO).getTime()
        const endsAt = fromIso(item.toDateISO).getTime()
        const matchesStatus = leaveHistoryStatusFilter === 'all' || item.status === leaveHistoryStatusFilter
        const matchesFrom = fromFilter === null || endsAt >= fromFilter
        const matchesTo = toFilter === null || startsAt <= toFilter
        return matchesStatus && matchesFrom && matchesTo
      })
      .sort((left, right) => fromIso(right.fromDateISO).getTime() - fromIso(left.fromDateISO).getTime())
  }, [appliedLeaveHistoryFrom, appliedLeaveHistoryTo, leaveHistoryStatusFilter, leaveRequests])

  const filteredLeaveApprovals = useMemo(
    () => (leaveApprovalFilter === 'all'
      ? leaveApprovals
      : leaveApprovals.filter((item) => item.status === leaveApprovalFilter)),
    [leaveApprovalFilter, leaveApprovals],
  )

  const leaveApprovalCounts = useMemo(() => leaveApprovals.reduce(
    (acc, item) => {
      acc[item.status] += 1
      acc.all += 1
      return acc
    },
    { pending: 0, approved: 0, returned: 0, cancelled: 0, all: 0 },
  ), [leaveApprovals])

  const confirmContent = useMemo(() => {
    if (!confirmAction || !selectedDay) return null

    if (confirmAction === 'clock') {
      const hasEndTime = selectedDay.endTime !== '--'
      if (hasEndTime) {
        return {
          title: 'Confirm Clock In',
          message: `This will set ${formatDateLong(selectedDay.key)} as in progress. End time will be cleared, hours will be reset to 4.0, and status will be Draft.`,
        }
      }

      return {
        title: 'Confirm Clock Out',
        message: `This will set end time to 06:00 PM for ${formatDateLong(selectedDay.key)}, update hours to at least 8.0, and mark the status as Draft.`,
      }
    }

    const impactedDays = activeRange.days.filter((day) => isWeekdayIso(day.key)).length
    if (selectedCopySource === 'default') {
      return {
        title: 'Confirm Copy Period',
        message: `This will overwrite ${impactedDays} working dates in the selected range with default template values (09:00 AM to 06:00 PM, 8.0 hours, Draft status). Existing entries for those dates will be replaced.`,
      }
    }

    const selectedItem = timeHistoryItems.find((item) => item.key === selectedCopySource)
    const sourceLabel = selectedItem
      ? getRangeLabel(selectedItem.fromDateISO, selectedItem.toDateISO)
      : 'the selected period'
    return {
      title: 'Confirm Copy Period',
      message: `This will copy entries from the past period (${sourceLabel}) to the matching weekdays of the current active period. Existing entries for those dates will be replaced.`,
    }
  }, [confirmAction, selectedDay, activeRange.days, selectedCopySource, timeHistoryItems])

  const closeConfirmModal = () => setConfirmAction(null)

  const closeWarningModal = () => setWarningModal(null)

  const openFutureDateWarning = (dateIso: string, intent: 'select' | 'edit' | 'range') => {
    const actionLabel = intent === 'edit' ? 'edit' : intent === 'range' ? 'use' : 'select'
    setWarningModal({
      title: 'Future Date Not Allowed',
      message: `${formatDateLong(dateIso)} is in the future. You cannot ${actionLabel} future dates in Time Entry.`,
    })
  }

  const handleModuleClick = (moduleId: Module) => {
    setCurrentModule(moduleId)
    setStepIndex(0)
  }

  const updateActiveRange = (updater: (range: TimeEntryRangeData) => TimeEntryRangeData) => {
    setTimeEntryStore((prev) => {
      const current = prev.ranges[prev.activeRangeKey]
      const updated = updater(current)
      return {
        ...prev,
        ranges: {
          ...prev.ranges,
          [prev.activeRangeKey]: updated,
        },
      }
    })
  }

  const updateDay = (dayKey: string, updater: (day: TimeEntryDay) => TimeEntryDay) => {
    updateActiveRange((range) => ({
      ...range,
      days: range.days.map((day) => (day.key === dayKey ? updater(day) : day)),
      lastSaved: 'Just now',
    }))
  }

  const applyDateRange = () => {
    setDateRangeError('')
    setSubmitError('')

    if (!fromDateInput || !toDateInput) {
      setDateRangeError('Select both From and To dates.')
      return
    }

    const from = fromIso(fromDateInput)
    const to = fromIso(toDateInput)
    if (from > to) {
      setDateRangeError('From date cannot be after To date.')
      return
    }

    if (isFutureIso(fromDateInput) || isFutureIso(toDateInput)) {
      setDateRangeError('Future dates are not allowed in the selected range.')
      openFutureDateWarning(isFutureIso(toDateInput) ? toDateInput : fromDateInput, 'range')
      return
    }

    const daysDiff = Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1
    if (daysDiff > MAX_RANGE_DAYS) {
      setDateRangeError(`Date range cannot exceed ${MAX_RANGE_DAYS} days.`)
      return
    }

    const key = makeRangeKey(fromDateInput, toDateInput)

    setTimeEntryStore((prev) => {
      if (prev.ranges[key]) {
        return { ...prev, activeRangeKey: key }
      }

      return {
        activeRangeKey: key,
        ranges: {
          ...prev.ranges,
          [key]: buildRangeData(fromDateInput, toDateInput, prev.ranges[prev.activeRangeKey].days),
        },
      }
    })
  }

  const openEditModalForDay = (dayKey: string) => {
    const day = activeRange.days.find((entry) => entry.key === dayKey)
    if (!day) return
    if (isFutureIso(dayKey)) {
      openFutureDateWarning(dayKey, 'edit')
      return
    }
    if (isOlderThan5Days(dayKey)) {
      setWarningModal({
        title: 'Time Entry Locked',
        message: `${formatDateLong(dayKey)} is older than 5 days. You cannot edit or change time entries older than 5 days.`,
      })
      return
    }
    setSelectedDayKey(dayKey)
    setEditForm(getEditFormFromDay(day))
    setEditError('')
    setIsEditModalOpen(true)
  }

  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setEditError('')
  }

  const handleSaveDayEdit = () => {
    if (!selectedDay) return

    const requestId = `time-leave-${selectedDay.key}`

    if (editForm.isLeave) {
      const leaveType = editForm.leaveType || 'annual'
      const notes = editForm.notes.trim() || `${leaveTypeLabel[leaveType]} requested.`

      updateDay(selectedDay.key, (day) => ({
        ...day,
        startTime: '--',
        endTime: '--',
        breakDuration: '--',
        hours: 0,
        regularHours: 0,
        overtimeHours: 0,
        status: 'draft',
        workLocation: 'Remote',
        isLeave: true,
        leaveType,
        notes,
      }))

      setLeaveRequests((prev) => {
        const filtered = prev.filter((r) => r.id !== requestId)
        return [
          ...filtered,
          {
            id: requestId,
            leaveType,
            fromDateISO: selectedDay.key,
            toDateISO: selectedDay.key,
            durationDays: 1,
            status: 'pending',
            appliedOnISO: todayIso,
            reason: notes,
            handoverTo: '',
            contactDuringLeave: '',
          },
        ]
      })

      closeEditModal()
      return
    }

    // If it was leave, remove the request
    setLeaveRequests((prev) => prev.filter((r) => r.id !== requestId))

    const breakMinutes = Math.max(0, Math.round(editForm.breakMinutes || 0))
    let hours = 0
    let regularHours = 0
    let overtimeHours = 0
    let startTime = '--'
    let endTime = '--'
    let status: TimeEntryStatus = 'none'

    if (editForm.timeSpentHours && editForm.timeSpentHours > 0) {
      if (editForm.timeSpentHours < 0 || editForm.timeSpentHours > 24) {
        setEditError('Please enter a value between 0 and 24 hours.')
        return
      }
      hours = editForm.timeSpentHours
      regularHours = Number(Math.min(8, hours).toFixed(1))
      overtimeHours = Number(Math.max(0, hours - 8).toFixed(1))
      status = 'draft'

      const startStr = editForm.startTime || '09:00'
      const startMin = minutesFromTime(startStr) ?? 540

      let endMin = startMin + Math.round(hours * 60) + breakMinutes
      if (endMin >= 1440) {
        endMin = 1439 // Cap to end of day to avoid overflow
      }

      startTime = formatTime24To12(startStr)
      const endH = Math.floor(endMin / 60)
      const endM = endMin % 60
      const endH24Str = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
      endTime = formatTime24To12(endH24Str)
    }

    updateDay(selectedDay.key, (day) => ({
      ...day,
      startTime,
      endTime,
      breakDuration: hours > 0 ? formatBreakMinutes(breakMinutes) : '--',
      hours,
      regularHours,
      overtimeHours,
      status,
      workLocation: 'Remote',
      isLeave: false,
      leaveType: undefined,
      notes: editForm.notes.trim() || (status === 'none' ? 'No entry.' : ''),
    }))

    closeEditModal()
  }

  const handleClockInOut = () => {
    if (!selectedDay || !isWeekdayIso(selectedDay.key)) {
      return
    }

    updateDay(selectedDay.key, (day) => {
      const hasEndTime = day.endTime !== '--'
      if (hasEndTime) {
        return {
          ...day,
          endTime: '--',
          hours: 4,
          regularHours: 4,
          overtimeHours: 0,
          status: 'draft',
          notes: 'Clocked in and still in progress.',
        }
      }

      return {
        ...day,
        startTime: day.startTime === '--' ? '09:00 AM' : day.startTime,
        endTime: '06:00 PM',
        breakDuration: day.breakDuration === '--' ? '01:00 hr' : day.breakDuration,
        hours: Math.max(day.hours, 8),
        regularHours: Math.max(day.regularHours, 8),
        overtimeHours: Math.max(0, Math.max(day.hours, 8) - 8),
        status: 'draft',
        notes: 'Clocked out after completing planned tasks.',
      }
    })
  }

  const requestClockInOut = () => {
    if (!selectedDay || !isWeekdayIso(selectedDay.key)) {
      return
    }
    if (isOlderThan5Days(selectedDay.key)) {
      setWarningModal({
        title: 'Action Locked',
        message: `You cannot clock in/out for ${formatDateLong(selectedDay.key)} as it is older than 5 days.`,
      })
      return
    }
    setConfirmAction('clock')
  }

  const handleCopyPreviousPeriod = () => {
    if (selectedCopySource === 'default') {
      updateActiveRange((range) => ({
        ...range,
        days: range.days.map((day) => {
          if (isOlderThan5Days(day.key)) {
            return day
          }
          if (!isWeekdayIso(day.key)) {
            return {
              ...day,
              status: 'none',
              hours: 0,
              regularHours: 0,
              overtimeHours: 0,
              startTime: '--',
              endTime: '--',
              breakDuration: '--',
              workLocation: 'Off',
              notes: 'Weekend.',
            }
          }

          return {
            ...day,
            status: 'draft',
            hours: 8,
            regularHours: 8,
            overtimeHours: 0,
            startTime: '09:00 AM',
            endTime: '06:00 PM',
            breakDuration: '01:00 hr',
            workLocation: 'Remote',
            notes: 'Copied from previous period template.',
          }
        }),
        lastSaved: 'Just now',
      }))
      return
    }

    // Get source days from the selected copy week
    let sourceDays: TimeEntryDay[] | undefined = timeEntryStore.ranges[selectedCopySource]?.days

    if (!sourceDays) {
      const histItem = timeHistoryItems.find((item) => item.key === selectedCopySource)
      if (histItem) {
        // Construct the source days on the fly using default values but distributing seed hours
        const rangeData = buildRangeData(histItem.fromDateISO, histItem.toDateISO)
        const { regularPerDay, hoursPerDay } = distributeHoursAcrossWeek(
          histItem.totalHours,
          histItem.regularHours,
          histItem.overtimeHours
        )
        let weekdayIdx = 0
        rangeData.days = rangeData.days.map((day) => {
          if (!isWeekdayIso(day.key)) {
            return day
          }
          const hours = hoursPerDay[weekdayIdx] ?? 8
          const reg = regularPerDay[weekdayIdx] ?? 8
          const ot = hours - reg
          weekdayIdx++
          return {
            ...day,
            hours,
            regularHours: reg,
            overtimeHours: ot,
            startTime: hours > 0 ? '09:00 AM' : '--',
            endTime: hours > 0 ? '06:00 PM' : '--',
            breakDuration: hours > 0 ? '01:00 hr' : '--',
            workLocation: hours > 0 ? 'Remote' : 'Off',
            notes: 'Copied from history template.',
          }
        })
        sourceDays = rangeData.days
      }
    }

    if (!sourceDays) {
      return
    }

    const sourceDaysList = sourceDays // non-optional reference

    updateActiveRange((range) => ({
      ...range,
      days: range.days.map((day) => {
        if (isOlderThan5Days(day.key)) {
          return day
        }
        if (!isWeekdayIso(day.key)) {
          return {
            ...day,
            status: 'none',
            hours: 0,
            regularHours: 0,
            overtimeHours: 0,
            startTime: '--',
            endTime: '--',
            breakDuration: '--',
            workLocation: 'Off',
            notes: 'Weekend.',
          }
        }

        const targetDayOfWeek = fromIso(day.key).getDay()
        const matchingSourceDay = sourceDaysList.find((sd) => fromIso(sd.key).getDay() === targetDayOfWeek)

        if (matchingSourceDay) {
          return {
            ...day,
            status: 'draft',
            hours: matchingSourceDay.hours,
            regularHours: matchingSourceDay.regularHours,
            overtimeHours: matchingSourceDay.overtimeHours,
            startTime: matchingSourceDay.startTime,
            endTime: matchingSourceDay.endTime,
            breakDuration: matchingSourceDay.breakDuration,
            workLocation: matchingSourceDay.workLocation,
            notes: matchingSourceDay.notes || 'Copied from selected period.',
          }
        }

        return day
      }),
      lastSaved: 'Just now',
    }))
  }

  const requestCopyPreviousPeriod = () => {
    setSelectedCopySource('default')
    setConfirmAction('copy')
  }

  const handleConfirmAction = () => {
    if (confirmAction === 'clock') {
      handleClockInOut()
    }
    if (confirmAction === 'copy') {
      handleCopyPreviousPeriod()
    }
    setConfirmAction(null)
  }

  // const handleRequestCorrection = () => {
  //   if (!selectedDay || !isWeekdayIso(selectedDay.key)) {
  //     return
  //   }
  //   if (isOlderThan5Days(selectedDay.key)) {
  //     setWarningModal({
  //       title: 'Action Locked',
  //       message: `You cannot request correction for ${formatDateLong(selectedDay.key)} as it is older than 5 days.`,
  //     })
  //     return
  //   }

  //   updateDay(selectedDay.key, (day) => ({
  //     ...day,
  //     status: 'returned',
  //     notes: 'Correction requested for this entry.',
  //   }))
  // }

  const handleSubmit = () => {
    setSubmitError('')

    if (!activeRange.fromDateISO || !activeRange.toDateISO) {
      setSubmitError('Select a valid date range before submitting.')
      return
    }

    if (fromIso(activeRange.fromDateISO) > fromIso(activeRange.toDateISO)) {
      setSubmitError('From date must be before To date.')
      return
    }

    if (activeRange.days.some((day) => day.status === 'returned')) {
      setSubmitError('Resolve returned entries before submitting.')
      return
    }

    const filledDays = activeRange.days.filter((day) => isWeekdayIso(day.key) && day.hours > 0)
    if (filledDays.length === 0) {
      setSubmitError('Enter time for at least one date before submitting.')
      return
    }

    if (filledDays.some((day) => day.startTime === '--' || day.endTime === '--')) {
      setSubmitError('Each filled date must have both start and end time.')
      return
    }

    updateActiveRange((range) => ({
      ...range,
      days: range.days.map((day) => {
        if (!isWeekdayIso(day.key) || day.hours <= 0) return day
        return { ...day, status: 'submitted' }
      }),
      lastSaved: 'Just now',
    }))
  }

  const handlePrevDate = () => {
    if (selectedDayIndex <= 0) return
    handleDaySelection(activeRange.days[selectedDayIndex - 1].key)
  }

  const handleNextDate = () => {
    if (selectedDayIndex >= activeRange.days.length - 1) return
    handleDaySelection(activeRange.days[selectedDayIndex + 1].key)
  }

  const handleDaySelection = (dayKey: string) => {
    if (isFutureIso(dayKey)) {
      openFutureDateWarning(dayKey, 'select')
      return false
    }

    setSelectedDayKey(dayKey)
    return true
  }

  const toggleCalendarStatus = (status: TimeEntryStatus) => {
    setCalendarVisibleStatuses((prev) => {
      if (prev.includes(status)) {
        return prev.length === 1 ? prev : prev.filter((value) => value !== status)
      }

      return [...prev, status]
    })
  }

  const handleCalendarCellClick = (iso: string) => {
    const clickedDate = fromIso(iso)
    if (isFutureIso(iso)) {
      openFutureDateWarning(iso, 'select')
      return
    }

    if (!isSameMonth(clickedDate, calendarMonthDate)) {
      setCalendarMonthDate(startOfMonth(clickedDate))
    }

    if (entryMap.has(iso)) {
      handleDaySelection(iso)
    }
  }

  const handleExportTimeHistory = () => {
    const header = ['Week', 'Total Hours', 'Regular Hours', 'Overtime', 'Leave Hours', 'Status', 'Submitted On', 'Approved On']
    const rows = filteredTimeHistoryItems.map((item) => [
      getRangeLabel(item.fromDateISO, item.toDateISO),
      formatHours(item.totalHours),
      formatHours(item.regularHours),
      formatHours(item.overtimeHours),
      formatHours(item.leaveHours),
      timeHistoryStatusLabel[item.status],
      item.submittedOnISO ? formatDateWithYear(item.submittedOnISO) : '-',
      item.approvedOnISO ? formatDateWithYear(item.approvedOnISO) : '-',
    ])

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'time-history.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const getPortalUserName = (): string => {
    if (previewRoleMode === 'employee') {
      const emp = adminEmployees.find(e => e.id === simulatedEmployeeId)
      if (emp) return emp.name
    }
    if (previewRoleMode === 'client') {
      return simulatedClientName
    }
    const names: Record<'employee' | 'admin' | 'client', string> = {
      employee: 'John Doe',
      admin: 'Admin User',
      client: 'Client Corp',
    }
    return activeUserType ? names[activeUserType] : 'User'
  }

  const handleDownloadPayslipPDF = (ps: { month: string; payDate: string; grossSalary: number; netSalary: number; status: string }, targetEmployeeName?: string) => {
    const empName = targetEmployeeName || getPortalUserName()

    // Earnings Breakdown
    const basic = Math.round(ps.grossSalary * 0.50)
    const hra = Math.round(ps.grossSalary * 0.30)
    const splAllowance = ps.grossSalary - basic - hra

    // Deductions Breakdown
    const pf = Math.min(1800, Math.round(basic * 0.12))
    const pt = 200
    const totalDeductions = ps.grossSalary - ps.netSalary
    const tds = Math.max(0, totalDeductions - pf - pt)
    const finalTotalDeductions = pf + pt + tds

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      showToast('Popup blocker prevented opening the payslip printable view.')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip - ${ps.month} - ${empName}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1f2937;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            background: #ffffff;
            font-size: 14px;
            line-height: 1.5;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #EC1B8D;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            color: #EC1B8D;
            letter-spacing: -0.5px;
          }
          .logo span {
            color: #111827;
            font-weight: 400;
          }
          .title {
            text-align: right;
          }
          .title h1 {
            font-size: 20px;
            font-weight: 700;
            margin: 0;
            color: #111827;
            text-transform: uppercase;
          }
          .title p {
            margin: 4px 0 0 0;
            color: #6b7280;
            font-size: 12px;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          .meta-item {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px dashed #e5e7eb;
          }
          .meta-item:last-child {
            border-bottom: none;
          }
          .meta-label {
            color: #6b7280;
            font-weight: 500;
          }
          .meta-value {
            font-weight: 600;
            color: #111827;
          }
          .tables-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th {
            background: #f3f4f6;
            color: #374151;
            text-align: left;
            padding: 10px 12px;
            font-weight: 600;
            border-bottom: 2px solid #e5e7eb;
            font-size: 13px;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #e5e7eb;
            color: #4b5563;
          }
          .amount-col {
            text-align: right;
          }
          .total-row td {
            font-weight: 700;
            color: #111827;
            border-top: 2px solid #e5e7eb;
            border-bottom: 2px solid #e5e7eb;
            background: #f9fafb;
          }
          .net-pay-section {
            background: linear-gradient(90deg, #EC1B8D 0%, #a2105c 100%);
            color: #ffffff;
            padding: 20px 30px;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
          }
          .net-pay-title {
            font-size: 15px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .net-pay-amount {
            font-size: 24px;
            font-weight: 800;
          }
          .footer-note {
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
            margin-top: 60px;
            border-top: 1px solid #e5e7eb;
            padding-top: 15px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="logo">Pynk<span>Portal</span></div>
          <div class="title">
            <h1>Payslip Advice</h1>
            <p>Statement for the month of ${ps.month}</p>
          </div>
        </div>

        <div class="meta-grid">
          <div>
            <div class="meta-item">
              <span class="meta-label">Employee Name:</span>
              <span class="meta-value">${empName}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Pay Period:</span>
              <span class="meta-value">${ps.month}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Pay Date:</span>
              <span class="meta-value">${ps.payDate}</span>
            </div>
          </div>
          <div>
            <div class="meta-item">
              <span class="meta-label">Payment Mode:</span>
              <span class="meta-value">Direct Bank Transfer</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Status:</span>
              <span class="meta-value" style="color: #059669;">${ps.status}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Currency:</span>
              <span class="meta-value">USD ($)</span>
            </div>
          </div>
        </div>

        <div class="tables-container">
          <div>
            <table>
              <thead>
                <tr>
                  <th>Earnings Description</th>
                  <th class="amount-col">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Basic Salary</td>
                  <td class="amount-col">$ ${basic.toLocaleString('en-US')}</td>
                </tr>
                <tr>
                  <td>House Rent Allowance (HRA)</td>
                  <td class="amount-col">$ ${hra.toLocaleString('en-US')}</td>
                </tr>
                <tr>
                  <td>Special Allowance</td>
                  <td class="amount-col">$ ${splAllowance.toLocaleString('en-US')}</td>
                </tr>
                <tr class="total-row">
                  <td>Total Gross Earnings</td>
                  <td class="amount-col">$ ${ps.grossSalary.toLocaleString('en-US')}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <table>
              <thead>
                <tr>
                  <th>Deductions Description</th>
                  <th class="amount-col">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Provident Fund (PF)</td>
                  <td class="amount-col">$ ${pf.toLocaleString('en-US')}</td>
                </tr>
                <tr>
                  <td>Professional Tax (PT)</td>
                  <td class="amount-col">$ ${pt.toLocaleString('en-US')}</td>
                </tr>
                <tr>
                  <td>Income Tax (TDS)</td>
                  <td class="amount-col">$ ${tds.toLocaleString('en-US')}</td>
                </tr>
                <tr class="total-row">
                  <td>Total Deductions</td>
                  <td class="amount-col">$ ${finalTotalDeductions.toLocaleString('en-US')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="net-pay-section">
          <span class="net-pay-title">Net Salary Paid (Take Home)</span>
          <span class="net-pay-amount">$ ${ps.netSalary.toLocaleString('en-US')}</span>
        </div>

        <div class="footer-note">
          This is an official, computer-generated payslip copy issued by Pynk HR. No signature is required.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `)

    printWindow.document.close()
    showToast(`Payslip PDF printable view for ${ps.month} opened successfully!`)
  }

  const handleExportExcel = () => {
    const employeeName = getPortalUserName()
    const period = getRangeLabel(activeRange.fromDateISO, activeRange.toDateISO)

    const rows = [
      ['Timesheet Hours Report'],
      ['Employee Name', employeeName],
      ['Period', period],
      ['Overall Status', rangeStatus],
      [],
      ['Date', 'Day', 'Status', 'Work Location', 'Start Time', 'End Time', 'Regular Hours', 'Overtime Hours', 'Total Hours', 'Notes']
    ]

    activeRange.days.forEach((day) => {
      const dayStatus = day.isLeave ? (day.leaveType ? leaveTypeLabel[day.leaveType] : 'Leave') : statusLabel[day.status]
      const regHrs = day.isLeave ? 0 : day.regularHours
      const otHrs = day.isLeave ? 0 : day.overtimeHours
      const totalHrs = day.isLeave ? 8 : day.hours

      rows.push([
        day.key,
        day.label + ' ' + day.dateLabel,
        dayStatus,
        day.isLeave ? '--' : day.workLocation,
        day.isLeave ? '--' : day.startTime,
        day.isLeave ? '--' : day.endTime,
        String(regHrs),
        String(otHrs),
        String(totalHrs),
        day.notes || ''
      ])
    })

    rows.push([])
    rows.push(['Totals', '', '', '', '', '', String(totals.regularHours), String(totals.overtimeHours), String(totals.totalHours)])

    const csvContent = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `timesheet_${employeeName.toLowerCase().replace(/\s+/g, '_')}_${activeRange.fromDateISO}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    showToast('Timesheet exported to Excel successfully!')
  }

  // const handleExportWord = () => {
  //   const employeeName = getPortalUserName()
  //   const period = getRangeLabel(activeRange.fromDateISO, activeRange.toDateISO)

  //   let html = `
  //     <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
  //     <head>
  //       <title>Timesheet Report</title>
  //       <style>
  //         body { font-family: Arial, sans-serif; color: #333; margin: 20px; }
  //         h2 { color: #EC1B8D; border-bottom: 2px solid #EC1B8D; padding-bottom: 5px; }
  //         .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  //         .meta-table td { padding: 6px; font-size: 13px; }
  //         .meta-label { font-weight: bold; width: 150px; color: #555; }
  //         .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  //         .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px; font-size: 11px; text-align: left; }
  //         .data-table th { background-color: #f2f2f2; font-weight: bold; color: #111; }
  //         .totals-row { font-weight: bold; background-color: #fafafa; }
  //       </style>
  //     </head>
  //     <body>
  //       <h2>Timesheet Details Report</h2>
  //       <table class="meta-table">
  //         <tr><td class="meta-label">Employee Name:</td><td>${employeeName}</td></tr>
  //         <tr><td class="meta-label">Period:</td><td>${period}</td></tr>
  //         <tr><td class="meta-label">Overall Status:</td><td>${rangeStatus}</td></tr>
  //         <tr><td class="meta-label">Total Hours:</td><td>${formatHours(totals.totalHours)} hrs (Regular: ${formatHours(totals.regularHours)} hrs, Overtime: ${formatHours(totals.overtimeHours)} hrs)</td></tr>
  //       </table>

  //       <h3>Daily Time Entries</h3>
  //       <table class="data-table">
  //         <thead>
  //           <tr>
  //             <th>Date</th>
  //             <th>Day</th>
  //             <th>Status</th>
  //             <th>Work Location</th>
  //             <th>Start Time</th>
  //             <th>End Time</th>
  //             <th>Break (min)</th>
  //             <th>Reg. Hours</th>
  //             <th>OT Hours</th>
  //             <th>Total Hours</th>
  //             <th>Notes</th>
  //           </tr>
  //         </thead>
  //         <tbody>
  //   `

  //   activeRange.days.forEach((day) => {
  //     const dayStatus = day.isLeave ? (day.leaveType ? leaveTypeLabel[day.leaveType] : 'Leave') : statusLabel[day.status]
  //     const breakMin = day.isLeave ? '--' : day.breakDuration
  //     const regHrs = day.isLeave ? '0.0' : formatHours(day.regularHours)
  //     const otHrs = day.isLeave ? '0.0' : formatHours(day.overtimeHours)
  //     const totalHrs = day.isLeave ? '8.0' : formatHours(day.hours)

  //     html += `
  //       <tr>
  //         <td>${day.key}</td>
  //         <td>${day.label} ${day.dateLabel}</td>
  //         <td>${dayStatus}</td>
  //         <td>${day.isLeave ? '--' : day.workLocation}</td>
  //         <td>${day.isLeave ? '--' : day.startTime}</td>
  //         <td>${day.isLeave ? '--' : day.endTime}</td>
  //         <td>${breakMin}</td>
  //         <td>${regHrs}</td>
  //         <td>${otHrs}</td>
  //         <td>${totalHrs}</td>
  //         <td>${day.notes || ''}</td>
  //       </tr>
  //     `
  //   })

  //   html += `
  //           <tr class="totals-row">
  //             <td colspan="7">Totals</td>
  //             <td>${formatHours(totals.regularHours)}</td>
  //             <td>${formatHours(totals.overtimeHours)}</td>
  //             <td>${formatHours(totals.totalHours)}</td>
  //             <td></td>
  //           </tr>
  //         </tbody>
  //       </table>
  //     </body>
  //     </html>
  //   `

  //   const blob = new Blob(['\ufeff' + html], { type: 'application/msword' })
  //   const url = URL.createObjectURL(blob)
  //   const anchor = document.createElement('a')
  //   anchor.href = url
  //   anchor.download = `timesheet_${employeeName.toLowerCase().replace(/\s+/g, '_')}_${activeRange.fromDateISO}.doc`
  //   anchor.click()
  //   URL.revokeObjectURL(url)
  //   showToast('Timesheet exported to Word successfully!')
  // }

  const handleExportPDF = () => {
    const employeeName = getPortalUserName()
    const period = getRangeLabel(activeRange.fromDateISO, activeRange.toDateISO)

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      showToast('Popup blocked! Please allow popups to export PDF.')
      return
    }

    let tableRows = ''
    activeRange.days.forEach((day) => {
      const dayStatus = day.isLeave ? (day.leaveType ? leaveTypeLabel[day.leaveType] : 'Leave') : statusLabel[day.status]
      const breakMin = day.isLeave ? '--' : day.breakDuration
      const regHrs = day.isLeave ? '0.0' : formatHours(day.regularHours)
      const otHrs = day.isLeave ? '0.0' : formatHours(day.overtimeHours)
      const totalHrs = day.isLeave ? '8.0' : formatHours(day.hours)

      tableRows += `
        <tr>
          <td>${day.key}</td>
          <td>${day.label} ${day.dateLabel}</td>
          <td><span class="status-badge ${day.isLeave ? 'leave' : day.status}">${dayStatus}</span></td>
          <td>${day.isLeave ? '--' : day.workLocation}</td>
          <td>${day.isLeave ? '--' : day.startTime}</td>
          <td>${day.isLeave ? '--' : day.endTime}</td>
          <td>${breakMin}</td>
          <td>${regHrs}</td>
          <td>${otHrs}</td>
          <td class="bold">${totalHrs}</td>
          <td class="notes">${day.notes || ''}</td>
        </tr>
      `
    })

    printWindow.document.write(`
      <html>
      <head>
        <title>Timesheet - ${employeeName}</title>
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1f2937;
            padding: 40px;
            margin: 0;
            background: #fff;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #EC1B8D;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: 800;
            color: #EC1B8D;
            letter-spacing: -0.5px;
          }
          .logo span {
            color: #1f2937;
          }
          .title {
            text-align: right;
          }
          .title h1 {
            margin: 0;
            font-size: 24px;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .title p {
            margin: 5px 0 0;
            font-size: 13px;
            color: #6b7280;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 35px;
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          .meta-item h3 {
            margin: 0 0 6px;
            font-size: 11px;
            text-transform: uppercase;
            color: #9ca3af;
            letter-spacing: 0.5px;
          }
          .meta-item p {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            color: #111827;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
          }
          .data-table th, .data-table td {
            padding: 10px 12px;
            font-size: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
          }
          .data-table th {
            background-color: #f3f4f6;
            font-weight: 700;
            color: #374151;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
          }
          .data-table tr:hover {
            background: #f9fafb;
          }
          .bold {
            font-weight: 700;
          }
          .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .status-badge.submitted { background: #d1fae5; color: #065f46; }
          .status-badge.draft { background: #fef3c7; color: #92400e; }
          .status-badge.returned { background: #fee2e2; color: #991b1b; }
          .status-badge.none { background: #f3f4f6; color: #374151; }
          .status-badge.leave { background: #ede9fe; color: #5b21b6; }
          .totals-bar {
            display: flex;
            justify-content: flex-end;
            gap: 30px;
            background: #111827;
            color: #fff;
            padding: 15px 25px;
            border-radius: 6px;
            font-size: 14px;
            margin-bottom: 40px;
          }
          .totals-bar div {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .totals-bar div span {
            color: #9ca3af;
            font-size: 11px;
            text-transform: uppercase;
          }
          .totals-bar div strong {
            font-size: 16px;
            color: #fff;
          }
          .footer-note {
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
            margin-top: 60px;
            border-top: 1px solid #e5e7eb;
            padding-top: 15px;
          }
          .notes {
            color: #6b7280;
            max-width: 150px;
            word-wrap: break-word;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="logo">Pynk<span>Portal</span></div>
          <div class="title">
            <h1>Timesheet Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <h3>Employee Name</h3>
            <p>${employeeName}</p>
          </div>
          <div class="meta-item">
            <h3>Pay Period</h3>
            <p>${period}</p>
          </div>
          <div class="meta-item">
            <h3>Submission Status</h3>
            <p>${rangeStatus}</p>
          </div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Day</th>
              <th>Status</th>
              <th>Work Location</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Break (m)</th>
              <th>Reg Hrs</th>
              <th>OT Hrs</th>
              <th>Total Hrs</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="totals-bar">
          <div>
            <span>Regular Hours</span>
            <strong>${formatHours(totals.regularHours)}</strong>
          </div>
          <div>
            <span>Overtime Hours</span>
            <strong>${formatHours(totals.overtimeHours)}</strong>
          </div>
          <div>
            <span>Total Logged</span>
            <strong>${formatHours(totals.totalHours)} hrs</strong>
          </div>
        </div>

        <div class="footer-note">
          This is an official timesheet record generated from Pynk HR Suite.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `)

    printWindow.document.close()
    showToast('Timesheet PDF printable view opened successfully!')
  }

  const applyHistoryDateFilter = () => {
    setHistoryFilterError('')

    if (!historyFromDateInput || !historyToDateInput) {
      setHistoryFilterError('Select both From and To dates.')
      return
    }

    if (isFutureIso(historyFromDateInput) || isFutureIso(historyToDateInput)) {
      setHistoryFilterError('Future dates are not allowed in Time History filters.')
      openFutureDateWarning(isFutureIso(historyToDateInput) ? historyToDateInput : historyFromDateInput, 'range')
      return
    }

    if (fromIso(historyFromDateInput) > fromIso(historyToDateInput)) {
      setHistoryFilterError('From date cannot be after To date.')
      return
    }

    setAppliedHistoryFromDate(historyFromDateInput)
    setAppliedHistoryToDate(historyToDateInput)
  }

  const applyLeaveHistoryDateFilter = () => {
    setLeaveHistoryError('')

    if (!leaveHistoryFromInput || !leaveHistoryToInput) {
      setLeaveHistoryError('Select both From and To dates.')
      return
    }

    if (isFutureIso(leaveHistoryFromInput) || isFutureIso(leaveHistoryToInput)) {
      setLeaveHistoryError('Future dates are not allowed in Leave History filters.')
      setLeaveWarning({
        title: 'Future Date Not Allowed',
        message: 'Please choose dates up to today for history filters.',
      })
      return
    }

    if (fromIso(leaveHistoryFromInput) > fromIso(leaveHistoryToInput)) {
      setLeaveHistoryError('From date cannot be after To date.')
      return
    }

    setAppliedLeaveHistoryFrom(leaveHistoryFromInput)
    setAppliedLeaveHistoryTo(leaveHistoryToInput)
  }

  // const handleSubmitLeaveRequest = () => {
  //   setLeaveFormError('')
  //   setLeaveFormSuccess('')

  //   if (!leaveForm.leaveType || !leaveForm.fromDateISO || !leaveForm.toDateISO) {
  //     setLeaveFormError('Leave type, from date, and to date are required.')
  //     return
  //   }

  //   if (fromIso(leaveForm.fromDateISO) > fromIso(leaveForm.toDateISO)) {
  //     setLeaveFormError('From date cannot be after To date.')
  //     return
  //   }

  //   if (fromIso(leaveForm.fromDateISO).getTime() < fromIso(todayIso).getTime()) {
  //     setLeaveFormError('Past dates are not allowed while applying leave.')
  //     return
  //   }

  //   if (!leaveForm.reason.trim() || leaveForm.reason.trim().length < 5) {
  //     setLeaveFormError('Reason is required and must be at least 5 characters.')
  //     return
  //   }

  //   if (!leaveForm.handoverTo.trim()) {
  //     setLeaveFormError('Please provide handover person details.')
  //     return
  //   }

  //   if (!/^\d{10}$/.test(leaveForm.contactDuringLeave.trim())) {
  //     setLeaveFormError('Contact during leave must be a valid 10-digit number.')
  //     return
  //   }

  //   const leaveDays = countWeekdaysInclusive(leaveForm.fromDateISO, leaveForm.toDateISO)
  //   if (leaveDays <= 0) {
  //     setLeaveFormError('Selected range has no working days. Please choose weekdays.')
  //     return
  //   }

  //   const hasOverlap = leaveRequests.some((item) => {
  //     if (item.status === 'cancelled' || item.status === 'returned') {
  //       return false
  //     }

  //     return doesDateRangeOverlap(
  //       leaveForm.fromDateISO,
  //       leaveForm.toDateISO,
  //       item.fromDateISO,
  //       item.toDateISO,
  //     )
  //   })

  //   if (hasOverlap) {
  //     setLeaveFormError('Selected leave dates overlap with an existing pending/approved request.')
  //     return
  //   }

  //   if (leaveDays > leaveAvailableByType[leaveForm.leaveType]) {
  //     setLeaveFormError(`Insufficient ${leaveTypeLabel[leaveForm.leaveType]} balance for selected dates.`)
  //     return
  //   }

  //   const newRequest: LeaveRequestItem = {
  //     id: `lv-${Date.now()}`,
  //     leaveType: leaveForm.leaveType,
  //     fromDateISO: leaveForm.fromDateISO,
  //     toDateISO: leaveForm.toDateISO,
  //     durationDays: leaveDays,
  //     status: 'pending',
  //     appliedOnISO: todayIso,
  //     reason: leaveForm.reason.trim(),
  //     handoverTo: leaveForm.handoverTo.trim(),
  //     contactDuringLeave: leaveForm.contactDuringLeave.trim(),
  //   }

  //   setLeaveRequests((prev) => [newRequest, ...prev])
  //   setLeaveFormSuccess('Leave request submitted successfully and sent for approval.')
  //   setLeaveForm({
  //     leaveType: 'annual',
  //     fromDateISO: todayIso,
  //     toDateISO: todayIso,
  //     reason: '',
  //     handoverTo: '',
  //     contactDuringLeave: '',
  //   })
  //   setActiveLeaveTab('Leave History')
  // }

  // const handleCancelLeaveRequest = (requestId: string) => {
  //   setLeaveRequests((prev) => prev.map((item) => (
  //     item.id === requestId && item.status === 'pending'
  //       ? { ...item, status: 'cancelled' }
  //       : item
  //   )))
  // }

  const handleLeaveApprovalAction = (id: string, nextStatus: LeaveStatus) => {
    setLeaveApprovals((prev) => prev.map((item) => (
      item.id === id && item.status === 'pending'
        ? { ...item, status: nextStatus }
        : item
    )))
  }

  // ── Admin Panel Aggregations and Sub-Renders ──
  const reconciliationData = useMemo(() => {
    const clientFiltered = adminEmployees.filter(emp => reconcileClientFilter === 'All' || emp.clientName === reconcileClientFilter)

    let rows: Array<{ name: string; prev: number; curr: number; clientName: string }> = []

    if (reconciliationDimension === 'client') {
      const groups: Record<string, { prev: number; curr: number; clientName: string }> = {}
      clientFiltered.forEach((emp) => {
        if (!groups[emp.clientName]) groups[emp.clientName] = { prev: 0, curr: 0, clientName: emp.clientName }
        groups[emp.clientName].prev += emp.prevGross
        groups[emp.clientName].curr += emp.currGross
      })
      rows = Object.entries(groups).map(([name, val]) => ({ name, prev: val.prev, curr: val.curr, clientName: val.clientName }))
    } else if (reconciliationDimension === 'employee') {
      rows = clientFiltered.map((emp) => ({ name: `${emp.name} (${emp.id})`, prev: emp.prevGross, curr: emp.currGross, clientName: emp.clientName }))
    } else if (reconciliationDimension === 'paygroup') {
      const groups: Record<string, { prev: number; curr: number; clientNames: Set<string> }> = {}
      clientFiltered.forEach((emp) => {
        if (!groups[emp.paygroup]) groups[emp.paygroup] = { prev: 0, curr: 0, clientNames: new Set() }
        groups[emp.paygroup].prev += emp.prevGross
        groups[emp.paygroup].curr += emp.currGross
        groups[emp.paygroup].clientNames.add(emp.clientName)
      })
      rows = Object.entries(groups).map(([name, val]) => ({
        name,
        prev: val.prev,
        curr: val.curr,
        clientName: Array.from(val.clientNames).join(', ')
      }))
    } else {
      // payment mode
      const groups: Record<string, { prev: number; curr: number; clientNames: Set<string> }> = {}
      clientFiltered.forEach((emp) => {
        if (!groups[emp.paymentMode]) groups[emp.paymentMode] = { prev: 0, curr: 0, clientNames: new Set() }
        groups[emp.paymentMode].prev += emp.prevGross
        groups[emp.paymentMode].curr += emp.currGross
        groups[emp.paymentMode].clientNames.add(emp.clientName)
      })
      rows = Object.entries(groups).map(([name, val]) => ({
        name,
        prev: val.prev,
        curr: val.curr,
        clientName: Array.from(val.clientNames).join(', ')
      }))
    }

    if (reconcileSearchQuery) {
      const query = reconcileSearchQuery.toLowerCase()
      rows = rows.filter(r =>
        r.name.toLowerCase().includes(query) ||
        r.clientName.toLowerCase().includes(query)
      )
    }

    return rows
  }, [adminEmployees, reconciliationDimension, reconcileClientFilter, reconcileSearchQuery])

  const totalsAdmin = useMemo(() => {
    const clientFiltered = adminEmployees.filter(emp => reconcileClientFilter === 'All' || emp.clientName === reconcileClientFilter)
    return clientFiltered.reduce(
      (acc, emp) => {
        acc.prev += emp.prevGross
        acc.curr += emp.currGross
        return acc
      },
      { prev: 0, curr: 0 }
    )
  }, [adminEmployees, reconcileClientFilter])

  const handleExportCSV = () => {
    let csv = 'Dimension / Name,Previous Gross (USD),Current Gross (USD),Difference (USD),Variance (%)\n'
    reconciliationData.forEach((row) => {
      const diff = row.curr - row.prev
      const pct = row.prev > 0 ? ((diff / row.prev) * 100).toFixed(2) : '0.00'
      csv += `"${row.name}",${row.prev},${row.curr},${diff},${pct}%\n`
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `payroll_reconciliation_${reconciliationDimension}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast(`Reconciliation ${reconciliationDimension}-wise CSV file downloaded!`)
  }

  const handleToggleAccess = (empId: string, view: 'employee' | 'admin' | 'client' | 'payroll-control') => {
    setAdminEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === empId) {
          if (emp.isBlocked) return emp // Cannot edit access of a blocked user
          if (view === 'employee') return { ...emp, hasEmployeeView: !emp.hasEmployeeView }
          if (view === 'admin') return { ...emp, hasAdminView: !emp.hasAdminView }
          if (view === 'client') {
            const nextClient = !emp.hasClientView
            return {
              ...emp,
              hasClientView: nextClient,
              hasPayrollControlAccess: nextClient ? emp.hasPayrollControlAccess : false
            }
          }
          if (view === 'payroll-control') return { ...emp, hasPayrollControlAccess: !emp.hasPayrollControlAccess }
        }
        return emp
      })
    )
    showToast('User access permission updated!')
  }

  const handleToggleBlock = (empId: string) => {
    setAdminEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === empId) {
          const nextBlocked = !emp.isBlocked
          return {
            ...emp,
            isBlocked: nextBlocked,
            // Strip views immediately if blocked
            hasEmployeeView: nextBlocked ? false : emp.hasEmployeeView,
            hasAdminView: nextBlocked ? false : emp.hasAdminView,
            hasClientView: nextBlocked ? false : emp.hasClientView,
            hasPayrollControlAccess: nextBlocked ? false : emp.hasPayrollControlAccess,
          }
        }
        return emp
      })
    )
    showToast('User account status updated!')
  }

  // ── Client Portal & Reports Sub-Renders ──
  const renderReportsView = () => {
    const isAccessRestricted = activeReportType === 'access' && activeUserType !== 'admin'
    const finalReportEmployees = adminEmployees.filter(emp => {
      const matchesClient = activeUserType === 'admin' ? (reportFilterClient === 'All' || emp.clientName === reportFilterClient) : (emp.clientName === simulatedClientName)
      const matchesSearch = reportFilterEmployee === 'All' || emp.id === reportFilterEmployee
      return matchesClient && matchesSearch
    })

    const calculateDetailedRegister = (e: AdminEmployee) => {
      const gross = e.currGross / 12 // simulated monthly pay period check
      const dedTax = gross * 0.35 // 35% tax + deductions
      const employerPaid = gross * 0.12 // 12% employer paid
      const bonus = offcyclePaymentsList.filter(o => o.employeeId === e.id).reduce((sum, o) => sum + o.amount, 0)

      return {
        gross: gross + bonus,
        dedTax: dedTax,
        net: (gross + bonus) - dedTax,
        employerPaid: employerPaid,
        earningsName: bonus > 0 ? 'Regular + Bonus' : 'Regular Pay',
        earningsAmount: gross,
        earningsHours: 80,
        deductionsName: '401K Contribution',
        deductionsAmount: gross * 0.05,
        taxesName: 'OASDI / FICA',
        taxesAmount: dedTax - (gross * 0.05)
      }
    }

    const handleDownloadReportCSV = () => {
      let csv = ''
      let filename = `report_${activeReportType}.csv`

      if (activeReportType === 'timesheet') {
        csv = 'Employee ID,Name,Client,Pay Group,Regular Hours,Leave Hours,Overtime,Status\n'
        finalReportEmployees.forEach(e => {
          csv += `"${e.id}","${e.name}","${e.clientName}","${e.paygroup}",40,8,4,"Approved"\n`
        })
      } else if (activeReportType === 'costs') {
        csv = 'Employee ID,Name,Client,Payment Mode,Gross salary,Bonus Payments,Total Cost\n'
        finalReportEmployees.forEach(e => {
          const bonus = offcyclePaymentsList.filter(o => o.employeeId === e.id).reduce((sum, o) => sum + o.amount, 0)
          csv += `"${e.id}","${e.name}","${e.clientName}","${e.paymentMode}",${e.currGross},${bonus},${e.currGross + bonus}\n`
        })
      } else if (activeReportType === 'variance') {
        csv = 'Name,June Gross (Prev),July Gross (Curr),Difference,Variance (%)\n'
        reconciliationData.forEach(r => {
          const diff = r.curr - r.prev
          const pct = r.prev > 0 ? ((diff / r.prev) * 100).toFixed(2) : '0.00'
          csv += `"${r.name}",${r.prev},${r.curr},${diff},${pct}%\n`
        })
      } else if (activeReportType === 'access' && activeUserType === 'admin') {
        csv = 'ID,Username,Role,Action,Timestamp,IP Address\n'
        portalAccessLogs.forEach(l => {
          csv += `"${l.id}","${l.username}","${l.role}","${l.action}","${l.timestamp}","${l.ipAddress}"\n`
        })
      } else if (activeReportType === 'payroll_register') {
        csv = 'Worker,Pay Group,Pay Cycle Type,Gross,Ded/Tax,Net,Employer Paid,Earnings Name,Earnings Amount,Earnings Hours,Deductions Name,Deductions Amount,Taxes Name,Taxes Amount\n'
        finalReportEmployees.forEach(e => {
          const reg = calculateDetailedRegister(e)
          csv += `"${e.name}","${e.paygroup}","On-cycle",${reg.gross.toFixed(2)},${reg.dedTax.toFixed(2)},${reg.net.toFixed(2)},${reg.employerPaid.toFixed(2)},"${reg.earningsName}",${reg.earningsAmount.toFixed(2)},${reg.earningsHours},"${reg.deductionsName}",${reg.deductionsAmount.toFixed(2)},"${reg.taxesName}",${reg.taxesAmount.toFixed(2)}\n`
        })
      } else if (activeReportType === 'payment_ledger') {
        csv = 'Payment,Payment Category,Company,Status,Payee / Payor,Transaction Date,Bank Account,Payment Type,Payment Group,Transaction Reference,Payment Amount,Currency,Reconciliation Status,Period,Pay Group,Cancel Payment Date\n'
        const currentYear = new Date().getFullYear()
        const currentDate = new Date().toLocaleDateString('en-US')
        finalReportEmployees.forEach(e => {
          const reg = calculateDetailedRegister(e)
          csv += `"Payroll Payment: ${e.name} - ${currentYear}-07-02","Payroll On-Cycle Payment","${e.clientName}","Complete","${e.name}","${currentDate}","Stark Pay Bank Account","${e.paymentMode}","Payroll On-Cycle Payment (${e.paymentMode}) for Bank Account","${e.id}",${reg.net.toFixed(2)},"USD","Unreconciled","${formatPeriodRange(clientPeriodStartDate, clientPeriodEndDate)}","${e.paygroup}",""\n`
        })
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast('Report CSV spreadsheet downloaded successfully!')
    }

    return (
      <div className="dash-shell">
        <div className="dash-welcome-row">
          <div>
            <h1 className="dash-welcome-title">Interactive Operational Reports 📈</h1>
            <p className="dash-welcome-sub">Generate audit-ready spreadsheets and overview analytics dashboards.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={handleDownloadReportCSV} disabled={isAccessRestricted}>
            📥 Download Spreadsheet (CSV)
          </button>
        </div>

        {/* Filters */}
        <div className="admin-filters-bar" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div className="filter-input-group">
            <label style={{ fontSize: '11px', color: 'var(--muted)' }}>Report Type Selection</label>
            <select value={activeReportType} onChange={e => setActiveReportType(e.target.value as any)} className="btn" style={{ background: 'var(--surface)', color: '#fff' }}>
              <option value="timesheet">Timesheet Hours Report</option>
              <option value="costs">Total Payroll Costs Report</option>
              {currentModule === 'client-reports' ? (
                <>
                  <option value="payroll_register">Payroll Register Detailed Report</option>
                  <option value="payment_ledger">Payment Ledger Export Report</option>
                </>
              ) : (
                <>
                  <option value="variance">Variance Reconciliation Report</option>
                  {activeUserType === 'admin' && <option value="access">Security Access Logs</option>}
                </>
              )}
            </select>
          </div>

          <div className="filter-input-group">
            <label style={{ fontSize: '11px', color: 'var(--muted)' }}>Pay Period From</label>
            <input type="date" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)} className="btn" style={{ background: 'var(--surface)', color: '#fff' }} />
          </div>

          <div className="filter-input-group">
            <label style={{ fontSize: '11px', color: 'var(--muted)' }}>Pay Period To</label>
            <input type="date" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)} className="btn" style={{ background: 'var(--surface)', color: '#fff' }} />
          </div>

          {activeUserType === 'admin' && (
            <div className="filter-input-group">
              <label style={{ fontSize: '11px', color: 'var(--muted)' }}>Corporate Client Filter</label>
              <select value={reportFilterClient} onChange={e => setReportFilterClient(e.target.value)} className="btn" style={{ background: 'var(--surface)', color: '#fff' }}>
                <option value="All">All Clients</option>
                <option value="Acme Corp">Acme Corp</option>
                <option value="Stark Industries">Stark Industries</option>
                <option value="Wayne Enterprises">Wayne Enterprises</option>
                <option value="Globex Corp">Globex Corp</option>
              </select>
            </div>
          )}

          <div className="filter-input-group">
            <label style={{ fontSize: '11px', color: 'var(--muted)' }}>Employee Database Search</label>
            <select value={reportFilterEmployee} onChange={e => setReportFilterEmployee(e.target.value)} className="btn" style={{ background: 'var(--surface)', color: '#fff' }}>
              <option value="All">All Employees</option>
              {adminEmployees
                .filter(emp => activeUserType === 'admin' || emp.clientName === simulatedClientName)
                .map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>
        </div>

        {/* Main Content Display */}
        {isAccessRestricted ? (
          <div className="dash-card text-center" style={{ padding: '40px' }}>
            <div style={{ fontSize: '40px', marginBottom: '14px' }}>🔒</div>
            <h3>Access Restriction Alert</h3>
            <p style={{ color: 'var(--muted)', maxWidth: '450px', margin: '0 auto' }}>
              Portal Access Logs and audit logs are restricted to system administrators. Please contact your Pynk HR coordinator.
            </p>
          </div>
        ) : (
          <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="tbl">
              {activeReportType === 'timesheet' && (
                <table>
                  <thead>
                    <tr>
                      <th>Employee ID</th>
                      <th>Name</th>
                      <th>Client Entity</th>
                      <th>Pay Group</th>
                      <th className="num">Regular Hours</th>
                      <th className="num">Leave Hours</th>
                      <th className="num">Overtime</th>
                      <th>Approval Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalReportEmployees.map(e => (
                      <tr key={e.id}>
                        <td><code>{e.id}</code></td>
                        <td><strong>{e.name}</strong></td>
                        <td>{e.clientName}</td>
                        <td>{e.paygroup}</td>
                        <td className="num">40h</td>
                        <td className="num">8h</td>
                        <td className="num">4h</td>
                        <td><span className="badge done">Approved</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeReportType === 'costs' && (
                <table>
                  <thead>
                    <tr>
                      <th>Employee ID</th>
                      <th>Name</th>
                      <th>Client Entity</th>
                      <th>Payment mode</th>
                      <th className="num">Base Pay (July)</th>
                      <th className="num">Offcycle Bonus</th>
                      <th className="num">Total Gross Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalReportEmployees.map(e => {
                      const bonus = offcyclePaymentsList.filter(o => o.employeeId === e.id).reduce((sum, o) => sum + o.amount, 0)
                      return (
                        <tr key={e.id}>
                          <td><code>{e.id}</code></td>
                          <td><strong>{e.name}</strong></td>
                          <td>{e.clientName}</td>
                          <td>{e.paymentMode}</td>
                          <td className="num">$ {e.currGross.toLocaleString('en-US')}</td>
                          <td className="num">$ {bonus.toLocaleString('en-US')}</td>
                          <td className="num"><strong>$ {(e.currGross + bonus).toLocaleString('en-US')}</strong></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}

              {activeReportType === 'variance' && (
                <table>
                  <thead>
                    <tr>
                      <th>Variance Group / Component</th>
                      <th className="num">June 2025 Volume</th>
                      <th className="num">July 2025 Volume</th>
                      <th className="num">Absolute variance</th>
                      <th className="num">Percentage variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciliationData.map((r, idx) => {
                      const diff = r.curr - r.prev
                      const pct = r.prev > 0 ? (diff / r.prev) * 100 : 0
                      const rowClass = diff > 0 ? 'increase' : diff < 0 ? 'decrease' : 'neutral'
                      return (
                        <tr key={idx}>
                          <td><strong>{r.name}</strong></td>
                          <td className="num">$ {r.prev.toLocaleString('en-US')}</td>
                          <td className="num">$ {r.curr.toLocaleString('en-US')}</td>
                          <td className={`num ${rowClass}`}>{diff > 0 ? '+' : ''}$ {diff.toLocaleString('en-US')}</td>
                          <td className={`num ${rowClass}`}>{pct.toFixed(2)}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}

              {activeReportType === 'payroll_register' && (
                <table>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ width: '40px', textAlign: 'center' }}>Result</th>
                      <th>Worker</th>
                      <th>Pay Group</th>
                      <th>Pay Cycle Type</th>
                      <th className="num">Gross</th>
                      <th className="num">Ded/Tax</th>
                      <th className="num">Net</th>
                      <th className="num">Employer Paid</th>
                      <th>Earnings Name</th>
                      <th className="num">Earnings Amt</th>
                      <th className="num">Earnings Hrs</th>
                      <th>Deductions Name</th>
                      <th className="num">Deductions Amt</th>
                      <th>Taxes Name</th>
                      <th className="num">Taxes Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalReportEmployees.map(e => {
                      const reg = calculateDetailedRegister(e)
                      return (
                        <tr key={e.id}>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ cursor: 'pointer', color: 'var(--primary)' }} title="View details">🔍</span>
                          </td>
                          <td><strong>{e.name}</strong></td>
                          <td><span style={{ color: 'var(--primary)', cursor: 'pointer' }}>{e.paygroup}</span></td>
                          <td>On-cycle</td>
                          <td className="num">$ {reg.gross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="num">$ {reg.dedTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="num" style={{ fontWeight: 600 }}>$ {reg.net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="num">$ {reg.employerPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td>{reg.earningsName}</td>
                          <td className="num">$ {reg.earningsAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="num">{reg.earningsHours.toFixed(2)}</td>
                          <td>{reg.deductionsName}</td>
                          <td className="num">$ {reg.deductionsAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td>{reg.taxesName}</td>
                          <td className="num">$ {reg.taxesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}

              {activeReportType === 'payment_ledger' && (
                <table>
                  <thead>
                    <tr>
                      <th>Payment</th>
                      <th>Payment Category</th>
                      <th>Company</th>
                      <th>Status</th>
                      <th>Payee / Payor</th>
                      <th>Transaction Date</th>
                      <th>Bank Account</th>
                      <th>Payment Type</th>
                      <th>Payment Group</th>
                      <th>Transaction Reference</th>
                      <th className="num">Payment Amount</th>
                      <th>Currency</th>
                      <th>Reconciliation Status</th>
                      <th>Period</th>
                      <th>Pay Group</th>
                      <th>Cancel Payment Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalReportEmployees.map(e => {
                      const reg = calculateDetailedRegister(e)
                      const currentYear = new Date().getFullYear()
                      const currentDate = new Date().toLocaleDateString('en-US')
                      return (
                        <tr key={e.id}>
                          <td style={{ whiteSpace: 'nowrap' }}><code>{`Payroll Payment: ${e.name} - ${currentYear}-07-02`}</code></td>
                          <td style={{ whiteSpace: 'nowrap' }}>Payroll On-Cycle Payment</td>
                          <td>{e.clientName}</td>
                          <td><span className="badge done">Complete</span></td>
                          <td><strong>{e.name}</strong></td>
                          <td>{currentDate}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>Stark Pay Bank Account</td>
                          <td>{e.paymentMode}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{`Payroll On-Cycle Payment (${e.paymentMode}) for Bank Account`}</td>
                          <td><code>{e.id}</code></td>
                          <td className="num" style={{ fontWeight: 600 }}>$ {reg.net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td>USD</td>
                          <td><span className="badge pending">Unreconciled</span></td>
                          <td style={{ whiteSpace: 'nowrap' }}>{formatPeriodRange(clientPeriodStartDate, clientPeriodEndDate)}</td>
                          <td>{e.paygroup}</td>
                          <td>—</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}

              {activeReportType === 'access' && activeUserType === 'admin' && (
                <table>
                  <thead>
                    <tr>
                      <th>Log ID</th>
                      <th>Operator</th>
                      <th>Account Role</th>
                      <th>Action performed</th>
                      <th>Timestamp</th>
                      <th>IP address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portalAccessLogs.map(l => (
                      <tr key={l.id}>
                        <td><code>{l.id}</code></td>
                        <td><strong>{l.username}</strong></td>
                        <td><span className="badge sign">{l.role}</span></td>
                        <td>{l.action}</td>
                        <td>{l.timestamp}</td>
                        <td><code>{l.ipAddress}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderClientPayrollControl = () => {
    const handleUpdateConfigRow = (empId: string, rateCode: string, field: 'hours' | 'fullSalary', value: number) => {
      setPayrollConfigRows((prev) =>
        prev.map((row) =>
          row.employeeId === empId && row.rateCode === rateCode
            ? { ...row, [field]: value }
            : row
        )
      )
    }

    const handleSavePayrollConfig = () => {
      for (const row of payrollConfigRows) {
        if (row.hours < 0) {
          setAlertModal({
            type: 'error',
            title: 'Validation Error',
            message: `Hours for ${row.employeeName} cannot be negative.`
          })
          return
        }
        if (row.fullSalary < 0) {
          setAlertModal({
            type: 'error',
            title: 'Validation Error',
            message: `Full Salary for ${row.employeeName} cannot be negative.`
          })
          return
        }
      }

      const currentPeriod = clientDashboardPayPeriod
      const currentCount = payrollEditCounts[currentPeriod] || 0

      if (currentCount >= 2) {
        setAlertModal({
          type: 'error',
          title: 'Limit Reached',
          message: `You have already reached the limit of 2 modifications for the pay period ${currentPeriod}.`
        })
        return
      }

      setShowSavePayrollConfirmModal(true)
    }

    const handleConfirmSavePayrollConfig = () => {
      setShowSavePayrollConfirmModal(false)

      const currentPeriod = clientDashboardPayPeriod
      const currentCount = payrollEditCounts[currentPeriod] || 0

      setPayrollEditCounts(prev => ({
        ...prev,
        [currentPeriod]: currentCount + 1
      }))

      // Sync with adminEmployees state for matching REG salaries
      setAdminEmployees((prevEmps) =>
        prevEmps.map((emp) => {
          const regRow = payrollConfigRows.find((r) => r.employeeId === emp.id && r.rateCode === 'REG')
          if (regRow) {
            return { ...emp, currGross: regRow.fullSalary }
          }
          return emp
        })
      )
      showToast('Payroll Area configuration and salaries saved successfully!')
    }

    const handleDownloadTimesheetTemplate = () => {
      const metaRows = [
        ["Payment Amount Less", "0", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["Expense Payee Type", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["Is Intercompany", "No", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["Is Direct Intercompany", "No", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["Companies Receiving Payment", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["Periods", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["Pay Run Groups and/or Pay Group Details", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["Reconciliation Status", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]
      ];

      const headers = [
        "Payment",
        "Payment Category",
        "Company",
        "Status",
        "Payee / Payor",
        "Transaction Date",
        "Bank Account",
        "Payment Type",
        "Payment Group",
        "Transaction Reference",
        "Payment Amount",
        "Currency",
        "Reconciliation Status",
        "Period",
        "Pay Group",
        "Cancel Payment Date"
      ];

      const currentDate = new Date().toLocaleDateString('en-US');
      const currentYear = new Date().getFullYear();

      const dataRows = payrollConfigRows.map((row) => {
        return [
          `Payroll Payment: ${row.employeeName} - ${currentYear}-07-02`,
          "Payroll On-Cycle Payment",
          "Stark Industries Inc",
          "Complete",
          row.employeeName,
          currentDate,
          "Stark Pay Bank Account",
          "Direct Deposit",
          `Payroll On-Cycle Payment (Direct Deposit) for Stark Pay Bank Account`,
          row.employeeId,
          row.fullSalary.toString(),
          "USD",
          "Unreconciled",
          formatPeriodRange(clientPeriodStartDate, clientPeriodEndDate) || `06/01/${currentYear} - 06/15/${currentYear}`,
          "US Biweekly",
          ""
        ];
      });

      const csvContent = [
        ...metaRows,
        headers,
        ...dataRows
      ]
        .map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "payroll_eib_template.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    const handleCSVBulkUploadSimulation = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0]
        if (!file.name.endsWith('.csv')) {
          showToast('Invalid file format. Please upload a CSV file matching the format template.')
          return
        }
        setIsBulkUploading(true)

        const reader = new FileReader()
        reader.onload = (event) => {
          const text = event.target?.result as string
          if (!text) {
            setIsBulkUploading(false)
            return
          }

          setTimeout(() => {
            setIsBulkUploading(false)
            const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
            if (lines.length === 0) {
              showToast('CSV file is empty.')
              return
            }

            const newRows: PayrollConfigRow[] = []

            // Check if it's the Workday EIB sheet format
            const isEibFormat = lines[0].includes('Payment Amount Less') || lines.some(l => l.includes('Reconciliation Status') && l.includes('Payee / Payor'))

            if (isEibFormat) {
              let headerIndex = -1
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('Payee / Payor') && lines[i].includes('Payment Amount')) {
                  headerIndex = i
                  break
                }
              }

              if (headerIndex === -1) {
                showToast('Failed to find header row in EIB template.')
                return
              }

              for (let i = headerIndex + 1; i < lines.length; i++) {
                const parts: string[] = []
                let currentPart = ''
                let inQuotes = false
                const line = lines[i]
                for (let j = 0; j < line.length; j++) {
                  const char = line[j]
                  if (char === '"') {
                    inQuotes = !inQuotes
                  } else if (char === ',' && !inQuotes) {
                    parts.push(currentPart.trim())
                    currentPart = ''
                  } else {
                    currentPart += char
                  }
                }
                parts.push(currentPart.trim())

                const cleanParts = parts.map(p => p.replace(/^"|"$/g, '').trim())

                if (cleanParts.length >= 15) {
                  const employeeId = cleanParts[9]
                  const employeeName = cleanParts[4]
                  const fullSalary = parseFloat(cleanParts[10]) || 0
                  const payGroup = cleanParts[14]

                  if (employeeId && employeeName) {
                    newRows.push({
                      employeeId,
                      employeeName,
                      rateCode: payGroup === 'US Biweekly' ? 'REG' : 'REG',
                      hours: 160,
                      fullSalary
                    })
                  }
                }
              }
            } else {
              for (let i = 1; i < lines.length; i++) {
                const parts = lines[i].split(',').map(part => part.replace(/^"|"$/g, '').trim())
                if (parts.length >= 5) {
                  newRows.push({
                    employeeId: parts[0],
                    employeeName: parts[1],
                    rateCode: parts[2],
                    hours: parseFloat(parts[3]) || 0,
                    fullSalary: parseFloat(parts[4]) || 0
                  })
                }
              }
            }

            if (newRows.length > 0) {
              setPayrollConfigRows(newRows)
              showToast(`Successfully parsed and loaded ${newRows.length} configurations in the table!`)
            } else {
              showToast('Failed to parse columns. Make sure CSV matches the template format.')
            }
          }, 1000)
        }
        reader.readAsText(file)
      }
    }

    return (
      <div className="dash-shell">
        {showSavePayrollConfirmModal && (
          <div className="time-modal-backdrop" role="presentation" onClick={() => setShowSavePayrollConfirmModal(false)}>
            <div className="modal-caution-box" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>⚠️</span>
                <div>
                  <h2>Confirm Salary Modification</h2>
                  <p className="modal-caution-sub">This action has a limited frequency</p>
                </div>
              </div>
              <div className="modal-caution-content">
                You are about to modify the salary records for this pay period.
                Please note that <strong style={{ color: '#f39c12' }}>only twice</strong> can edits be performed per pay period.
              </div>
              <p className="modal-caution-footer">Are you sure you want to save/modify salary records?</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setShowSavePayrollConfirmModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleConfirmSavePayrollConfig}
                  style={{ background: 'linear-gradient(135deg,#f39c12,#e67e22)', border: 'none', fontWeight: 700 }}>
                  ✓ Yes, Save
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="dash-welcome-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="dash-welcome-title">Payroll Control Center Configurator ⚙️</h1>
            <p className="dash-welcome-sub">Configure hourly rates, adjust employee salaries, or run timesheet uploads.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="pay-period-select-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="payroll-control-period-select" style={{ fontSize: '12px', fontWeight: '500', color: 'var(--muted)' }}>Pay Period:</label>
              <select
                id="payroll-control-period-select"
                className="modal-field"
                style={{ width: '130px', padding: '6px 10px', fontSize: '12px' }}
                value={clientDashboardPayPeriod}
                onChange={(e) => setClientDashboardPayPeriod(e.target.value as ClientDashboardPayPeriod)}
              >
                {clientDashboardPayPeriods.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            {isBulkUploading ? (
              <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="preview-pulse-dot" style={{ width: '6px', height: '6px', margin: 0 }}></span> Parsing sheet...
              </span>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleDownloadTimesheetTemplate}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 12px' }}
                >
                  📥 Download EIB Format
                </button>
                <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 12px' }}
                  >
                    📤 Upload Time Entry for Employees
                  </button>
                  <input
                    type="file"
                    disabled={isPeriodLocked}
                    onChange={handleCSVBulkUploadSimulation}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="dash-grid-layout" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>

          {/* Unified Payroll Area Configurator Table Card */}
          <div className="configurator-table-card">
            {(() => {
              const handleExportConfiguratorExcel = () => {
                const headers = ['Employee ID', 'Employee Name', 'Rate Code', 'Hours', 'Full Salary (USD)', 'Salary Per Hour (USD)']
                const rows = payrollConfigRows.map((row) => {
                  const salaryPerHour = row.hours > 0 ? (row.fullSalary / row.hours) : 0
                  return [
                    row.employeeId,
                    row.employeeName,
                    row.rateCode,
                    row.hours.toString(),
                    row.fullSalary.toString(),
                    salaryPerHour.toFixed(2)
                  ]
                })

                const csvContent = [
                  headers.join(','),
                  ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
                ].join('\n')

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.setAttribute('href', url)
                link.setAttribute('download', 'payroll_code_configurator.csv')
                link.style.visibility = 'hidden'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }

              return (
                <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 className="dash-card-title" style={{ margin: 0 }}>Salary & Hourly Code Configurator</h3>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
                      Set hours, salary, and calculate hourly rates per employee and code.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleExportConfiguratorExcel}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', borderRadius: '6px' }}
                  >
                    📥 Export Data
                  </button>
                </div>
              )
            })()}

            <div style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid var(--line)', borderRadius: '6px' }}>
              <table className="configurator-table">
                <thead>
                  <tr>
                    <th>Employee / Group</th>
                    <th>Rate Code</th>
                    <th style={{ width: '100px' }}>Hours</th>
                    <th style={{ width: '160px' }}>Full Salary (USD)</th>
                    <th style={{ width: '160px', textAlign: 'right' }}>Salary Per Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollConfigRows.map((row) => {
                    const salaryPerHour = row.hours > 0 ? (row.fullSalary / row.hours) : 0

                    return (
                      <tr key={`${row.employeeId}-${row.rateCode}`}>
                        <td>
                          <strong>{row.employeeName}</strong>
                          <span style={{ display: 'block', fontSize: '10px', color: 'var(--muted)' }}>{row.employeeId}</span>
                        </td>
                        <td>
                          <span className={`status-chip ${row.rateCode === 'REG' ? 'submitted' : 'returned'}`} style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                            {row.rateCode}
                          </span>
                        </td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            style={{ width: '90px', padding: '4px 8px', background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '4px', textAlign: 'right' }}
                            value={row.hours}
                            disabled={isPeriodLocked}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0
                              handleUpdateConfigRow(row.employeeId, row.rateCode, 'hours', val)
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            style={{ width: '140px', padding: '4px 8px', background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '4px', textAlign: 'right' }}
                            value={row.fullSalary}
                            disabled={isPeriodLocked}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0
                              handleUpdateConfigRow(row.employeeId, row.rateCode, 'fullSalary', val)
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)' }}>
                          ${salaryPerHour.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSavePayrollConfig}
              disabled={isPeriodLocked}
              style={{ width: 'fit-content', marginTop: '15px' }}
            >
              Save/Modify Salary Records
            </button>
          </div>

        </div>
      </div>
    )
  }

  const renderClientPayrollPeriod = () => {
    const allIds = adminEmployees.map(e => e.id)
    // Only non-approved employees are eligible for selection
    const pendingIds = allIds.filter(id => !approvedEmployeeIds.has(id))
    const allApproved = allIds.length > 0 && allIds.every(id => approvedEmployeeIds.has(id))

    const isAllSelected = pendingIds.length > 0 && pendingIds.every(id => selectedEmployeeIds.has(id))
    const isIndeterminate = pendingIds.some(id => selectedEmployeeIds.has(id)) && !isAllSelected
    const selectedCount = selectedEmployeeIds.size
    const approvedCount = approvedEmployeeIds.size

    const handleSelectAll = () => {
      if (isAllSelected) {
        setSelectedEmployeeIds(new Set())
      } else {
        setSelectedEmployeeIds(new Set(pendingIds))
      }
    }

    const handleToggleOne = (id: string) => {
      if (approvedEmployeeIds.has(id)) return // can't toggle approved
      setSelectedEmployeeIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }

    const handleConfirmApprove = () => {
      const nowApproved = new Set([...approvedEmployeeIds, ...selectedEmployeeIds])
      setApprovedEmployeeIds(nowApproved)
      setSelectedEmployeeIds(new Set())
      setShowApproveConfirmModal(false)

      if (nowApproved.size === allIds.length) {
        setDismissedAllApproved(false)
      } else {
        setDismissedApprovedCount(false)
      }

      showToast(`Timesheet entries approved for ${selectedCount} employee${selectedCount > 1 ? 's' : ''}!`)
    }

    return (
      <div className="dash-shell">
        {/* Confirmation Modal */}
        {showApproveConfirmModal && (
          <div className="time-modal-backdrop" role="presentation" onClick={() => setShowApproveConfirmModal(false)}>
            <div className="modal-caution-box" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>⚠️</span>
                <div>
                  <h2>Confirm Approval</h2>
                  <p className="modal-caution-sub">This action cannot be undone</p>
                </div>
              </div>
              <div className="modal-caution-content">
                You are about to <strong style={{ color: '#f39c12' }}>approve timesheet entries</strong> for{' '}
                <strong>{selectedCount} employee{selectedCount > 1 ? 's' : ''}</strong>.
                Once approved, submissions will be <strong style={{ color: '#e74c3c' }}>frozen</strong> and forwarded for payroll processing.
              </div>
              <p className="modal-caution-footer">Are you sure you want to proceed?</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setShowApproveConfirmModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleConfirmApprove}
                  style={{ background: 'linear-gradient(135deg,#f39c12,#e67e22)', border: 'none', fontWeight: 700 }}>
                  ✓ Yes, Approve
                </button>
              </div>
            </div>
          </div>
        )}


        <div className="dash-welcome-row" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'nowrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'nowrap', flexShrink: 0 }}>
              <h1 className="dash-welcome-title" style={{ margin: 0, whiteSpace: 'nowrap' }}>Payroll Area & Time Approval Checklist 📅</h1>

              {/* Date selection inline next to the title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap', flexShrink: 0, background: 'var(--surface)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <label htmlFor="period-start-date-input" style={{ fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap', color: 'var(--muted)' }}>Start:</label>
                  <input
                    id="period-start-date-input"
                    type="date"
                    className="modal-field"
                    style={{ width: '120px', padding: '4px 6px', fontSize: '11px', background: 'transparent', color: 'var(--text-h)', border: 'none' }}
                    value={clientPeriodStartDate}
                    onChange={(e) => setClientPeriodStartDate(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <label htmlFor="period-end-date-input" style={{ fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap', color: 'var(--muted)' }}>End:</label>
                  <input
                    id="period-end-date-input"
                    type="date"
                    className="modal-field"
                    style={{ width: '120px', padding: '4px 6px', fontSize: '11px', background: 'transparent', color: 'var(--text-h)', border: 'none' }}
                    value={clientPeriodEndDate}
                    onChange={(e) => setClientPeriodEndDate(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (!clientPeriodStartDate) {
                      setAlertModal({
                        type: 'error',
                        title: 'Validation Error',
                        message: 'Please select a valid Period Start Date.'
                      })
                      return
                    }
                    if (!clientPeriodEndDate) {
                      setAlertModal({
                        type: 'error',
                        title: 'Validation Error',
                        message: 'Please select a valid Period End Date.'
                      })
                      return
                    }

                    const start = new Date(clientPeriodStartDate)
                    const end = new Date(clientPeriodEndDate)

                    if (end < start) {
                      setAlertModal({
                        type: 'error',
                        title: 'Validation Error',
                        message: 'Period End Date cannot be before Period Start Date.'
                      })
                      return
                    }

                    // Calculate date difference in days
                    const diffTime = Math.abs(end.getTime() - start.getTime())
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // inclusive of start & end

                    if (clientPayGroupFilter === 'Monthly') {
                      if (diffDays < 28 || diffDays > 31) {
                        setAlertModal({
                          type: 'error',
                          title: 'Monthly Period Validation Error',
                          message: `A Monthly pay period must be between 28 and 31 days. Your selected range is ${diffDays} days.`
                        })
                        return
                      }
                    } else if (clientPayGroupFilter === 'Weekly') {
                      if (diffDays !== 7) {
                        setAlertModal({
                          type: 'error',
                          title: 'Weekly Period Validation Error',
                          message: `A Weekly pay period must be exactly 7 days. Your selected range is ${diffDays} days.`
                        })
                        return
                      }
                    } else if (clientPayGroupFilter === 'Bi-Weekly') {
                      if (diffDays !== 14) {
                        setAlertModal({
                          type: 'error',
                          title: 'Bi-Weekly Period Validation Error',
                          message: `A Bi-Weekly pay period must be exactly 14 days. Your selected range is ${diffDays} days.`
                        })
                        return
                      }
                    } else if (clientPayGroupFilter === 'Semi-Monthly') {
                      if (diffDays < 13 || diffDays > 16) {
                        setAlertModal({
                          type: 'error',
                          title: 'Semi-Monthly Period Validation Error',
                          message: `A Semi-Monthly pay period must be between 13 and 16 days. Your selected range is ${diffDays} days.`
                        })
                        return
                      }
                    }

                    showToast('Active pay period dates configured successfully!')
                  }}
                  style={{ padding: '4px 10px', fontSize: '11px', height: 'auto', minHeight: 'unset', fontWeight: 600 }}
                >
                  Save Dates
                </button>
              </div>
            </div>

            <div className="filter-input-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <select value={clientPayGroupFilter} onChange={e => setClientPayGroupFilter(e.target.value as any)} className="btn" style={{ background: 'var(--surface)', color: 'var(--ink)', padding: '6px 12px', fontSize: '13px' }}>
                <option value="Monthly">Monthly Pay Period</option>
                <option value="Weekly">Weekly Pay Period</option>
                <option value="Bi-Weekly">Bi-Weekly Pay Period</option>
                <option value="Semi-Monthly">Semi-Monthly Pay Period</option>
              </select>
              {!allApproved && selectedCount > 0 && (
                <button type="button" className="btn btn-primary"
                  onClick={() => setShowApproveConfirmModal(true)}
                  style={{ width: 'fit-content', background: 'linear-gradient(135deg,#f39c12,#e67e22)', border: 'none', padding: '6px 12px', fontSize: '13px' }}>
                  ✓ Approve Selected ({selectedCount})
                </button>
              )}
            </div>
          </div>
          <p className="dash-welcome-sub" style={{ margin: 0 }}>Manage processing periods, approve employee logs, and run validation audits.</p>
        </div>

        {/* Modal Alert Banner */}
        {allApproved ? (
          !dismissedAllApproved && (
            <div className="admin-toast-backdrop" role="alertdialog" aria-modal="true" aria-label="Approved">
              <div className="admin-toast-message">
                <span className="admin-toast-icon" style={{ background: 'linear-gradient(135deg,#2ecc71,#27ae60)', boxShadow: '0 6px 20px rgba(46,204,113,0.4)' }}>✓</span>
                <span className="admin-toast-text" style={{ fontWeight: 700, fontSize: '1.05rem' }}>All Timesheet entries APPROVED!</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.5, textAlign: 'center' }}>
                  All staff hours are approved. Details are forwarded for secondary payroll verification audits.
                </span>
                <button type="button" className="admin-toast-ok" style={{ background: 'linear-gradient(135deg,#2ecc71,#27ae60)', boxShadow: '0 4px 14px rgba(46,204,113,0.4)' }} onClick={() => setDismissedAllApproved(true)}>OK</button>
              </div>
            </div>
          )
        ) : approvedCount > 0 ? (
          !dismissedApprovedCount && (
            <div className="admin-toast-backdrop" role="alertdialog" aria-modal="true" aria-label="Approvals info">
              <div className="admin-toast-message">
                <span className="admin-toast-icon" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', boxShadow: '0 6px 20px rgba(59,130,246,0.4)' }}>ℹ</span>
                <span className="admin-toast-text" style={{ fontWeight: 700, fontSize: '1.05rem' }}>{approvedCount} of {allIds.length} employees approved</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.5, textAlign: 'center' }}>
                  {pendingIds.length} employee{pendingIds.length > 1 ? 's' : ''} still pending. Select and approve their entries below.
                </span>
                <button type="button" className="admin-toast-ok" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', boxShadow: '0 4px 14px rgba(59,130,246,0.4)' }} onClick={() => setDismissedApprovedCount(true)}>OK</button>
              </div>
            </div>
          )
        ) : (
          !dismissedPendingClient && (
            <div className="admin-toast-backdrop" role="alertdialog" aria-modal="true" aria-label="Pending approvals">
              <div className="admin-toast-message">
                <span className="admin-toast-icon" style={{ background: 'linear-gradient(135deg,#f39c12,#e67e22)', boxShadow: '0 6px 20px rgba(243,156,18,0.4)' }}>⚠</span>
                <span className="admin-toast-text" style={{ fontWeight: 700, fontSize: '1.05rem' }}>Pending Client Approval (Cut-off close)</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.5, textAlign: 'center' }}>
                  Select employees below and click "Approve Selected" to freeze and submit their timesheet entries.
                </span>
                <button type="button" className="admin-toast-ok" style={{ background: 'linear-gradient(135deg,#f39c12,#e67e22)', boxShadow: '0 4px 14px rgba(243,156,18,0.4)' }} onClick={() => setDismissedPendingClient(true)}>OK</button>
              </div>
            </div>
          )
        )}

        {/* Employees checklist */}
        <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '44px', textAlign: 'center' }}>
                    {pendingIds.length > 0 && (
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={el => { if (el) el.indeterminate = isIndeterminate }}
                        onChange={handleSelectAll}
                        title="Select all pending employees"
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#6c63ff' }}
                      />
                    )}
                  </th>
                  <th>Employee ID</th>
                  <th>Full Name</th>
                  <th>Department / Group</th>
                  <th>Logged Hours (Regular + OT)</th>
                  <th>Leave Hours (Sick/Earned)</th>
                  <th className="num">Offcycle Bonus</th>
                  <th>Timesheet Status</th>
                  <th>Audit Check</th>
                  <th>Approval</th>
                </tr>
              </thead>
              <tbody>
                {adminEmployees.map(emp => {
                  const isEmpApproved = approvedEmployeeIds.has(emp.id)
                  const isChecked = selectedEmployeeIds.has(emp.id)
                  const bonus = offcyclePaymentsList.filter(o => o.employeeId === emp.id).reduce((sum, o) => sum + o.amount, 0)
                  return (
                    <tr key={emp.id}
                      onClick={() => { if (!isEmpApproved) handleToggleOne(emp.id) }}
                      style={{
                        cursor: isEmpApproved ? 'default' : 'pointer',
                        background: isEmpApproved
                          ? 'rgba(46,204,113,0.06)'
                          : isChecked ? 'rgba(108,99,255,0.1)' : undefined,
                        opacity: isEmpApproved ? 0.75 : 1,
                        transition: 'background 0.2s'
                      }}
                    >
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        {isEmpApproved ? (
                          <span title="Approved" style={{ color: '#2ecc71', fontSize: '1rem' }}>✓</span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleOne(emp.id)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#6c63ff' }}
                          />
                        )}
                      </td>
                      <td><code>{emp.id}</code></td>
                      <td><strong>{emp.name}</strong></td>
                      <td>{emp.paygroup}</td>
                      <td>40 hours</td>
                      <td>8 hours</td>
                      <td className="num" style={{ fontWeight: 600, color: bonus > 0 ? '#2ecc71' : 'var(--muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <span>$ {bonus.toLocaleString('en-US')}</span>
                          {bonus > 0 && (
                            <span
                              title="View Bonus Details"
                              onClick={(e) => {
                                e.stopPropagation();
                                const payments = offcyclePaymentsList.filter(o => o.employeeId === emp.id);
                                setActiveOffcycleDetailsModal({ employeeName: emp.name, payments });
                              }}
                              style={{
                                cursor: 'pointer',
                                color: 'var(--primary)',
                                fontSize: '0.9rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '2px',
                                borderRadius: '4px',
                                background: 'rgba(108,99,255,0.08)'
                              }}
                            >
                              ⓘ
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="badge done">Submitted</span>
                      </td>
                      <td>
                        <span className="badge ok" style={{ background: 'rgba(46,204,113,0.1)', color: '#2ecc71', border: '1px solid rgba(46,204,113,0.2)' }}>✓ Validated</span>
                      </td>
                      <td>
                        {isEmpApproved ? (
                          <span className="badge ok" style={{ background: 'rgba(46,204,113,0.15)', color: '#2ecc71', border: '1px solid rgba(46,204,113,0.3)', fontWeight: 600 }}>✓ Approved</span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(243,156,18,0.1)', color: '#f39c12', border: '1px solid rgba(243,156,18,0.25)' }}>⏳ Pending</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    )
  }

  const renderClientOffcycles = () => {
    const handleAddOffcyclePayment = (e: React.FormEvent) => {
      e.preventDefault()
      const amt = parseFloat(offcycleForm.amount) || 0
      if (amt <= 0) {
        showToast('Please enter a valid payment amount!')
        return
      }
      const targetEmp = adminEmployees.find(emp => emp.id === offcycleForm.employeeId)
      if (!targetEmp) return

      const newPay: ClientOffcyclePayment = {
        id: `off-${Date.now()}`,
        employeeId: offcycleForm.employeeId,
        employeeName: targetEmp.name,
        clientName: targetEmp.clientName,
        code: offcycleForm.code,
        amount: amt,
        date: '15 July 2025',
        remarks: offcycleForm.remarks || 'Additional special pay'
      }

      setOffcyclePaymentsList(prev => [newPay, ...prev])
      setIsOffcycleModalOpen(false)
      setOffcycleForm({
        employeeId: 'EMP-001',
        code: 'Monthly Bonus',
        amount: '',
        remarks: ''
      })
      showToast(`Added $${amt.toLocaleString('en-US')} offcycle pay to ${targetEmp.name}.`)
    }

    const handleRemoveOffcycle = (id: string) => {
      setOffcyclePaymentsList(prev => prev.filter(item => item.id !== id))
      showToast('Offcycle bonus transaction removed.')
    }

    return (
      <div className="dash-shell">
        <div className="dash-welcome-row">
          <div>
            <h1 className="dash-welcome-title">Offcycles & Special One-Time Payments 💸</h1>
            <p className="dash-welcome-sub">Credit bonuses, quarterly incentives, sales commissions, spot awards, and final settlements.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setIsOffcycleModalOpen(true)} disabled={isPeriodLocked}>
            + Add Special Payment
          </button>
        </div>

        {/* Ledger list */}
        <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Entity Client</th>
                  <th>Payment Type Code</th>
                  <th className="num">Amount (USD)</th>
                  <th>Date Logged</th>
                  <th>Remarks</th>
                  {!isPeriodLocked && <th className="num">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {offcyclePaymentsList.map(pay => (
                  <tr key={pay.id}>
                    <td><strong>{pay.employeeName}</strong> <br /><small style={{ color: 'var(--muted)' }}><code>{pay.employeeId}</code></small></td>
                    <td>{pay.clientName}</td>
                    <td><span className="badge done">{pay.code}</span></td>
                    <td className="num" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>$ {pay.amount.toLocaleString('en-US')}</td>
                    <td>{pay.date}</td>
                    <td>{pay.remarks}</td>
                    {!isPeriodLocked && (
                      <td className="num">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleRemoveOffcycle(pay.id)}>
                          🗑️ Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Payment Modal */}
        {isOffcycleModalOpen && (
          <div className="time-modal-backdrop" role="dialog" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'grid', placeItems: 'center' }}>
            <div className="time-modal-content" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '500px' }}>
              <div className="time-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, color: 'var(--ink)' }}>Add One-Time Special Payment</h3>
                <button type="button" style={{ background: 'none', border: 'none', color: 'var(--ink)', fontSize: '20px', cursor: 'pointer' }}
                  onClick={() => setIsOffcycleModalOpen(false)}>✕</button>
              </div>
              <form onSubmit={handleAddOffcyclePayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                <div className="field">
                  <label>Select Recipient Employee</label>
                  <select
                    className="btn"
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)' }}
                    value={offcycleForm.employeeId}
                    onChange={(e) => setOffcycleForm(prev => ({ ...prev, employeeId: e.target.value }))}
                  >
                    {adminEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>)}
                  </select>
                </div>

                <div className="field">
                  <label>One-Time Code Component</label>
                  <select
                    className="btn"
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)' }}
                    value={offcycleForm.code}
                    onChange={(e) => setOffcycleForm(prev => ({ ...prev, code: e.target.value }))}
                  >
                    <option value="Monthly Bonus">Monthly Bonus</option>
                    <option value="Quarterly Bonus">Quarterly Bonus</option>
                    <option value="Annual Bonus">Annual Bonus</option>
                    <option value="Performance Incentive">Performance Incentive</option>
                    <option value="Sales Commission">Sales Commission</option>
                    <option value="Referral Bonus">Referral Bonus</option>
                    <option value="Spot Award">Spot Award</option>
                    <option value="Festival Bonus">Festival Bonus</option>
                    <option value="Attendance Bonus">Attendance Bonus</option>
                    <option value="Shift Bonus">Shift Bonus</option>
                    <option value="Joining Bonus">Joining Bonus</option>
                    <option value="Relocation Bonus">Relocation Bonus</option>
                    <option value="Full & Final Settlement">Full & Final Settlement</option>
                    <option value="Leave Encashment">Leave Encashment</option>
                    <option value="Gratuity">Gratuity</option>
                  </select>
                </div>

                <div className="field">
                  <label>Payment Amount (USD)</label>
                  <input
                    type="number"
                    className="btn"
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', textAlign: 'left', cursor: 'text' }}
                    placeholder="Enter amount in USD"
                    required
                    value={offcycleForm.amount}
                    onChange={(e) => setOffcycleForm(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>

                <div className="field">
                  <label>Remarks & Reason</label>
                  <input
                    type="text"
                    className="btn"
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', textAlign: 'left', cursor: 'text' }}
                    placeholder="e.g. Project completion bonus"
                    value={offcycleForm.remarks}
                    onChange={(e) => setOffcycleForm(prev => ({ ...prev, remarks: e.target.value }))}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                  Save Payment
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    )
  }

  const renderClientLock = () => {
    const allIds = adminEmployees.map(emp => emp.id)
    const pendingLockIds = allIds.filter(id => !lockedEmployeeIds.has(id))
    const selectedLockCount = selectedLockEmployeeIds.size
    const isAllLockSelected = pendingLockIds.length > 0 && pendingLockIds.every(id => selectedLockEmployeeIds.has(id))
    const isLockIndeterminate = selectedLockEmployeeIds.size > 0 && !isAllLockSelected

    const handleSelectAllLock = () => {
      if (isAllLockSelected) {
        setSelectedLockEmployeeIds(new Set())
      } else {
        setSelectedLockEmployeeIds(new Set(pendingLockIds))
      }
    }

    const handleToggleOneLock = (id: string) => {
      if (lockedEmployeeIds.has(id)) return
      setSelectedLockEmployeeIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }

    const handleConfirmLock = () => {
      const nextLocked = new Set([...lockedEmployeeIds, ...selectedLockEmployeeIds])
      setLockedEmployeeIds(nextLocked)
      setSelectedLockEmployeeIds(new Set())
      setShowLockConfirmModal(false)

      const allLockedNow = allIds.every(id => nextLocked.has(id))
      if (allLockedNow) {
        setIsPeriodLocked(true)
        setDismissedPeriodLocked(false)
      }

      showToast(`Locked pay period & submitted for ${selectedLockCount} employee(s) - OK.`)
    }

    return (
      <div className="dash-shell">
        {/* Lock Confirmation Modal */}
        {showLockConfirmModal && (
          <div className="time-modal-backdrop" role="presentation" onClick={() => setShowLockConfirmModal(false)}>
            <div className="modal-caution-box" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>🔒</span>
                <div>
                  <h2 style={{ color: 'var(--ink)' }}>Confirm Final Lock & Submit</h2>
                  <p className="time-confirm-message" style={{ margin: '6px 0 0 0', fontSize: '0.95rem' }}>
                    Are you sure you want to final lock the pay period and submit payroll data for the selected <strong>{selectedLockCount}</strong> employee(s) to Pynk?
                  </p>
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                    This action will freeze all timesheet entries and calculations. It cannot be undone.
                  </p>
                </div>
              </div>
              <div className="modal-caution-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowLockConfirmModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleConfirmLock}>
                  Yes, Lock & Submit
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="dash-welcome-row" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* First Line: Title and Recalc Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <h1 className="dash-welcome-title" style={{ margin: 0 }}>Final Approval & Locking Workflows 🔒</h1>

            <button
              type="button"
              className="btn btn-secondary"
              disabled={isRefreshingLock}
              onClick={() => {
                setIsRefreshingLock(true)
                setTimeout(() => {
                  setIsRefreshingLock(false)
                  showToast('Variance analysis and off-cycle volumes recalculated!')
                }, 600)
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '0.85rem',
                borderRadius: '50px',
                cursor: 'pointer',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                flexShrink: 0
              }}
            >
              <span className={isRefreshingLock ? 'refresh-spin' : ''} style={{ fontSize: '0.9rem' }}>🔄</span>
              {isRefreshingLock ? 'Recalculating...' : 'Recalc Data for Final Submission'}
            </button>
          </div>

          {/* Second Line: Dates and Pay Group Filters */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '16px' }}>
            {/* Date selection inline */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap', flexShrink: 0, background: 'var(--surface)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label htmlFor="lock-start-date-input" style={{ fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap', color: 'var(--muted)' }}>Start:</label>
                <input
                  id="lock-start-date-input"
                  type="date"
                  className="modal-field"
                  style={{ width: '120px', padding: '4px 6px', fontSize: '11px', background: 'transparent', color: 'var(--text-h)', border: 'none' }}
                  value={clientPeriodStartDate}
                  onChange={(e) => setClientPeriodStartDate(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label htmlFor="lock-end-date-input" style={{ fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap', color: 'var(--muted)' }}>End:</label>
                <input
                  id="lock-end-date-input"
                  type="date"
                  className="modal-field"
                  style={{ width: '120px', padding: '4px 6px', fontSize: '11px', background: 'transparent', color: 'var(--text-h)', border: 'none' }}
                  value={clientPeriodEndDate}
                  onChange={(e) => setClientPeriodEndDate(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (!clientPeriodStartDate) {
                    setAlertModal({
                      type: 'error',
                      title: 'Validation Error',
                      message: 'Please select a valid Period Start Date.'
                    })
                    return
                  }
                  if (!clientPeriodEndDate) {
                    setAlertModal({
                      type: 'error',
                      title: 'Validation Error',
                      message: 'Please select a valid Period End Date.'
                    })
                    return
                  }

                  const start = new Date(clientPeriodStartDate)
                  const end = new Date(clientPeriodEndDate)

                  if (end < start) {
                    setAlertModal({
                      type: 'error',
                      title: 'Validation Error',
                      message: 'Period End Date cannot be before Period Start Date.'
                    })
                    return
                  }

                  // Calculate date difference in days
                  const diffTime = Math.abs(end.getTime() - start.getTime())
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // inclusive of start & end

                  if (clientPayGroupFilter === 'Monthly') {
                    if (diffDays < 28 || diffDays > 31) {
                      setAlertModal({
                        type: 'error',
                        title: 'Monthly Period Validation Error',
                        message: `A Monthly pay period must be between 28 and 31 days. Your selected range is ${diffDays} days.`
                      })
                      return
                    }
                  } else if (clientPayGroupFilter === 'Weekly') {
                    if (diffDays !== 7) {
                      setAlertModal({
                        type: 'error',
                        title: 'Weekly Period Validation Error',
                        message: `A Weekly pay period must be exactly 7 days. Your selected range is ${diffDays} days.`
                      })
                      return
                    }
                  } else if (clientPayGroupFilter === 'Bi-Weekly') {
                    if (diffDays !== 14) {
                      setAlertModal({
                        type: 'error',
                        title: 'Bi-Weekly Period Validation Error',
                        message: `A Bi-Weekly pay period must be exactly 14 days. Your selected range is ${diffDays} days.`
                      })
                      return
                    }
                  } else if (clientPayGroupFilter === 'Semi-Monthly') {
                    if (diffDays < 13 || diffDays > 16) {
                      setAlertModal({
                        type: 'error',
                        title: 'Semi-Monthly Period Validation Error',
                        message: `A Semi-Monthly pay period must be between 13 and 16 days. Your selected range is ${diffDays} days.`
                      })
                      return
                    }
                  }

                  showToast('Active pay period dates configured successfully!')
                }}
                style={{ padding: '4px 10px', fontSize: '11px', height: 'auto', minHeight: 'unset', fontWeight: 600 }}
              >
                Save Dates
              </button>
            </div>

            <div className="filter-input-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <select value={clientPayGroupFilter} onChange={e => setClientPayGroupFilter(e.target.value as any)} className="btn" style={{ background: 'var(--surface)', color: 'var(--ink)', padding: '6px 12px', fontSize: '13px' }}>
                <option value="Monthly">Monthly Pay Period</option>
                <option value="Weekly">Weekly Pay Period</option>
                <option value="Bi-Weekly">Bi-Weekly Pay Period</option>
                <option value="Semi-Monthly">Semi-Monthly Pay Period</option>
              </select>
              {!isPeriodLocked && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={selectedLockCount === 0}
                  onClick={() => {
                    setShowLockConfirmModal(true)
                  }}
                  style={{ whiteSpace: 'nowrap', padding: '6px 12px', fontSize: '13px' }}
                >
                  🔒 Lock Selected ({selectedLockCount}) & Submit
                </button>
              )}
            </div>
          </div>
        </div>

        {isPeriodLocked ? (
          !dismissedPeriodLocked && (
            <div className="admin-toast-backdrop" role="alertdialog" aria-modal="true" aria-label="Period Locked">
              <div className="admin-toast-message">
                <span className="admin-toast-icon" style={{ background: 'linear-gradient(135deg,#2ecc71,#27ae60)', boxShadow: '0 6px 20px rgba(46,204,113,0.4)' }}>✓</span>
                <span className="admin-toast-text" style={{ fontWeight: 700, fontSize: '1.05rem' }}>Now data is getting final submitted and no modification can be done after final submit - OK</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.5, textAlign: 'center' }}>
                  Current pay period payroll logs are locked and transmitted to processing partners. Client changes are disabled.
                </span>
                <button type="button" className="admin-toast-ok" style={{ background: 'linear-gradient(135deg,#2ecc71,#27ae60)', boxShadow: '0 4px 14px rgba(46,204,113,0.4)' }} onClick={() => setDismissedPeriodLocked(true)}>OK</button>
              </div>
            </div>
          )
        ) : (
          !dismissedPeriodOpen && (
            <div className="admin-toast-backdrop" role="alertdialog" aria-modal="true" aria-label="Period Open">
              <div className="admin-toast-message">
                <span className="admin-toast-icon" style={{ background: 'linear-gradient(135deg,#f39c12,#e67e22)', boxShadow: '0 6px 20px rgba(243,156,18,0.4)' }}>⚠</span>
                <span className="admin-toast-text" style={{ fontWeight: 700, fontSize: '1.05rem' }}>Period Open - Submissions editable</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.5, textAlign: 'center' }}>
                  Lock the pay period to compile variance reconciliation sheets and freeze timesheets. Lock action cannot be undone.
                </span>
                <button type="button" className="admin-toast-ok" style={{ background: 'linear-gradient(135deg,#f39c12,#e67e22)', boxShadow: '0 4px 14px rgba(243,156,18,0.4)' }} onClick={() => setDismissedPeriodOpen(true)}>OK</button>
              </div>
            </div>
          )
        )}

        {/* Variance stats table */}
        <div className="dash-card">
          <h3 className="dash-card-title">Employee-wise final lock checklist</h3>
          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '44px', textAlign: 'center' }}>
                    {pendingLockIds.length > 0 && (
                      <input
                        type="checkbox"
                        checked={isAllLockSelected}
                        ref={el => { if (el) el.indeterminate = isLockIndeterminate }}
                        onChange={handleSelectAllLock}
                        title="Select all pending employees for locking"
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#6c63ff' }}
                      />
                    )}
                  </th>
                  <th>Employee ID</th>
                  <th>Full Name</th>
                  <th>Department / Group</th>
                  <th>Pay Period</th>
                  <th>Pay Group</th>
                  <th>Category</th>
                  <th>Logged Hours (Regular + OT)</th>
                  <th>Leave Hours (Sick/Earned)</th>
                  <th className="num">Offcycle Bonus</th>
                  <th>Timesheet Status</th>
                  <th>Audit Check</th>
                  <th>Approval</th>
                </tr>
              </thead>
              <tbody>
                {adminEmployees.map(e => {
                  const isEmpLocked = lockedEmployeeIds.has(e.id)
                  const isChecked = selectedLockEmployeeIds.has(e.id)
                  const bonus = offcyclePaymentsList.filter(o => o.employeeId === e.id).reduce((sum, o) => sum + o.amount, 0)
                  return (
                    <tr key={e.id}
                      onClick={() => { if (!isEmpLocked) handleToggleOneLock(e.id) }}
                      style={{
                        cursor: isEmpLocked ? 'default' : 'pointer',
                        background: isEmpLocked
                          ? 'rgba(46,204,113,0.06)'
                          : isChecked ? 'rgba(108,99,255,0.1)' : undefined,
                        opacity: isEmpLocked ? 0.75 : 1,
                        transition: 'background 0.2s'
                      }}
                    >
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        {isEmpLocked ? (
                          <span title="Locked & Submitted" style={{ color: '#2ecc71', fontSize: '1rem' }}>🔒</span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleOneLock(e.id)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#6c63ff' }}
                          />
                        )}
                      </td>
                      <td><code>{e.id}</code></td>
                      <td><strong>{e.name}</strong></td>
                      <td>{e.paygroup}</td>
                      <td>{formatPeriodRange(clientPeriodStartDate, clientPeriodEndDate) || '07/01/2025 - 07/15/2025'}</td>
                      <td>{clientPayGroupFilter}</td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
                          On-Cycle
                        </span>
                      </td>
                      <td>40 hours</td>
                      <td>8 hours</td>
                      <td className="num" style={{ fontWeight: 600, color: bonus > 0 ? '#2ecc71' : 'var(--muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <span>$ {bonus.toLocaleString('en-US')}</span>
                          {bonus > 0 && (
                            <span
                              title="View Bonus Details"
                              onClick={(event) => {
                                event.stopPropagation();
                                const payments = offcyclePaymentsList.filter(o => o.employeeId === e.id);
                                setActiveOffcycleDetailsModal({ employeeName: e.name, payments });
                              }}
                              style={{
                                cursor: 'pointer',
                                color: 'var(--primary)',
                                fontSize: '0.9rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '2px',
                                borderRadius: '4px',
                                background: 'rgba(108,99,255,0.08)'
                              }}
                            >
                              ⓘ
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${isEmpLocked ? 'done' : 'done'}`}>
                          {isEmpLocked ? 'Locked' : 'Submitted'}
                        </span>
                      </td>
                      <td>
                        <span className="badge ok" style={{ background: 'rgba(46,204,113,0.1)', color: '#2ecc71', border: '1px solid rgba(46,204,113,0.2)' }}>✓ Validated</span>
                      </td>
                      <td>
                        {isEmpLocked ? (
                          <span className="badge ok" style={{ background: 'rgba(46,204,113,0.15)', color: '#2ecc71', border: '1px solid rgba(46,204,113,0.3)', fontWeight: 600 }}>🔒 Locked</span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(243,156,18,0.1)', color: '#f39c12', border: '1px solid rgba(243,156,18,0.25)' }}>⏳ Pending</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>



      </div>
    )
  }

  const filteredAdminEmployees = useMemo(() => {
    return adminEmployees.filter((emp) => {
      const matchesClient = filterClientName === 'All' || emp.clientName === filterClientName
      const matchesSearch =
        emp.name.toLowerCase().includes(searchEmployeeQuery.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchEmployeeQuery.toLowerCase())
      return matchesClient && matchesSearch
    })
  }, [adminEmployees, filterClientName, searchEmployeeQuery])

  useEffect(() => {
    if (!expandedApprovalKey && approvalItems.length > 0) {
      setExpandedApprovalKey(approvalItems[0].key)
    }
  }, [approvalItems, expandedApprovalKey])

  const renderLeaveModuleContent = () => {
    return (
      <div className="leave-shell" style={{ padding: 0 }}>
        <div className="leave-top">
          <div className="leave-tabs" role="tablist" aria-label="Leave tabs">
            {leaveTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`leave-tab ${activeLeaveTab === tab ? 'active' : ''}`}
                onClick={() => {
                  setActiveLeaveTab(tab)
                  // setLeaveFormError('')
                  // setLeaveFormSuccess('')
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeLeaveTab === 'Leave History' && (
            <div className="leave-history-toolbar">
              <div className="leave-history-range-group">
                <span className="leave-history-range-label">Date Range</span>
                <label className="leave-date-pill">
                  <input
                    type="date"
                    value={leaveHistoryFromInput}
                    max={todayIso}
                    onChange={(event) => setLeaveHistoryFromInput(event.target.value)}
                  />
                </label>
                <span className="leave-range-sep">-</span>
                <label className="leave-date-pill">
                  <input
                    type="date"
                    value={leaveHistoryToInput}
                    max={todayIso}
                    onChange={(event) => setLeaveHistoryToInput(event.target.value)}
                  />
                </label>
                <button type="button" className="leave-ghost-btn" onClick={applyLeaveHistoryDateFilter}>
                  Apply
                </button>
              </div>

              <div className="leave-filter-row" role="tablist" aria-label="Leave history filters">
                {(['all', 'pending', 'approved', 'returned', 'cancelled'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`leave-filter-chip ${leaveHistoryStatusFilter === status ? 'active' : ''}`}
                    onClick={() => setLeaveHistoryStatusFilter(status)}
                  >
                    {status === 'all' ? 'All Statuses' : leaveStatusLabel[status]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {leaveHistoryError && activeLeaveTab === 'Leave History' && <p className="submit-error">{leaveHistoryError}</p>}
        {activeLeaveTab === 'Leave Balance' ? (
          <div className="leave-balance-shell">
            <div className="leave-balance-grid">
              {leaveBalances.map((item) => {
                const consumed = item.used + item.pending
                const ratio = item.entitlement > 0 ? Math.min(100, Math.round((consumed / item.entitlement) * 100)) : 0
                const available = Math.max(0, item.entitlement - consumed)

                return (
                  <section key={item.id} className="leave-balance-card">
                    <h4>{item.name}</h4>
                    <p>{leaveTypeDescriptions[item.id]}</p>
                    <div className="leave-balance-nums">
                      <span>Entitlement: <strong>{item.entitlement}</strong></span>
                      <span>Used: <strong>{item.used}</strong></span>
                      <span>Pending: <strong>{item.pending}</strong></span>
                      <span>Available: <strong>{available}</strong></span>
                    </div>
                    <div className="leave-balance-progress">
                      <div style={{ width: `${ratio}%`, backgroundColor: item.color }} />
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        ) : activeLeaveTab === 'Leave History' ? (
          <div className="leave-history-shell">
            <p className="leave-history-note">Showing leave history for {appliedLeaveHistoryRangeLabel}</p>
            <section className="leave-card">
              <table className="leave-history-table">
                <thead>
                  <tr>
                    <th>Applied On</th>
                    <th>Leave Type</th>
                    <th>Date Range</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaveHistory.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDateWithYear(item.appliedOnISO)}</td>
                      <td>{leaveTypeLabel[item.leaveType]}</td>
                      <td>{getRangeLabel(item.fromDateISO, item.toDateISO)}</td>
                      <td>{item.durationDays}</td>
                      <td><span className={`leave-status-pill ${item.status}`}>{leaveStatusLabel[item.status]}</span></td>
                      <td>{item.reason}</td>
                    </tr>
                  ))}
                  {filteredLeaveHistory.length === 0 && (
                    <tr>
                      <td colSpan={6} className="history-empty-row">No leave requests found for the selected filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </div>
        ) : (
          <div className="leave-approvals-shell">
            <div className="leave-approvals-filter-row" role="tablist" aria-label="Leave approvals filters">
              {([
                ['pending', `Pending (${leaveApprovalCounts.pending})`],
                ['approved', `Approved (${leaveApprovalCounts.approved})`],
                ['returned', `Returned (${leaveApprovalCounts.returned})`],
                ['all', `All (${leaveApprovalCounts.all})`],
              ] as const).map(([status, label]) => (
                <button
                  key={status}
                  type="button"
                  className={`leave-filter-chip ${leaveApprovalFilter === status ? 'active' : ''}`}
                  onClick={() => setLeaveApprovalFilter(status)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="leave-approval-list">
              {filteredLeaveApprovals.map((item) => (
                <article key={item.id} className="leave-approval-card">
                  <div className="leave-approval-main">
                    <h4>{item.employeeName}</h4>
                    <p>{item.employeeRole}</p>
                    <small>{leaveTypeLabel[item.leaveType]} · {getRangeLabel(item.fromDateISO, item.toDateISO)} · {item.durationDays} day(s)</small>
                  </div>
                  <div className="leave-approval-side">
                    <span className={`leave-status-pill ${item.status}`}>{leaveStatusLabel[item.status]}</span>
                    {item.status === 'pending' && (
                      <div className="leave-approval-actions">
                        <button type="button" className="btn btn-primary" onClick={() => handleLeaveApprovalAction(item.id, 'approved')}>
                          Approve
                        </button>
                        <button type="button" className="btn" onClick={() => handleLeaveApprovalAction(item.id, 'returned')}>
                          Return
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}

              {filteredLeaveApprovals.length === 0 && (
                <section className="leave-card approval-empty-card">
                  <p>No leave approvals found for the selected filter.</p>
                </section>
              )}
            </div>
          </div>
        )}

        {leaveWarning && (
          <div className="time-modal-backdrop" role="presentation" onClick={() => setLeaveWarning(null)}>
            <div
              className="time-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Leave warning"
              onClick={(event) => event.stopPropagation()}
            >
              <h3>{leaveWarning.title}</h3>
              <p className="time-confirm-message">{leaveWarning.message}</p>
              <div className="time-modal-actions">
                <button type="button" className="btn btn-primary" onClick={() => setLeaveWarning(null)}>OK</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {userType === 'admin' && (
        <div className="admin-preview-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '8px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="preview-pulse-dot" style={{ background: '#ffffff' }}></span>
            <span style={{ fontSize: '0.85rem', color: '#ffffff' }}>
              {previewRoleMode ? (
                <>
                  Active Preview: <strong>{previewRoleMode === 'client' ? `Client Portal (${simulatedClientName})` : `Employee Portal (${currentEmployeeInfo.name})`}</strong>
                </>
              ) : (
                <>
                  🟢 System Control Mode: <strong>Administrator View</strong>
                </>
              )}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Client Portal simulator */}
            <select
              value={previewRoleMode === 'client' ? simulatedClientName : ''}
              onChange={(e) => {
                const val = e.target.value
                if (!val) return
                setPreviewRoleMode('client')
                setSimulatedClientName(val)
                setCurrentModule('client-dashboard')
                showToast(`Simulating Client View for ${val} - OK`)
              }}
              className="btn"
              style={{ padding: '6px 12px', fontSize: '0.82rem', background: 'rgba(255,255,255,0.02)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '6px', cursor: 'pointer' }}
            >
              <option value="">🏢 Simulate Client View...</option>
              <option value="Acme Corp">Acme Corp</option>
              <option value="Stark Industries">Stark Industries</option>
              <option value="Wayne Enterprises">Wayne Enterprises</option>
              <option value="Globex Corp">Globex Corp</option>
            </select>

            {/* Employee Portal simulator */}
            <select
              value={previewRoleMode === 'employee' ? simulatedEmployeeId : ''}
              onChange={(e) => {
                const val = e.target.value
                if (!val) return
                const emp = adminEmployees.find(emp => emp.id === val)
                if (emp && emp.isBlocked) {
                  showToast(`⚠️ Cannot simulate access for a blocked/terminated employee (${val}).`)
                  return
                }
                setPreviewRoleMode('employee')
                setSimulatedEmployeeId(val)
                setCurrentModule('dashboard')
                showToast(`Simulating Employee View for ${emp ? emp.name : val} - OK`)
              }}
              className="btn"
              style={{ padding: '6px 12px', fontSize: '0.82rem', background: 'rgba(255,255,255,0.02)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '6px', cursor: 'pointer' }}
            >
              <option value="">👤 Simulate Employee View...</option>
              {adminEmployees.map(emp => (
                <option key={emp.id} value={emp.id} style={{ color: emp.isBlocked ? 'var(--muted)' : undefined }}>
                  {emp.name} ({emp.id}){emp.isBlocked ? ' [BLOCKED/TERMINATED]' : ''}
                </option>
              ))}
            </select>

            {/* Exit simulation button */}
            {previewRoleMode && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setPreviewRoleMode(null)
                  setCurrentModule('admin-dashboard')
                  showToast('Returned to system administrator view - OK')
                }}
                style={{ padding: '6px 14px', fontSize: '0.82rem', background: 'var(--line)', color: 'var(--ink)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                🔌 Exit Preview
              </button>
            )}
          </div>
        </div>
      )}

      {successToastMessage && (
        <div
          className="admin-toast-backdrop"
          role="alertdialog"
          aria-modal="true"
          aria-label="Notification"
        >
          <div className="admin-toast-message">
            <span className="admin-toast-icon">✓</span>
            <span className="admin-toast-text">{successToastMessage}</span>
            <button
              type="button"
              className="admin-toast-ok"
              onClick={() => setSuccessToastMessage(null)}
              autoFocus
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Global Alert Modal — replaces all inline admin-alert-banner */}
      {alertModal && (() => {
        const cfg = {
          success: { icon: '✓', color: '#2ecc71', gradient: 'linear-gradient(135deg,#2ecc71,#27ae60)', shadow: 'rgba(46,204,113,0.4)', okGrad: 'linear-gradient(135deg,#2ecc71,#27ae60)' },
          info: { icon: 'ℹ', color: '#3b82f6', gradient: 'linear-gradient(135deg,#3b82f6,#2563eb)', shadow: 'rgba(59,130,246,0.4)', okGrad: 'linear-gradient(135deg,#3b82f6,#2563eb)' },
          warning: { icon: '⚠', color: '#f39c12', gradient: 'linear-gradient(135deg,#f39c12,#e67e22)', shadow: 'rgba(243,156,18,0.4)', okGrad: 'linear-gradient(135deg,#f39c12,#e67e22)' },
          error: { icon: '✕', color: '#e74c3c', gradient: 'linear-gradient(135deg,#e74c3c,#c0392b)', shadow: 'rgba(231,76,60,0.4)', okGrad: 'linear-gradient(135deg,#e74c3c,#c0392b)' },
        }[alertModal.type]
        return (
          <div className="admin-toast-backdrop" role="alertdialog" aria-modal="true" aria-label={alertModal.title}>
            <div className="admin-toast-message">
              <span className="admin-toast-icon" style={{ background: cfg.gradient, boxShadow: `0 6px 20px ${cfg.shadow}` }}>
                {cfg.icon}
              </span>
              <span className="admin-toast-text" style={{ fontWeight: 700, fontSize: '1.05rem' }}>{alertModal.title}</span>
              {alertModal.message && (
                <span style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.5, textAlign: 'center' }}>
                  {alertModal.message}
                </span>
              )}
              <button
                type="button"
                className="admin-toast-ok"
                style={{ background: cfg.okGrad, boxShadow: `0 4px 14px ${cfg.shadow}` }}
                onClick={() => setAlertModal(null)}
                autoFocus
              >
                OK
              </button>
            </div>
          </div>
        )
      })()}

      {/* Bonus Details Popup Modal */}
      {activeOffcycleDetailsModal && (
        <div className="admin-toast-backdrop" role="dialog" aria-modal="true" onClick={() => setActiveOffcycleDetailsModal(null)}>
          <div className="time-modal-content" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="time-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: 'var(--ink)' }}>Bonus Details: {activeOffcycleDetailsModal.employeeName}</h3>
              <button type="button" style={{ background: 'none', border: 'none', color: 'var(--ink)', fontSize: '20px', cursor: 'pointer' }}
                onClick={() => setActiveOffcycleDetailsModal(null)}>✕</button>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
              {activeOffcycleDetailsModal.payments.length === 0 ? (
                <p style={{ color: 'var(--muted)', margin: 0 }}>No off-cycle payments found.</p>
              ) : (
                activeOffcycleDetailsModal.payments.map((p, idx) => (
                  <div key={p.id || idx} style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--ink)' }}>
                      <span>{p.code}</span>
                      <span style={{ color: '#2ecc71' }}>$ {p.amount.toLocaleString('en-US')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted)', marginTop: '6px' }}>
                      <span>Remarks: {p.remarks}</span>
                      <span>Date: {p.date || 'Pending'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveOffcycleDetailsModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Submit Confirmation Modal */}
      {showPayrollSubmitConfirmModal && (() => {
        const regularGross = adminEmployees.reduce((sum, e) => sum + e.currGross, 0)
        const offcycleBonus = offcyclePaymentsList.reduce((sum, o) => sum + o.amount, 0)
        const grandTotal = regularGross + offcycleBonus
        return (
          <div className="time-modal-backdrop" role="presentation" onClick={() => setShowPayrollSubmitConfirmModal(false)}>
            <div className="modal-caution-box" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>📤</span>
                <div>
                  <h2 style={{ color: 'var(--ink)' }}>Confirm Final Payroll Transmission</h2>
                  <p className="time-confirm-message" style={{ margin: '6px 0 0 0', fontSize: '0.95rem' }}>
                    Are you sure you want to final submit the compiled payroll data to Pynk partner processing systems?
                  </p>

                  {/* Summary list */}
                  <div style={{ marginTop: '14px', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--muted)' }}>Total Employees:</span>
                      <strong style={{ color: 'var(--ink)' }}>{adminEmployees.length}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--muted)' }}>Regular Gross Pay:</span>
                      <strong style={{ color: 'var(--ink)' }}>$ {regularGross.toLocaleString('en-US')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--muted)' }}>Special / Offcycle Payments:</span>
                      <strong style={{ color: 'var(--ink)' }}>$ {offcycleBonus.toLocaleString('en-US')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderTop: '1px solid var(--line)', paddingTop: '6px', marginTop: '4px' }}>
                      <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Grand Payroll Total:</span>
                      <strong style={{ color: '#2ecc71' }}>$ {grandTotal.toLocaleString('en-US')}</strong>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-caution-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayrollSubmitConfirmModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={() => {
                  setIsPayrollSubmitted(true);
                  setDismissedPayrollSubmitted(false);
                  setShowPayrollSubmitConfirmModal(false);
                  showToast('Current pay period payroll data submitted successfully - OK');
                }}>
                  Yes, Final Submit
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      <div className="portal-layout">
        <aside className="portal-sidebar" aria-label="Modules">
          <div className="module-list">
            {modules.map((module) => (
              <button
                key={module.id}
                className={`module-btn ${currentModule === module.id ? 'active' : ''}`}
                onClick={() => handleModuleClick(module.id)}
              >
                <span className="module-icon">{module.icon}</span>
                <span className="module-label">{module.label}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="portal-content">
          {/* ── Client / Shared Reports View ── */}
          {currentModule === 'client-reports' || currentModule === 'admin-reports' ? renderReportsView() :

            /* ── Client Payroll Control ── */
            currentModule === 'client-payroll-control' ? renderClientPayrollControl() :

              /* ── Client Payroll Period ── */
              currentModule === 'client-payroll-period' ? renderClientPayrollPeriod() :

                /* ── Client Offcycles ── */
                currentModule === 'client-offcycles' ? renderClientOffcycles() :

                  /* ── Client Lock ── */
                  currentModule === 'client-lock' ? renderClientLock() :

                    /* ── Admin Dashboard Module ── */
                    currentModule === 'admin-dashboard' ? (() => {
                      const clientCount = new Set(adminEmployees.map((e) => e.clientName)).size
                      const activeEmployees = adminEmployees.length
                      const grossTotal = totalsAdmin.curr
                      const variance = totalsAdmin.curr - totalsAdmin.prev
                      const varPct = totalsAdmin.prev > 0 ? (variance / totalsAdmin.prev) * 100 : 0

                      return (
                        <div className="dash-shell">
                          <div className="dash-welcome-row">
                            <div>
                              <h1 className="dash-welcome-title">Welcome, Pynk Administrator! 👨‍💼</h1>
                              <p className="dash-welcome-sub">Workforce management and global payroll control center.</p>
                            </div>
                            <div className="dash-today-date">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              15 July 2025 (Cut-off Date)
                            </div>
                          </div>

                          {/* ── Stat Metric Cards ── */}
                          <div className="dash-stats-row">
                            <div className="dash-stat-card">
                              <div className="dash-stat-icon dash-stat-icon--blue">🏢</div>
                              <div className="dash-stat-body">
                                <p className="dash-stat-label">Clients Managed</p>
                                <p className="dash-stat-value">{clientCount}</p>
                                <p className="dash-stat-sub">Active Corporate Portals</p>
                              </div>
                            </div>

                            <div className="dash-stat-card">
                              <div className="dash-stat-icon dash-stat-icon--green">👥</div>
                              <div className="dash-stat-body">
                                <p className="dash-stat-label">Active Staff</p>
                                <p className="dash-stat-value">{activeEmployees}</p>
                                <p className="dash-stat-sub">Across All Entities</p>
                              </div>
                            </div>

                            <div className="dash-stat-card">
                              <div className="dash-stat-icon dash-stat-icon--purple">💰</div>
                              <div className="dash-stat-body">
                                <p className="dash-stat-label">July 2025 Gross Payroll</p>
                                <p className="dash-stat-value" style={{ fontSize: '20px' }}>$ {grossTotal.toLocaleString('en-US')}</p>
                                <p className="dash-stat-sub">Processing Volume</p>
                              </div>
                            </div>

                            <div className="dash-stat-card">
                              <div className="dash-stat-icon dash-stat-icon--orange">📊</div>
                              <div className="dash-stat-body">
                                <p className="dash-stat-label">Variance</p>
                                <p className={`dash-stat-value ${variance >= 0 ? 'increase' : 'decrease'}`} style={{ fontSize: '18px', margin: 0 }}>
                                  {variance >= 0 ? '+' : ''}$ {variance.toLocaleString('en-US')}
                                </p>
                                <p className="dash-stat-sub" style={{ margin: 0 }}>{varPct.toFixed(2)}% vs Last Period</p>
                              </div>
                            </div>

                            <div className="dash-stat-card">
                              <div className="dash-stat-icon dash-stat-icon--red">⏱️</div>
                              <div className="dash-stat-body">
                                <p className="dash-stat-label">Cut-off Timer</p>
                                <p className="dash-stat-value">{isPayrollSubmitted ? '✓ Done' : '2 Days Left'}</p>
                                <p className="dash-stat-sub">Partner Submission window</p>
                              </div>
                            </div>
                          </div>

                          {/* ── Alerts and Workflows ── */}
                          <div className="admin-dash-grid">

                            {/* Alert: Cutoff warning */}
                            <div className="dash-card dash-time-card">
                              <h3 className="dash-card-title">Processing Timeline Warning</h3>

                              {/* Payroll details summary */}
                              <div style={{ margin: '12px 0', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px' }}>
                                  <span style={{ color: 'var(--muted)' }}>Approved Employees:</span>
                                  <strong style={{ color: 'var(--ink)' }}>{approvedEmployeeIds.size} / {adminEmployees.length}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px' }}>
                                  <span style={{ color: 'var(--muted)' }}>Locked Employees:</span>
                                  <strong style={{ color: 'var(--ink)' }}>{lockedEmployeeIds.size} / {adminEmployees.length}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                  <span style={{ color: 'var(--muted)' }}>Total Payroll Gross:</span>
                                  <strong style={{ color: '#2ecc71' }}>
                                    $ {(
                                      adminEmployees.reduce((sum, e) => sum + e.currGross, 0) +
                                      offcyclePaymentsList.reduce((sum, o) => sum + o.amount, 0)
                                    ).toLocaleString('en-US')}
                                  </strong>
                                </div>
                              </div>

                              {isPayrollSubmitted ? (
                                !dismissedPayrollSubmitted && (
                                  <div className="admin-toast-backdrop" role="alertdialog" aria-modal="true" aria-label="Submitted">
                                    <div className="admin-toast-message">
                                      <span className="admin-toast-icon" style={{ background: 'linear-gradient(135deg,#2ecc71,#27ae60)', boxShadow: '0 6px 20px rgba(46,204,113,0.4)' }}>✓</span>
                                      <span className="admin-toast-text" style={{ fontWeight: 700, fontSize: '1.05rem' }}>Submission Completed!</span>
                                      <span style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.5, textAlign: 'center' }}>
                                        Current pay period payroll data has been validated and submitted to partner systems (OK).
                                      </span>
                                      <button type="button" className="admin-toast-ok" style={{ background: 'linear-gradient(135deg,#2ecc71,#27ae60)', boxShadow: '0 4px 14px rgba(46,204,113,0.4)' }} onClick={() => setDismissedPayrollSubmitted(true)}>OK</button>
                                    </div>
                                  </div>
                                )
                              ) : (
                                !dismissedPayrollWarning && (
                                  <div className="admin-toast-backdrop" role="alertdialog" aria-modal="true" aria-label="Warning">
                                    <div className="admin-toast-message">
                                      <span className="admin-toast-icon" style={{ background: 'linear-gradient(135deg,#f39c12,#e67e22)', boxShadow: '0 6px 20px rgba(243,156,18,0.4)' }}>⚠</span>
                                      <span className="admin-toast-text" style={{ fontWeight: 700, fontSize: '1.05rem' }}>Partner Portal Submission Window Expiring</span>
                                      <span style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.5, textAlign: 'center' }}>
                                        Pynk should send data to processing partners by 15 July 2025 cut-off. Please complete comparison and reconciliation reviews first.
                                      </span>
                                      <button type="button" className="admin-toast-ok" style={{ background: 'linear-gradient(135deg,#f39c12,#e67e22)', boxShadow: '0 4px 14px rgba(243,156,18,0.4)' }} onClick={() => setDismissedPayrollWarning(true)}>OK</button>
                                    </div>
                                  </div>
                                )
                              )}

                              {!isPayrollSubmitted && (
                                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <p style={{ color: '#f39c12', fontSize: '0.82rem', margin: 0 }}>
                                    ⚠️ Reconciled payroll details must be verified and sent to partners in the Reconciliation tab.
                                  </p>
                                  <button type="button" className="btn btn-secondary" style={{ width: 'fit-content' }}
                                    onClick={() => setCurrentModule('admin-reconciliation')}>
                                    ➡️ Go to Reconciliation & Variance Reviews
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Alert: Secondary approval workflows */}
                            <div className="dash-card dash-leave-card">
                              <h3 className="dash-card-title">Pending Secondary Approvals</h3>
                              {isSecondApprovalNotified ? (
                                !dismissedSecondApprovalNotified && (
                                  <div className="admin-toast-backdrop" role="alertdialog" aria-modal="true" aria-label="Notified">
                                    <div className="admin-toast-message">
                                      <span className="admin-toast-icon" style={{ background: 'linear-gradient(135deg,#2ecc71,#27ae60)', boxShadow: '0 6px 20px rgba(46,204,113,0.4)' }}>✓</span>
                                      <span className="admin-toast-text" style={{ fontWeight: 700, fontSize: '1.05rem' }}>Approver Notified!</span>
                                      <span style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.5, textAlign: 'center' }}>
                                        Second approval request has been broadcasted to Wayne Enterprises partner manager.
                                      </span>
                                      <button type="button" className="admin-toast-ok" style={{ background: 'linear-gradient(135deg,#2ecc71,#27ae60)', boxShadow: '0 4px 14px rgba(46,204,113,0.4)' }} onClick={() => setDismissedSecondApprovalNotified(true)}>OK</button>
                                    </div>
                                  </div>
                                )
                              ) : (
                                !dismissedSecondApprovalRequired && (
                                  <div className="admin-toast-backdrop" role="alertdialog" aria-modal="true" aria-label="Approvals Required">
                                    <div className="admin-toast-message">
                                      <span className="admin-toast-icon" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', boxShadow: '0 6px 20px rgba(59,130,246,0.4)' }}>ℹ</span>
                                      <span className="admin-toast-text" style={{ fontWeight: 700, fontSize: '1.05rem' }}>Timesheet Stage 2 Approvals Required</span>
                                      <span style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.5, textAlign: 'center' }}>
                                        Timesheet 1st approval is DONE for Stark Industries, but 2nd approval is needed from partner manager before submission.
                                      </span>
                                      <button type="button" className="admin-toast-ok" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', boxShadow: '0 4px 14px rgba(59,130,246,0.4)' }} onClick={() => setDismissedSecondApprovalRequired(true)}>OK</button>
                                    </div>
                                  </div>
                                )
                              )}
                              {!isSecondApprovalNotified && (
                                <button type="button" className="btn btn-secondary" style={{ width: 'fit-content', marginTop: '10px' }}
                                  onClick={() => {
                                    setIsSecondApprovalNotified(true);
                                    setDismissedSecondApprovalNotified(false);
                                    showToast('Second approver notified for Step 2 approval.');
                                  }}>
                                  Notify Wayne Enterprises 2nd Approver
                                </button>
                              )}
                            </div>

                            {/* Card: Quick tools */}
                            <div className="dash-card dash-upcoming-card">
                              <h3 className="dash-card-title">Partner Integration Overview</h3>
                              <div className="admin-integration-list">
                                <div className="integration-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line-soft)' }}>
                                  <span>Acme Corp Portal Status:</span>
                                  <span className="badge done">Verified</span>
                                </div>
                                <div className="integration-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line-soft)' }}>
                                  <span>Stark Industries Timesheets:</span>
                                  <span className="badge sign">Pending 2nd Approval</span>
                                </div>
                                <div className="integration-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line-soft)' }}>
                                  <span>Wayne Enterprises Export status:</span>
                                  <span className="badge done">CSV Ready</span>
                                </div>
                                <div className="integration-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                  <span>Globex Corp Audit logs:</span>
                                  <span className="badge done">100% Checked</span>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      )
                    })() : currentModule === 'admin-reconciliation' ? (() => {
                      const allReconcileKeys = reconciliationData.map(row => row.name)
                      const pendingReconcileKeys = allReconcileKeys.filter(key => !submittedReconcileKeys.has(key))
                      const selectedReconcileCount = selectedReconcileKeys.size
                      const isAllReconcileSelected = pendingReconcileKeys.length > 0 && pendingReconcileKeys.every(key => selectedReconcileKeys.has(key))
                      const isReconcileIndeterminate = selectedReconcileKeys.size > 0 && !isAllReconcileSelected

                      const handleSelectAllReconcile = () => {
                        if (isAllReconcileSelected) {
                          setSelectedReconcileKeys(new Set())
                        } else {
                          setSelectedReconcileKeys(new Set(pendingReconcileKeys))
                        }
                      }

                      const handleToggleOneReconcile = (key: string) => {
                        if (submittedReconcileKeys.has(key)) return
                        setSelectedReconcileKeys(prev => {
                          const next = new Set(prev)
                          if (next.has(key)) next.delete(key)
                          else next.add(key)
                          return next
                        })
                      }

                      const handleConfirmSendToPartners = () => {
                        const nextSubmitted = new Set([...submittedReconcileKeys, ...selectedReconcileKeys])
                        setSubmittedReconcileKeys(nextSubmitted)
                        setSelectedReconcileKeys(new Set())
                        setShowReconcileConfirmModal(false)

                        const allSubmittedNow = allReconcileKeys.every(key => nextSubmitted.has(key))
                        if (allSubmittedNow) {
                          setIsPayrollSubmitted(true)
                        }

                        showToast(`Sent reconciled details to partners for ${selectedReconcileCount} groups successfully!`)
                      }

                      return (
                        <div className="dash-shell">
                          {/* Reconcile Send Confirmation Modal */}
                          {showReconcileConfirmModal && (
                            <div className="time-modal-backdrop" role="presentation" onClick={() => setShowReconcileConfirmModal(false)}>
                              <div className="modal-caution-box" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                  <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>✈️</span>
                                  <div>
                                    <h2 style={{ color: 'var(--ink)' }}>Confirm Transmission to Partners</h2>
                                    <p className="time-confirm-message" style={{ margin: '6px 0 0 0', fontSize: '0.95rem' }}>
                                      Are you sure you want to send the reconciled payroll and variance details to processing partners for the selected <strong>{selectedReconcileCount}</strong> groups?
                                    </p>
                                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                                      This will lock the selected groups and transmit the reconciled variance sheet to partner organizations.
                                    </p>
                                  </div>
                                </div>
                                <div className="modal-caution-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                  <button type="button" className="btn btn-secondary" onClick={() => setShowReconcileConfirmModal(false)}>
                                    Cancel
                                  </button>
                                  <button type="button" className="btn btn-primary" onClick={handleConfirmSendToPartners}>
                                    Yes, Reconcile & Send
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="dash-welcome-row">
                            <div>
                              <h1 className="dash-welcome-title">Payroll Reconciliation & Variance Reviews ⚖️</h1>
                              <p className="dash-welcome-sub">Compare current in-progress period against previous completed pay period.</p>
                            </div>
                            <div className="dash-actions-row" style={{ display: 'flex', gap: '10px' }}>
                              <button type="button" className="btn btn-secondary" onClick={handleExportCSV}>
                                📥 Export CSV
                              </button>
                              <button type="button" className="btn btn-primary"
                                disabled={selectedReconcileCount === 0 || isPayrollSubmitted}
                                onClick={() => {
                                  setShowReconcileConfirmModal(true)
                                }}>
                                ✈️ Send Selected ({selectedReconcileCount}) to Partners
                              </button>
                            </div>
                          </div>

                          {/* Dimension Toggles and Filter Toolbar */}
                          <div className="reconciliation-toolbar" style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {(['client', 'employee', 'paygroup', 'payment'] as const).map((dim) => (
                                <button
                                  key={dim}
                                  type="button"
                                  className={`btn ${reconciliationDimension === dim ? 'btn-primary' : ''}`}
                                  onClick={() => setReconciliationDimension(dim)}
                                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                >
                                  {dim.charAt(0).toUpperCase() + dim.slice(1)} Wise
                                </button>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <select
                                value={reconcileClientFilter}
                                onChange={(e) => setReconcileClientFilter(e.target.value)}
                                className="btn"
                                style={{ padding: '6px 12px', fontSize: '0.85rem', background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '6px' }}
                              >
                                <option value="All">All Clients</option>
                                <option value="Acme Corp">Acme Corp</option>
                                <option value="Stark Industries">Stark Industries</option>
                                <option value="Wayne Enterprises">Wayne Enterprises</option>
                                <option value="Globex Corp">Globex Corp</option>
                              </select>
                              <input
                                type="text"
                                placeholder="Search..."
                                value={reconcileSearchQuery}
                                onChange={(e) => setReconcileSearchQuery(e.target.value)}
                                className="btn"
                                style={{ padding: '6px 12px', fontSize: '0.85rem', background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '6px', width: '180px', textAlign: 'left', cursor: 'text' }}
                              />
                            </div>
                          </div>

                          {/* Main Table */}
                          <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="tbl">
                              <table>
                                <thead>
                                  <tr>
                                    <th style={{ width: '44px', textAlign: 'center' }}>
                                      {pendingReconcileKeys.length > 0 && (
                                        <input
                                          type="checkbox"
                                          checked={isAllReconcileSelected}
                                          ref={el => { if (el) el.indeterminate = isReconcileIndeterminate }}
                                          onChange={handleSelectAllReconcile}
                                          title="Select all pending groups for sending"
                                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#6c63ff' }}
                                        />
                                      )}
                                    </th>
                                    <th>{reconciliationDimension.charAt(0).toUpperCase() + reconciliationDimension.slice(1)} Group / Name</th>
                                    <th>Client Name</th>
                                    <th className="num">June 2025 completed (Prev)</th>
                                    <th className="num">July 2025 in-progress (Curr)</th>
                                    <th className="num">Difference (Amt)</th>
                                    <th className="num">Difference (%)</th>
                                    <th>Trend Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {reconciliationData.map((row, idx) => {
                                    const isRowSubmitted = submittedReconcileKeys.has(row.name)
                                    const isChecked = selectedReconcileKeys.has(row.name)
                                    const diff = row.curr - row.prev
                                    const pct = row.prev > 0 ? (diff / row.prev) * 100 : 0
                                    let statusLabel = 'Equal'
                                    let statusClass = 'neutral'
                                    if (diff > 0) { statusLabel = 'Increased ↗'; statusClass = 'increase' }
                                    else if (diff < 0) { statusLabel = 'Decreased ↘'; statusClass = 'decrease' }

                                    return (
                                      <tr key={idx}
                                        onClick={() => { if (!isRowSubmitted) handleToggleOneReconcile(row.name) }}
                                        style={{
                                          cursor: isRowSubmitted ? 'default' : 'pointer',
                                          background: isRowSubmitted
                                            ? 'rgba(46,204,113,0.06)'
                                            : isChecked ? 'rgba(108,99,255,0.1)' : undefined,
                                          opacity: isRowSubmitted ? 0.75 : 1,
                                          transition: 'background 0.2s'
                                        }}
                                      >
                                        <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                          {isRowSubmitted ? (
                                            <span title="Submitted" style={{ color: '#2ecc71', fontSize: '1rem' }}>✓</span>
                                          ) : (
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => handleToggleOneReconcile(row.name)}
                                              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#6c63ff' }}
                                            />
                                          )}
                                        </td>
                                        <td><strong>{row.name}</strong></td>
                                        <td>
                                          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                                            {row.clientName || 'N/A'}
                                          </span>
                                        </td>
                                        <td className="num">$ {row.prev.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                        <td className="num">$ {row.curr.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                        <td className={`num ${statusClass}`}>
                                          {diff > 0 ? '+' : ''}$ {diff.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className={`num ${statusClass}`}>{pct.toFixed(2)}%</td>
                                        <td>
                                          <span className={`trend-badge ${statusClass}`}>{statusLabel}</span>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td></td>
                                    <td><strong>Grand Total:</strong></td>
                                    <td></td>
                                    <td className="num"><strong>$ {totalsAdmin.prev.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
                                    <td className="num"><strong>$ {totalsAdmin.curr.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
                                    <td className={`num ${totalsAdmin.curr - totalsAdmin.prev >= 0 ? 'increase' : 'decrease'}`}>
                                      <strong>
                                        {totalsAdmin.curr - totalsAdmin.prev >= 0 ? '+' : ''}
                                        $ {(totalsAdmin.curr - totalsAdmin.prev).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                      </strong>
                                    </td>
                                    <td className={`num ${totalsAdmin.curr - totalsAdmin.prev >= 0 ? 'increase' : 'decrease'}`}>
                                      <strong>
                                        {(totalsAdmin.prev > 0 ? ((totalsAdmin.curr - totalsAdmin.prev) / totalsAdmin.prev) * 100 : 0).toFixed(2)}%
                                      </strong>
                                    </td>
                                    <td>
                                      <span className="trend-badge neutral">Checked</span>
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>

                        </div>
                      )
                    })() : currentModule === 'admin-payslips' ? (() => {
                      const clientNames = ['All', 'Acme Corp', 'Stark Industries', 'Wayne Enterprises', 'Globex Corp']
                      return (
                        <div className="dash-shell">
                          <div className="dash-welcome-row">
                            <div>
                              <h1 className="dash-welcome-title">Employee Payslips & Year-End Records 📄</h1>
                              <p className="dash-welcome-sub">View and generate historical payslips or Form 16 / tax documentation details.</p>
                            </div>
                          </div>

                          {/* Filter bar */}
                          <div className="admin-filters-bar" style={{ display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid var(--line)' }}>
                            <div className="filter-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '200px' }}>
                              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)' }}>Filter Client Corporate</label>
                              <select value={filterClientName} onChange={(e) => setFilterClientName(e.target.value)} className="btn" style={{ padding: '8px 12px', background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)' }}>
                                {clientNames.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>

                            <div className="filter-input-group flex-fill" style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)' }}>Search Employee Name / ID</label>
                              <input
                                type="text"
                                className="btn"
                                style={{ padding: '8px 12px', background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', textAlign: 'left', cursor: 'text' }}
                                placeholder="Type employee name or ID..."
                                value={searchEmployeeQuery}
                                onChange={(e) => setSearchEmployeeQuery(e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Employees list Table */}
                          <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="tbl">
                              <table>
                                <thead>
                                  <tr>
                                    <th>ID</th>
                                    <th>Employee Name</th>
                                    <th>Corporate Client</th>
                                    <th>Role</th>
                                    <th>Monthly Gross</th>
                                    <th>Year-End Statement</th>
                                    <th className="num">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredAdminEmployees.map((emp) => (
                                    <tr key={emp.id}>
                                      <td><code>{emp.id}</code></td>
                                      <td><strong>{emp.name}</strong></td>
                                      <td>{emp.clientName}</td>
                                      <td><span className="badge done">{emp.role}</span></td>
                                      <td>$ {emp.currGross.toLocaleString('en-US')}</td>
                                      <td><span className="badge done">Form 16 Generated</span></td>
                                      <td className="num">
                                        <button type="button" className="btn btn-secondary btn-sm" style={{ marginRight: '8px' }}
                                          onClick={() => setSelectedEmployeeForPayslipModal(emp)}>
                                          📄 View Payslips
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                  {filteredAdminEmployees.length === 0 && (
                                    <tr>
                                      <td colSpan={7} className="text-center" style={{ padding: '24px', color: 'var(--muted)', textAlign: 'center' }}>
                                        No matching employee records found.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Payslips drilldown modal */}
                          {selectedEmployeeForPayslipModal && (() => {
                            const emp = selectedEmployeeForPayslipModal
                            const months = ['June 2025', 'May 2025', 'April 2025', 'March 2025', 'February 2025', 'January 2025']
                            return (
                              <div className="time-modal-backdrop" role="dialog" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'grid', placeItems: 'center' }}>
                                <div className="time-modal-content" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '550px' }}>
                                  <div className="time-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
                                    <h3 style={{ margin: 0, color: '#fff' }}>Payslips history for {emp.name}</h3>
                                    <button type="button" className="close-btn" style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}
                                      onClick={() => setSelectedEmployeeForPayslipModal(null)}>✕</button>
                                  </div>
                                  <div className="time-modal-body" style={{ padding: '16px 0 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div className="admin-payslip-info-box" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--muted)', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                      <div><strong>Employee ID:</strong> {emp.id}</div>
                                      <div><strong>Client Portal:</strong> {emp.clientName}</div>
                                    </div>

                                    <div className="admin-payslips-drill-list" style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                                      {months.map((m, idx) => (
                                        <div key={idx} className="admin-payslip-drill-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--line-soft)' }}>
                                          <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '13.5px' }}>{m}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Gross: $ {emp.currGross.toLocaleString('en-US')}</div>
                                          </div>
                                          <button type="button" className="btn btn-secondary btn-sm"
                                            onClick={() => {
                                              const ps = {
                                                month: m,
                                                payDate: `30 ${m.split(' ')[0].substring(0, 3)} 2025`,
                                                grossSalary: emp.currGross,
                                                netSalary: Math.round(emp.currGross * 0.70),
                                                status: 'Paid'
                                              }
                                              handleDownloadPayslipPDF(ps, emp.name)
                                            }}>
                                            📥 Download PDF
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })()}

                        </div>
                      )
                    })() : currentModule === 'admin-access' ? (() => {
                      return (
                        <div className="dash-shell">
                          <div className="dash-welcome-row">
                            <div>
                              <h1 className="dash-welcome-title">User Roles & Access Privilege Control 🔐</h1>
                              <p className="dash-welcome-sub">Manage active view permissions (Employee View, Admin View, Client View) across corporate personnel.</p>
                            </div>
                          </div>

                          <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="tbl">
                              <table>
                                <thead>
                                  <tr>
                                    <th>Personnel ID</th>
                                    <th>Full Name</th>
                                    <th>Corporate Client</th>
                                    <th className="text-center" style={{ textAlign: 'center' }}>Employee View</th>
                                    <th className="text-center" style={{ textAlign: 'center' }}>Admin View</th>
                                    <th className="text-center" style={{ textAlign: 'center' }}>Client View</th>
                                    <th className="text-center" style={{ textAlign: 'center' }}>Payroll Control Tab</th>
                                    <th className="text-center" style={{ textAlign: 'center', width: '130px' }}>Account Status</th>
                                    <th className="num" style={{ width: '130px' }}>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {adminEmployees.map((emp) => (
                                    <tr key={emp.id} style={{ opacity: emp.isBlocked ? 0.55 : 1, transition: 'opacity 0.2s' }}>
                                      <td><code>{emp.id}</code></td>
                                      <td><strong>{emp.name}</strong></td>
                                      <td>{emp.clientName}</td>
                                      <td className="text-center" style={{ textAlign: 'center' }}>
                                        <input
                                          type="checkbox"
                                          style={{ width: '16px', height: '16px', cursor: emp.isBlocked ? 'not-allowed' : 'pointer' }}
                                          checked={emp.hasEmployeeView}
                                          disabled={emp.isBlocked}
                                          onChange={() => handleToggleAccess(emp.id, 'employee')}
                                        />
                                      </td>
                                      <td className="text-center" style={{ textAlign: 'center' }}>
                                        <input
                                          type="checkbox"
                                          style={{ width: '16px', height: '16px', cursor: (emp.isBlocked || emp.id === 'EMP-005' || emp.id === 'EMP-009') ? 'not-allowed' : 'pointer' }}
                                          checked={emp.hasAdminView}
                                          disabled={emp.isBlocked || emp.id === 'EMP-005' || emp.id === 'EMP-009'} // Safeguard primary admins
                                          onChange={() => handleToggleAccess(emp.id, 'admin')}
                                        />
                                      </td>
                                      <td className="text-center" style={{ textAlign: 'center' }}>
                                        <input
                                          type="checkbox"
                                          style={{ width: '16px', height: '16px', cursor: emp.isBlocked ? 'not-allowed' : 'pointer' }}
                                          checked={emp.hasClientView}
                                          disabled={emp.isBlocked}
                                          onChange={() => handleToggleAccess(emp.id, 'client')}
                                        />
                                      </td>
                                      <td className="text-center" style={{ textAlign: 'center' }}>
                                        <input
                                          type="checkbox"
                                          style={{ width: '16px', height: '16px', cursor: (emp.isBlocked || !emp.hasClientView) ? 'not-allowed' : 'pointer' }}
                                          checked={emp.hasPayrollControlAccess}
                                          disabled={emp.isBlocked || !emp.hasClientView}
                                          onChange={() => handleToggleAccess(emp.id, 'payroll-control')}
                                        />
                                      </td>
                                      <td className="text-center" style={{ textAlign: 'center' }}>
                                        {emp.isBlocked ? (
                                          <span className="badge danger" style={{ background: '#e74c3c', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>TERMINATED</span>
                                        ) : (
                                          <span className="badge success" style={{ background: '#2ecc71', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>ACTIVE</span>
                                        )}
                                      </td>
                                      <td className="num">
                                        {emp.id === 'EMP-005' || emp.id === 'EMP-009' ? (
                                          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>System Owner</span>
                                        ) : (
                                          <button
                                            type="button"
                                            className={`btn btn-sm ${emp.isBlocked ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => handleToggleBlock(emp.id)}
                                            style={{
                                              padding: '4px 10px',
                                              fontSize: '0.78rem',
                                              borderColor: emp.isBlocked ? undefined : '#e74c3c',
                                              color: emp.isBlocked ? undefined : '#e74c3c',
                                              background: emp.isBlocked ? undefined : 'transparent'
                                            }}
                                          >
                                            {emp.isBlocked ? 'Restore Access' : 'Block User 🚫'}
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                        </div>
                      )
                    })() : currentModule === 'client-dashboard' ? (() => {
                      const clientPersonnel = (previewRoleMode === 'client'
                        ? clientPersonnelSeed.filter((emp) => emp.clientName === simulatedClientName)
                        : clientPersonnelSeed.filter((emp) => emp.clientName === 'Acme Corp' || emp.clientName === 'Stark Industries')
                      ).filter((emp) => emp.status !== 'Onboarding in Progress')

                      const totalGrossUsd = clientPersonnel.reduce((sum, cp) => {
                        return sum + getClientEmployeeGrossUsd(cp.id, clientDashboardPayPeriod)
                      }, 0)

                      const handleExportExcel = () => {
                        const headers = ['Employee ID', 'Name', 'Role', 'Pay Group', 'Payment Method', 'Status', 'Gross Salary (USD)']
                        const rows = clientPersonnel.map((emp) => [
                          emp.id,
                          emp.name,
                          emp.role,
                          emp.paygroup,
                          emp.paymentMethod,
                          emp.status,
                          getClientEmployeeGrossUsd(emp.id, clientDashboardPayPeriod).toString()
                        ])

                        const csvContent = [
                          headers.join(','),
                          ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
                        ].join('\n')

                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                        const url = URL.createObjectURL(blob)
                        const link = document.createElement('a')
                        link.setAttribute('href', url)
                        link.setAttribute('download', `employees_list_${clientDashboardPayPeriod}.csv`)
                        link.style.visibility = 'hidden'
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                      }

                      return (
                        <div className="dash-shell">
                          <div className="dash-welcome-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <h1 className="dash-welcome-title">{previewRoleMode === 'client' ? simulatedClientName : 'Acme & Stark Industries'} - Corporate Client Dashboard 🏢</h1>
                              <p className="dash-welcome-sub">View overall staff lists, aggregate gross pay volume, and timesheet processing status.</p>
                            </div>
                            <div className="pay-period-select-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <label htmlFor="client-dashboard-period-select" style={{ fontSize: '14px', fontWeight: '500', color: 'var(--muted)' }}>Pay Period:</label>
                              <select
                                id="client-dashboard-period-select"
                                className="modal-field"
                                style={{ width: '150px', padding: '6px 12px', fontSize: '14px' }}
                                value={clientDashboardPayPeriod}
                                onChange={(e) => setClientDashboardPayPeriod(e.target.value as ClientDashboardPayPeriod)}
                              >
                                {clientDashboardPayPeriods.map((p) => (
                                  <option key={p.value} value={p.value}>
                                    {p.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="dash-stats-row">
                            <div className="dash-stat-card">
                              <div className="dash-stat-icon dash-stat-icon--blue">👥</div>
                              <div className="dash-stat-body">
                                <p className="dash-stat-label">Total Employee Count</p>
                                <p className="dash-stat-value">{clientPersonnel.length}</p>
                                <p className="dash-stat-sub">Managed under entity</p>
                              </div>
                            </div>

                            <div className="dash-stat-card">
                              <div className="dash-stat-icon dash-stat-icon--green">⏱️</div>
                              <div className="dash-stat-body">
                                <p className="dash-stat-label">Timesheets Approved</p>
                                <p className="dash-stat-value">100%</p>
                                <p className="dash-stat-sub">All logged hours verified</p>
                              </div>
                            </div>

                            <div className="dash-stat-card">
                              <div className="dash-stat-icon dash-stat-icon--purple">💰</div>
                              <div className="dash-stat-body">
                                <p className="dash-stat-label">Total Entity Payroll ({clientDashboardPayPeriods.find(p => p.value === clientDashboardPayPeriod)?.label})</p>
                                <p className="dash-stat-value" style={{ fontSize: '20px' }}>{formatUsdCurrency(totalGrossUsd)}</p>
                                <p className="dash-stat-sub">Pending final partner wire</p>
                              </div>
                            </div>
                          </div>

                          <div className="dash-card">
                            <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                              <h3 className="dash-card-title" style={{ margin: 0 }}>Employees List</h3>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleExportExcel}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', borderRadius: '6px' }}
                              >
                                📥 Export to Excel
                              </button>
                            </div>
                            <div className="tbl">
                              <table>
                                <thead>
                                  <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Role</th>
                                    <th>Pay Group</th>
                                    <th>Payment Method</th>
                                    <th>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {clientPersonnel.map((emp) => (
                                    <tr key={emp.id}>
                                      <td><code>{emp.id}</code></td>
                                      <td>{emp.name}</td>
                                      <td>{emp.role}</td>
                                      <td>{emp.paygroup}</td>
                                      <td>{emp.paymentMethod}</td>
                                      <td>
                                        <span className={`emp-status-pill ${clientStatusPillClass[emp.status]}`}>
                                          {emp.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                  {clientPersonnel.length === 0 && (
                                    <tr>
                                      <td colSpan={6} className="text-center" style={{ padding: '24px', color: 'var(--muted)', textAlign: 'center' }}>
                                        No personnel records found for this client.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )
                    })() : currentModule === 'dashboard' ? (() => {
                      /* ── Dashboard computed values ── */
                      const today = new Date()
                      const todayLabel = today.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

                      // Timesheet – current range
                      const dashHrs = Math.floor(totals.totalHours)
                      const dashMins = Math.round((totals.totalHours - dashHrs) * 60)
                      const dashTimesheetLabel = `${dashHrs}h${dashMins > 0 ? ` ${dashMins}m` : ''}`
                      const dashTimesheetPct = Math.min(100, Math.round((totals.totalHours / 40) * 100))

                      // Leave overview derived from leaveBalances
                      const totalAvailableDays = leaveBalances.reduce((s, b) => s + Math.max(0, b.entitlement - b.used - b.pending), 0)
                      const totalTakenDays = leaveBalances.reduce((s, b) => s + b.used, 0)
                      const totalPendingDays = leaveBalances.reduce((s, b) => s + b.pending, 0)
                      const totalPlannedDays = leaveRequests.filter(r => r.status === 'approved' && fromIso(r.fromDateISO) > today).reduce((s, r) => s + r.durationDays, 0)

                      // Donut chart
                      const donutTotal = totalAvailableDays + totalPlannedDays + totalPendingDays + totalTakenDays
                      const donutR = 54
                      const donutCirc = 2 * Math.PI * donutR
                      const donutSegments = [
                        { label: 'Available', days: totalAvailableDays, color: '#48b36a' },
                        { label: 'Planned', days: totalPlannedDays, color: '#5a7dff' },
                        { label: 'Pending Approval', days: totalPendingDays, color: '#f4ac3f' },
                        { label: 'Taken', days: totalTakenDays, color: '#e74c3c' },
                      ]
                      let donutOffset = 0

                      // Upcoming leaves (future pending/approved)
                      const upcomingLeaves = leaveRequests
                        .filter(r => (r.status === 'approved' || r.status === 'pending') && fromIso(r.fromDateISO) > today)
                        .slice(0, 3)

                      // Expiring identity docs (within 90 days)
                      const expiringDocs = identityDocs.filter(d => {
                        if (!d.expiryDate || d.expiryDate === '-') return false
                        const [dd, mm, yyyy] = d.expiryDate.split(' ')
                        const monthIdx = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(mm)
                        if (monthIdx === -1 || !yyyy) return false
                        const exp = new Date(Number(yyyy), monthIdx, Number(dd))
                        const diff = (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                        return diff >= 0 && diff <= 90
                      })

                      // Latest payslip
                      const latestPayslip = payslipSeedData[0]

                      // Recent activity from notifications (last 4)
                      const recentActivity = notifications.slice(0, 4)

                      // Company announcements (static)
                      // const announcements = [
                      //   { id: 'a1', icon: '📢', title: 'Public Holiday on 27 June 2025', body: 'Please note that 27 June 2025 (Friday) will be a public holiday for all employees.', age: '2 days ago' },
                      //   { id: 'a2', icon: '📋', title: 'Policy Update', body: 'We have updated our Remote Work Policy. Please read the updated policy.', age: '5 days ago' },
                      //   { id: 'a3', icon: '🎤', title: 'Townhall Meeting', body: 'Quarterly townhall meeting is scheduled on 20 June 2025 at 4:00 PM IST.', age: '1 week ago' },
                      // ]

                      // Reminders
                      const reminders = [
                        ...expiringDocs.map(d => ({
                          id: d.id,
                          icon: '🔴',
                          title: `${d.name} Expiring Soon`,
                          sub: `Expires on ${d.expiryDate}`,
                          module: 'documents' as Module,
                        })),
                        {
                          id: 'rem-ts',
                          icon: '🕐',
                          title: 'Timesheet Submission',
                          sub: `Submit before ${new Date(today.getFullYear(), today.getMonth(), today.getDate() + (5 - today.getDay() + 7) % 7).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
                          module: 'time-entry' as Module,
                        },
                      ].slice(0, 4)

                      // Day-grid for time overview (current week range)
                      const dayGridDays = activeRange.days.slice(0, 7)

                      return (
                        <div className="dash-shell">

                          {/* ── Welcome Row ── */}
                          <div className="dash-welcome-row">
                            <div>
                              <h1 className="dash-welcome-title">Welcome back, {previewRoleMode === 'employee' ? currentEmployeeInfo.preferredName : (personalInfo.preferredName || personalInfo.firstName)}! 👋</h1>
                              <p className="dash-welcome-sub">Here's what's happening with your work today.</p>
                            </div>
                            <div className="dash-today-date">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              {todayLabel}
                            </div>
                          </div>

                          {/* ── Stat Cards ── */}
                          <div className="dash-stats-row">

                            {/* Total Leave Balance */}
                            <div className="dash-stat-card">
                              <div className="dash-stat-icon dash-stat-icon--green">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                  <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                                  <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                              </div>
                              <div className="dash-stat-body">
                                <p className="dash-stat-label">Total Leave Balance</p>
                                <p className="dash-stat-value">{totalAvailableDays}<span className="dash-stat-unit"> days</span></p>
                                <p className="dash-stat-sub">Days Available</p>
                              </div>
                            </div>

                            {/* Pending Leave Requests */}
                            <div className="dash-stat-card">
                              <div className="dash-stat-icon dash-stat-icon--orange">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 4c-1.5 0-3 1-4.5 2.5L11 8 2.8 6.2c-.5-.1-.9.4-.6.8L6 10l-2 3.5c-.3.5.1 1 .6.9L8 14l.5 2.5c.1.5.6.8 1 .5l2.5-2.5L14 16l2.2.8c.7.3 1.4-.3 1.2-1l-.6-1.5-.8-.1z" />
                                </svg>
                              </div>
                              <div className="dash-stat-body">
                                <p className="dash-stat-label">Pending Leave Requests</p>
                                <p className="dash-stat-value">{leaveSummary.pending}</p>
                                <p className="dash-stat-sub">Request Pending</p>
                              </div>
                            </div>

                            {/* Timesheet This Week */}
                            <div className="dash-stat-card">
                              <div className="dash-stat-icon dash-stat-icon--blue">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                </svg>
                              </div>
                              <div className="dash-stat-body">
                                <p className="dash-stat-label">Timesheet This Week</p>
                                <p className="dash-stat-value">{dashTimesheetLabel}</p>
                                <p className="dash-stat-sub">Logged Hours</p>
                              </div>
                            </div>

                            {/* Payslip */}
                            <div className="dash-stat-card">
                              <div className="dash-stat-icon dash-stat-icon--purple">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                  <line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                                </svg>
                              </div>
                              <div className="dash-stat-body">
                                <p className="dash-stat-label">Payslip ({latestPayslip.month})</p>
                                <span className="dash-badge dash-badge--green">Generated</span>
                                <button type="button" className="dash-link-btn" onClick={() => { setCurrentModule('my-pay'); setActivePayTab('Payslips') }}>
                                  View Payslip
                                </button>
                              </div>
                            </div>

                            {/* Documents Expiring */}
                            <div className="dash-stat-card">
                              <div className="dash-stat-icon dash-stat-icon--red">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <polyline points="14 2 14 8 20 8" />
                                  <line x1="12" y1="11" x2="12" y2="16" /><circle cx="12" cy="19" r="0.5" fill="currentColor" />
                                </svg>
                              </div>
                              <div className="dash-stat-body">
                                <p className="dash-stat-label">Documents Expiring</p>
                                <p className="dash-stat-value">{expiringDocs.length || 2}</p>
                                <p className="dash-stat-sub">Require Attention</p>
                              </div>
                            </div>

                            {/* Upcoming Leave */}
                            <div className="dash-stat-card">
                              <div className="dash-stat-icon dash-stat-icon--orange">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 4c-1.5 0-3 1-4.5 2.5L11 8 2.8 6.2c-.5-.1-.9.4-.6.8L6 10l-2 3.5c-.3.5.1 1 .6.9L8 14l.5 2.5c.1.5.6.8 1 .5l2.5-2.5L14 16l2.2.8c.7.3 1.4-.3 1.2-1l-.6-1.5-.8-.1z" />
                                </svg>
                              </div>
                              <div className="dash-stat-body">
                                <p className="dash-stat-label">Upcoming Leave</p>
                                <p className="dash-stat-value">{upcomingLeaves.length}</p>
                                <p className="dash-stat-sub">{upcomingLeaves.length === 0 ? 'No leaves scheduled' : `${upcomingLeaves.length} Scheduled`}</p>
                                <button type="button" className="dash-link-btn" onClick={() => { setCurrentModule('time-entry'); setActiveTimeEntryTab('Leave'); setActiveLeaveTab('Leave History') }}>
                                  View Leave
                                </button>
                              </div>
                            </div>

                          </div>

                          {/* ── Dashboard Columns Layout ── */}
                          <div className="dash-columns-wrapper">
                            <div className="dash-col-main">

                              {/* My Time Overview */}
                              <div className="dash-card dash-time-card">
                                <h3 className="dash-card-title">My Time Overview</h3>
                                <div className="dash-time-week-bar">
                                  <div className="dash-time-week-label">
                                    <span>This Week ({getRangeLabel(activeRange.fromDateISO, activeRange.toDateISO)})</span>
                                    <strong>{dashTimesheetLabel} / 40h</strong>
                                  </div>
                                  <div className="dash-progress-track">
                                    <div className="dash-progress-fill" style={{ width: `${dashTimesheetPct}%` }} />
                                  </div>
                                </div>

                                <div className="dash-day-grid">
                                  {dayGridDays.map(day => {
                                    const hrs = Math.floor(day.hours)
                                    const mins = Math.round((day.hours - hrs) * 60)
                                    const label = hrs > 0 ? `${hrs}h${mins > 0 ? ` ${mins}m` : ''}` : '–'
                                    return (
                                      <div key={day.key} className="dash-day-cell">
                                        <span className="dash-day-label">{day.label.slice(0, 3)}</span>
                                        <span className="dash-day-hours">{label}</span>
                                        <span className={`dash-day-dot ${day.status === 'submitted' ? 'dot-submitted' : day.status === 'draft' ? 'dot-draft' : 'dot-none'}`} />
                                      </div>
                                    )
                                  })}
                                </div>

                                <button type="button" className="dash-view-link" onClick={() => setCurrentModule('time-entry')}>
                                  View Time Entry →
                                </button>
                              </div>

                              {/* My Leave Overview */}
                              <div className="dash-card dash-leave-card">
                                <h3 className="dash-card-title">My Leave Overview</h3>
                                <div className="dash-leave-body">
                                  {/* Donut Chart SVG */}
                                  <div className="dash-donut-wrap">
                                    <svg width="140" height="140" viewBox="0 0 140 140">
                                      <circle cx="70" cy="70" r={donutR} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="18" />
                                      {donutTotal > 0 && donutSegments.map(seg => {
                                        const dashLen = (seg.days / donutTotal) * donutCirc
                                        const gap = donutCirc - dashLen
                                        const currentOffset = donutOffset
                                        donutOffset += dashLen
                                        if (seg.days === 0) return null
                                        return (
                                          <circle
                                            key={seg.label}
                                            cx="70" cy="70" r={donutR}
                                            fill="none"
                                            stroke={seg.color}
                                            strokeWidth="18"
                                            strokeDasharray={`${dashLen} ${gap}`}
                                            strokeDashoffset={donutCirc / 4 - currentOffset}
                                            strokeLinecap="butt"
                                          />
                                        )
                                      })}
                                      <text x="70" y="66" textAnchor="middle" dominantBaseline="middle" style={{ fill: 'var(--ink)', fontSize: '22px', fontWeight: 700 }}>
                                        {totalAvailableDays}
                                      </text>
                                      <text x="70" y="84" textAnchor="middle" dominantBaseline="middle" style={{ fill: 'var(--muted)', fontSize: '11px' }}>
                                        Days
                                      </text>
                                    </svg>
                                  </div>

                                  {/* Legend */}
                                  <div className="dash-leave-legend">
                                    {donutSegments.map(seg => (
                                      <div key={seg.label} className="dash-legend-row">
                                        <span className="dash-legend-dot" style={{ background: seg.color }} />
                                        <span className="dash-legend-label">{seg.label}</span>
                                        <span className="dash-legend-val">{seg.days.toFixed(1)} Days</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <button type="button" className="dash-view-link" onClick={() => { setCurrentModule('time-entry'); setActiveTimeEntryTab('Leave'); setActiveLeaveTab('Leave Balance') }}>
                                  View Leave Balance
                                </button>
                              </div>

                              {/* Recent Activity */}
                              <div className="dash-card dash-activity-card">
                                <div className="dash-card-header-row">
                                  <h3 className="dash-card-title">Recent Activity</h3>
                                  <button type="button" className="dash-view-all-btn" onClick={() => setIsNotificationDrawerOpen(true)}>View All</button>
                                </div>
                                <div className="dash-activity-list">
                                  {recentActivity.map(item => (
                                    <div key={item.id} className="dash-activity-item" role="button" tabIndex={0}
                                      onClick={() => handleNotificationClick(item)}
                                      onKeyDown={e => e.key === 'Enter' && handleNotificationClick(item)}>
                                      <span className="dash-activity-icon">
                                        {item.category === 'leave' ? '✈️' : item.category === 'payroll' ? '💰' : item.category === 'time-entry' ? '⏱️' : item.category === 'documents' ? '📄' : '🔔'}
                                      </span>
                                      <div className="dash-activity-body">
                                        <p className="dash-activity-title">{item.title}</p>
                                        <p className="dash-activity-sub">{item.description}</p>
                                      </div>
                                      <span className="dash-activity-time">{item.timestamp}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                            </div>
                            <div className="dash-col-side">



                              {/* Important Reminders */}
                              <div className="dash-card dash-reminders-card">
                                <div className="dash-card-header-row">
                                  <h3 className="dash-card-title">Important Reminders</h3>
                                </div>
                                <div className="dash-reminders-list">
                                  {reminders.map(rem => (
                                    <div key={rem.id} className="dash-reminder-item" role="button" tabIndex={0}
                                      onClick={() => setCurrentModule(rem.module)}
                                      onKeyDown={e => e.key === 'Enter' && setCurrentModule(rem.module)}>
                                      <span className="dash-reminder-icon">{rem.icon}</span>
                                      <div className="dash-reminder-body">
                                        <p className="dash-reminder-title">{rem.title}</p>
                                        <p className="dash-reminder-sub">{rem.sub}</p>
                                      </div>
                                      <span className="dash-reminder-arrow">→</span>
                                    </div>
                                  ))}
                                  {reminders.length === 0 && (
                                    <p className="dash-empty-note">No active reminders.</p>
                                  )}
                                </div>
                                <button type="button" className="dash-view-link" onClick={() => setIsNotificationDrawerOpen(true)}>View All Reminders</button>
                              </div>

                              {/* Quick Actions */}
                              <div className="dash-card dash-quick-card">
                                <h3 className="dash-card-title">Quick Actions</h3>
                                <div className="dash-quick-grid">
                                  <button type="button" className="dash-quick-btn" onClick={() => { setCurrentModule('time-entry'); setActiveTimeEntryTab('My Timesheet') }}>
                                    <span className="dash-quick-icon dash-qi--green">
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                      </svg>
                                    </span>
                                    Request Day Off / Leave
                                  </button>
                                  <button type="button" className="dash-quick-btn" onClick={() => setCurrentModule('time-entry')}>
                                    <span className="dash-quick-icon dash-qi--blue">
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                      </svg>
                                    </span>
                                    Log Time
                                  </button>
                                  <button type="button" className="dash-quick-btn" onClick={() => { setCurrentModule('my-pay'); setActivePayTab('Payslips') }}>
                                    <span className="dash-quick-icon dash-qi--red">
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="3" width="20" height="14" rx="2" />
                                        <line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                                      </svg>
                                    </span>
                                    View Payslip
                                  </button>
                                </div>
                              </div>

                              {/* Company Announcements */}
                              {/* <div className="dash-card dash-announce-card">
                                <div className="dash-card-header-row">
                                  <h3 className="dash-card-title">Company Announcements</h3>
                                  <button type="button" className="dash-view-all-btn" onClick={() => setIsNotificationDrawerOpen(true)}>View All</button>
                                </div>
                                <div className="dash-announcements-list">
                                  {announcements.map(ann => (
                                    <div key={ann.id} className="dash-announce-item">
                                      <span className="dash-announce-icon">{ann.icon}</span>
                                      <div className="dash-announce-body">
                                        <p className="dash-announce-title">{ann.title}</p>
                                        <p className="dash-announce-desc">{ann.body}</p>
                                        <p className="dash-announce-age">{ann.age}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div> */}

                            </div>
                          </div>

                        </div>
                      )
                    })() : currentModule === 'time-entry' ? (
                      <div className="time-entry-shell">
                        <div className="time-entry-top">
                          <div className="time-entry-tabs" role="tablist" aria-label="Time entry tabs">
                            {timeEntryTabs.map((tab) => (
                              <button
                                key={tab}
                                type="button"
                                className={`time-tab ${activeTimeEntryTab === tab ? 'active' : ''}`}
                                onClick={() => setActiveTimeEntryTab(tab)}
                              >
                                {tab}
                              </button>
                            ))}
                          </div>

                          {isCalendarTab ? (
                            <div className="calendar-toolbar">
                              <div className="calendar-nav-group" aria-label="Calendar navigation">
                                <button type="button" className="calendar-chip-btn" onClick={() => setCalendarMonthDate(startOfMonth(fromIso(activeRange.fromDateISO)))}>
                                  Today
                                </button>
                                <button type="button" className="calendar-icon-btn" aria-label="Previous month" onClick={() => setCalendarMonthDate((prev) => addMonths(prev, -1))}>
                                  ‹
                                </button>
                                <div className="calendar-month-pill">{formatMonthYear(calendarMonthDate)}</div>
                                <button type="button" className="calendar-icon-btn" aria-label="Next month" onClick={() => setCalendarMonthDate((prev) => addMonths(prev, 1))}>
                                  ›
                                </button>
                              </div>

                              <div className="calendar-toolbar-actions">
                                <button
                                  type="button"
                                  className={`calendar-chip-btn ${isCalendarFiltersOpen ? 'active' : ''}`}
                                  onClick={() => setIsCalendarFiltersOpen((prev) => !prev)}
                                >
                                  Filters
                                </button>
                                {/* <button
                                  type="button"
                                  className="btn"
                                  onClick={() => openEditModalForDay(selectedDay.key)}
                                  disabled={isOlderThan5Days(selectedDay.key)}
                                  title={isOlderThan5Days(selectedDay.key) ? 'Locked (older than 5 days)' : ''}
                                >
                                  {isOlderThan5Days(selectedDay.key) ? '🔒 Locked' : 'Edit Selected'}
                                </button>
                                <button type="button" className="btn btn-primary" onClick={handleSubmit}>Submit</button> */}
                              </div>

                              {isCalendarFiltersOpen && (
                                <div className="calendar-filter-popover" role="dialog" aria-label="Calendar filters">
                                  {(['submitted', 'draft', 'returned', 'none'] as TimeEntryStatus[]).map((status) => (
                                    <label key={status} className="calendar-filter-option">
                                      <input
                                        type="checkbox"
                                        checked={calendarVisibleStatuses.includes(status)}
                                        onChange={() => toggleCalendarStatus(status)}
                                      />
                                      <span className={`status-chip ${status}`}>{statusLabel[status] === '-' ? 'No Entry' : statusLabel[status]}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : isTimeHistoryTab ? (
                            <div className="history-toolbar">
                              <div className="history-range-group">
                                <span className="history-range-label">Date Range</span>
                                <label className="history-date-pill">
                                  <input
                                    type="date"
                                    value={historyFromDateInput}
                                    max={todayIso}
                                    onChange={(event) => setHistoryFromDateInput(event.target.value)}
                                  />
                                </label>
                                <span className="history-range-sep">-</span>
                                <label className="history-date-pill">
                                  <input
                                    type="date"
                                    value={historyToDateInput}
                                    max={todayIso}
                                    onChange={(event) => setHistoryToDateInput(event.target.value)}
                                  />
                                </label>
                                <button type="button" className="history-ghost-btn" onClick={applyHistoryDateFilter}>
                                  Apply
                                </button>
                              </div>

                              <div className="history-toolbar-actions">
                                <button
                                  type="button"
                                  className={`history-ghost-btn ${isTimeHistoryFiltersOpen ? 'active' : ''}`}
                                  onClick={() => setIsTimeHistoryFiltersOpen((prev) => !prev)}
                                >
                                  Filter
                                </button>
                                <button type="button" className="history-ghost-btn" onClick={handleExportTimeHistory}>
                                  Export
                                </button>
                              </div>

                              {isTimeHistoryFiltersOpen && (
                                <div className="history-filter-popover" role="dialog" aria-label="Time history filters">
                                  {(['all', 'approved', 'draft', 'returned'] as const).map((status) => (
                                    <button
                                      key={status}
                                      type="button"
                                      className={`history-filter-chip ${historyStatusFilter === status ? 'active' : ''}`}
                                      onClick={() => setHistoryStatusFilter(status)}
                                    >
                                      {status === 'all' ? 'All Statuses' : timeHistoryStatusLabel[status]}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : isApprovalsTab ? (
                            <div className="approvals-toolbar">
                              <div className="approvals-filter-row" role="tablist" aria-label="Approval filters">
                                {([
                                  ['pending', `Pending (${approvalCounts.pending})`],
                                  ['approved', 'Approved'],
                                  ['returned', 'Returned'],
                                  ['all', 'All'],
                                ] as const).map(([status, label]) => (
                                  <button
                                    key={status}
                                    type="button"
                                    className={`approval-filter-chip ${approvalFilter === status ? 'active' : ''}`}
                                    onClick={() => setApprovalFilter(status)}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>

                              <div className="approvals-toolbar-actions">
                                <button
                                  type="button"
                                  className={`approval-toolbar-btn ${isApprovalsFilterOpen ? 'active' : ''}`}
                                  onClick={() => setIsApprovalsFilterOpen((prev) => !prev)}
                                >
                                  Filter
                                </button>
                              </div>

                              {isApprovalsFilterOpen && (
                                <div className="approval-filter-popover" role="dialog" aria-label="Approvals filters">
                                  {(['pending', 'approved', 'returned', 'all'] as const).map((status) => (
                                    <button
                                      key={status}
                                      type="button"
                                      className={`approval-filter-chip ${approvalFilter === status ? 'active' : ''}`}
                                      onClick={() => {
                                        setApprovalFilter(status)
                                        setIsApprovalsFilterOpen(false)
                                      }}
                                    >
                                      {status === 'pending'
                                        ? `Pending (${approvalCounts.pending})`
                                        : status === 'all'
                                          ? 'All'
                                          : approvalStatusLabel[status]}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : isLeaveTab ? (
                            null
                          ) : (
                            <div className="time-entry-actions">
                              <label className="date-control">
                                From
                                <input type="date" value={fromDateInput} max={todayIso} onChange={(event) => setFromDateInput(event.target.value)} />
                              </label>
                              <label className="date-control">
                                To
                                <input type="date" value={toDateInput} max={todayIso} onChange={(event) => setToDateInput(event.target.value)} />
                              </label>
                              <button type="button" className="btn" onClick={applyDateRange}>Apply Dates</button>
                              <button type="button" className="btn btn-primary" onClick={handleSubmit}>Submit</button>
                            </div>
                          )}
                        </div>

                        {dateRangeError && <p className="submit-error">{dateRangeError}</p>}
                        {submitError && <p className="submit-error">{submitError}</p>}
                        {isTimeHistoryTab && historyFilterError && <p className="submit-error">{historyFilterError}</p>}

                        {isCalendarTab ? (
                          <div className="time-calendar-layout">
                            <section className="calendar-surface" aria-label="Monthly time entry calendar">
                              <div className="calendar-week-header">
                                {calendarWeekdays.map((label) => (
                                  <span key={label}>{label}</span>
                                ))}
                              </div>

                              <div className="calendar-grid">
                                {calendarDays.map((cell) => {
                                  const isLeave = cell.entry?.isLeave
                                  const status = isLeave ? 'leave' : (cell.entry?.status ?? 'none')
                                  const statusText = isLeave
                                    ? (cell.entry?.leaveType ? leaveTypeLabel[cell.entry.leaveType] : 'Leave')
                                    : (status === 'none' || status === 'leave' ? 'No Entry' : statusLabel[status as TimeEntryStatus])

                                  return (
                                    <button
                                      key={cell.iso}
                                      type="button"
                                      className={[
                                        'calendar-cell',
                                        cell.isCurrentMonth ? '' : 'is-outside',
                                        cell.isSelected ? 'is-selected' : '',
                                        cell.isToday ? 'is-today' : '',
                                        cell.isVisible ? '' : 'is-filtered',
                                      ].filter(Boolean).join(' ')}
                                      onClick={() => handleCalendarCellClick(cell.iso)}
                                    >
                                      <div className="calendar-cell-head">
                                        <span className="calendar-date-number">{cell.date.getDate()}</span>
                                        {cell.entry && cell.isVisible ? <i className={`dot ${status}`} /> : null}
                                      </div>
                                      <div className="calendar-cell-body">
                                        {cell.entry && cell.isVisible ? (
                                          <>
                                            <span className={`calendar-hours-pill ${status}`}>
                                              {isLeave ? 'Leave' : (cell.entry.hours > 0 ? `${formatHours(cell.entry.hours)}h` : '0h')}
                                            </span>
                                            <small>{statusText}</small>
                                          </>
                                        ) : (
                                          <small>{cell.isCurrentMonth ? 'No entry' : ''}</small>
                                        )}
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            </section>

                            <aside className="calendar-summary-panel" aria-label="Calendar summary">
                              <section className="calendar-summary-card">
                                <h3>Summary</h3>
                                <p className="calendar-summary-month">{formatMonthYear(calendarMonthDate)}</p>
                                <div className="calendar-summary-metrics">
                                  <div>
                                    <span>Total Hours</span>
                                    <strong>{formatHours(visibleMonthTotals.totalHours)} hrs</strong>
                                  </div>
                                  <div>
                                    <span>Regular Hours</span>
                                    <strong>{formatHours(visibleMonthTotals.regularHours)} hrs</strong>
                                  </div>
                                  <div>
                                    <span>Overtime</span>
                                    <strong>{formatHours(visibleMonthTotals.overtimeHours)} hrs</strong>
                                  </div>
                                  <div>
                                    <span>Leave Hours</span>
                                    <strong>{formatHours(visibleMonthTotals.leaveHours)} hrs</strong>
                                  </div>
                                </div>
                              </section>

                              <section className="calendar-summary-card">
                                <h3>Status Mix</h3>
                                <div className="calendar-status-list">
                                  <span><i className="dot leave" />Leave <strong>{visibleMonthTotals.leave}</strong></span>
                                  <span><i className="dot submitted" />Submitted <strong>{visibleMonthTotals.submitted}</strong></span>
                                  <span><i className="dot draft" />Draft <strong>{visibleMonthTotals.draft}</strong></span>
                                  <span><i className="dot returned" />Returned <strong>{visibleMonthTotals.returned}</strong></span>
                                  <span><i className="dot none" />No Entry <strong>{visibleMonthTotals.none}</strong></span>
                                </div>
                              </section>

                              <section className="calendar-summary-card">
                                <div className="day-card-head compact">
                                  <h4>{formatDateLong(selectedDay.key)}</h4>
                                  {isOlderThan5Days(selectedDay.key) ? (
                                    <span className="locked-badge" title="Locked (older than 5 days)">🔒 Locked</span>
                                  ) : (
                                    <button type="button" onClick={() => openEditModalForDay(selectedDay.key)}>Edit</button>
                                  )}
                                </div>
                                <dl className="calendar-detail-list">
                                  <div>
                                    <dt>Status</dt>
                                    <dd>
                                      <span className={`status-chip ${selectedDay.isLeave ? 'leave' : selectedDay.status}`}>
                                        {selectedDay.isLeave
                                          ? (selectedDay.leaveType ? leaveTypeLabel[selectedDay.leaveType] : 'Leave')
                                          : (statusLabel[selectedDay.status] === '-' ? 'No Entry' : statusLabel[selectedDay.status])}
                                      </span>
                                    </dd>
                                  </div>
                                  <div><dt>Work Location</dt><dd>{selectedDay.workLocation}</dd></div>
                                  <div><dt>Start Time</dt><dd>{selectedDay.isLeave ? '--' : selectedDay.startTime}</dd></div>
                                  <div><dt>End Time</dt><dd>{selectedDay.isLeave ? '--' : selectedDay.endTime}</dd></div>
                                  <div><dt>Break</dt><dd>{selectedDay.isLeave ? '--' : selectedDay.breakDuration}</dd></div>
                                  <div><dt>Notes</dt><dd>{selectedDay.notes || 'No notes.'}</dd></div>
                                </dl>
                              </section>
                            </aside>
                          </div>
                        ) : isTimeHistoryTab ? (
                          <div className="time-history-shell">
                            <p className="history-range-note">Showing history for {appliedHistoryRangeLabel}</p>
                            <section className="time-history-card" aria-label="Time history table">
                              <table className="time-history-table">
                                <thead>
                                  <tr>
                                    <th>Week</th>
                                    <th>Total Hours</th>
                                    <th>Regular Hours</th>
                                    <th>Overtime</th>
                                    <th>Leave Hours</th>
                                    <th>Status</th>
                                    <th>Submitted On</th>
                                    <th>Approved On</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredTimeHistoryItems.map((item) => (
                                    <tr key={item.key}>
                                      <td>{getRangeLabel(item.fromDateISO, item.toDateISO)}</td>
                                      <td>{formatHours(item.totalHours)}</td>
                                      <td>{formatHours(item.regularHours)}</td>
                                      <td>{formatHours(item.overtimeHours)}</td>
                                      <td>{formatHours(item.leaveHours)}</td>
                                      <td>
                                        <span className={`history-status-chip ${item.status}`}>
                                          {timeHistoryStatusLabel[item.status]}
                                        </span>
                                      </td>
                                      <td>{item.submittedOnISO ? formatDateWithYear(item.submittedOnISO) : '-'}</td>
                                      <td>{item.approvedOnISO ? formatDateWithYear(item.approvedOnISO) : '-'}</td>
                                    </tr>
                                  ))}
                                  {filteredTimeHistoryItems.length === 0 && (
                                    <tr>
                                      <td colSpan={8} className="history-empty-row">No time history found for the current filters.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </section>
                          </div>
                        ) : isApprovalsTab ? (
                          <div className="approvals-shell">
                            {filteredApprovalItems.map((item) => {
                              const isExpanded = expandedApprovalKey === item.key

                              return (
                                <section key={item.key} className="approval-card" aria-label={`Approval item ${item.employeeName}`}>
                                  <div className="approval-card-head">
                                    <div className="approval-employee">
                                      <div className="approval-avatar">JD</div>
                                      <div>
                                        <h4>{item.employeeName}</h4>
                                        <p>{item.employeeRole}</p>
                                      </div>
                                    </div>

                                    <div className="approval-summary-grid">
                                      <div>
                                        <span>Week</span>
                                        <strong>{getRangeLabel(item.fromDateISO, item.toDateISO)}</strong>
                                      </div>
                                      <div>
                                        <span>Total Hours</span>
                                        <strong>{formatHours(item.totalHours)}</strong>
                                      </div>
                                      <div>
                                        <span>Submitted On</span>
                                        <strong>{formatDateWithYear(item.submittedOnISO)}</strong>
                                      </div>
                                      <div>
                                        <span>Status</span>
                                        <strong><span className={`approval-status-pill ${item.status}`}>{approvalStatusLabel[item.status]}</span></strong>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      className="approval-toggle-btn"
                                      onClick={() => setExpandedApprovalKey((prev) => (prev === item.key ? null : item.key))}
                                      aria-label={isExpanded ? 'Collapse approval details' : 'Expand approval details'}
                                    >
                                      {isExpanded ? '⌃' : '⌄'}
                                    </button>
                                  </div>

                                  {isExpanded && (
                                    <>
                                      <div className="approval-detail-table-wrap">
                                        <table className="approval-detail-table">
                                          <thead>
                                            <tr>
                                              <th>Day</th>
                                              {item.details.map((day) => (
                                                <th key={day.key}>
                                                  <span>{day.label}</span>
                                                  <small>{day.dateLabel}</small>
                                                </th>
                                              ))}
                                              <th>Total</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr>
                                              <td>Hours</td>
                                              {item.details.map((day) => <td key={`hours-${day.key}`}>{formatHours(day.hours)}</td>)}
                                              <td>{formatHours(item.totalHours)}</td>
                                            </tr>
                                            <tr>
                                              <td>Regular Hours</td>
                                              {item.details.map((day) => <td key={`regular-${day.key}`}>{formatHours(day.regularHours)}</td>)}
                                              <td>{formatHours(item.regularHours)}</td>
                                            </tr>
                                            <tr>
                                              <td>Overtime</td>
                                              {item.details.map((day) => <td key={`ot-${day.key}`}>{formatHours(day.overtimeHours)}</td>)}
                                              <td>{formatHours(item.overtimeHours)}</td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </>
                                  )}
                                </section>
                              )
                            })}

                            {filteredApprovalItems.length === 0 && (
                              <section className="approval-card approval-empty-card">
                                <p>No approvals found for the selected filter.</p>
                              </section>
                            )}
                          </div>
                        ) : isLeaveTab ? (
                          renderLeaveModuleContent()
                        ) : (
                          <>
                            <div className="time-entry-cards">
                              <section className="time-card summary-card" aria-label="Summary">
                                <h3>Summary</h3>
                                <div className="summary-grid">
                                  <div className="summary-item">
                                    <span>Total Hours</span>
                                    <strong>{formatHours(totals.totalHours)}</strong>
                                    <small>/ 40 hrs</small>
                                  </div>
                                  <div className="summary-item">
                                    <span>Regular Hours</span>
                                    <strong>{formatHours(totals.regularHours)}</strong>
                                    <small>/ 40 hrs</small>
                                  </div>
                                  <div className="summary-item">
                                    <span>Overtime</span>
                                    <strong>{formatHours(totals.overtimeHours)}</strong>
                                    <small>hrs</small>
                                  </div>
                                  <div className="summary-item">
                                    <span>Leave Hours</span>
                                    <strong>{formatHours(leaveHours)}</strong>
                                    <small>hrs</small>
                                  </div>
                                </div>
                              </section>

                              <section className="time-card status-card" aria-label="Status">
                                <h3>Status</h3>
                                <span className={`status-chip ${rangeStatus.toLowerCase()}`}>{rangeStatus}</span>
                                <p>Last saved: {activeRange.lastSaved}</p>
                                <p>{getRangeLabel(activeRange.fromDateISO, activeRange.toDateISO)}</p>
                                <div className="status-progress">
                                  <div className="status-progress-fill" style={{ width: `${completionPct}%` }} />
                                </div>
                                <small>{completionPct}% completed</small>
                              </section>

                              <section className="time-card quick-card" aria-label="Quick actions">
                                <h3>Quick Actions</h3>
                                <button type="button" className="quick-link" onClick={requestClockInOut}>
                                  Clock In / Out <span>›</span>
                                </button>
                                <button type="button" className="quick-link" onClick={requestCopyPreviousPeriod}>
                                  Copy Previous Period <span>›</span>
                                </button>
                                {/* <button type="button" className="quick-link" onClick={handleRequestCorrection}>
                                  Request Correction <span>›</span>
                                </button> */}
                              </section>
                            </div>

                            <div className="time-entry-main">
                              <div className="time-table-card">
                                <div className="time-table-header">
                                  <h3 className="time-table-title">Timesheet Entries</h3>
                                  <div className="export-group">
                                    <span className="export-label">Export:</span>
                                    <button type="button" className="export-btn pdf" onClick={handleExportPDF} title="Export to PDF">
                                      <svg viewBox="0 0 384 512" style={{ width: '12px', height: '12px', fill: 'currentColor' }}><path d="M181.9 256.1c-5-16-4.9-46.9-2-46.9 8.4 0 7.6 36.9 2 46.9zm-1.7 47.2c-7.7 20.2-17.3 43.3-28.4 62.7 18.3-7 39-17.2 50.8-24.7-17.6 1.7-18.4 16-22.4 22zm-78.2 92.5c-4.3 0-8.2-2.5-9.4-6.6-4.9-16.7 13.9-38.3 35.8-51.4-17 19.8-24.1 40-26.4 58zm191.1-131.6c-4.4 9.1-16.1 19.9-29.2 27.2 26.6-2.5 35.2-19.8 29.2-27.2zm112.9-96.2c0-10.7-3.9-20.7-11-28.4L284.4 28.9c-7.6-8.3-18.4-13-29.6-13H48C21.5 15.9 0 37.4 0 63.9v384.3C0 474.7 21.5 496 48 496h288c26.5 0 48-21.3 48-47.8V168zm-121.7 66.8c0 29.1-13.6 57.2-27.2 78.4-11.7 18.2-28.2 41.2-40 60.1-5.7 9.1-12.7 19.1-17.1 27.5-6.8 12.9-17.6 22-26.8 22-9.7 0-21.4-12.6-28.4-36.9-1.9-6.7-2.2-25 10-53.7 2.4-5.6 5.8-12.4 9.4-19 12.5-23.3 27.8-52.4 34.4-75.9-4.2-18.1-10.1-47.4-10.1-66.2 0-35.3 12.4-54.8 35.3-54.8 22.9 0 29.5 28.5 25.1 63.4 12.4 24.4 26.2 47.2 38.6 68.2 12.7-7.2 26.9-13.8 35.3-13.8 17.5 0 26 10.1 26 23.9 0 20.2-14.7 34.6-28.2 40.3z" /></svg>
                                      PDF
                                    </button>
                                    <button type="button" className="export-btn excel" onClick={handleExportExcel} title="Export to Excel">
                                      <svg viewBox="0 0 384 512" style={{ width: '12px', height: '12px', fill: 'currentColor' }}><path d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm60.1 106.5L224 336l60.1 93.5c5.1 8-2.6 18.5-11.9 18.5h-31.9c-5.9 0-11.2-3.2-14-8.4L192 385.3l-34.3 54.3c-2.8 5.2-8.1 8.4-14 8.4H111.8c-9.3 0-17-10.5-11.9-18.5L160 336l-60.1-93.5c-5.1-8 2.6-18.5 11.9-18.5h31.9c5.9 0 11.2 3.2 14 8.4L192 286.7l34.3-54.3c2.8-5.2 8.1-8.4 14-8.4H272.2c9.3 0 17 10.5 11.9 18.5zM384 121.9v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z" /></svg>
                                      Excel
                                    </button>
                                    {/* <button type="button" className="export-btn word" onClick={handleExportWord} title="Export to Word">
                                      <svg viewBox="0 0 384 512" style={{ width: '12px', height: '12px', fill: 'currentColor' }}><path d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm39 123.9c.4 5.3-2.5 10.4-7.4 12.5L224 336l31.6 63.6c2.4 4.8 1.9 10.6-1.5 14.9s-9 6.9-14.3 6.9H208c-5.8 0-11.1-3.1-13.9-8.3L168 360l-26.1 53.1c-2.8 5.2-8.1 8.3-13.9 8.3H95.8c-5.3 0-10.1-2.6-12.5-6.9s-1.9-9.7 1.5-14.9L116 336l-31.6-63.6c-2.4-4.8-1.9-10.6 1.5-14.9s9-6.9 14.3-6.9H128c5.8 0 11.1 3.1 13.9 8.3L168 312l26.1-53.1c2.8-5.2 8.1-8.3 13.9-8.3h32.2c5.3 0 10.1 2.6 12.5 6.9s1.9 9.7-1.5 14.9zM384 121.9v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z" /></svg>
                                      Word
                                    </button> */}
                                  </div>
                                </div>
                                <table className="time-table">
                                  <thead>
                                    <tr>
                                      <th>Date</th>
                                      {activeRange.days.map((day) => (
                                        <th
                                          key={day.key}
                                          className={selectedDayKey === day.key ? 'selected' : ''}
                                          onClick={() => handleDaySelection(day.key)}
                                        >
                                          <span>{day.label}</span>
                                          <small>{day.dateLabel}</small>
                                        </th>
                                      ))}
                                      <th>Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td>Status</td>
                                      {activeRange.days.map((day) => (
                                        <td key={`status-${day.key}`} className={selectedDayKey === day.key ? 'selected' : ''}>
                                          <button
                                            type="button"
                                            className={`status-chip status-chip-btn ${day.isLeave ? 'leave' : day.status} ${isOlderThan5Days(day.key) ? 'locked' : ''}`}
                                            onClick={() => openEditModalForDay(day.key)}
                                            title={isOlderThan5Days(day.key) ? 'Locked (older than 5 days)' : 'Edit this date'}
                                          >
                                            {day.isLeave ? (day.leaveType ? leaveTypeLabel[day.leaveType] : 'Leave') : statusLabel[day.status]}
                                            {isOlderThan5Days(day.key) && ' 🔒'}
                                          </button>
                                        </td>
                                      ))}
                                      <td> </td>
                                    </tr>
                                    <tr>
                                      <td>Hours</td>
                                      {activeRange.days.map((day) => (
                                        <td key={`hours-${day.key}`} className={selectedDayKey === day.key ? 'selected' : ''}>
                                          {day.isLeave ? '--' : formatHours(day.hours)}
                                        </td>
                                      ))}
                                      <td>{formatHours(totals.totalHours)}</td>
                                    </tr>
                                    <tr>
                                      <td>Regular Hours</td>
                                      {activeRange.days.map((day) => (
                                        <td key={`regular-${day.key}`} className={selectedDayKey === day.key ? 'selected' : ''}>
                                          {day.isLeave ? '--' : formatHours(day.regularHours)}
                                        </td>
                                      ))}
                                      <td>{formatHours(totals.regularHours)}</td>
                                    </tr>
                                    <tr>
                                      <td>Overtime</td>
                                      {activeRange.days.map((day) => (
                                        <td key={`ot-${day.key}`} className={selectedDayKey === day.key ? 'selected' : ''}>
                                          {day.isLeave ? '--' : formatHours(day.overtimeHours)}
                                        </td>
                                      ))}
                                      <td>{formatHours(totals.overtimeHours)}</td>
                                    </tr>
                                  </tbody>
                                </table>

                                <div className="time-legend">
                                  <span>
                                    <i className="dot submitted" />Submitted
                                  </span>
                                  <span>
                                    <i className="dot draft" />Draft
                                  </span>
                                  <span>
                                    <i className="dot returned" />Returned
                                  </span>
                                  <span>
                                    <i className="dot none" />No Entry
                                  </span>
                                </div>
                              </div>

                              <aside className="time-day-card" aria-label="Selected date details">
                                <div className="day-card-head">
                                  <h4>{formatDateLong(selectedDay.key)}</h4>
                                  {isOlderThan5Days(selectedDay.key) ? (
                                    <span className="locked-badge" title="Locked (older than 5 days)">🔒 Locked</span>
                                  ) : (
                                    <button type="button" onClick={() => openEditModalForDay(selectedDay.key)}>Edit</button>
                                  )}
                                </div>
                                <dl>
                                  <div><dt>Work Location</dt><dd>{selectedDay.workLocation}</dd></div>
                                  <div><dt>Start Time</dt><dd>{selectedDay.startTime}</dd></div>
                                  <div><dt>End Time</dt><dd>{selectedDay.endTime}</dd></div>
                                  <div><dt>Break</dt><dd>{selectedDay.breakDuration}</dd></div>
                                  <div><dt>Regular Hours</dt><dd>{formatHours(selectedDay.regularHours)} hrs</dd></div>
                                  <div><dt>Overtime</dt><dd>{formatHours(selectedDay.overtimeHours)} hrs</dd></div>
                                  <div><dt>Notes</dt><dd>{selectedDay.notes || 'No notes.'}</dd></div>
                                </dl>
                              </aside>
                            </div>

                            <div className="foot">
                              <button
                                className="btn"
                                onClick={handlePrevDate}
                                disabled={selectedDayIndex === 0}
                              >
                                ← Back
                              </button>
                              <div className="progress">
                                <div className="pmeta">
                                  <span>Date {selectedDayIndex + 1} of {activeRange.days.length}</span>
                                  <span>{dateProgressPct}% complete</span>
                                </div>
                                <div className="pbar">
                                  <div className="fill" style={{ width: `${dateProgressPct}%` }} />
                                </div>
                              </div>
                              <button
                                className="btn btn-primary"
                                onClick={handleNextDate}
                                disabled={selectedDayIndex >= activeRange.days.length - 1}
                              >
                                Next →
                              </button>
                            </div>
                          </>
                        )}

                        {isEditModalOpen && (
                          <div className="time-modal-backdrop" role="presentation" onClick={closeEditModal}>
                            <div
                              className="time-modal"
                              role="dialog"
                              aria-modal="true"
                              aria-label="Edit time entry"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <h3>Edit Entry · {formatDateLong(selectedDay.key)}</h3>
                              <div className="time-modal-grid">
                                <label style={{ gridColumn: '1 / -1' }}>
                                  Time Type
                                  <select
                                    value={editForm.timeType}
                                    onChange={(event) => {
                                      const val = event.target.value as any
                                      setEditForm((prev) => ({
                                        ...prev,
                                        timeType: val,
                                        isLeave: val !== 'regular',
                                        leaveType: val !== 'regular' ? val : undefined
                                      }))
                                    }}
                                  >
                                    <option value="regular">Regular Hours ⏱️</option>
                                    <optgroup label="Leaves / Time Off 🏝️">
                                      {(Object.keys(leaveTypeLabel) as LeaveTypeId[]).map((typeId) => (
                                        <option key={typeId} value={typeId}>
                                          {leaveTypeLabel[typeId]}
                                        </option>
                                      ))}
                                    </optgroup>
                                  </select>
                                </label>

                                {editForm.timeType === 'regular' && (
                                  <label style={{ gridColumn: '1 / -1' }}>
                                    Time Spent (Hours)
                                    <input
                                      type="number"
                                      min={0}
                                      max={24}
                                      step={0.5}
                                      value={editForm.timeSpentHours || ''}
                                      placeholder="e.g. 8"
                                      onChange={(event) =>
                                        setEditForm((prev) => ({ ...prev, timeSpentHours: Number(event.target.value || 0) }))
                                      }
                                    />
                                  </label>
                                )}

                                <label className="full">
                                  Notes / Reason
                                  <textarea
                                    rows={3}
                                    value={editForm.notes}
                                    onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))}
                                    placeholder={editForm.timeType !== 'regular' ? "Provide the reason for leave" : ""}
                                  />
                                </label>
                              </div>
                              {editError && <p className="time-modal-error">{editError}</p>}
                              <div className="time-modal-actions">
                                <button type="button" className="btn" onClick={closeEditModal}>Cancel</button>
                                <button type="button" className="btn btn-primary" onClick={handleSaveDayEdit}>Save Entry</button>
                              </div>
                            </div>
                          </div>
                        )}

                        {confirmAction && confirmContent && (
                          <div className="time-modal-backdrop" role="presentation" onClick={closeConfirmModal}>
                            <div
                              className="time-modal"
                              role="dialog"
                              aria-modal="true"
                              aria-label="Confirm quick action"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <h3>{confirmContent.title}</h3>
                              <p className="time-confirm-message">{confirmContent.message}</p>
                              {confirmAction === 'copy' && (
                                <div className="time-modal-grid" style={{ marginTop: '16px', marginBottom: '16px' }}>
                                  <label className="full">
                                    Select period or template to copy from
                                    <select
                                      value={selectedCopySource}
                                      onChange={(event) => setSelectedCopySource(event.target.value)}
                                    >
                                      <option value="default">Default Template (Mon-Fri, 9:00 AM - 6:00 PM)</option>
                                      {timeHistoryItems
                                        .filter((item) => item.key !== timeEntryStore.activeRangeKey) // Exclude current range
                                        .map((item) => (
                                          <option key={item.key} value={item.key}>
                                            Past Week: {getRangeLabel(item.fromDateISO, item.toDateISO)} ({item.status})
                                          </option>
                                        ))}
                                    </select>
                                  </label>
                                </div>
                              )}
                              <div className="time-modal-actions">
                                <button type="button" className="btn" onClick={closeConfirmModal}>Cancel</button>
                                <button type="button" className="btn btn-primary" onClick={handleConfirmAction}>Yes, Continue</button>
                              </div>
                            </div>
                          </div>
                        )}

                        {warningModal && (
                          <div className="time-modal-backdrop" role="presentation" onClick={closeWarningModal}>
                            <div
                              className="time-modal"
                              role="dialog"
                              aria-modal="true"
                              aria-label="Time entry warning"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <h3>{warningModal.title}</h3>
                              <p className="time-confirm-message">{warningModal.message}</p>
                              <div className="time-modal-actions">
                                <button type="button" className="btn btn-primary" onClick={closeWarningModal}>OK</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : currentModule === 'my-pay' ? (
                      <div className="pay-shell">
                        {/* Pay Tab Navigation */}
                        <div className="pay-top" ref={payTabRef}>
                          <div className="pay-tabs" role="tablist" aria-label="My Pay tabs">
                            {myPayTabs.map((tab) => (
                              <button
                                key={tab}
                                type="button"
                                className={`pay-tab ${activePayTab === tab ? 'active' : ''}`}
                                onClick={() => setActivePayTab(tab)}
                                role="tab"
                                aria-selected={activePayTab === tab}
                              >
                                {tab}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* ── OVERVIEW TAB ── */}
                        {activePayTab === 'Overview' && (() => {
                          const ytdGross = payslipSeedData.filter(p => p.status === 'Paid').reduce((s, p) => s + p.grossSalary, 0)
                          const ytdNet = payslipSeedData.filter(p => p.status === 'Paid').reduce((s, p) => s + p.netSalary, 0)
                          const ytdTax = salaryDeductions.find(d => d.label === 'Income Tax (TDS)')?.amount ?? 0
                          const ytdDeductions = salaryDeductions.reduce((s, d) => s + d.amount, 0)
                          const recentPayslips = payslipSeedData.slice(0, 3)
                          return (
                            <div className="pay-overview-grid">
                              {/* Current Month Card */}
                              <section className="pay-card pay-current-month" aria-label="Current month salary">
                                <div className="pay-card-label">Current Month <span className="pay-month-badge">(June 2025)</span></div>
                                <div className="pay-net-row">
                                  <div>
                                    <div className="pay-net-label">Net Salary</div>
                                    <div className="pay-net-amount">{formatCurrency(68750)}</div>
                                  </div>
                                  <span className="pay-status-chip paid">Paid</span>
                                </div>
                                <div className="pay-meta-row">
                                  <div><span>Gross Salary</span><strong>{formatCurrency(98500)}</strong></div>
                                  <div><span>Pay Date</span><strong>30 Jun 2025</strong></div>
                                  <div><span>Next Payday</span><strong>31 Jul 2025</strong></div>
                                </div>
                              </section>

                              {/* Quick Actions Card */}
                              <section className="pay-card pay-quick-actions" aria-label="Quick actions">
                                <div className="pay-card-label">Quick Actions</div>
                                <div className="pay-actions-list">
                                  <button type="button" className="pay-action-btn" onClick={() => {
                                    setSelectedPayslipForView(payslipSeedData[0])
                                    setActivePayTab('Payslips')
                                  }}>
                                    <span className="pay-action-icon">📄</span>
                                    <span>View Payslip</span>
                                  </button>
                                  <button type="button" className="pay-action-btn" onClick={() => setActivePayTab('Payslips')}>
                                    <span className="pay-action-icon">⬇️</span>
                                    <span>Download Payslip</span>
                                  </button>
                                  <button type="button" className="pay-action-btn" onClick={() => setActivePayTab('Salary Breakdown')}>
                                    <span className="pay-action-icon">📊</span>
                                    <span>View Salary Breakdown</span>
                                  </button>
                                </div>
                              </section>

                              {/* Employment Details Card */}
                              <section className="pay-card pay-emp-details" aria-label="Employment details">
                                <div className="pay-card-label">Employment Details</div>
                                <dl className="pay-emp-dl">
                                  <div><dt>Employment Country</dt><dd>🇮🇳 India</dd></div>
                                  <div><dt>Payroll Entity</dt><dd>Pynk India Pvt Ltd</dd></div>
                                  <div><dt>Payroll Cycle</dt><dd>Monthly</dd></div>
                                  <div><dt>Next Payday</dt><dd>31 Jul 2025</dd></div>
                                </dl>
                              </section>

                              {/* Year To Date Card */}
                              <section className="pay-card pay-ytd" aria-label="Year to date">
                                <div className="pay-card-label">Year To Date <span className="pay-fy-label">(FY 2025-26)</span></div>
                                <div className="pay-ytd-grid">
                                  <div className="pay-ytd-item">
                                    <span>Gross Earnings</span>
                                    <strong className="pay-ytd-gross">{formatCurrency(ytdGross)}</strong>
                                  </div>
                                  <div className="pay-ytd-item">
                                    <span>Net Earnings</span>
                                    <strong className="pay-ytd-net">{formatCurrency(ytdNet)}</strong>
                                  </div>
                                  <div className="pay-ytd-item">
                                    <span>Total Tax</span>
                                    <strong className="pay-ytd-tax">{formatCurrency(ytdTax * 12)}</strong>
                                  </div>
                                  <div className="pay-ytd-item">
                                    <span>Total Deductions</span>
                                    <strong>{formatCurrency(ytdDeductions * 12)}</strong>
                                  </div>
                                </div>
                                <button type="button" className="pay-view-link" onClick={() => setActivePayTab('Payment History')}>
                                  View full Year To Date details →
                                </button>
                              </section>

                              {/* Recent Payslips Card */}
                              <section className="pay-card pay-recent" aria-label="Recent payslips">
                                <div className="pay-card-label">Recent Payslips</div>
                                <div className="pay-recent-list">
                                  {recentPayslips.map((ps) => (
                                    <div key={ps.id} className="pay-recent-row">
                                      <span className="pay-recent-month">{ps.month}</span>
                                      <span className="pay-recent-date">{ps.payDate}</span>
                                      <span className={`pay-status-chip ${ps.status.toLowerCase()}`}>{ps.status}</span>
                                      <button type="button" className="pay-view-link" onClick={() => {
                                        setSelectedPayslipForView(ps)
                                        setActivePayTab('Payslips')
                                      }}>View</button>
                                    </div>
                                  ))}
                                </div>
                                <button type="button" className="pay-view-link" onClick={() => setActivePayTab('Payslips')}>
                                  View all payslips →
                                </button>
                              </section>
                            </div>
                          )
                        })()}

                        {/* ── PAYSLIPS TAB ── */}
                        {activePayTab === 'Payslips' && (() => {
                          const years = [...new Set(payslipSeedData.map(p => p.month.split(' ')[1]))]
                          const ITEMS_PER_PAGE = 6
                          const filtered = payslipSeedData.filter(p => {
                            const yearMatch = p.month.includes(payslipYear)
                            const monthMatch = payslipSearchMonth === '' || p.month.toLowerCase().includes(payslipSearchMonth.toLowerCase())
                            return yearMatch && monthMatch
                          })
                          const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
                          const safePage = Math.min(payslipPage, totalPages)
                          const pageItems = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

                          return (
                            <div className="pay-payslips-shell">
                              {/* Filters */}
                              <div className="pay-payslips-filters">
                                <label className="pay-filter-group">
                                  <span>Year</span>
                                  <select
                                    id="payslip-year-select"
                                    value={payslipYear}
                                    onChange={e => { setPayslipYear(e.target.value); setPayslipPage(1) }}
                                  >
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                  </select>
                                </label>
                                <label className="pay-filter-group">
                                  <span>Search by month</span>
                                  <div className="pay-search-input">
                                    <input
                                      id="payslip-month-search"
                                      type="text"
                                      placeholder="e.g. June"
                                      value={payslipSearchMonth}
                                      onChange={e => { setPayslipSearchMonth(e.target.value); setPayslipPage(1) }}
                                    />
                                    <span className="pay-search-icon">📅</span>
                                  </div>
                                </label>
                              </div>

                              {/* Table */}
                              <section className="pay-table-card" aria-label="Payslips table">
                                <div className="pay-table-wrap">
                                  <table className="pay-table">
                                    <thead>
                                      <tr>
                                        <th>Month</th>
                                        <th>Pay Date</th>
                                        <th>Gross Salary</th>
                                        <th>Net Salary</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {pageItems.map(ps => (
                                        <tr key={ps.id}>
                                          <td>{ps.month}</td>
                                          <td>{ps.payDate}</td>
                                          <td>{formatCurrency(ps.grossSalary)}</td>
                                          <td>{formatCurrency(ps.netSalary)}</td>
                                          <td><span className={`pay-status-chip ${ps.status.toLowerCase()}`}>{ps.status}</span></td>
                                          <td>
                                            <div className="pay-table-actions">
                                              <button type="button" className="pay-action-link" onClick={() => setSelectedPayslipForView(ps)}>
                                                👁️ View
                                              </button>
                                              <button type="button" className="pay-action-link" onClick={() => handleDownloadPayslipPDF(ps)}>
                                                ⬇️ Download
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                      {pageItems.length === 0 && (
                                        <tr><td colSpan={6} className="pay-empty-row">No payslips found for the selected filters.</td></tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Pagination */}
                                <div className="pay-pagination">
                                  <span className="pay-pagination-info">Showing {Math.min((safePage - 1) * ITEMS_PER_PAGE + 1, filtered.length)} to {Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} payslips</span>
                                  <div className="pay-pagination-controls">
                                    <button type="button" className="pay-page-btn" disabled={safePage === 1} onClick={() => setPayslipPage(p => Math.max(1, p - 1))}>‹</button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                                      <button
                                        key={pg}
                                        type="button"
                                        className={`pay-page-btn ${safePage === pg ? 'active' : ''}`}
                                        onClick={() => setPayslipPage(pg)}
                                      >{pg}</button>
                                    ))}
                                    <button type="button" className="pay-page-btn" disabled={safePage === totalPages} onClick={() => setPayslipPage(p => Math.min(totalPages, p + 1))}>›</button>
                                  </div>
                                </div>
                              </section>

                              {/* Payslip View Modal */}
                              {selectedPayslipForView && (
                                <div className="pay-modal-backdrop" role="presentation" onClick={() => setSelectedPayslipForView(null)}>
                                  <div
                                    className="pay-modal pay-payslip-modal"
                                    role="dialog"
                                    aria-modal="true"
                                    aria-label={`Payslip for ${selectedPayslipForView.month}`}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <div className="pay-modal-head">
                                      <div>
                                        <h3>Payslip · {selectedPayslipForView.month}</h3>
                                        <p className="pay-modal-sub">Pynk India Pvt Ltd · John Doe</p>
                                      </div>
                                      <button type="button" className="pay-modal-close" onClick={() => setSelectedPayslipForView(null)}>✕</button>
                                    </div>

                                    <div className="payslip-view-grid">
                                      <div className="payslip-section">
                                        <h4>Earnings</h4>
                                        {salaryEarnings.map(e => (
                                          <div key={e.label} className="payslip-row">
                                            <span><i className="pay-dot" style={{ background: e.color }} />{e.label}</span>
                                            <strong>{formatCurrency(e.amount)}</strong>
                                          </div>
                                        ))}
                                        <div className="payslip-total-row">
                                          <span>Total Earnings</span>
                                          <strong>{formatCurrency(salaryEarnings.reduce((s, e) => s + e.amount, 0))}</strong>
                                        </div>
                                      </div>
                                      <div className="payslip-section">
                                        <h4>Deductions</h4>
                                        {salaryDeductions.map(d => (
                                          <div key={d.label} className="payslip-row">
                                            <span><i className="pay-dot" style={{ background: d.color }} />{d.label}</span>
                                            <strong>{formatCurrency(d.amount)}</strong>
                                          </div>
                                        ))}
                                        <div className="payslip-total-row">
                                          <span>Total Deductions</span>
                                          <strong>{formatCurrency(salaryDeductions.reduce((s, d) => s + d.amount, 0))}</strong>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="payslip-net-row">
                                      <span>Net Salary (Take Home)</span>
                                      <strong>{formatCurrency(selectedPayslipForView.netSalary)}</strong>
                                    </div>

                                    <div className="pay-modal-actions">
                                      <button type="button" className="btn" onClick={() => setSelectedPayslipForView(null)}>Close</button>
                                      <button type="button" className="btn btn-primary" onClick={() => {
                                        if (selectedPayslipForView) {
                                          handleDownloadPayslipPDF(selectedPayslipForView)
                                        }
                                      }}>⬇️ Download PDF</button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })()}

                        {/* ── SALARY BREAKDOWN TAB ── */}
                        {activePayTab === 'Salary Breakdown' && (() => {
                          const totalEarnings = salaryEarnings.reduce((s, e) => s + e.amount, 0)
                          const totalDeductions = salaryDeductions.reduce((s, d) => s + d.amount, 0)
                          const netSalary = totalEarnings - totalDeductions
                          const months = payslipSeedData.map(p => p.month)
                          return (
                            <div className="pay-breakdown-shell">
                              <div className="pay-breakdown-sidebar">
                                <label className="pay-filter-group">
                                  <span>Select Month</span>
                                  <select
                                    id="breakdown-month-select"
                                    value={salaryBreakdownMonth}
                                    onChange={e => setSalaryBreakdownMonth(e.target.value)}
                                  >
                                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                                  </select>
                                </label>

                                <div className="pay-breakdown-summary">
                                  <div className="pay-breakdown-kpi">
                                    <span>Gross Salary</span>
                                    <strong>{formatCurrency(totalEarnings)}</strong>
                                  </div>
                                  <div className="pay-breakdown-kpi">
                                    <span>Total Deductions</span>
                                    <strong>{formatCurrency(totalDeductions)}</strong>
                                  </div>
                                  <div className="pay-breakdown-kpi net">
                                    <span>Net Salary (Take Home)</span>
                                    <strong>{formatCurrency(netSalary)}</strong>
                                  </div>
                                </div>
                              </div>

                              <div className="pay-breakdown-main">
                                <h3>Salary Breakdown</h3>
                                <div className="pay-breakdown-grid">
                                  <section className="pay-breakdown-card" aria-label="Earnings">
                                    <h4>Earnings</h4>
                                    {salaryEarnings.map(e => (
                                      <div key={e.label} className="pay-breakdown-row">
                                        <span><i className="pay-dot" style={{ background: e.color }} />{e.label}</span>
                                        <strong>{formatCurrency(e.amount)}</strong>
                                      </div>
                                    ))}
                                    <div className="pay-breakdown-total">
                                      <span>Total Earnings</span>
                                      <strong>{formatCurrency(totalEarnings)}</strong>
                                    </div>
                                  </section>

                                  <section className="pay-breakdown-card" aria-label="Deductions">
                                    <h4>Deductions</h4>
                                    {salaryDeductions.map(d => (
                                      <div key={d.label} className="pay-breakdown-row">
                                        <span><i className="pay-dot" style={{ background: d.color }} />{d.label}</span>
                                        <strong>{formatCurrency(d.amount)}</strong>
                                      </div>
                                    ))}
                                    <div className="pay-breakdown-total">
                                      <span>Total Deductions</span>
                                      <strong>{formatCurrency(totalDeductions)}</strong>
                                    </div>
                                  </section>
                                </div>

                                <p className="pay-breakdown-note">* The salary breakdown is for informational purposes only.</p>
                              </div>
                            </div>
                          )
                        })()}

                        {/* ── TAX DOCUMENTS TAB ── */}
                        {activePayTab === 'Tax Documents' && (
                          <div className="pay-taxdocs-shell">
                            <div className="pay-taxdocs-banner">
                              <div className="pay-taxdocs-banner-left">
                                <span className="pay-taxdocs-icon">📋</span>
                                <div>
                                  <div className="pay-taxdocs-fy-label">Financial Year</div>
                                  <div className="pay-taxdocs-fy">2024-25 (01 Apr 2024 - 31 Mar 2025)</div>
                                </div>
                              </div>
                              <div className="pay-taxdocs-help">
                                <span>ℹ️</span>
                                <div>
                                  <strong>Need help?</strong>
                                  <p>For any tax related queries, contact your HR or check our Help Center.</p>
                                </div>
                              </div>
                            </div>

                            <section className="pay-table-card" aria-label="Tax documents">
                              <div className="pay-table-wrap">
                                <table className="pay-table">
                                  <thead>
                                    <tr>
                                      <th>Document</th>
                                      <th>Financial Year</th>
                                      <th>Description</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {taxDocumentSeedData.map(doc => (
                                      <tr key={doc.id}>
                                        <td><strong>{doc.name}</strong></td>
                                        <td>{doc.financialYear}</td>
                                        <td>{doc.description}</td>
                                        <td>
                                          <button type="button" className="pay-download-btn" onClick={() => {
                                            const csv = `Document,Financial Year,Description\n${doc.name},${doc.financialYear},${doc.description}`
                                            const blob = new Blob([csv], { type: 'text/csv' })
                                            const url = URL.createObjectURL(blob)
                                            const a = document.createElement('a')
                                            a.href = url
                                            a.download = `${doc.name.replace(/\s+/g, '-')}-${doc.financialYear}.csv`
                                            a.click()
                                            URL.revokeObjectURL(url)
                                          }}>
                                            ⬇️ Download
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </section>

                            <p className="pay-breakdown-note">You can download these documents for your tax filing purposes.</p>
                          </div>
                        )}

                        {/* ── BANK DETAILS TAB ── */}
                        {activePayTab === 'Bank Details' && (
                          <div className="pay-bank-shell">
                            <div className="pay-bank-grid">
                              {/* Salary Account Card */}
                              <section className="pay-card pay-bank-card" aria-label="Salary account">
                                <h3>Salary Account ({getCountryLabel(employmentCountryCode)})</h3>
                                <div className="pay-bank-inner">
                                  <div className="pay-bank-icon-wrap">
                                    <span className="pay-bank-icon">🏛️</span>
                                    {bankDetailsSeed.verified && (
                                      <span className="pay-bank-verified">✅ Verified</span>
                                    )}
                                  </div>
                                  <dl className="pay-bank-dl">
                                    {getBankDisplayFields(employmentCountryCode, bankDetailsSeed).map((row) => (
                                      <div key={row.label}>
                                        <dt>{row.label}</dt>
                                        <dd>
                                          {row.label === 'Bank Name' ? <strong>{row.value}</strong> : row.label === 'Account Number' ? maskAccountNumber(row.value) : row.value}
                                        </dd>
                                      </div>
                                    ))}
                                  </dl>
                                </div>
                              </section>

                              {/* Update Request Card */}
                              <section className="pay-card pay-bank-update-card" aria-label="Bank update request">
                                <h3>Need to update bank details?</h3>
                                <p className="pay-bank-update-desc">You can request for bank details update. The request will be reviewed and updated by HR.</p>
                                {bankUpdateRequestSent ? (
                                  <div className="pay-bank-success">
                                    ✅ Your bank update request has been submitted successfully. HR will review and update your details.
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-primary"
                                    id="request-bank-update-btn"
                                    onClick={() => { setBankUpdateModalOpen(true); setBankUpdateError(''); setBankUpdateSuccess(false) }}
                                  >
                                    Request Bank Update
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="pay-view-link"
                                  style={{ marginTop: '12px' }}
                                  onClick={() => { }}
                                >
                                  View Request Status ›
                                </button>
                              </section>
                            </div>

                            {/* Secondary Bank Account */}
                            <div className="pay-bank-grid" style={{ marginTop: '16px' }}>
                              <section className="pay-card pay-bank-card" aria-label="Secondary bank account" style={{ borderTop: '2px solid var(--line)', paddingTop: '16px' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  Secondary Account
                                  <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--muted)', background: 'var(--line)', borderRadius: '4px', padding: '2px 8px' }}>Optional</span>
                                </h3>
                                {secondaryBankDetailsSeed ? (
                                  <div className="pay-bank-inner">
                                    <div className="pay-bank-icon-wrap">
                                      <span className="pay-bank-icon">🏦</span>
                                      {secondaryBankDetailsSeed.verified && (
                                        <span className="pay-bank-verified">✅ Verified</span>
                                      )}
                                    </div>
                                    <dl className="pay-bank-dl">
                                      {getBankDisplayFields(employmentCountryCode, secondaryBankDetailsSeed).map((row) => (
                                        <div key={row.label}>
                                          <dt>{row.label}</dt>
                                          <dd>
                                            {row.label === 'Bank Name' ? <strong>{row.value}</strong> : row.label === 'Account Number' ? maskAccountNumber(row.value) : row.value}
                                          </dd>
                                        </div>
                                      ))}
                                    </dl>
                                  </div>
                                ) : (
                                  <div style={{ color: 'var(--muted)', fontSize: '13px', padding: '12px 0' }}>
                                    No secondary account linked.
                                    <br />
                                    <button
                                      type="button"
                                      className="btn btn-primary"
                                      style={{ marginTop: '12px', fontSize: '13px' }}
                                      onClick={() => { setBankUpdateModalOpen(true); setBankUpdateError(''); setBankUpdateSuccess(false) }}
                                    >
                                      + Add Secondary Account
                                    </button>
                                  </div>
                                )}
                              </section>
                            </div>

                            <p className="pay-breakdown-note">* Salary is credited to your above bank account every month.</p>

                            {/* Bank Update Modal */}
                            {bankUpdateModalOpen && (
                              <div className="pay-modal-backdrop" role="presentation" onClick={() => setBankUpdateModalOpen(false)}>
                                <div
                                  className="pay-modal"
                                  role="dialog"
                                  aria-modal="true"
                                  aria-label="Request bank details update"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <div className="pay-modal-head">
                                    <h3>Request Bank Details Update</h3>
                                    <button type="button" className="pay-modal-close" onClick={() => setBankUpdateModalOpen(false)}>✕</button>
                                  </div>
                                  <p className="pay-modal-sub">
                                    Fill in the new bank details below for {getCountryLabel(employmentCountryCode)}. HR will verify and update.
                                  </p>

                                  <BankDetailsFormFields
                                    countryCode={employmentCountryCode}
                                    form={bankUpdateForm}
                                    onChange={(updates) => setBankUpdateForm((prev) => ({ ...prev, ...updates }))}
                                    variant="pay"
                                  />

                                  {bankUpdateError && <p className="pay-form-error">{bankUpdateError}</p>}
                                  {bankUpdateSuccess && <p className="pay-form-success">{bankUpdateSuccess}</p>}

                                  <div className="pay-modal-actions">
                                    <button type="button" className="btn" onClick={() => setBankUpdateModalOpen(false)}>Cancel</button>
                                    <button
                                      type="button"
                                      className="btn btn-primary"
                                      id="submit-bank-update-btn"
                                      onClick={() => {
                                        setBankUpdateError('')
                                        const validationError = validateBankForm(bankUpdateForm, employmentCountryCode)
                                        if (validationError) {
                                          setBankUpdateError(validationError)
                                          return
                                        }
                                        setBankUpdateRequestSent(true)
                                        setBankUpdateModalOpen(false)
                                        setBankUpdateForm(EMPTY_BANK_FORM)
                                      }}
                                    >
                                      Submit Request
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── PAYMENT HISTORY TAB ── */}
                        {activePayTab === 'Payment History' && (() => {
                          const filtered = payHistoryStatusFilter === 'All'
                            ? paymentHistorySeed
                            : paymentHistorySeed.filter(p => p.status === payHistoryStatusFilter)
                          return (
                            <div className="pay-payhistory-shell">
                              <div className="pay-history-filters">
                                {(['All', 'Credited', 'Pending', 'Failed'] as const).map(status => (
                                  <button
                                    key={status}
                                    type="button"
                                    className={`pay-history-chip ${payHistoryStatusFilter === status ? 'active' : ''}`}
                                    onClick={() => setPayHistoryStatusFilter(status)}
                                  >
                                    {status}
                                  </button>
                                ))}
                              </div>

                              <section className="pay-table-card" aria-label="Payment history table">
                                <div className="pay-table-wrap">
                                  <table className="pay-table">
                                    <thead>
                                      <tr>
                                        <th>Month</th>
                                        <th>Pay Date</th>
                                        <th>Gross Salary</th>
                                        <th>Net Salary</th>
                                        <th>Payment Mode</th>
                                        <th>Transaction ID</th>
                                        <th>Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {filtered.map(ph => (
                                        <tr key={ph.id}>
                                          <td>{ph.month}</td>
                                          <td>{ph.payDate}</td>
                                          <td>{formatCurrency(ph.grossSalary)}</td>
                                          <td>{formatCurrency(ph.netSalary)}</td>
                                          <td>{ph.paymentMode}</td>
                                          <td><span className="pay-txn-id">{ph.transactionId}</span></td>
                                          <td><span className={`pay-history-status ${ph.status.toLowerCase()}`}>{ph.status}</span></td>
                                        </tr>
                                      ))}
                                      {filtered.length === 0 && (
                                        <tr><td colSpan={7} className="pay-empty-row">No payment history found.</td></tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </section>

                              <p className="pay-breakdown-note">* Payment history shows salary credits to your registered bank account.</p>
                            </div>
                          )
                        })()}
                      </div>
                    ) : currentModule === 'documents' ? (
                      <div className="doc-shell">
                        <div className="doc-top">
                          <div className="doc-tabs">
                            {documentTabs.map((tab) => (
                              <button
                                key={tab}
                                type="button"
                                className={`doc-tab ${activeDocTab === tab ? 'active' : ''}`}
                                onClick={() => {
                                  setActiveDocTab(tab)
                                  setDocSearchQuery('')
                                }}
                              >
                                {tab}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* ── MY DOCUMENTS (OVERVIEW) ── */}
                        {activeDocTab === 'My Documents' && (
                          <div className="doc-overview-tab">
                            <div className="doc-metrics-grid">
                              <div className="doc-metric-card">
                                <div className="doc-metric-icon blue">📄</div>
                                <div className="doc-metric-content">
                                  <span className="doc-metric-label">Total Documents</span>
                                  <strong className="doc-metric-value">24</strong>
                                  <span className="doc-metric-sub">All time</span>
                                </div>
                              </div>
                              <div className="doc-metric-card">
                                <div className="doc-metric-icon green">⬇️</div>
                                <div className="doc-metric-content">
                                  <span className="doc-metric-label">Downloaded This Month</span>
                                  <strong className="doc-metric-value">5</strong>
                                  <span className="doc-metric-sub">Files</span>
                                </div>
                              </div>
                              <div className="doc-metric-card">
                                <div className="doc-metric-icon orange">⬆️</div>
                                <div className="doc-metric-content">
                                  <span className="doc-metric-label">Pending Uploads</span>
                                  <strong className="doc-metric-value">2</strong>
                                  <span className="doc-metric-sub">Files</span>
                                </div>
                              </div>
                              <div className="doc-metric-card">
                                <div className="doc-metric-icon red">📅</div>
                                <div className="doc-metric-content">
                                  <span className="doc-metric-label">Expiring Soon</span>
                                  <strong className="doc-metric-value">1</strong>
                                  <span className="doc-metric-sub">Documents</span>
                                </div>
                              </div>
                            </div>

                          </div>
                        )}

                        {/* ── SHARED TABLE LAYOUT FOR OTHER TABS ── */}
                        {activeDocTab !== 'My Documents' && (
                          <div className="doc-table-shell">
                            <div className="doc-table-header">
                              <div className="doc-table-title">
                                <h3>{activeDocTab}</h3>
                                <p>
                                  {activeDocTab === 'Expiring Documents' && 'Documents that are expiring soon.'}
                                </p>
                              </div>

                              <div className="doc-table-controls">
                                <div className="doc-search-box">
                                  <input
                                    type="text"
                                    placeholder="Search document"
                                    value={docSearchQuery}
                                    onChange={(e) => { setDocSearchQuery(e.target.value); setDocCurrentPage(1); }}
                                  />
                                  <span className="doc-search-icon">🔍</span>
                                </div>

                                <select className="doc-filter-btn" value={docStatusFilter} onChange={(e) => { setDocStatusFilter(e.target.value); setDocCurrentPage(1); }} style={{ appearance: 'auto' }}>
                                  <option value="All">All Status</option>
                                  <option value="Available">Available</option>
                                  <option value="Verified">Verified</option>
                                  <option value="Pending Verification">Pending</option>
                                </select>
                              </div>
                            </div>

                            <div className="doc-table-card">
                              <div className="doc-table-wrap">
                                <table className="doc-table">
                                  <thead>
                                    <tr>
                                      <th>Document Name</th>
                                      <th>Description</th>
                                      <th>Status</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(() => {
                                      let source: PortalDocument[] = []
                                      if (activeDocTab === 'Expiring Documents') source = [uploadedDocsState[1]]

                                      let filtered = source.filter(d => d.name.toLowerCase().includes(docSearchQuery.toLowerCase()))

                                      // if (activeDocTab === 'Tax Documents') {
                                      //   filtered = filtered.filter(d => d.financialYear === taxYearFilter)
                                      // }

                                      if (docStatusFilter !== 'All') {
                                        filtered = filtered.filter(d => {
                                          if (docStatusFilter === 'Pending') return d.status === 'Pending Verification'
                                          return d.status === docStatusFilter
                                        })
                                      }

                                      const totalItems: number = filtered.length
                                      if (totalItems === 0) return 'Showing 0 documents'
                                      const startIndex = (docCurrentPage - 1) * DOCS_PER_PAGE
                                      const paginated = filtered.slice(startIndex, startIndex + DOCS_PER_PAGE)

                                      if (paginated.length === 0) {
                                        return <tr><td colSpan={6} className="doc-empty">No documents found.</td></tr>
                                      }

                                      return paginated.map((doc) => (
                                        <tr key={doc.id}>
                                          <td className="doc-cell-name">{doc.name}</td>
                                          <td>{doc.description}</td>
                                          <td>
                                            <span className={`doc-status ${doc.status === 'Available' || doc.status === 'Verified' ? 'success' : 'warning'}`}>
                                              {doc.status}
                                            </span>
                                          </td>
                                          <td>
                                            <div className="doc-table-actions">
                                              <button type="button" title="View" onClick={() => setDocPreview(doc)}>👁️</button>
                                              <button type="button" title="Download" onClick={() => handleDownloadDoc(doc)}>⬇️</button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))
                                    })()}
                                  </tbody>
                                </table>
                              </div>
                              <div className="doc-pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="doc-pagination-info">
                                  {(() => {
                                    let source: PortalDocument[] = []
                                    if (activeDocTab === 'Expiring Documents') source = [uploadedDocsState[1]]

                                    let filtered = source.filter(d => d.name.toLowerCase().includes(docSearchQuery.toLowerCase()))
                                    // if (activeDocTab === 'Tax Documents') {
                                    //   filtered = filtered.filter(d => d.financialYear === taxYearFilter)
                                    // }
                                    if (docStatusFilter !== 'All') {
                                      filtered = filtered.filter(d => d.status === (docStatusFilter === 'Pending' ? 'Pending Verification' : docStatusFilter))
                                    }

                                    const totalItems = filtered.length
                                    if (totalItems === 0) return 'Showing 0 documents'
                                    const start = (docCurrentPage - 1) * DOCS_PER_PAGE + 1
                                    const end = Math.min(docCurrentPage * DOCS_PER_PAGE, totalItems)
                                    return `Showing ${start} to ${end} of ${totalItems} documents`
                                  })()}
                                </span>
                                <div className="doc-pagination-controls" style={{ display: 'flex', gap: '8px' }}>
                                  <button type="button" className="btn" disabled={docCurrentPage === 1} onClick={() => setDocCurrentPage(p => Math.max(1, p - 1))}>Prev</button>
                                  <button type="button" className="btn" disabled={
                                    (() => {
                                      let source: PortalDocument[] = []
                                      if (activeDocTab === 'Expiring Documents') source = [uploadedDocsState[1]]

                                      let filtered = source.filter(d => d.name.toLowerCase().includes(docSearchQuery.toLowerCase()))
                                      // if (activeDocTab === 'Tax Documents') {
                                      //   filtered = filtered.filter(d => d.financialYear === taxYearFilter)
                                      // }
                                      if (docStatusFilter !== 'All') {
                                        filtered = filtered.filter(d => d.status === (docStatusFilter === 'Pending' ? 'Pending Verification' : docStatusFilter))
                                      }
                                      return docCurrentPage >= Math.ceil(filtered.length / DOCS_PER_PAGE)
                                    })()
                                  } onClick={() => setDocCurrentPage(p => p + 1)}>Next</button>
                                </div>
                              </div>
                            </div>

                            {/* {activeDocTab === 'Uploaded Documents' && (
                              <div className="doc-info-tip" style={{ marginTop: '14px' }}>
                                <span>ℹ️</span> You will be notified once your documents are verified by HR.
                              </div>
                            )} */}

                            {isDocUploadModalOpen && (
                              <div className="time-modal-backdrop" role="presentation" onClick={() => setIsDocUploadModalOpen(false)}>
                                <div className="time-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                                  <div className="time-modal-head">
                                    <h3>Upload Document</h3>
                                    <button type="button" onClick={() => setIsDocUploadModalOpen(false)}>✕</button>
                                  </div>
                                  <div className="time-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                                    {docUploadError && <div className="login-error">{docUploadError}</div>}
                                    <div className="login-group">
                                      <label>Document Name *</label>
                                      <input type="text" value={docUploadName} onChange={e => setDocUploadName(e.target.value)} placeholder="e.g. Passport Copy" />
                                    </div>
                                    <div className="login-group">
                                      <label>Category *</label>
                                      <select value={docUploadCategory} onChange={e => setDocUploadCategory(e.target.value)}>
                                        <option value="">Select Category</option>
                                        <option value="Identity Proof">Identity Proof</option>
                                        <option value="Address Proof">Address Proof</option>
                                        <option value="Work Authorization">Work Authorization</option>
                                        <option value="Qualification">Qualification</option>
                                        <option value="Tax Document">Tax Document</option>
                                        <option value="Bank Details">Bank Details</option>
                                        <option value="Other">Other</option>
                                      </select>
                                    </div>
                                    <div className="login-group">
                                      <label>File *</label>
                                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setDocUploadFile(e.target.files?.[0] || null)} />
                                    </div>
                                  </div>
                                  <div className="time-modal-foot">
                                    <button type="button" className="btn" onClick={() => setIsDocUploadModalOpen(false)}>Cancel</button>
                                    <button type="button" className="btn btn-primary" onClick={() => {
                                      if (!docUploadName || !docUploadCategory || !docUploadFile) {
                                        setDocUploadError('Please fill all required fields and select a file.')
                                        return
                                      }
                                      const newDoc: PortalDocument = {
                                        id: `ud-new-${Date.now()}`,
                                        name: docUploadName,
                                        category: docUploadCategory,
                                        status: 'Pending Verification',
                                        size: `${(docUploadFile.size / 1024).toFixed(0)} KB`,
                                        uploadedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                                        verifiedOn: '-'
                                      }
                                      setUploadedDocsState([newDoc, ...uploadedDocsState])
                                      setIsDocUploadModalOpen(false)
                                      setDocUploadName('')
                                      setDocUploadCategory('')
                                      setDocUploadFile(null)
                                      setDocUploadError('')
                                    }}>Upload</button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {docPreview && (
                              <div className="time-modal-backdrop" role="presentation" onClick={() => setDocPreview(null)}>
                                <div className="time-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                                  <div className="time-modal-head">
                                    <h3>{docPreview.name}</h3>
                                    <button type="button" onClick={() => setDocPreview(null)}>✕</button>
                                  </div>
                                  <div className="time-modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '32px' }}>
                                    <span style={{ fontSize: '48px' }}>📄</span>
                                    <p style={{ textAlign: 'center', color: 'var(--muted)', margin: 0 }}>This is a preview of the document.<br />(Preview not available in demo)</p>
                                    <div style={{ marginTop: '16px', display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--muted)' }}>
                                      <span>Size: {docPreview.size}</span>
                                      <span>|</span>
                                      <span>Status: {docPreview.status}</span>
                                    </div>
                                  </div>
                                  <div className="time-modal-foot">
                                    <button type="button" className="btn" onClick={() => setDocPreview(null)}>Close</button>
                                    <button type="button" className="btn btn-primary" onClick={() => {
                                      setDocPreview(null)
                                      handleDownloadDoc(docPreview)
                                    }}>Download</button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {docNotification && (
                              <div style={{
                                position: 'fixed',
                                bottom: '24px',
                                right: '24px',
                                background: '#2ecc71',
                                color: '#fff',
                                padding: '12px 24px',
                                border: '1px solid #1a4d2e',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                fontWeight: '700',
                                zIndex: 1000,
                              }}>
                                {docNotification}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : currentModule === 'leave' ? (
                      null
                    ) : currentModule === 'profile' ? (
                      <div className="profile-shell">
                        <div className="profile-top">
                          <div className="profile-tabs" role="tablist" aria-label="Profile tabs">
                            {profileTabs.map((tab) => (
                              <button
                                key={tab}
                                type="button"
                                className={`profile-tab ${activeProfileTab === tab ? 'active' : ''}`}
                                onClick={() => setActiveProfileTab(tab)}
                              >
                                {tab}
                              </button>
                            ))}
                          </div>
                        </div>

                        {activeProfileTab === 'Overview' && (
                          <div className="profile-overview-shell">
                            <div className="profile-overview-grid">
                              {/* Left Card: Summary Card */}
                              <div className="profile-card profile-summary-card">
                                <div className="profile-avatar-large">
                                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80" alt="John Doe" />
                                </div>
                                <h2 className="profile-name">{previewRoleMode === 'employee' ? currentEmployeeInfo.name : `${personalInfo.firstName} ${personalInfo.lastName}`}</h2>
                                <p className="profile-title">{previewRoleMode === 'employee' ? currentEmployeeInfo.role : 'Software Engineer'}</p>
                                <p className="profile-emp-id">{previewRoleMode === 'employee' ? currentEmployeeInfo.id : 'EMP001245'}</p>
                                <span className="profile-status-badge active">Active</span>
                              </div>

                              {/* Middle Card: Employee Snapshot */}
                              <div className="profile-card profile-info-card">
                                <h3>Employee Snapshot</h3>
                                <div className="profile-details-list">
                                  <div className="profile-detail-row">
                                    <span className="label">Department</span>
                                    <span className="value">{previewRoleMode === 'employee' ? currentEmployeeInfo.paygroup : 'Engineering'}</span>
                                  </div>
                                  <div className="profile-detail-row">
                                    <span className="label">Manager</span>
                                    <span className="value">Sarah Johnson</span>
                                  </div>
                                  <div className="profile-detail-row">
                                    <span className="label">Location</span>
                                    <span className="value">Bangalore, India</span>
                                  </div>
                                  <div className="profile-detail-row">
                                    <span className="label">Employment Type</span>
                                    <span className="value">Full Time</span>
                                  </div>
                                  <div className="profile-detail-row">
                                    <span className="label">Joining Date</span>
                                    <span className="value">15 Mar 2023</span>
                                  </div>
                                  <div className="profile-detail-row">
                                    <span className="label">Work Email</span>
                                    <span className="value">{contactDetails.workEmail}</span>
                                  </div>
                                  <div className="profile-detail-row">
                                    <span className="label">Work Phone</span>
                                    <span className="value">{contactDetails.mobileNumber}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right Card: Employment Details */}
                              <div className="profile-card profile-info-card">
                                <h3>Employment Details</h3>
                                <div className="profile-details-list">
                                  <div className="profile-detail-row">
                                    <span className="label">Employment Country</span>
                                    <span className="value">🇮🇳 India</span>
                                  </div>
                                  <div className="profile-detail-row">
                                    <span className="label">Employer of Record</span>
                                    <span className="value">Pynk India Pvt Ltd</span>
                                  </div>
                                  <div className="profile-detail-row">
                                    <span className="label">Client Company</span>
                                    <span className="value">ABC Technologies</span>
                                  </div>
                                  <div className="profile-detail-row">
                                    <span className="label">Payroll Entity</span>
                                    <span className="value">Pynk India Pvt Ltd</span>
                                  </div>
                                  <div className="profile-detail-row">
                                    <span className="label">Payroll Cycle</span>
                                    <span className="value">Monthly</span>
                                  </div>
                                  <div className="profile-detail-row">
                                    <span className="label">Next Payday</span>
                                    <span className="value">31 Jul 2025</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Quick Actions Row */}
                            <div className="quick-actions-section">
                              <h3>Quick Actions</h3>
                              <div className="quick-actions-grid">
                                <button type="button" className="quick-action-tile" onClick={() => setActiveProfileTab('Contact')}>
                                  <div className="tile-icon-wrapper">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                    </svg>
                                  </div>
                                  <div className="tile-content">
                                    <span className="tile-title">Update Contact</span>
                                    <span className="tile-desc">Update your contact details</span>
                                  </div>
                                </button>

                                <button type="button" className="quick-action-tile" onClick={() => setActiveProfileTab('Bank')}>
                                  <div className="tile-icon-wrapper">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="2" y="22" width="20" height="2" />
                                      <path d="M5 22V10M19 22V10M12 22V10M2 10l10-8 10 8" />
                                    </svg>
                                  </div>
                                  <div className="tile-content">
                                    <span className="tile-title">Request Bank Change</span>
                                    <span className="tile-desc">Submit bank detail change</span>
                                  </div>
                                </button>

                                <button type="button" className="quick-action-tile" onClick={() => {
                                  setDocNotification("Downloading ID Card...");
                                  setTimeout(() => setDocNotification(null), 3000);
                                }}>
                                  <div className="tile-icon-wrapper">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="3" y="4" width="18" height="16" rx="2" ry="2" />
                                      <line x1="7" y1="8" x2="17" y2="8" />
                                      <line x1="7" y1="12" x2="17" y2="12" />
                                      <line x1="7" y1="16" x2="12" y2="16" />
                                    </svg>
                                  </div>
                                  <div className="tile-content">
                                    <span className="tile-title">Download ID Card</span>
                                    <span className="tile-desc">View and download ID card</span>
                                  </div>
                                </button>

                                <button type="button" className="quick-action-tile" onClick={() => setCurrentModule('documents')}>
                                  <div className="tile-icon-wrapper">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                      <polyline points="14 2 14 8 20 8" />
                                      <line x1="16" y1="13" x2="8" y2="13" />
                                      <line x1="16" y1="17" x2="8" y2="17" />
                                    </svg>
                                  </div>
                                  <div className="tile-content">
                                    <span className="tile-title">View Documents</span>
                                    <span className="tile-desc">Access your documents</span>
                                  </div>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeProfileTab === 'Personal' && (
                          <div className="profile-personal-shell">
                            <div className="profile-personal-grid">
                              {/* Personal Information */}
                              <div className="profile-card profile-personal-info-card">
                                <h3>Personal Information</h3>
                                <div className="personal-form-grid">
                                  <label>
                                    First Name
                                    <input type="text" value={personalInfo.firstName} disabled className="disabled-input" />
                                  </label>
                                  <label>
                                    Middle Name
                                    <input type="text" value={personalInfo.middleName} disabled className="disabled-input" />
                                  </label>
                                  <label>
                                    Last Name
                                    <input type="text" value={personalInfo.lastName} disabled className="disabled-input" />
                                  </label>
                                  <label>
                                    Preferred Name
                                    <input type="text" value={personalInfo.preferredName} disabled className="disabled-input" />
                                  </label>
                                  <label className="with-icon">
                                    Date of Birth
                                    <div className="input-with-icon-wrapper">
                                      <input type="text" value="14 May 1992" disabled className="disabled-input" />
                                      <span className="input-inner-icon">📅</span>
                                    </div>
                                  </label>
                                  <label className="with-icon">
                                    Gender
                                    <div className="input-with-icon-wrapper">
                                      <input type="text" value={personalInfo.gender} disabled className="disabled-input" />
                                      <span className="input-inner-icon">▼</span>
                                    </div>
                                  </label>
                                  <label className="with-icon">
                                    Marital Status
                                    <div className="input-with-icon-wrapper">
                                      <input type="text" value={personalInfo.maritalStatus} disabled className="disabled-input" />
                                      <span className="input-inner-icon">▼</span>
                                    </div>
                                  </label>
                                  <label className="with-icon">
                                    Nationality
                                    <div className="input-with-icon-wrapper">
                                      <input type="text" value={personalInfo.nationality} disabled className="disabled-input" />
                                      <span className="input-inner-icon">▼</span>
                                    </div>
                                  </label>
                                  <label>
                                    PAN Number
                                    <input type="text" value={personalInfo.panNumber} disabled className="disabled-input" />
                                  </label>
                                  <label>
                                    Aadhaar Number
                                    <input type="text" value={personalInfo.aadhaarNumber} disabled className="disabled-input" />
                                  </label>
                                </div>
                              </div>

                              <div className="profile-personal-sidebar">
                                {/* Request Change Card */}
                                <div className="profile-card request-change-card">
                                  <h3>Request Change</h3>
                                  <div className="request-change-content">
                                    <div className="request-change-illustration">
                                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#aa3bff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                        <path d="M12 11h.01" />
                                      </svg>
                                    </div>
                                    <p>To update your personal information, please raise a request.</p>
                                    <button type="button" className="btn btn-primary" onClick={handleOpenRequestChange}>
                                      Request Change
                                    </button>
                                  </div>
                                </div>

                                {/* Recent Requests Card */}
                                <div className="profile-card recent-requests-card">
                                  <h3>Recent Requests</h3>
                                  <div className="requests-list">
                                    {profileChangeRequests.map((req) => (
                                      <div key={req.id} className="request-item">
                                        <div className="request-info">
                                          <span className="request-type">{req.type}</span>
                                          <span className="request-date">Requested on {req.requestedDate}</span>
                                        </div>
                                        <span className={`request-status-pill ${req.status.toLowerCase()}`}>
                                          {req.status}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeProfileTab === 'Contact' && (
                          <div className="profile-contact-shell">
                            <p className="contact-intro">You can edit your contact information.</p>

                            {contactEditSuccess && <p className="submit-success" style={{ marginBottom: '14px' }}>Contact details updated successfully!</p>}
                            {contactEditError && <p className="submit-error" style={{ marginBottom: '14px' }}>{contactEditError}</p>}

                            <div className="profile-card contact-card">
                              <div className="contact-card-head">
                                <h3>Contact Details</h3>
                                {!isEditingContact ? (
                                  <button type="button" className="btn edit-btn" onClick={handleEditContactClick}>
                                    <span style={{ marginRight: '6px' }}>✏️</span> Edit
                                  </button>
                                ) : (
                                  <div className="contact-edit-actions">
                                    <button type="button" className="btn btn-primary" onClick={handleSaveContact}>
                                      Save
                                    </button>
                                    <button type="button" className="btn" onClick={() => setIsEditingContact(false)}>
                                      Cancel
                                    </button>
                                  </div>
                                )}
                              </div>

                              {!isEditingContact ? (
                                <div className="contact-details-grid">
                                  <div className="contact-column">
                                    <div className="contact-field">
                                      <span className="label">Work Email</span>
                                      <div className="value-with-badge">
                                        <span className="value">{contactDetails.workEmail}</span>
                                        <span className="verified-badge">Verified</span>
                                      </div>
                                    </div>
                                    <div className="contact-field">
                                      <span className="label">Personal Email</span>
                                      <div className="value-with-badge">
                                        <span className="value">{contactDetails.personalEmail}</span>
                                        <span className="verified-badge">Verified</span>
                                      </div>
                                    </div>
                                    <div className="contact-field">
                                      <span className="label">Mobile Number</span>
                                      <div className="value-with-badge">
                                        <span className="value">{contactDetails.mobileNumber}</span>
                                        <span className="verified-badge">Verified</span>
                                      </div>
                                    </div>
                                    <div className="contact-field">
                                      <span className="label">Alternate Number</span>
                                      <span className="value">{contactDetails.alternateNumber || '-'}</span>
                                    </div>
                                  </div>

                                  <div className="contact-column">
                                    <div className="contact-field">
                                      <span className="label">Address</span>
                                      <span className="value">{contactDetails.address}</span>
                                    </div>
                                    <div className="contact-field">
                                      <span className="label">City</span>
                                      <span className="value">{contactDetails.city}</span>
                                    </div>
                                    <div className="contact-field">
                                      <span className="label">State</span>
                                      <span className="value">{contactDetails.state}</span>
                                    </div>
                                    <div className="contact-field">
                                      <span className="label">Country</span>
                                      <span className="value">{contactDetails.country}</span>
                                    </div>
                                    <div className="contact-field">
                                      <span className="label">PIN Code</span>
                                      <span className="value">{contactDetails.pinCode}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="contact-edit-grid">
                                  <div className="contact-column">
                                    <label>
                                      Work Email (Read Only)
                                      <input type="text" value={contactDetails.workEmail} disabled className="disabled-input" />
                                    </label>
                                    <label>
                                      Personal Email
                                      <input
                                        type="email"
                                        value={contactEditForm.personalEmail}
                                        onChange={(e) => setContactEditForm({ ...contactEditForm, personalEmail: e.target.value })}
                                      />
                                    </label>
                                    <label>
                                      Mobile Number
                                      <input
                                        type="text"
                                        value={contactEditForm.mobileNumber}
                                        onChange={(e) => setContactEditForm({ ...contactEditForm, mobileNumber: e.target.value })}
                                      />
                                    </label>
                                    <label>
                                      Alternate Number
                                      <input
                                        type="text"
                                        value={contactEditForm.alternateNumber}
                                        onChange={(e) => setContactEditForm({ ...contactEditForm, alternateNumber: e.target.value })}
                                      />
                                    </label>
                                  </div>
                                  <div className="contact-column">
                                    <label>
                                      Address
                                      <input
                                        type="text"
                                        value={contactEditForm.address}
                                        onChange={(e) => setContactEditForm({ ...contactEditForm, address: e.target.value })}
                                      />
                                    </label>
                                    <label>
                                      City
                                      <input
                                        type="text"
                                        value={contactEditForm.city}
                                        onChange={(e) => setContactEditForm({ ...contactEditForm, city: e.target.value })}
                                      />
                                    </label>
                                    <label>
                                      State
                                      <input
                                        type="text"
                                        value={contactEditForm.state}
                                        onChange={(e) => setContactEditForm({ ...contactEditForm, state: e.target.value })}
                                      />
                                    </label>
                                    <label>
                                      Country
                                      <input
                                        type="text"
                                        value={contactEditForm.country}
                                        onChange={(e) => setContactEditForm({ ...contactEditForm, country: e.target.value })}
                                      />
                                    </label>
                                    <label>
                                      PIN Code
                                      <input
                                        type="text"
                                        value={contactEditForm.pinCode}
                                        onChange={(e) => setContactEditForm({ ...contactEditForm, pinCode: e.target.value })}
                                      />
                                    </label>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {activeProfileTab === 'Employment' && (
                          <div className="profile-employment-shell">
                            <div className="profile-card employment-card">
                              <h3>Employment Information</h3>
                              <div className="employment-details-grid">
                                <div className="employment-column">
                                  <div className="employment-field">
                                    <span className="label">Employee ID</span>
                                    <span className="value font-mono">EMP001245</span>
                                  </div>
                                  <div className="employment-field">
                                    <span className="label">Job Title</span>
                                    <span className="value">Software Engineer</span>
                                  </div>
                                  <div className="employment-field">
                                    <span className="label">Department</span>
                                    <span className="value">Engineering</span>
                                  </div>
                                  <div className="employment-field">
                                    <span className="label">Sub Department</span>
                                    <span className="value">Product Development</span>
                                  </div>
                                  <div className="employment-field">
                                    <span className="label">Manager</span>
                                    <span className="value">Sarah Johnson</span>
                                  </div>
                                  <div className="employment-field">
                                    <span className="label">Work Location</span>
                                    <span className="value">Bangalore, India</span>
                                  </div>
                                </div>

                                <div className="employment-column">
                                  <div className="employment-field">
                                    <span className="label">Employment Type</span>
                                    <span className="value">Full Time</span>
                                  </div>
                                  <div className="employment-field">
                                    <span className="label">Joining Date</span>
                                    <span className="value">15 Mar 2023</span>
                                  </div>
                                  <div className="employment-field">
                                    <span className="label">Confirmation Date</span>
                                    <span className="value">15 Sep 2023</span>
                                  </div>
                                  <div className="employment-field">
                                    <span className="label">Employee Status</span>
                                    <span className="verified-badge font-normal active" style={{ display: 'inline-flex' }}>Active</span>
                                  </div>
                                  <div className="employment-field">
                                    <span className="label">Notice Period</span>
                                    <span className="value">60 Days</span>
                                  </div>
                                  <div className="employment-field">
                                    <span className="label">Payroll Entity</span>
                                    <span className="value">Pynk India Pvt Ltd</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="employment-info-banner">
                              <span className="banner-icon">ℹ️</span>
                              <span className="banner-text">For any changes in employment information, please contact your HR.</span>
                            </div>
                          </div>
                        )}

                        {activeProfileTab === 'Emergency' && (
                          <div className="profile-emergency-shell">
                            <div className="emergency-actions-row">
                              <button type="button" className="btn btn-primary" onClick={handleOpenAddEmergency}>
                                + Add Contact
                              </button>
                            </div>

                            <div className="profile-card emergency-card">
                              <table className="emergency-contacts-table">
                                <thead>
                                  <tr>
                                    <th>Contact Name</th>
                                    <th>Relationship</th>
                                    <th>Phone Number</th>
                                    <th>Email Address</th>
                                    <th>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {emergencyContacts.map((contact) => (
                                    <tr key={contact.id}>
                                      <td>{contact.name}</td>
                                      <td>{contact.relationship}</td>
                                      <td>{contact.phone}</td>
                                      <td>{contact.email}</td>
                                      <td className="emergency-table-actions">
                                        <button type="button" className="action-btn edit" onClick={() => handleOpenEditEmergency(contact)} title="Edit">
                                          ✏️
                                        </button>
                                        <button type="button" className="action-btn delete" onClick={() => handleDeleteEmergencyContact(contact.id)} title="Delete">
                                          🗑️
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                  {emergencyContacts.length === 0 && (
                                    <tr>
                                      <td colSpan={5} className="empty-contacts-row">No emergency contacts listed.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>

                            <div className="employment-info-banner">
                              <span className="banner-icon">ℹ️</span>
                              <span className="banner-text">Please ensure your emergency contacts are always up to date.</span>
                            </div>
                          </div>
                        )}

                        {/* Bank Details */}
                        {activeProfileTab === 'Bank' && (
                          <div className="profile-personal-shell">
                            <div className="profile-personal-grid">
                              {/* Salary Account */}
                              <div className="profile-card profile-personal-info-card">
                                <h3>Salary Account ({getCountryLabel(employmentCountryCode)})</h3>
                                <div className="contact-details-grid" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '20px', alignItems: 'center' }}>
                                  <div style={{ background: 'rgba(90, 125, 255, 0.1)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <span style={{ fontSize: '48px' }}>🏦</span>
                                  </div>
                                  <div className="contact-details-grid">
                                    {getBankDisplayFields(employmentCountryCode, bankDetails).map((row) => (
                                      <div key={row.label} className="contact-field">
                                        <span className="label">{row.label}</span>
                                        {row.label === 'Bank Name' ? (
                                          <div className="value-with-badge">
                                            <span className="value">{row.value}</span>
                                            <span className="verified-badge">Verified</span>
                                          </div>
                                        ) : (
                                          <span className="value">{row.value}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="profile-personal-sidebar">
                                {/* Need to update bank details? */}
                                <div className="profile-card request-change-card">
                                  <h3>Need to update bank details?</h3>
                                  <div className="request-change-content">
                                    <p>Submit a request to update your bank account details. The request will be reviewed and approved by HR.</p>
                                    <button type="button" className="btn btn-primary" onClick={handleOpenBankChange}>
                                      Request Bank Change
                                    </button>
                                    <button type="button" className="btn-link" style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '13px', fontWeight: '600', marginTop: '8px' }} onClick={() => setActiveProfileTab('Change Requests')}>
                                      View Request Status &gt;
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Secondary Bank Account */}
                            <div className="profile-personal-grid" style={{ marginTop: '16px' }}>
                              <div className="profile-card profile-personal-info-card">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  Secondary Account
                                  <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--muted)', background: 'var(--line)', borderRadius: '4px', padding: '2px 8px' }}>Optional</span>
                                </h3>
                                {secondaryBankDetailsSeed ? (
                                  <div className="contact-details-grid" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '20px', alignItems: 'center' }}>
                                    <div style={{ background: 'rgba(90, 125, 255, 0.1)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                      <span style={{ fontSize: '48px' }}>🏦</span>
                                    </div>
                                    <div className="contact-details-grid">
                                      {getBankDisplayFields(employmentCountryCode, secondaryBankDetailsSeed).map((row) => (
                                        <div key={row.label} className="contact-field">
                                          <span className="label">{row.label}</span>
                                          {row.label === 'Bank Name' ? (
                                            <div className="value-with-badge">
                                              <span className="value">{row.value}</span>
                                              {secondaryBankDetailsSeed.verified && <span className="verified-badge">Verified</span>}
                                            </div>
                                          ) : (
                                            <span className="value">{row.value}</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ color: 'var(--muted)', fontSize: '13px', padding: '12px 0' }}>
                                    No secondary account linked.
                                    <br />
                                    <button
                                      type="button"
                                      className="btn btn-primary"
                                      style={{ marginTop: '12px', fontSize: '13px' }}
                                      onClick={handleOpenBankChange}
                                    >
                                      + Add Secondary Account
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Local Recent Requests */}
                            <div className="profile-card" style={{ marginTop: '16px' }}>
                              <h3>Recent Requests</h3>
                              <div className="requests-list">
                                {profileChangeRequests.filter(req => req.type.includes('Bank') || req.type.includes('Branch') || req.type.includes('Account')).map((req) => (
                                  <div key={req.id} className="request-item">
                                    <div className="request-info">
                                      <span className="request-type">{req.type}</span>
                                      <span className="request-date">Requested on {req.requestedDate}</span>
                                    </div>
                                    <span className={`request-status-pill ${req.status.toLowerCase()}`}>
                                      {req.status}
                                    </span>
                                  </div>
                                ))}
                                {profileChangeRequests.filter(req => req.type.includes('Bank') || req.type.includes('Branch') || req.type.includes('Account')).length === 0 && (
                                  <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '10px 0 0' }}>No recent bank change requests.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Documents & IDs */}
                        {activeProfileTab === 'Documents & IDs' && (
                          <div className="profile-emergency-shell">
                            <div className="profile-card emergency-card">
                              <h3>Identity Documents</h3>
                              <table className="emergency-contacts-table">
                                <thead>
                                  <tr>
                                    <th>Document</th>
                                    <th>Number</th>
                                    <th>Issue Date</th>
                                    <th>Expiry Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {identityDocs.map((doc) => (
                                    <tr key={doc.id}>
                                      <td style={{ fontWeight: '600' }}>{doc.name}</td>
                                      <td>{doc.number}</td>
                                      <td>{doc.issueDate}</td>
                                      <td>{doc.expiryDate}</td>
                                      <td>
                                        <span className="verified-badge" style={{ display: 'inline-block' }}>{doc.status}</span>
                                      </td>
                                      <td>
                                        <button type="button" className="action-btn" title="View Document" onClick={() => alert(`Previewing ${doc.name} (${doc.number})`)}>
                                          👁️
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <div className="employment-info-banner">
                              <span className="banner-icon">ℹ️</span>
                              <span className="banner-text">
                                To upload or update documents, please go to{' '}
                                <button type="button" style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer', fontWeight: '600' }} onClick={() => setCurrentModule('documents')}>
                                  Documents section
                                </button>.
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Skills */}
                        {activeProfileTab === 'Skills' && (
                          <div className="profile-emergency-shell">
                            <div className="profile-top" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                              <div className="profile-tabs" role="tablist" aria-label="Skills sub tabs" style={{ gap: '8px' }}>
                                {(['Skills', 'Education', 'Certifications', 'Languages'] as const).map((subTab) => (
                                  <button
                                    key={subTab}
                                    type="button"
                                    className={`profile-tab ${activeSkillsSubTab === subTab ? 'active' : ''}`}
                                    style={{ padding: '6px 12px', fontSize: '13px' }}
                                    onClick={() => setActiveSkillsSubTab(subTab)}
                                  >
                                    {subTab}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {activeSkillsSubTab === 'Skills' && (
                              <div className="profile-card emergency-card" style={{ marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                  <h3 style={{ margin: 0 }}>Skills</h3>
                                  <button type="button" className="btn btn-primary" onClick={handleOpenAddSkill}>
                                    + Add Skill
                                  </button>
                                </div>
                                <table className="emergency-contacts-table">
                                  <thead>
                                    <tr>
                                      <th>Skill Name</th>
                                      <th>Proficiency</th>
                                      <th>Years of Experience</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {profileSkills.map((skill) => (
                                      <tr key={skill.id}>
                                        <td style={{ fontWeight: '600' }}>{skill.name}</td>
                                        <td>{skill.proficiency}</td>
                                        <td>{skill.experience} yrs</td>
                                        <td className="emergency-table-actions">
                                          <button type="button" className="action-btn edit" title="Edit Skill" onClick={() => handleOpenEditSkill(skill)}>
                                            ✏️
                                          </button>
                                          <button type="button" className="action-btn delete" title="Delete Skill" onClick={() => handleDeleteSkill(skill.id)}>
                                            🗑️
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                    {profileSkills.length === 0 && (
                                      <tr>
                                        <td colSpan={4} className="empty-contacts-row">No skills added yet.</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {activeSkillsSubTab === 'Education' && (
                              <div className="profile-card emergency-card" style={{ marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                  <h3 style={{ margin: 0 }}>Education</h3>
                                  <button type="button" className="btn btn-primary" onClick={handleOpenAddEducation}>
                                    + Add Education
                                  </button>
                                </div>
                                <table className="emergency-contacts-table">
                                  <thead>
                                    <tr>
                                      <th>Degree</th>
                                      <th>Institution</th>
                                      <th>Field of Study</th>
                                      <th>Year of Passing</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {profileEducation.map((edu) => (
                                      <tr key={edu.id}>
                                        <td style={{ fontWeight: '600' }}>{edu.degree}</td>
                                        <td>{edu.institution}</td>
                                        <td>{edu.fieldOfStudy}</td>
                                        <td>{edu.yearOfPassing}</td>
                                        <td className="emergency-table-actions">
                                          <button type="button" className="action-btn edit" title="Edit Education" onClick={() => handleOpenEditEducation(edu)}>
                                            ✏️
                                          </button>
                                          <button type="button" className="action-btn delete" title="Delete Education" onClick={() => handleDeleteEducation(edu.id)}>
                                            🗑️
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                    {profileEducation.length === 0 && (
                                      <tr>
                                        <td colSpan={5} className="empty-contacts-row">No education records added yet.</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {activeSkillsSubTab === 'Certifications' && (
                              <div className="profile-card emergency-card" style={{ marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                  <h3 style={{ margin: 0 }}>Certifications</h3>
                                  <button type="button" className="btn btn-primary" onClick={handleOpenAddCertification}>
                                    + Add Certification
                                  </button>
                                </div>
                                <table className="emergency-contacts-table">
                                  <thead>
                                    <tr>
                                      <th>Certificate Name</th>
                                      <th>Issuing Organization</th>
                                      <th>Issue Date</th>
                                      <th>Expiry Date</th>
                                      <th>Credential ID</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {profileCertifications.map((cert) => (
                                      <tr key={cert.id}>
                                        <td style={{ fontWeight: '600' }}>{cert.name}</td>
                                        <td>{cert.issuingOrg}</td>
                                        <td>{cert.issueDate}</td>
                                        <td>{cert.expiryDate}</td>
                                        <td className="font-mono">{cert.credentialId}</td>
                                        <td className="emergency-table-actions">
                                          <button type="button" className="action-btn edit" title="Edit Certification" onClick={() => handleOpenEditCertification(cert)}>
                                            ✏️
                                          </button>
                                          <button type="button" className="action-btn delete" title="Delete Certification" onClick={() => handleDeleteCertification(cert.id)}>
                                            🗑️
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                    {profileCertifications.length === 0 && (
                                      <tr>
                                        <td colSpan={6} className="empty-contacts-row">No certifications added yet.</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {activeSkillsSubTab === 'Languages' && (
                              <div className="profile-card emergency-card" style={{ marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                  <h3 style={{ margin: 0 }}>Languages</h3>
                                  <button type="button" className="btn btn-primary" onClick={handleOpenAddLanguage}>
                                    + Add Language
                                  </button>
                                </div>
                                <table className="emergency-contacts-table">
                                  <thead>
                                    <tr>
                                      <th>Language</th>
                                      <th>Proficiency</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {profileLanguages.map((lang) => (
                                      <tr key={lang.id}>
                                        <td style={{ fontWeight: '600' }}>{lang.name}</td>
                                        <td>{lang.proficiency}</td>
                                        <td className="emergency-table-actions">
                                          <button type="button" className="action-btn edit" title="Edit Language" onClick={() => handleOpenEditLanguage(lang)}>
                                            ✏️
                                          </button>
                                          <button type="button" className="action-btn delete" title="Delete Language" onClick={() => handleDeleteLanguage(lang.id)}>
                                            🗑️
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                    {profileLanguages.length === 0 && (
                                      <tr>
                                        <td colSpan={3} className="empty-contacts-row">No languages added yet.</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            <div className="employment-info-banner">
                              <span className="banner-icon">ℹ️</span>
                              <span className="banner-text">Keep your profile details updated to help us find better internal roles and opportunities.</span>
                            </div>
                          </div>
                        )}

                        {/* Preferences */}
                        {activeProfileTab === 'Preferences' && (
                          <div className="profile-personal-shell">
                            {preferencesSaveSuccess && (
                              <p className="submit-success" style={{ marginBottom: '14px' }}>
                                Preferences saved successfully!
                              </p>
                            )}
                            <div className="profile-personal-grid">
                              <div className="profile-card profile-personal-info-card">
                                <h3>System Preferences</h3>
                                <div className="personal-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                  <label>
                                    Preferred Language
                                    <select
                                      value={profilePreferences.preferredLanguage}
                                      onChange={(e) => setProfilePreferences({ ...profilePreferences, preferredLanguage: e.target.value })}
                                      style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                                    >
                                      <option value="English">English</option>
                                      <option value="Spanish">Spanish</option>
                                      <option value="French">French</option>
                                      <option value="German">German</option>
                                    </select>
                                  </label>

                                  <label>
                                    Time Zone
                                    <select
                                      value={profilePreferences.timeZone}
                                      onChange={(e) => setProfilePreferences({ ...profilePreferences, timeZone: e.target.value })}
                                      style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                                    >
                                      <option value="(GMT+05:30) Asia/Kolkata">(GMT+05:30) Asia/Kolkata</option>
                                      <option value="(GMT-05:00) EST">(GMT-05:00) EST</option>
                                      <option value="(GMT+00:00) UTC">(GMT+00:00) UTC</option>
                                    </select>
                                  </label>

                                  <label>
                                    Date Format
                                    <select
                                      value={profilePreferences.dateFormat}
                                      onChange={(e) => setProfilePreferences({ ...profilePreferences, dateFormat: e.target.value })}
                                      style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                                    >
                                      <option value="DD MMM YYYY">DD MMM YYYY</option>
                                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                    </select>
                                  </label>

                                  <label>
                                    Time Format
                                    <select
                                      value={profilePreferences.timeFormat}
                                      onChange={(e) => setProfilePreferences({ ...profilePreferences, timeFormat: e.target.value })}
                                      style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                                    >
                                      <option value="12 Hour">12 Hour</option>
                                      <option value="24 Hour">24 Hour</option>
                                    </select>
                                  </label>
                                </div>
                              </div>

                              <div className="profile-personal-sidebar">
                                <div className="profile-card">
                                  <h3>Email Notifications</h3>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', marginTop: '10px' }}>
                                    <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                                      <input
                                        type="checkbox"
                                        checked={profilePreferences.emailNotifications.leaveAttendance}
                                        onChange={(e) => setProfilePreferences({
                                          ...profilePreferences,
                                          emailNotifications: { ...profilePreferences.emailNotifications, leaveAttendance: e.target.checked }
                                        })}
                                      />
                                      Leave & Attendance Updates
                                    </label>

                                    <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                                      <input
                                        type="checkbox"
                                        checked={profilePreferences.emailNotifications.payslipPayroll}
                                        onChange={(e) => setProfilePreferences({
                                          ...profilePreferences,
                                          emailNotifications: { ...profilePreferences.emailNotifications, payslipPayroll: e.target.checked }
                                        })}
                                      />
                                      Payslip & Payroll Updates
                                    </label>

                                    <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                                      <input
                                        type="checkbox"
                                        checked={profilePreferences.emailNotifications.companyAnnouncements}
                                        onChange={(e) => setProfilePreferences({
                                          ...profilePreferences,
                                          emailNotifications: { ...profilePreferences.emailNotifications, companyAnnouncements: e.target.checked }
                                        })}
                                      />
                                      Company Announcements
                                    </label>

                                    <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                                      <input
                                        type="checkbox"
                                        checked={profilePreferences.emailNotifications.policyUpdates}
                                        onChange={(e) => setProfilePreferences({
                                          ...profilePreferences,
                                          emailNotifications: { ...profilePreferences.emailNotifications, policyUpdates: e.target.checked }
                                        })}
                                      />
                                      Policy Updates
                                    </label>
                                  </div>
                                </div>

                                <div className="profile-card" style={{ marginTop: '12px' }}>
                                  <h3>Theme</h3>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', marginTop: '10px' }}>
                                    {(['Light', 'Dark', 'System Default'] as const).map((t) => (
                                      <label key={t} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                                        <input
                                          type="radio"
                                          name="theme"
                                          checked={profilePreferences.theme === t}
                                          onChange={() => setProfilePreferences({ ...profilePreferences, theme: t })}
                                        />
                                        {t}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                              <button type="button" className="btn btn-primary" onClick={handleSavePreferences}>
                                💾 Save Preferences
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Change Requests */}
                        {activeProfileTab === 'Change Requests' && (
                          <div className="profile-personal-shell">
                            <div className="profile-top" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                              <div className="profile-tabs" role="tablist" aria-label="Request filters" style={{ gap: '8px' }}>
                                {(['All Requests', 'Pending', 'Approved', 'Rejected'] as const).map((filter) => (
                                  <button
                                    key={filter}
                                    type="button"
                                    className={`profile-tab ${activeChangeRequestsSubTab === filter ? 'active' : ''}`}
                                    style={{ padding: '6px 12px', fontSize: '13px' }}
                                    onClick={() => setActiveChangeRequestsSubTab(filter)}
                                  >
                                    {filter}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="profile-personal-grid" style={{ marginTop: '10px' }}>
                              <div className="profile-card emergency-card" style={{ padding: '16px' }}>
                                <h3>Request Audit Table</h3>
                                <table className="emergency-contacts-table">
                                  <thead>
                                    <tr>
                                      <th>Request Type</th>
                                      <th>Description</th>
                                      <th>Requested On</th>
                                      <th>Status</th>
                                      <th>Comments</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {profileChangeRequests
                                      .filter((req) => {
                                        if (activeChangeRequestsSubTab === 'All Requests') return true
                                        return req.status === activeChangeRequestsSubTab
                                      })
                                      .map((req) => (
                                        <tr key={req.id}>
                                          <td style={{ fontWeight: '600' }}>{req.type}</td>
                                          <td>{req.description}</td>
                                          <td>{req.requestedDate}</td>
                                          <td>
                                            <span className={`request-status-pill ${req.status.toLowerCase()}`}>
                                              {req.status}
                                            </span>
                                          </td>
                                          <td style={{ color: 'var(--muted)', fontSize: '12px' }}>{req.comments}</td>
                                          <td>
                                            <button type="button" className="btn btn-link" style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--primary)' }} onClick={() => alert(`Request ID: ${req.id}\nDetails: ${req.description}\nStatus: ${req.status}\nComments: ${req.comments}`)}>
                                              View
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    {profileChangeRequests.filter((req) => {
                                      if (activeChangeRequestsSubTab === 'All Requests') return true
                                      return req.status === activeChangeRequestsSubTab
                                    }).length === 0 && (
                                        <tr>
                                          <td colSpan={6} className="empty-contacts-row">No change requests found.</td>
                                        </tr>
                                      )}
                                  </tbody>
                                </table>
                              </div>

                              <div className="profile-personal-sidebar">
                                <div className="profile-card">
                                  <h3>How it works?</h3>
                                  <ol style={{ textAlign: 'left', paddingLeft: '16px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', color: 'var(--muted)' }}>
                                    <li>
                                      <strong style={{ color: 'var(--ink)' }}>Submit Request</strong>
                                      <p style={{ margin: '2px 0 0' }}>Raise a ticket for any personal or banking details change.</p>
                                    </li>
                                    <li>
                                      <strong style={{ color: 'var(--ink)' }}>HR Review</strong>
                                      <p style={{ margin: '2px 0 0' }}>The human resource managers will audit the details.</p>
                                    </li>
                                    <li>
                                      <strong style={{ color: 'var(--ink)' }}>Instant Status Update</strong>
                                      <p style={{ margin: '2px 0 0' }}>Receive alerts once the request status transitions.</p>
                                    </li>
                                  </ol>
                                  <div style={{ marginTop: '20px' }}>
                                    <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={handleOpenRequestChange}>
                                      📝 Raise New Request
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}


                        {/* Modals */}
                        {isEmergencyModalOpen && (
                          <div className="time-modal-backdrop" role="presentation" onClick={() => setIsEmergencyModalOpen(false)}>
                            <div
                              className="time-modal"
                              role="dialog"
                              aria-modal="true"
                              aria-label={`${emergencyModalMode === 'add' ? 'Add' : 'Edit'} Emergency Contact`}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <h3>{emergencyModalMode === 'add' ? 'Add Emergency Contact' : 'Edit Emergency Contact'}</h3>
                              {emergencyError && <p className="submit-error" style={{ marginBottom: '10px' }}>{emergencyError}</p>}
                              <div className="leave-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: '16px' }}>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                  Contact Name
                                  <input
                                    type="text"
                                    value={emergencyForm.name}
                                    onChange={(e) => setEmergencyForm({ ...emergencyForm, name: e.target.value })}
                                    placeholder="e.g. Jane Doe"
                                    className="modal-field"
                                  />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                  Relationship
                                  <input
                                    type="text"
                                    value={emergencyForm.relationship}
                                    onChange={(e) => setEmergencyForm({ ...emergencyForm, relationship: e.target.value })}
                                    placeholder="e.g. Sister, Father"
                                    className="modal-field"
                                  />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                  Phone Number
                                  <input
                                    type="text"
                                    value={emergencyForm.phone}
                                    onChange={(e) => setEmergencyForm({ ...emergencyForm, phone: e.target.value })}
                                    placeholder="e.g. +91 98765 11111"
                                    className="modal-field"
                                  />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                  Email Address
                                  <input
                                    type="email"
                                    value={emergencyForm.email}
                                    onChange={(e) => setEmergencyForm({ ...emergencyForm, email: e.target.value })}
                                    placeholder="e.g. jane.doe@gmail.com"
                                    className="modal-field"
                                  />
                                </label>
                              </div>
                              <div className="time-modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                <button type="button" className="btn" onClick={() => setIsEmergencyModalOpen(false)}>Cancel</button>
                                <button type="button" className="btn btn-primary" onClick={handleSaveEmergencyContact}>Save</button>
                              </div>
                            </div>
                          </div>
                        )}

                        {isRequestChangeModalOpen && (
                          <div className="time-modal-backdrop" role="presentation" onClick={() => setIsRequestChangeModalOpen(false)}>
                            <div
                              className="time-modal"
                              role="dialog"
                              aria-modal="true"
                              aria-label="Request Profile Change"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <h3>Raise Change Request</h3>
                              <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>Submit a request to update your personal details.</p>
                              {requestChangeError && <p className="submit-error" style={{ margin: '10px 0' }}>{requestChangeError}</p>}
                              <div className="leave-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: '16px' }}>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                  Field to Update
                                  <select
                                    value={requestChangeField}
                                    onChange={(e) => setRequestChangeField(e.target.value)}
                                    className="modal-field"
                                  >
                                    <option value="First Name">First Name</option>
                                    <option value="Middle Name">Middle Name</option>
                                    <option value="Last Name">Last Name</option>
                                    <option value="Preferred Name">Preferred Name</option>
                                    <option value="Date of Birth">Date of Birth</option>
                                    <option value="Gender">Gender</option>
                                    <option value="Marital Status">Marital Status</option>
                                    <option value="Nationality">Nationality</option>
                                    <option value="PAN Number">PAN Number</option>
                                    <option value="Aadhaar Number">Aadhaar Number</option>
                                  </select>
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                  New Value
                                  <input
                                    type="text"
                                    value={requestChangeNewValue}
                                    onChange={(e) => setRequestChangeNewValue(e.target.value)}
                                    placeholder="Enter new details"
                                    className="modal-field"
                                  />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                  Reason for Change
                                  <textarea
                                    rows={3}
                                    value={requestChangeReason}
                                    onChange={(e) => setRequestChangeReason(e.target.value)}
                                    placeholder="Why are you making this change request?"
                                    className="modal-field" style={{ resize: 'none' }}
                                  />
                                </label>
                              </div>
                              {requestChangeSuccess && (
                                <p style={{ color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '6px', padding: '8px 12px', marginTop: '12px', fontSize: '13px' }}>
                                  ✓ {requestChangeSuccess}
                                </p>
                              )}
                              <div className="time-modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                <button type="button" className="btn" onClick={() => setIsRequestChangeModalOpen(false)}>Cancel</button>
                                <button type="button" className="btn btn-primary" onClick={handleSubmitChangeRequest}>Submit Request</button>
                              </div>
                            </div>
                          </div>
                        )}

                        {isBankChangeModalOpen && (
                          <div className="time-modal-backdrop" role="presentation" onClick={() => setIsBankChangeModalOpen(false)}>
                            <div
                              className="time-modal"
                              role="dialog"
                              aria-modal="true"
                              aria-label="Request Bank Account Change"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <h3>Request Bank Account Change</h3>
                              <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>Provide updated bank account credentials.</p>
                              {bankChangeError && <p className="submit-error" style={{ margin: '10px 0' }}>{bankChangeError}</p>}
                              <BankDetailsFormFields
                                countryCode={employmentCountryCode}
                                form={bankChangeForm}
                                onChange={(updates) => setBankChangeForm((prev) => ({ ...prev, ...updates }))}
                                variant="profile"
                              />
                              {bankChangeSuccess && (
                                <p style={{ color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '6px', padding: '8px 12px', marginTop: '12px', fontSize: '13px' }}>
                                  ✓ Bank change request submitted! Closing…
                                </p>
                              )}
                              <div className="time-modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                <button type="button" className="btn" onClick={() => setIsBankChangeModalOpen(false)}>Cancel</button>
                                <button type="button" className="btn btn-primary" onClick={handleSaveBankChange}>Submit</button>
                              </div>
                            </div>
                          </div>
                        )}

                        {isSkillModalOpen && (
                          <div className="time-modal-backdrop" role="presentation" onClick={() => setIsSkillModalOpen(false)}>
                            <div
                              className="time-modal"
                              role="dialog"
                              aria-modal="true"
                              aria-label={`${skillModalMode === 'add' ? 'Add' : 'Edit'} Skill`}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <h3>{skillModalMode === 'add' ? 'Add Skill' : 'Edit Skill'}</h3>
                              {skillError && <p className="submit-error" style={{ margin: '10px 0' }}>{skillError}</p>}
                              <div className="leave-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: '16px' }}>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                  Skill Name
                                  <input
                                    type="text"
                                    value={skillForm.name}
                                    onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                                    placeholder="e.g. JavaScript"
                                    className="modal-field"
                                  />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                  Proficiency
                                  <select
                                    value={skillForm.proficiency}
                                    onChange={(e) => setSkillForm({ ...skillForm, proficiency: e.target.value as any })}
                                    className="modal-field"
                                  >
                                    <option value="Beginner">Beginner</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Advanced">Advanced</option>
                                    <option value="Expert">Expert</option>
                                  </select>
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                  Years of Experience
                                  <input
                                    type="number"
                                    value={skillForm.experience}
                                    onChange={(e) => setSkillForm({ ...skillForm, experience: Number(e.target.value) })}
                                    className="modal-field"
                                  />
                                </label>
                              </div>
                              <div className="time-modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                <button type="button" className="btn" onClick={() => setIsSkillModalOpen(false)}>Cancel</button>
                                <button type="button" className="btn btn-primary" onClick={handleSaveSkill}>Save</button>
                              </div>
                            </div>
                          </div>
                        )}

                        {isEducationModalOpen && (
                          <div className="time-modal-backdrop" role="presentation" onClick={() => setIsEducationModalOpen(false)}>
                            <div
                              className="time-modal"
                              role="dialog"
                              aria-modal="true"
                              aria-label={`${educationModalMode === 'add' ? 'Add' : 'Edit'} Education`}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <h3>{educationModalMode === 'add' ? 'Add Education' : 'Edit Education'}</h3>
                              {educationError && <p className="submit-error" style={{ margin: '10px 0' }}>{educationError}</p>}
                              <div className="leave-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: '16px' }}>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                  Degree
                                  <input
                                    type="text"
                                    value={educationForm.degree}
                                    onChange={(e) => setEducationForm({ ...educationForm, degree: e.target.value })}
                                    placeholder="e.g. Bachelor of Engineering"
                                    className="modal-field"
                                  />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                  Institution
                                  <input
                                    type="text"
                                    value={educationForm.institution}
                                    onChange={(e) => setEducationForm({ ...educationForm, institution: e.target.value })}
                                    placeholder="e.g. VTU"
                                    className="modal-field"
                                  />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                  Field of Study
                                  <input
                                    type="text"
                                    value={educationForm.fieldOfStudy}
                                    onChange={(e) => setEducationForm({ ...educationForm, fieldOfStudy: e.target.value })}
                                    placeholder="e.g. Computer Science"
                                    className="modal-field"
                                  />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                  Year of Passing
                                  <input
                                    type="text"
                                    value={educationForm.yearOfPassing}
                                    onChange={(e) => setEducationForm({ ...educationForm, yearOfPassing: e.target.value })}
                                    placeholder="e.g. 2014"
                                    className="modal-field"
                                  />
                                </label>
                              </div>
                              <div className="time-modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                <button type="button" className="btn" onClick={() => setIsEducationModalOpen(false)}>Cancel</button>
                                <button type="button" className="btn btn-primary" onClick={handleSaveEducation}>Save</button>
                              </div>
                            </div>
                          </div>
                        )}

                        {isCertificationModalOpen && (
                          <div className="time-modal-backdrop" role="presentation" onClick={() => setIsCertificationModalOpen(false)}>
                            <div
                              className="time-modal"
                              role="dialog"
                              aria-modal="true"
                              aria-label={`${certificationModalMode === 'add' ? 'Add' : 'Edit'} Certification`}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <h3>{certificationModalMode === 'add' ? 'Add Certification' : 'Edit Certification'}</h3>
                              {certificationError && <p className="submit-error" style={{ margin: '10px 0' }}>{certificationError}</p>}
                              <div className="leave-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: '16px' }}>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                  Certification Name
                                  <input
                                    type="text"
                                    value={certificationForm.name}
                                    onChange={(e) => setCertificationForm({ ...certificationForm, name: e.target.value })}
                                    placeholder="e.g. AWS Solutions Architect"
                                    className="modal-field"
                                  />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                  Issuing Organization
                                  <input
                                    type="text"
                                    value={certificationForm.issuingOrg}
                                    onChange={(e) => setCertificationForm({ ...certificationForm, issuingOrg: e.target.value })}
                                    placeholder="e.g. Amazon Web Services"
                                    className="modal-field"
                                  />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                  Issue Date
                                  <input
                                    type="text"
                                    value={certificationForm.issueDate}
                                    onChange={(e) => setCertificationForm({ ...certificationForm, issueDate: e.target.value })}
                                    placeholder="e.g. 12 Dec 2024"
                                    className="modal-field"
                                  />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                  Expiry Date
                                  <input
                                    type="text"
                                    value={certificationForm.expiryDate}
                                    onChange={(e) => setCertificationForm({ ...certificationForm, expiryDate: e.target.value })}
                                    placeholder="e.g. 12 Dec 2027 or -"
                                    className="modal-field"
                                  />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                  Credential ID
                                  <input
                                    type="text"
                                    value={certificationForm.credentialId}
                                    onChange={(e) => setCertificationForm({ ...certificationForm, credentialId: e.target.value })}
                                    placeholder="e.g. AWS-12345 or -"
                                    className="modal-field"
                                  />
                                </label>
                              </div>
                              <div className="time-modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                <button type="button" className="btn" onClick={() => setIsCertificationModalOpen(false)}>Cancel</button>
                                <button type="button" className="btn btn-primary" onClick={handleSaveCertification}>Save</button>
                              </div>
                            </div>
                          </div>
                        )}

                        {isLanguageModalOpen && (
                          <div className="time-modal-backdrop" role="presentation" onClick={() => setIsLanguageModalOpen(false)}>
                            <div
                              className="time-modal"
                              role="dialog"
                              aria-modal="true"
                              aria-label={`${languageModalMode === 'add' ? 'Add' : 'Edit'} Language`}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <h3>{languageModalMode === 'add' ? 'Add Language' : 'Edit Language'}</h3>
                              {languageError && <p className="submit-error" style={{ margin: '10px 0' }}>{languageError}</p>}
                              <div className="leave-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: '16px' }}>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                  Language Name
                                  <input
                                    type="text"
                                    value={languageForm.name}
                                    onChange={(e) => setLanguageForm({ ...languageForm, name: e.target.value })}
                                    placeholder="e.g. English"
                                    className="modal-field"
                                  />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                  Proficiency
                                  <select
                                    value={languageForm.proficiency}
                                    onChange={(e) => setLanguageForm({ ...languageForm, proficiency: e.target.value as any })}
                                    className="modal-field"
                                  >
                                    <option value="Beginner">Beginner</option>
                                    <option value="Conversational">Conversational</option>
                                    <option value="Professional">Professional</option>
                                    <option value="Fluent">Fluent</option>
                                    <option value="Native / Bilingual">Native / Bilingual</option>
                                  </select>
                                </label>
                              </div>
                              <div className="time-modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                <button type="button" className="btn" onClick={() => setIsLanguageModalOpen(false)}>Cancel</button>
                                <button type="button" className="btn btn-primary" onClick={handleSaveLanguage}>Save</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="layout">
                        {(
                          <aside className="rail" aria-label="Steps">
                            <h2>{modules.find((m) => m.id === currentModule)?.label} · {steps.length} steps</h2>
                            <ol>
                              {steps.map((stepItem, idx) => (
                                <li key={idx}>
                                  <button
                                    className={`rstep ${idx < stepIndex ? 'is-done' : idx === stepIndex ? 'is-current' : ''}`}
                                    onClick={() => setStepIndex(idx)}
                                  >
                                    <span className="rnum">{idx < stepIndex ? '✓' : idx + 1}</span>
                                    <span className="rlabel">
                                      {stepItem.title}
                                      <span className="rmini">{stepItem.tag}</span>
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ol>
                          </aside>
                        )}

                        <div className="stage">
                          <div className="screen">
                            <div className="screen-head">
                              <h1>{currentStep.title}</h1>
                              <span className="tag">{currentStep.tag}</span>
                            </div>
                            <div className="screen-body">
                              <p className="screen-intro">{currentStep.content}</p>
                              <div style={{ marginTop: '24px', padding: '20px', background: 'var(--info-soft)', borderRadius: '8px' }}>
                                <p>This is step {stepIndex + 1} of {steps.length}</p>
                                <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '8px' }}>
                                  Data is stored locally in your browser
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="foot">
                            <button
                              className="btn"
                              onClick={() => setStepIndex(Math.max(stepIndex - 1, 0))}
                              disabled={stepIndex === 0}
                            >
                              ← Back
                            </button>
                            <div className="progress">
                              <div className="pmeta">
                                <span>Step {stepIndex + 1} of {steps.length}</span>
                                <span>{Math.round(((stepIndex + 1) / steps.length) * 100)}% complete</span>
                              </div>
                              <div className="pbar">
                                <div className="fill" style={{ width: `${Math.round(((stepIndex + 1) / steps.length) * 100)}%` }} />
                              </div>
                            </div>
                            <button
                              className="btn btn-primary"
                              onClick={() => setStepIndex(Math.min(stepIndex + 1, steps.length - 1))}
                              disabled={isLast}
                            >
                              Next →
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
        </section>
      </div>

      {/* ── Notification Drawer ── */}
      {isNotificationDrawerOpen && (
        <div
          className="notification-drawer-backdrop"
          role="presentation"
          onClick={() => setIsNotificationDrawerOpen(false)}
        >
          <div
            className="notification-drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Notification Center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="notification-drawer-header">
              <h3>
                🔔 Notifications
                {unreadCount > 0 && (
                  <span className="notification-unread-pill">{unreadCount} unread</span>
                )}
              </h3>
              <div className="notification-header-actions">
                {unreadCount > 0 && (
                  <button type="button" className="btn-mark-all" onClick={handleMarkAllAsRead}>
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  className="btn-drawer-close"
                  aria-label="Close notification drawer"
                  onClick={() => setIsNotificationDrawerOpen(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="notification-drawer-filters">
              {notificationFilterTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`notification-filter-btn ${activeNotificationFilter === tab ? 'active' : ''}`}
                  onClick={() => {
                    setActiveNotificationFilter(tab)
                    setVisibleNotificationsCount(5)
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Notification List */}
            <div className="notification-drawer-list">
              {/* Empty state */}
              {displayedNotifications.length === 0 && !isNotificationsLoadingMore && (
                <div className="notification-empty">
                  <div className="notification-empty-icon">🔕</div>
                  <h4>All caught up!</h4>
                  <p>
                    {activeNotificationFilter === 'Unread'
                      ? 'No unread notifications.'
                      : `No ${activeNotificationFilter === 'All' ? '' : activeNotificationFilter + ' '}notifications found.`}
                  </p>
                </div>
              )}

              {/* Notification cards */}
              {displayedNotifications.map((item) => (
                <div
                  key={item.id}
                  className={`notification-card ${item.isRead ? 'read' : 'unread'}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNotificationClick(item)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(item)}
                  style={{ cursor: 'pointer' }}
                >
                  {getCategoryIcon(item.category)}

                  <div className="notification-card-body">
                    <div className="notification-card-header">
                      <p className="notification-card-title">{item.title}</p>
                      <span className="notification-card-time">{item.timestamp}</span>
                    </div>
                    <p className="notification-card-desc">{item.description}</p>

                    <div className="notification-card-actions">
                      {item.actionText && (
                        <button
                          type="button"
                          className="btn-notification-action"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleNotificationClick(item)
                          }}
                        >
                          {item.actionText} →
                        </button>
                      )}
                      {/* Toggle read / unread */}
                      <button
                        type="button"
                        className="btn-notification-toggle-read"
                        title={item.isRead ? 'Mark as unread' : 'Mark as read'}
                        onClick={(e) => handleToggleRead(item.id, e)}
                      >
                        {item.isRead ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                      {/* Delete */}
                      <button
                        type="button"
                        className="btn-notification-delete"
                        title="Delete notification"
                        onClick={(e) => handleDeleteNotification(item.id, e)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Skeleton loaders while loading more */}
              {isNotificationsLoadingMore && (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={`sk-${i}`} className="notification-skeleton">
                      <div className="skeleton-circle skeleton-pulse" />
                      <div className="skeleton-lines">
                        <div className="skeleton-line-title skeleton-pulse" />
                        <div className="skeleton-line-desc skeleton-pulse" />
                        <div className="skeleton-line-time skeleton-pulse" />
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Load More */}
              {hasMoreNotifications && !isNotificationsLoadingMore && (
                <div className="notification-load-more">
                  <button
                    type="button"
                    className="btn-load-more"
                    onClick={handleLoadMoreNotifications}
                    disabled={isNotificationsLoadingMore}
                  >
                    Load older notifications
                  </button>
                </div>
              )}

              {/* All loaded message */}
              {!hasMoreNotifications && displayedNotifications.length > 0 && (
                <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted)', padding: '12px 20px 20px' }}>
                  You've seen all notifications
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>

  )
}
