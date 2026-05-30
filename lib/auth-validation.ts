export type AuthValidationResult =
  | { valid: true }
  | { valid: false; message: string }

/** Practical format check — not exhaustive RFC 5322, but rejects common typos */
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

const HAS_UPPERCASE = /[A-Z]/
const HAS_SPECIAL = /[^A-Za-z0-9]/

export function validateEmail(email: string): AuthValidationResult {
  const trimmed = email.trim()

  if (!trimmed) {
    return { valid: false, message: 'Email is required' }
  }

  if (/\s/.test(email)) {
    return { valid: false, message: 'Email cannot contain spaces' }
  }

  const atCount = (trimmed.match(/@/g) ?? []).length
  if (atCount !== 1) {
    return {
      valid: false,
      message: 'Enter a valid email address (e.g. you@example.com)',
    }
  }

  const [local, domain] = trimmed.split('@')
  if (!local || !domain) {
    return { valid: false, message: 'Enter a valid email address' }
  }

  if (domain.startsWith('.') || domain.endsWith('.') || !domain.includes('.')) {
    return { valid: false, message: 'Email domain must include a valid extension' }
  }

  const tld = domain.split('.').pop()
  if (!tld || tld.length < 2) {
    return { valid: false, message: 'Enter a valid email address' }
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, message: 'Enter a valid email address' }
  }

  return { valid: true }
}

export function validatePassword(password: string): AuthValidationResult {
  if (!password) {
    return { valid: false, message: 'Password is required' }
  }

  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' }
  }

  if (!HAS_UPPERCASE.test(password)) {
    return {
      valid: false,
      message: 'Password must include at least one uppercase letter',
    }
  }

  if (!HAS_SPECIAL.test(password)) {
    return {
      valid: false,
      message: 'Password must include at least one special character (!@#$…)',
    }
  }

  return { valid: true }
}

export function validateFullName(name: string): AuthValidationResult {
  const trimmed = name.trim()
  if (!trimmed) {
    return { valid: false, message: 'Full name is required' }
  }
  if (trimmed.length < 2) {
    return { valid: false, message: 'Full name must be at least 2 characters' }
  }
  return { valid: true }
}

export function validateSignIn(
  email: string,
  password: string
): AuthValidationResult {
  const emailResult = validateEmail(email)
  if (!emailResult.valid) return emailResult

  if (!password) {
    return { valid: false, message: 'Password is required' }
  }

  return { valid: true }
}

const DISABLE_CONFIRM_HINT =
  'Turn off “Confirm email” in Supabase: Authentication → Providers → Email.'

export function formatAuthError(error: {
  code?: string
  message?: string
}): string {
  const code = error.code ?? ''
  const message = error.message ?? ''
  const lower = message.toLowerCase()

  if (code === 'email_not_confirmed') {
    return `This account is waiting on email confirmation. ${DISABLE_CONFIRM_HINT}`
  }

  if (code === 'over_email_send_rate_limit' || lower.includes('rate limit')) {
    return `Too many emails were sent from Supabase. Wait about an hour, or ${DISABLE_CONFIRM_HINT}`
  }

  if (code === 'user_already_exists' || code === 'email_exists') {
    return 'An account with this email already exists. Please sign in.'
  }

  if (lower.includes('invalid login credentials')) {
    return 'Incorrect email or password.'
  }

  return message || 'Something went wrong. Please try again.'
}

/** Sign-up returned a user but no session — confirm-email is still on in Supabase. */
export function signUpNeedsConfirmEmailOff(): string {
  return `Account was created but you are not signed in. ${DISABLE_CONFIRM_HINT}`
}

export function validateSignUp(
  email: string,
  password: string,
  fullName: string
): AuthValidationResult {
  const nameResult = validateFullName(fullName)
  if (!nameResult.valid) return nameResult

  const emailResult = validateEmail(email)
  if (!emailResult.valid) return emailResult

  const passwordResult = validatePassword(password)
  if (!passwordResult.valid) return passwordResult

  return { valid: true }
}
