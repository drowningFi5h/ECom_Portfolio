import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[72px] w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-900 shadow-none placeholder:text-stone-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0b3b46]/40 focus-visible:border-[#0b3b46]/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export { Textarea };
