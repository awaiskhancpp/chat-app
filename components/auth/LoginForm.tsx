'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName || email.split('@')[0] },
        },
      })
      if (signUpError) {
        setError(signUpError.message)
      } else {
        setInfo('Check your email to confirm your account')
        setIsSignUp(false)
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message)
      } else {
        router.push('/chat')
        router.refresh()
      }
    }
    setLoading(false)
  }

  const inputClass =
    'w-full rounded-[10px] border border-wa-border bg-wa-input px-4 py-3 text-[0.9rem] text-wa-text outline-none'

  return (
    <div className="flex min-h-screen items-center justify-center bg-wa-bg px-6 py-8">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <div className="mb-3 text-[3rem] leading-none" aria-hidden>
            {'\u{1F4AC}'}
          </div>
          <h1 className="mb-1 text-2xl font-bold text-wa-text">
            ChatApp
          </h1>
          <p className="text-sm text-wa-text2">
            Private real-time messaging
          </p>
        </div>

        <div className="rounded-2xl border border-wa-border bg-wa-panel p-8">
          <h2 className="mb-6 text-base font-semibold text-wa-text">
            {isSignUp ? 'Create an account' : 'Sign in'}
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <input
                type="text"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
              />
            )}
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={inputClass}
            />

            {error && (
              <p className="text-[0.8125rem] text-wa-danger">{error}</p>
            )}
            {info && (
              <p className="text-[0.8125rem] text-wa-green">{info}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rounded-[10px] bg-wa-green py-3.5 text-[0.9375rem] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-wa-text2">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setInfo('') }}
              className="border-0 bg-transparent text-sm font-semibold text-wa-green"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
