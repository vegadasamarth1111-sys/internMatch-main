interface DefaultAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  initials?: string;
}

export function DefaultAvatar({ size = 'md', initials = 'U' }: DefaultAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold`}
    >
      {initials}
    </div>
  );
}
