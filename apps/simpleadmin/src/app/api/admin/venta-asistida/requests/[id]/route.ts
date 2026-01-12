import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getStaffGate } from '@/lib/admin/auth';
import { createAdminServerClient } from '@/lib/supabase/adminServerClient';

const PatchSchema = z.object({
	status: z.string().trim().min(1).max(40).optional(),
	adminNotes: z
		.string()
		.trim()
		.max(5000)
		.optional()
		.or(z.literal(''))
		.transform((v) => (v ? v : undefined)),
	contactedAt: z.string().datetime().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
	const gate = await getStaffGate();
	if (gate.status === 'anon') {
		return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
	}
	if (gate.status !== 'staff') {
		return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
	}

	const { id } = await ctx.params;
	const admin = createAdminServerClient();

	const { data: beforeRow } = await admin
		.from('vehicle_sale_service_requests')
		.select('id,user_id,reference_code,status')
		.eq('id', id)
		.maybeSingle();
	const body = await request.json().catch(() => null);
	const parsed = PatchSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
	}

	const update: Record<string, unknown> = {};
	if (parsed.data.status) update.status = parsed.data.status;
	if (parsed.data.adminNotes !== undefined) update.admin_notes = parsed.data.adminNotes ?? null;
	if (parsed.data.contactedAt) update.contacted_at = parsed.data.contactedAt;

	if (Object.keys(update).length === 0) {
		return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
	}

	const { error } = await admin.from('vehicle_sale_service_requests').update(update).eq('id', id);

	if (error) {
		return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 });
	}

	// Notificar al usuario (si existe) cuando cambia el estado
	try {
		const nextStatus = typeof parsed.data.status === 'string' ? parsed.data.status : undefined;
		const prevStatus = typeof (beforeRow as any)?.status === 'string' ? String((beforeRow as any).status) : undefined;
		const userId = (beforeRow as any)?.user_id ? String((beforeRow as any).user_id) : null;
		const referenceCode = (beforeRow as any)?.reference_code ? String((beforeRow as any).reference_code) : null;

		if (userId && nextStatus && prevStatus && nextStatus !== prevStatus) {
			await admin.from('notifications').insert({
				user_id: userId,
				type: 'venta_asistida_status',
				title: 'Actualización de tu solicitud de venta asistida',
				content: referenceCode
					? `Tu solicitud ${referenceCode} cambió a estado: ${nextStatus}.`
					: `Tu solicitud cambió a estado: ${nextStatus}.`,
				data: {
					service: 'venta_asistida',
					request_id: id,
					reference_code: referenceCode,
					status: nextStatus,
				},
				is_read: false,
			});
		}
	} catch {
		// ignore notification errors
	}

	return NextResponse.json({ ok: true }, { status: 200 });
}
