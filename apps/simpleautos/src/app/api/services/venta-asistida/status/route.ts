import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/serverSupabase';

const QuerySchema = z.object({
	code: z.string().trim().min(3).max(64).optional(),
	token: z.string().trim().min(20).max(200).optional(),
	email: z.string().trim().email().max(120).optional(),
});

function getClientIp(request: Request) {
	return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
}

type RateState = { count: number; resetAt: number };

function takeRateLimit(key: string, opts: { windowMs: number; max: number }): { ok: true } | { ok: false; retryAfterSeconds: number } {
	const g = globalThis as any;
	const store: Map<string, RateState> = g.__ventaAsistidaStatusRateLimit ?? (g.__ventaAsistidaStatusRateLimit = new Map());

	const now = Date.now();
	const current = store.get(key);
	if (!current || current.resetAt <= now) {
		store.set(key, { count: 1, resetAt: now + opts.windowMs });
		return { ok: true };
	}

	if (current.count >= opts.max) {
		return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
	}

	current.count += 1;
	store.set(key, current);
	return { ok: true };
}

export async function GET(request: Request) {
	// Rate limit básico anti-bruteforce (memoria del runtime)
	const ip = getClientIp(request);
	if (ip) {
		const maxPer5Min = Number(process.env.VENTA_ASISTIDA_STATUS_MAX_PER_5MIN || 40);
		const rl = takeRateLimit(`ip:${ip}`, { windowMs: 5 * 60 * 1000, max: Number.isFinite(maxPer5Min) ? maxPer5Min : 40 });
		if (!rl.ok) {
			return NextResponse.json(
				{ error: 'Demasiadas consultas. Intenta más tarde.' },
				{ status: 429, headers: { 'retry-after': String(rl.retryAfterSeconds) } }
			);
		}
	}

	const url = new URL(request.url);
	const parsed = QuerySchema.safeParse({
		code: url.searchParams.get('code') || undefined,
		token: url.searchParams.get('token') || undefined,
		email: url.searchParams.get('email') || undefined,
	});

	if (!parsed.success) {
		return NextResponse.json({ error: 'Query inválida' }, { status: 400 });
	}

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!supabaseUrl || !serviceRoleKey) {
		return NextResponse.json({ error: 'Supabase env no configurado' }, { status: 500 });
	}

	let authUserId: string | null = null;
	try {
		const sessionSupabase = await createServerClient();
		const { data } = await sessionSupabase.auth.getUser();
		authUserId = data?.user?.id ?? null;
	} catch {
		authUserId = null;
	}

	const admin = createClient(supabaseUrl, serviceRoleKey, {
		auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
	});

	const { code, token, email } = parsed.data;

	// Caso 1: usuario logueado sin code -> devuelve todas sus solicitudes
	if (authUserId && !code) {
		const { data, error } = await admin
			.from('vehicle_sale_service_requests')
			.select('id,created_at,updated_at,status,reference_code')
			.eq('user_id', authUserId)
			.order('created_at', { ascending: false })
			.limit(50);

		if (error) {
			return NextResponse.json({ error: 'No se pudo cargar' }, { status: 500 });
		}
		return NextResponse.json({ ok: true, mode: 'list', data: data ?? [] }, { status: 200 });
	}

	// Caso 2: consulta por token (preferente)
	if (token) {
		const { data: row, error } = await admin
			.from('vehicle_sale_service_requests')
			.select('id,created_at,updated_at,status,reference_code')
			.eq('tracking_token', token)
			.maybeSingle();

		if (error || !row) {
			return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
		}

		return NextResponse.json(
			{
				ok: true,
				mode: 'single',
				data: {
					id: row.id,
					reference_code: (row as any).reference_code,
					status: (row as any).status,
					created_at: (row as any).created_at,
					updated_at: (row as any).updated_at,
				},
			},
			{ status: 200 }
		);
	}

	// Caso 3: consulta por code (logueado o no)
	if (!code) {
		return NextResponse.json({ error: 'Falta code o token' }, { status: 400 });
	}

	// Para usuarios no logueados, exigimos email para verificación.
	if (!authUserId && !email) {
		return NextResponse.json({ error: 'Falta email' }, { status: 400 });
	}

	const { data: row, error } = await admin
		.from('vehicle_sale_service_requests')
		.select('id,created_at,updated_at,status,reference_code,user_id,owner_email')
		.eq('reference_code', code)
		.maybeSingle();

	if (error || !row) {
		return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
	}

	// Autorización:
	// - Si está logueado: debe ser dueño
	// - Si no está logueado: debe coincidir email
	if (authUserId) {
		if (String((row as any).user_id || '') !== String(authUserId)) {
			return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
		}
	} else {
		const rowEmail = String((row as any).owner_email || '').trim().toLowerCase();
		const inputEmail = String(email || '').trim().toLowerCase();
		// No revelar si el código existe: si no coincide, responder como no encontrada.
		if (!inputEmail || !rowEmail || rowEmail !== inputEmail) {
			return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
		}
	}

	return NextResponse.json(
		{
			ok: true,
			mode: 'single',
			data: {
				id: row.id,
				reference_code: (row as any).reference_code,
				status: (row as any).status,
				created_at: (row as any).created_at,
				updated_at: (row as any).updated_at,
			},
		},
		{ status: 200 }
	);
}
