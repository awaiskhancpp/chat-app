interface AvatarProps {
  name: string
  url?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-[49px] w-[49px] text-sm',
  lg: 'h-12 w-12 text-sm',
}

export default function Avatar({ name, url, size = 'md' }: AvatarProps) {
  const initials = name.slice(0, 2).toUpperCase()
  const sizeClass = sizeClasses[size]

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-wa-green font-semibold text-white`}
    >
      {initials}
    </div>
  )
}
