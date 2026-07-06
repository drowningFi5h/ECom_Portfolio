'use client';

import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function RefreshButton({ lastSynced }: { lastSynced: string }) {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);

  function handleRefresh() {
    setSpinning(true);
    router.refresh();
    // Stop spinner after the refresh resolves (Next.js doesn't expose a callback,
    // so 1.5s is long enough for the server round-trip to finish)
    setTimeout(() => setSpinning(false), 1500);
  }

  return (
    <button
      onClick={handleRefresh}
      title="Refresh dashboard data"
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-opacity hover:opacity-80 active:scale-95"
      style={{
        background: 'var(--amz-teal-light)',
        color: 'var(--amz-teal-dark)',
        borderColor: 'var(--amz-teal)',
      }}
    >
      <RefreshCw className={`h-3 w-3 ${spinning ? 'animate-spin' : ''}`} />
      {spinning ? 'Refreshing…' : 'Live data'}
    </button>
  );
}
