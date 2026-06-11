/**
 * Sanitize string input to prevent XSS attacks.
 * Strips HTML tags and encodes dangerous characters.
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Sanitize an object's string fields recursively.
 * Skips fields that are expected to contain HTML (like 'notes' with markdown).
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options?: { allowHtmlFields?: string[] }
): T {
  const allowHtmlFields = options?.allowHtmlFields || []
  const result = { ...obj }

  for (const key of Object.keys(result)) {
    if (allowHtmlFields.includes(key)) continue

    if (typeof result[key] === 'string') {
      result[key] = sanitizeString(result[key])
    } else if (typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
      result[key] = sanitizeObject(result[key], options)
    } else if (Array.isArray(result[key])) {
      result[key] = result[key].map((item: any) =>
        typeof item === 'string' ? sanitizeString(item) :
        typeof item === 'object' && item !== null ? sanitizeObject(item, options) :
        item
      )
    }
  }

  return result
}

/**
 * Validate and clamp numeric input to safe range.
 */
export function sanitizeNumber(value: any, min?: number, max?: number): number {
  const num = Number(value)
  if (isNaN(num)) return 0
  if (min !== undefined && num < min) return min
  if (max !== undefined && num > max) return max
  return num
}

/**
 * Strip all HTML tags from a string (for fields that should never contain HTML).
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '')
}
