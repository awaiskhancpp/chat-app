'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  formatAuthError,
  signUpNeedsConfirmEmailOff,
  validateSignIn,
  validateSignUp,
} from '@/lib/auth-validation'
import AuthShell, {
  authButtonClass,
  authInputClass,
  PASSWORD_HINT,
  passwordHintClass,
} from './AuthShell'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validation = isSignUp
      ? validateSignUp(email, password, fullName)
      : validateSignIn(email, password)

    if (!validation.valid) {
      toast.error(validation.message)
      return
    }

    setLoading(true)
    const trimmedEmail = email.trim().toLowerCase()

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { full_name: fullName.trim() || trimmedEmail.split('@')[0] },
        },
      })

      if (error) {
        toast.error(formatAuthError(error))
      } else if (data.user?.identities?.length === 0) {
        toast.error('An account with this email already exists. Please sign in.')
      } else if (data.session) {
        toast.success('Account created!')
        router.push('/chat')
        router.refresh()
      } else {
        toast.error(signUpNeedsConfirmEmailOff())
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })

      if (error) {
        toast.error(formatAuthError(error))
      } else if (data.session) {
        toast.success('Signed in successfully')
        router.push('/chat')
        router.refresh()
      }
    }

    setLoading(false)
  }

  return (
    <AuthShell heading={isSignUp ? 'Create an account' : 'Sign in'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isSignUp && (
          <input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
            className={authInputClass}
          />
        )}
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className={authInputClass}
        />
        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            className={authInputClass}
          />
          {isSignUp && <p className={passwordHintClass}>{PASSWORD_HINT}</p>}
        </div>

        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-wa-text2">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp)
            setPassword('')
          }}
          className="border-0 bg-transparent text-sm font-semibold text-wa-green"
        >
          {isSignUp ? 'Sign in' : 'Sign up'}
        </button>
      </p>
    </AuthShell>
  )
}
