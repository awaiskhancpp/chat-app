import { MessageCircle } from 'lucide-react'

interface AuthShellProps {
  children: React.ReactNode
  heading: string
  subheading?: string
}

export default function AuthShell({
  children,
  heading,
  subheading = 'Private real-time messaging',
}: AuthShellProps) {
  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-8 text-center">
        <MessageCircle
          className="mx-auto mb-3 h-12 w-12 text-wa-green"
          strokeWidth={1.5}
          aria-hidden
        />
        <h1 className="mb-1 text-2xl font-bold text-wa-text">ChatApp</h1>
        <p className="text-sm text-wa-text2">{subheading}</p>
      </div>

      <div className="rounded-2xl border border-wa-border bg-wa-panel p-6 sm:p-8">
        <h2 className="mb-6 text-base font-semibold text-wa-text">{heading}</h2>
        {children}
      </div>
    </div>
  )
}

export const authInputClass =
  'w-full rounded-[10px] border border-wa-border bg-wa-input px-4 py-3 text-[0.9rem] text-wa-text outline-none focus:border-wa-green'

export const authLabelClass = 'mb-1.5 block text-xs font-medium text-wa-text2'

export const authButtonClass =
  'w-full rounded-[10px] bg-wa-green py-3.5 text-[0.9375rem] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70'

export const authSecondaryButtonClass =
  'flex w-full items-center justify-center gap-2 rounded-[10px] border border-wa-border bg-wa-input py-3 text-sm font-medium text-wa-text transition-colors hover:bg-wa-hover disabled:opacity-70'

export const passwordHintClass = 'mt-1.5 text-xs text-wa-text2'

export const PASSWORD_HINT =
  'At least 6 characters, one uppercase letter, and one special character'
