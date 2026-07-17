import { useCallback, useEffect, useRef, useState } from 'react'
import { searchIfsc, lookupIfsc, type IfscLookupResult } from '../services/ifscLookup'
import {
  getBankFieldsForCountry,
  type BankCountryCode,
  type BankFieldDef,
  type BankFormValues,
} from '../utils/bankValidation'

interface BankDetailsFormFieldsProps {
  countryCode: BankCountryCode
  form: BankFormValues
  onChange: (updates: Partial<BankFormValues>) => void
  variant?: 'pay' | 'profile'
  idPrefix?: string
}

export function BankDetailsFormFields({
  countryCode,
  form,
  onChange,
  variant = 'pay',
  idPrefix = 'bank',
}: BankDetailsFormFieldsProps) {
  const fields = getBankFieldsForCountry(countryCode)
  const [ifscSuggestions, setIfscSuggestions] = useState<IfscLookupResult[]>([])
  const [ifscLookupLoading, setIfscLookupLoading] = useState(false)
  const [ifscLookupError, setIfscLookupError] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const ifscWrapRef = useRef<HTMLDivElement>(null)
  const lookupAbortRef = useRef<AbortController | null>(null)

  const applyIfscResult = useCallback((result: IfscLookupResult) => {
    onChange({
      ifscCode: result.ifsc,
      bankName: result.bank,
      branch: result.branch,
    })
    setIfscLookupError('')
    setShowSuggestions(false)
  }, [onChange])

  useEffect(() => {
    if (countryCode !== 'IN') {
      setIfscSuggestions([])
      setShowSuggestions(false)
      return
    }

    const code = form.ifscCode.trim().toUpperCase()
    if (code.length < 4) {
      setIfscSuggestions([])
      setIfscLookupError('')
      return
    }

    if (lookupAbortRef.current) {
      lookupAbortRef.current.abort()
    }
    const controller = new AbortController()
    lookupAbortRef.current = controller

    if (/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) {
      setIfscLookupLoading(true)
      lookupIfsc(code, controller.signal).then((result) => {
        if (controller.signal.aborted) return
        setIfscLookupLoading(false)
        if (result) {
          applyIfscResult(result)
        } else {
          setIfscLookupError('IFSC code not found. Please verify and try again.')
        }
      }).catch(() => {
        if (controller.signal.aborted) return
        setIfscLookupLoading(false)
        setIfscLookupError('IFSC lookup failed.')
      })
      return () => {
        controller.abort()
      }
    }

    const timer = window.setTimeout(async () => {
      setIfscLookupLoading(true)
      try {
        const results = await searchIfsc(code, controller.signal)
        if (controller.signal.aborted) return
        setIfscLookupLoading(false)
        setIfscSuggestions(results)
        setShowSuggestions(results.length > 0)
        if (results.length === 0 && code.length >= 6) {
          setIfscLookupError('No matching IFSC found.')
        } else {
          setIfscLookupError('')
        }
      } catch {
        if (controller.signal.aborted) return
        setIfscLookupLoading(false)
        setIfscLookupError('IFSC lookup failed.')
      }
    }, 350)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [form.ifscCode, countryCode, applyIfscResult])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ifscWrapRef.current && !ifscWrapRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleFieldChange = (field: BankFieldDef, value: string) => {
    if (field.key === 'ifscCode') {
      onChange({ ifscCode: value.toUpperCase() })
      return
    }
    onChange({ [field.key]: value })
  }

  const isReadOnly = (field: BankFieldDef) =>
    Boolean(field.readOnlyWhenFilled && form[field.key]?.trim())

  const gridClass = variant === 'pay' ? 'pay-bank-form-grid' : 'leave-form-grid bank-profile-form-grid'
  const inputClass = variant === 'profile' ? 'modal-field' : undefined
  const labelStyle = variant === 'profile'
    ? { display: 'flex' as const, flexDirection: 'column' as const, gap: '4px', textAlign: 'left' as const }
    : undefined

  return (
    <div className={gridClass} style={variant === 'profile' ? { display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: '16px' } : undefined}>
      {fields.map((field) => {
        if (field.key === 'ifscCode' && field.lookup === 'ifsc') {
          return (
            <div
              key={field.key}
              className={`ifsc-field-wrap${field.fullWidth ? ' pay-form-full' : ''}`}
              ref={ifscWrapRef}
            >
              <label style={labelStyle}>
                {field.label} {field.required && <span className="pay-req">*</span>}
                <input
                  id={`${idPrefix}-ifsc-input`}
                  type="text"
                  className={inputClass}
                  placeholder={field.placeholder}
                  value={form.ifscCode}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  onFocus={() => ifscSuggestions.length > 0 && setShowSuggestions(true)}
                  autoComplete="off"
                />
              </label>
              {ifscLookupLoading && <p className="ifsc-lookup-hint">Looking up IFSC…</p>}
              {ifscLookupError && !ifscLookupLoading && <p className="ifsc-lookup-error">{ifscLookupError}</p>}
              {showSuggestions && ifscSuggestions.length > 0 && (
                <ul className="ifsc-suggestions" role="listbox" aria-label="IFSC suggestions">
                  {ifscSuggestions.map((item) => (
                    <li key={item.ifsc}>
                      <button
                        type="button"
                        role="option"
                        className="ifsc-suggestion-item"
                        onClick={() => applyIfscResult(item)}
                      >
                        <strong>{item.ifsc}</strong>
                        <span>{item.bank}</span>
                        <span className="ifsc-suggestion-branch">{item.branch}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        }

        const value = form[field.key]
        const readOnly = isReadOnly(field)

        return (
          <label
            key={field.key}
            className={field.fullWidth ? 'pay-form-full' : undefined}
            style={labelStyle}
          >
            {field.label} {field.required && <span className="pay-req">*</span>}
            {field.multiline ? (
              <textarea
                id={`${idPrefix}-${field.key}-input`}
                rows={3}
                className={inputClass}
                placeholder={field.placeholder}
                value={value}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                style={variant === 'profile' ? { resize: 'none' } : undefined}
              />
            ) : (
              <input
                id={`${idPrefix}-${field.key}-input`}
                type="text"
                className={inputClass}
                placeholder={field.placeholder}
                value={value}
                readOnly={readOnly}
                onChange={(e) => handleFieldChange(field, e.target.value)}
              />
            )}
          </label>
        )
      })}
    </div>
  )
}
