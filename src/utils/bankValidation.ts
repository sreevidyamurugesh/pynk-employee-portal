export type BankCountryCode = 'IN' | 'US' | 'GB' | 'OTHER'

export interface BankFormValues {
  bankName: string
  branch: string
  accountNumber: string
  ifscCode: string
  routingNumber: string
  sortCode: string
  swiftCode: string
  iban: string
  accountHolderName: string
  reason: string
}

export interface BankFieldDef {
  key: keyof BankFormValues
  label: string
  placeholder: string
  required: boolean
  pattern?: RegExp
  patternMessage?: string
  minLength?: number
  minLengthMessage?: string
  lookup?: 'ifsc'
  readOnlyWhenFilled?: boolean
  fullWidth?: boolean
  multiline?: boolean
}

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/
const ROUTING_PATTERN = /^\d{9}$/
const SORT_CODE_PATTERN = /^\d{2}-\d{2}-\d{2}$|^\d{6}$/
const IBAN_PATTERN = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/

export const EMPTY_BANK_FORM: BankFormValues = {
  bankName: '',
  branch: '',
  accountNumber: '',
  ifscCode: '',
  routingNumber: '',
  sortCode: '',
  swiftCode: '',
  iban: '',
  accountHolderName: '',
  reason: '',
}

const COUNTRY_FIELD_CONFIG: Record<BankCountryCode, BankFieldDef[]> = {
  IN: [
    {
      key: 'ifscCode',
      label: 'IFSC Code',
      placeholder: 'e.g. HDFC0001234',
      required: false,
      pattern: IFSC_PATTERN,
      patternMessage: 'IFSC must be 4 letters, 0, then 6 alphanumeric (e.g. HDFC0001234).',
      lookup: 'ifsc',
    },
    {
      key: 'bankName',
      label: 'Bank Name',
      placeholder: 'Enter bank name',
      required: true,
      readOnlyWhenFilled: true,
    },
    {
      key: 'branch',
      label: 'Branch',
      placeholder: 'Enter branch name',
      required: true,
      readOnlyWhenFilled: true,
    },
    {
      key: 'accountNumber',
      label: 'Account Number',
      placeholder: 'Enter account number',
      required: true,
      minLength: 9,
      minLengthMessage: 'Account number must be at least 9 digits.',
    },
    {
      key: 'accountHolderName',
      label: 'Account Holder Name',
      placeholder: 'Name as on bank account',
      required: true,
    },
    {
      key: 'reason',
      label: 'Reason for Update',
      placeholder: 'Provide reason for bank account change',
      required: true,
      minLength: 10,
      minLengthMessage: 'Please provide a reason (min 10 characters).',
      fullWidth: true,
      multiline: true,
    },
  ],
  US: [
    {
      key: 'routingNumber',
      label: 'Routing Number',
      placeholder: 'e.g. 021000021',
      required: true,
      pattern: ROUTING_PATTERN,
      patternMessage: 'Routing number must be exactly 9 digits.',
    },
    {
      key: 'bankName',
      label: 'Bank Name',
      placeholder: 'e.g. Chase Bank',
      required: true,
    },
    {
      key: 'accountNumber',
      label: 'Account Number',
      placeholder: 'Enter account number',
      required: true,
      minLength: 4,
      minLengthMessage: 'Account number must be at least 4 digits.',
    },
    {
      key: 'accountHolderName',
      label: 'Account Holder Name',
      placeholder: 'Name as on bank account',
      required: true,
    },
    {
      key: 'reason',
      label: 'Reason for Update',
      placeholder: 'Provide reason for bank account change',
      required: true,
      minLength: 10,
      minLengthMessage: 'Please provide a reason (min 10 characters).',
      fullWidth: true,
      multiline: true,
    },
  ],
  GB: [
    {
      key: 'sortCode',
      label: 'Sort Code',
      placeholder: 'e.g. 12-34-56',
      required: true,
      pattern: SORT_CODE_PATTERN,
      patternMessage: 'Sort code must be 6 digits (e.g. 12-34-56).',
    },
    {
      key: 'bankName',
      label: 'Bank Name',
      placeholder: 'e.g. Barclays',
      required: true,
    },
    {
      key: 'accountNumber',
      label: 'Account Number',
      placeholder: 'Enter account number',
      required: true,
      minLength: 8,
      minLengthMessage: 'Account number must be at least 8 digits.',
    },
    {
      key: 'accountHolderName',
      label: 'Account Holder Name',
      placeholder: 'Name as on bank account',
      required: true,
    },
    {
      key: 'reason',
      label: 'Reason for Update',
      placeholder: 'Provide reason for bank account change',
      required: true,
      minLength: 10,
      minLengthMessage: 'Please provide a reason (min 10 characters).',
      fullWidth: true,
      multiline: true,
    },
  ],
  OTHER: [
    {
      key: 'iban',
      label: 'IBAN',
      placeholder: 'e.g. DE89370400440532013000',
      required: true,
      pattern: IBAN_PATTERN,
      patternMessage: 'Enter a valid IBAN.',
    },
    {
      key: 'swiftCode',
      label: 'SWIFT / BIC',
      placeholder: 'e.g. DEUTDEFF (optional)',
      required: false,
    },
    {
      key: 'bankName',
      label: 'Bank Name',
      placeholder: 'Enter bank name',
      required: true,
    },
    {
      key: 'accountNumber',
      label: 'Account Number',
      placeholder: 'Enter account number (if applicable)',
      required: false,
    },
    {
      key: 'accountHolderName',
      label: 'Account Holder Name',
      placeholder: 'Name as on bank account',
      required: true,
    },
    {
      key: 'reason',
      label: 'Reason for Update',
      placeholder: 'Provide reason for bank account change',
      required: true,
      minLength: 10,
      minLengthMessage: 'Please provide a reason (min 10 characters).',
      fullWidth: true,
      multiline: true,
    },
  ],
}

export function countryNameToCode(country: string): BankCountryCode {
  const normalized = country.trim().toLowerCase()
  if (normalized === 'india' || normalized === 'in') return 'IN'
  if (normalized === 'united states' || normalized === 'usa' || normalized === 'us') return 'US'
  if (normalized === 'united kingdom' || normalized === 'uk' || normalized === 'gb') return 'GB'
  return 'OTHER'
}

export function getBankFieldsForCountry(countryCode: BankCountryCode): BankFieldDef[] {
  return COUNTRY_FIELD_CONFIG[countryCode]
}

export function validateBankForm(form: BankFormValues, countryCode: BankCountryCode): string | null {
  const fields = getBankFieldsForCountry(countryCode)

  for (const field of fields) {
    const raw = form[field.key]
    const value = typeof raw === 'string' ? raw.trim() : ''

    if (field.required && !value) {
      return `${field.label} is required.`
    }

    if (value && field.minLength && value.length < field.minLength) {
      return field.minLengthMessage ?? `${field.label} is too short.`
    }

    if (value && field.pattern && !field.pattern.test(value)) {
      return field.patternMessage ?? `${field.label} format is invalid.`
    }
  }

  return null
}

export function bankFormFromDetails(
  details: Partial<BankFormValues> & { bankName: string; accountNumber: string; accountHolderName: string },
): BankFormValues {
  return {
    ...EMPTY_BANK_FORM,
    bankName: details.bankName,
    branch: details.branch ?? '',
    accountNumber: details.accountNumber,
    ifscCode: details.ifscCode ?? '',
    routingNumber: details.routingNumber ?? '',
    sortCode: details.sortCode ?? '',
    swiftCode: details.swiftCode ?? '',
    iban: details.iban ?? '',
    accountHolderName: details.accountHolderName,
    reason: '',
  }
}

export function getBankDisplayFields(
  countryCode: BankCountryCode,
  details: {
    bankName: string
    branch?: string
    accountNumber: string
    ifscCode?: string
    routingNumber?: string
    sortCode?: string
    swiftCode?: string
    iban?: string
    accountHolderName: string
  },
): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Bank Name', value: details.bankName },
  ]

  if (countryCode === 'IN') {
    if (details.branch) rows.push({ label: 'Branch', value: details.branch })
    rows.push(
      { label: 'Account Number', value: details.accountNumber },
      { label: 'IFSC Code', value: details.ifscCode ?? '-' },
    )
  } else if (countryCode === 'US') {
    rows.push(
      { label: 'Routing Number', value: details.routingNumber ?? '-' },
      { label: 'Account Number', value: details.accountNumber },
    )
  } else if (countryCode === 'GB') {
    rows.push(
      { label: 'Sort Code', value: details.sortCode ?? '-' },
      { label: 'Account Number', value: details.accountNumber },
    )
  } else {
    rows.push(
      { label: 'IBAN', value: details.iban ?? '-' },
      { label: 'SWIFT / BIC', value: details.swiftCode || '-' },
      { label: 'Account Number', value: details.accountNumber || '-' },
    )
  }

  rows.push({ label: 'Account Holder Name', value: details.accountHolderName })
  return rows
}

export function getCountryLabel(countryCode: BankCountryCode): string {
  const labels: Record<BankCountryCode, string> = {
    IN: '🇮🇳 India',
    US: '🇺🇸 United States',
    GB: '🇬🇧 United Kingdom',
    OTHER: '🌍 International',
  }
  return labels[countryCode]
}
