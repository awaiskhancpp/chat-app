'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  formatAuthError,
  signUpNeedsConfirmEmailOff,
  validateSignUp,
} from '@/lib/auth-validation'
import AuthShell, {
  authButtonClass,
  authInputClass,
  authLabelClass,
  authSecondaryButtonClass,
  PASSWORD_HINT,
  passwordHintClass,
} from './AuthShell'

export default function SignupForm() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()

    const validation = validateSignUp(email, password, name)
    if (!validation.valid) {
      toast.error(validation.message)
      return
    }

    setLoading(true)
    const trimmedEmail = email.trim().toLowerCase()

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: { full_name: name.trim() },
      },
    })

    if (error) {
      toast.error(formatAuthError(error))
      setLoading(false)
      return
    }

    if (data.user?.identities?.length === 0) {
      toast.error('An account with this email already exists. Please sign in.')
      setLoading(false)
      return
    }

    if (data.session) {
      toast.success('Account created!')
      router.push('/chat')
      router.refresh()
      return
    }

    toast.error(signUpNeedsConfirmEmailOff())
    setLoading(false)
  }

  async function handleGoogleSignup() {
    setGoogleLoading(true)

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (oauthError) {
      toast.error(oauthError.message)
      setGoogleLoading(false)
    }
  }

  return (
    <AuthShell heading="Create account" subheading="Join the conversation">
      <button
        type="button"
        className={authSecondaryButtonClass}
        onClick={handleGoogleSignup}
        disabled={googleLoading || loading}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {googleLoading ? 'Redirecting…' : 'Continue with Google'}
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-wa-text2">
        <span className="h-px flex-1 bg-wa-border" />
        <span>or</span>
        <span className="h-px flex-1 bg-wa-border" />
      </div>

      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        <div>
          <label htmlFor="signup-name" className={authLabelClass}>
            Display name
          </label>
          <input
            id="signup-name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            autoComplete="name"
            className={authInputClass}
          />
        </div>

        <div>
          <label htmlFor="signup-email" className={authLabelClass}>
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={authInputClass}
          />
        </div>

        <div>
          <label htmlFor="signup-password" className={authLabelClass}>
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className={authInputClass}
          />
          <p className={passwordHintClass}>{PASSWORD_HINT}</p>
        </div>

        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-wa-text2">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-semibold text-wa-green hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
