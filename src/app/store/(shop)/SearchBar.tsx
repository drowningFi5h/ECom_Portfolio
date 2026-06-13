'use client';

import { useRef, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props {
  compact?: boolean;
}

export default function SearchBar({ compact = false }: Props) {
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
      <Input
        type="text"
        value={value}
        onChange={e => handleChange(e.target.value)}
        placeholder={compact ? 'Search…' : 'Search services and products…'}
        className={cn(
          'pr-7',
          compact
            ? 'w-52 md:w-64 h-9 bg-stone-100 border-transparent focus-visible:bg-white focus-visible:border-stone-300'
            : 'h-10 bg-white',
        )}
      />

      {value && (
        <button
          onClick={() => handleChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-stone-400 hover:text-stone-700 transition-colors"
          aria-label="Clear search">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
