import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logError, logInfo } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  // Verificar autorizaci�n del cron job
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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


