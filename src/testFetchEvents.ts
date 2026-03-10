import { supabase } from './lib/supabase';

async function fetchEvents() {
  console.log('Fetching events from Supabase...');

  const { data, error } = await supabase
    .from('events')
    .select('id, title, date, link')
    .limit(5);

  if (error) {
    console.error('Error fetching events:', error);
    return;
  }

  console.log('Events fetched successfully:');
  console.log(JSON.stringify(data, null, 2));
}

fetchEvents();
