'use client';

import { useRef, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  compact?: boolean;
  dark?: boolean;
}

export default function SearchBar({ compact = false, dark = false }: Props) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(() => searchParams.get('search') ?? '');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const push = useCallback((v: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (v) p.set('search', v); else p.delete('search');
    router.push(`/store?${p.toString()}`);
  }, [router, searchParams]);

  function handleChange(v: string) {
    setValue(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => push(v), 350);
  }

  return (
    <div className={cn('relative', compact ? 'hidden sm:block' : 'w-full')}>
      <input
        type="text"
        value={value}
        onChange={e => handleChange(e.target.value)}
        placeholder={compact ? 'Search…' : 'Search services and products…'}
        className={cn(
          'rounded-lg border text-[13px] outline-none w-full transition-colors',
          compact ? 'w-52 md:w-64 h-9 px-3' : 'h-10 px-3',
          dark
            ? 'bg-white/10 border-white/15 text-white placeholder:text-white/35 focus:bg-white/15 focus:border-white/25'
            : 'bg-stone-100 border-transparent text-stone-800 placeholder:text-stone-400 focus:bg-white focus:border-stone-300',
        )}
      />
      {value && (
        <button
          onClick={() => handleChange('')}
          className={`absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors ${dark ? 'text-white/40 hover:text-white' : 'text-stone-400 hover:text-stone-700'}`}
          aria-label="Clear search">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
