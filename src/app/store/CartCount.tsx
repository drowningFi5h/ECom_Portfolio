'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function CartCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count: c } = await supabase
        .from('cart_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setCount(c ?? 0);
    }
    load();
  }, []);

  if (count === 0) return null;
  return (
    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-[#c78336] text-white text-[10px] font-bold flex items-center justify-center px-1">
      {count > 9 ? '9+' : count}
    </span>
  );
}
