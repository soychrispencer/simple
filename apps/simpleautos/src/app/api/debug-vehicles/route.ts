import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => (cookieStore as any) });
    
    // Verificar autenticaci�n
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'No autenticado',
        authError: authError?.message 
      }, { status: 401 });
    }

    // Obtener TODOS los listings sin filtrar por owner_id
    const { data: allVehicles, error: allError } = await supabase
      .from('listings')
      .select('id, title, user_id, status, visibility, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // Obtener los listings filtrados por owner_id
    const { data: myVehicles, error: myError } = await supabase
      .from('listings')
      .select('id, title, user_id, status, visibility, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      user_id: user.id,
      user_email: user.email,
      all_vehicles_count: allVehicles?.length || 0,
      all_vehicles: allVehicles,
      my_vehicles_count: myVehicles?.length || 0,
      my_vehicles: myVehicles,
      errors: {
        all: allError?.message || null,
        mine: myError?.message || null
      }
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Error interno',
      details: error.message 
    }, { status: 500 });
  }
}


