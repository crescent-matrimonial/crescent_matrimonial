import { User } from 'lucide-react';
import type { PersonWithDetails } from '@/lib/types';

interface AvatarProps {
  person: Pick<PersonWithDetails, 'full_name' | 'profile_photo_url' | 'gender'>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

export function Avatar({ person, size = 'md' }: AvatarProps) {
  const name = person.full_name || 'Unnamed';
  const initials = name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2);
  const ringColor = person.gender === 'male' ? 'ring-sky-500/40' : 'ring-rose-500/40';
  const bgColor = person.gender === 'male' ? 'bg-sky-950' : 'bg-rose-950';

  if (person.profile_photo_url) {
    return (
      <img
        src={person.profile_photo_url}
        alt={name}
        className={`${sizeMap[size]} rounded-full object-cover ring-2 ${ringColor}`}
      />
    );
  }
  return (
    <div
      className={`${sizeMap[size]} ${bgColor} flex items-center justify-center rounded-full font-semibold uppercase tracking-wide text-slate-200 ring-2 ${ringColor}`}
    >
      {initials || <User className="h-1/2 w-1/2 opacity-70" />}
    </div>
  );
}
