export interface IfscLookupResult {
  ifsc: string
  bank: string
  branch: string
  address: string
  city: string
  state: string
}

interface RazorpayIfscResponse {
  IFSC: string
  BANK: string
  BRANCH: string
  ADDRESS?: string
  CITY?: string
  STATE?: string
}

function mapIfscResponse(data: RazorpayIfscResponse): IfscLookupResult {
  return {
    ifsc: data.IFSC,
    bank: data.BANK,
    branch: data.BRANCH,
    address: data.ADDRESS ?? '',
    city: data.CITY ?? '',
    state: data.STATE ?? '',
  }
}

export async function lookupIfsc(code: string, signal?: AbortSignal): Promise<IfscLookupResult | null> {
  const trimmed = code.trim().toUpperCase()
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(trimmed)) return null

  try {
    const res = await fetch(`https://ifsc.razorpay.com/${encodeURIComponent(trimmed)}`, { signal })
    if (!res.ok) return null
    const data = (await res.json()) as RazorpayIfscResponse
    if (!data.IFSC || !data.BANK) return null
    return mapIfscResponse(data)
  } catch {
    return null
  }
}

export async function searchIfsc(query: string, signal?: AbortSignal): Promise<IfscLookupResult[]> {
  const trimmed = query.trim().toUpperCase()
  if (trimmed.length < 4) return []

  try {
    const res = await fetch(`https://ifsc.razorpay.com/search?q=${encodeURIComponent(trimmed)}`, { signal })
    if (!res.ok) return []
    const data = (await res.json()) as RazorpayIfscResponse[]
    if (!Array.isArray(data)) return []
    return data.slice(0, 8).map(mapIfscResponse)
  } catch {
    return []
  }
}
