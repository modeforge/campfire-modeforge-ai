export async function getRsvpCount(eventSlug: string): Promise<number> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('placeholder')) {
      return 0;
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('campfire_rsvps')
      .select('guest_count')
      .eq('event_slug', eventSlug);

    if (error || !data) return 0;

    return data.reduce((sum, row) => sum + (row.guest_count || 0), 0);
  } catch {
    return 0;
  }
}
