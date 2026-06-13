import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-lg border border-stone-200 bg-white pl-3 pr-3 py-1 text-[13px] text-stone-900 shadow-none transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0b3b46]/40 focus-visible:border-[#0b3b46]/50 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
