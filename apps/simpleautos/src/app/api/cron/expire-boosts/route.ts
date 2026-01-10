import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logError, logInfo } from '@/lib/logger';

export async function GET(request: Request) {
  // Verificar autorizacin del cron job
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Supabase env no configurado' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Llamar a la funci�n de Supabase que expira boosts
    const { data, error } = await supabase.rpc('expire_old_boosts');

    if (error) {
      logError('[CRON] Error expiring boosts', error);
      throw error;
    }

    const result = Array.isArray(data) && data.length > 0 ? data[0] : { expired_count: 0, slots_cleaned: 0 };

    logInfo('[CRON] Boost expiration completed', {
      timestamp: new Date().toISOString(),
      expired: result.expired_count,
      slots_cleaned: result.slots_cleaned,
    });

    return NextResponse.json({
      success: true,
      expired_count: result.expired_count,
      slots_cleaned: result.slots_cleaned,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logError('[CRON] Fatal error', error);
    return NextResponse.json(
      { 
        error: error.message,
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}


