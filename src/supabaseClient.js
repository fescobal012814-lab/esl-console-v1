import { createClient } from '@supabase/supabase-js';

// These two values are meant to be public — Supabase's own dashboard labels the
// "Publishable key" as safe to use in browser code. Real protection comes from the
// app's own teacher passcode / student PIN screen, not from hiding these.
const SUPABASE_URL = 'https://dnirdutajbsdghddbnll.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable__5HIncMsKirnv59TFgjx3w_I9NHIFMT';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
