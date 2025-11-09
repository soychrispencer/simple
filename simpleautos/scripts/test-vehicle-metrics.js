import { createClient } from '@supabase/supabase-js';

// Hardcoded for this script - in production use environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rkejxzdufvoknhnxuusd.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrZWp4emR1ZnZva25obnh1dXNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjA0MDcxMiwiZXhwIjoyMDcxNjE2NzEyfQ.CwqTG_gcP_bg2VG50HK_Z5yk3fq25JJUFD-Ezu_CYyI';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function applyMigrations() {
  console.log('Applying database migrations...');

  try {
    // First, try to create the vehicle_metrics table by inserting a dummy record
    // This will fail if the table doesn't exist, but we can catch that
    console.log('Testing if vehicle_metrics table exists...');
    const { error: testError } = await supabase
      .from('vehicle_metrics')
      .select('vehicle_id')
      .limit(1);

    if (testError && testError.code === 'PGRST116') {
      console.log('vehicle_metrics table does not exist, cannot create via client');
      console.log('Please apply the migration manually in Supabase dashboard or CLI');
    } else {
      console.log('vehicle_metrics table exists or can be accessed');
    }

    // Try to call the function to see if it exists
    console.log('Testing if increment_vehicle_metric function exists...');
    const { error: functionTest } = await supabase.rpc('increment_vehicle_metric', {
      p_vehicle_id: '00000000-0000-0000-0000-000000000000',
      p_metric_type: 'views'
    });

    if (functionTest && functionTest.code === 'PGRST202') {
      console.log('increment_vehicle_metric function does not exist');
      console.log('Please apply the migration manually in Supabase dashboard or CLI');
    } else {
      console.log('increment_vehicle_metric function exists or call succeeded');
    }

  } catch (e) {
    console.error('Migration test failed:', e);
  }
}

async function main() {
  await applyMigrations();
}

main().catch(console.error);