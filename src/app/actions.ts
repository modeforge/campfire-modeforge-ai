'use server';

import { z } from 'zod';

const rsvpSchema = z.object({
  eventSlug: z.string().min(1),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  guestCount: z.coerce.number().int().min(1, 'At least 1 guest required'),
});

export type RsvpFormState = {
  success: boolean;
  error?: string;
};

export async function submitRsvp(
  prevState: RsvpFormState,
  formData: FormData
): Promise<RsvpFormState> {
  try {
    const data = rsvpSchema.parse({
      eventSlug: formData.get('eventSlug'),
      name: formData.get('name'),
      email: formData.get('email'),
      guestCount: formData.get('guestCount'),
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('placeholder')) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { error } = await supabase.from('campfire_rsvps').insert({
        event_slug: data.eventSlug,
        name: data.name,
        email: data.email,
        guest_count: data.guestCount,
      });
      if (error) {
        console.error('RSVP insert error:', error);
        return { success: false, error: 'Something went wrong. Please try again.' };
      }
    }

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error('RSVP error:', error);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}
