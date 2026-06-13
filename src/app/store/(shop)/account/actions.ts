'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function updateUserProfile(formData: FormData) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );

  const { error } = await supabase.auth.updateUser({
    data: {
      full_name:     (formData.get('full_name')     as string).trim() || undefined,
      phone:         (formData.get('phone')         as string).trim() || undefined,
      company:       (formData.get('company')       as string).trim() || undefined,
      gst_number:    (formData.get('gst_number')    as string).trim().toUpperCase() || undefined,
      address_line1: (formData.get('address_line1') as string).trim() || undefined,
      address_line2: (formData.get('address_line2') as string).trim() || undefined,
      city:          (formData.get('city')          as string).trim() || undefined,
      state:         (formData.get('state')         as string).trim() || undefined,
      pincode:       (formData.get('pincode')       as string).trim() || undefined,
    },
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
