export interface NotificationItem {
  id: string
  category: 'payroll' | 'leave' | 'time-entry' | 'documents' | 'profile' | 'system'
  title: string
  description: string
  timestamp: string
  isRead: boolean
  actionText?: string
  module: string
}

export const notificationsSeed: NotificationItem[] = [
  {
    id: 'n-001',
    category: 'leave',
    title: 'Leave Approved',
    description: 'Your leave request for July 15 has been approved.',
    timestamp: '2 mins ago',
    isRead: false,
    actionText: 'View Leave',
    module: 'leave'
  },
  {
    id: 'n-002',
    category: 'time-entry',
    title: 'Timesheet Reminder',
    description: "Don't forget to submit your timesheet before Friday.",
    timestamp: '1 hour ago',
    isRead: false,
    actionText: 'Go to Time Entry',
    module: 'time-entry'
  },
  {
    id: 'n-003',
    category: 'payroll',
    title: 'Payslip Available',
    description: 'Your June payslip is now available.',
    timestamp: '3 hours ago',
    isRead: false,
    actionText: 'View Payslip',
    module: 'my-pay'
  },
  {
    id: 'n-004',
    category: 'documents',
    title: 'Document Verification',
    description: 'Your passport has been successfully verified.',
    timestamp: 'Yesterday',
    isRead: true,
    actionText: 'View Documents',
    module: 'documents'
  },
  {
    id: 'n-005',
    category: 'documents',
    title: 'Passport Expiry Reminder',
    description: 'Your passport expires in 30 days.',
    timestamp: '2 days ago',
    isRead: false,
    actionText: 'Upload New Copy',
    module: 'documents'
  },
  {
    id: 'n-006',
    category: 'profile',
    title: 'Bank Detail Update Approved',
    description: 'Your bank account details change request has been approved.',
    timestamp: '3 days ago',
    isRead: true,
    actionText: 'View Profile',
    module: 'profile'
  },
  {
    id: 'n-007',
    category: 'system',
    title: 'System Update Complete',
    description: 'The Pynk Employee Portal has been updated to version 2.4.0.',
    timestamp: '4 days ago',
    isRead: true,
    module: 'dashboard'
  },
  {
    id: 'n-008',
    category: 'leave',
    title: 'Sick Leave Submitted',
    description: 'Your sick leave request for June 12 has been submitted for approval.',
    timestamp: '1 week ago',
    isRead: true,
    actionText: 'View Leave History',
    module: 'leave'
  },
  {
    id: 'n-009',
    category: 'payroll',
    title: 'Tax Declaration Window Open',
    description: 'Tax declaration window for Q2 is now open. Declare before month end.',
    timestamp: '1 week ago',
    isRead: true,
    actionText: 'Declare Tax',
    module: 'my-pay'
  },
  {
    id: 'n-010',
    category: 'system',
    title: 'Welcome to Pynk',
    description: 'Welcome to your new employee self-service portal! Get started by completing your profile.',
    timestamp: '2 weeks ago',
    isRead: true,
    actionText: 'Complete Profile',
    module: 'profile'
  }
]

export const additionalNotificationsSeed: NotificationItem[] = [
  {
    id: 'n-011',
    category: 'time-entry',
    title: 'Overtime Approved',
    description: 'Your overtime claim of 4.5 hours for week 23 has been approved.',
    timestamp: '3 weeks ago',
    isRead: true,
    module: 'time-entry'
  },
  {
    id: 'n-012',
    category: 'documents',
    title: 'Visa Document Upload Needed',
    description: 'Your work visa document needs updating. Please upload a copy.',
    timestamp: '1 month ago',
    isRead: true,
    actionText: 'Upload Visa',
    module: 'documents'
  },
  {
    id: 'n-013',
    category: 'payroll',
    title: 'Bonus Allocation Details',
    description: 'Performance bonus allocation statement is ready for download.',
    timestamp: '1 month ago',
    isRead: true,
    actionText: 'View Pay Details',
    module: 'my-pay'
  },
  {
    id: 'n-014',
    category: 'system',
    title: 'Security Alert: Password Changed',
    description: "Your account password was updated successfully. If this wasn't you, contact IT.",
    timestamp: '2 months ago',
    isRead: true,
    module: 'dashboard'
  }
]
