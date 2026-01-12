import VentaAsistidaSeguimientoClient from "./SeguimientoClient";

export default async function VentaAsistidaSeguimientoPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const params = await searchParams;
	const raw = params?.code;
	const initialCode = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
	const rawToken = params?.token;
	const initialToken = typeof rawToken === "string" ? rawToken : Array.isArray(rawToken) ? rawToken[0] : undefined;
	return <VentaAsistidaSeguimientoClient initialCode={initialCode} initialToken={initialToken} />;
}
