import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testQuery() {
  try {
    console.log('Testing vehicles query...');
    const result = await supabase
      .from('vehicles')
      .select('id,title,specs')
      .limit(1);

    if (result.error) {
      console.error('Query error:', result.error);
    } else {
      console.log('Query successful:', result.data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testQuery();