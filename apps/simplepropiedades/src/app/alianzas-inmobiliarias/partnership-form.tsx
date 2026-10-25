'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { IconArrowRight, IconCheck, IconLoader2 } from '@tabler/icons-react';
import styles from './page.module.css';

type Operation = 'venta' | 'arriendo' | 'ambas';

export function PartnershipForm() {
    const [operation, setOperation] = useState<Operation>('ambas');
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [error, setError] = useState('');
    const requestId = useRef<string | null>(null);

    function handleChange() {
        if (status === 'error') { setStatus('idle'); setError(''); }
        requestId.current = null;
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (status === 'sending' || status === 'success') return;
        const data = new FormData(event.currentTarget);
        requestId.current ??= crypto.randomUUID();
        setStatus('sending');
        setError('');
        try {
            const response = await fetch('/api/public/partnership-inquiries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'omit',
                signal: AbortSignal.timeout(20_000),
                body: JSON.stringify({
                    requestId: requestId.current,
                    name: String(data.get('name') ?? '').trim(),
                    company: String(data.get('company') ?? '').trim(),
                    email: String(data.get('email') ?? '').trim(),
                    operation,
                    consent: data.get('consent') === 'on',
                    website: String(data.get('website') ?? ''),
                }),
            });
            const result = await response.json().catch(() => null);
            if (!response.ok || result?.ok !== true) throw new Error(result?.error || 'No pudimos registrar la solicitud. Intente nuevamente o escríbanos por WhatsApp.');
            setStatus('success');
        } catch (cause) {
            setError(cause instanceof TypeError || cause instanceof DOMException
                ? 'No pudimos confirmar la recepción. Intente nuevamente; su solicitud no se duplicará.'
                : cause instanceof Error ? cause.message : 'No pudimos conectar. Intente nuevamente.');
            setStatus('error');
        }
    }

    return (
        <div className={styles.formCard} id="evaluar-alianza" tabIndex={-1}>
            {status === 'success' ? (
                <div className={styles.success} role="status" aria-live="polite">
                    <span className={styles.successIcon}><IconCheck size={30} /></span>
                    <p className={styles.formEyebrow}>Solicitud recibida</p>
                    <h2>Gracias por dar<br />el primer paso.</h2>
                    <p>El equipo de Simple revisará su solicitud y lo contactará al correo indicado para conversar sobre su cartera.</p>
                    <a href="https://wa.me/56978623828" target="_blank" rel="noopener noreferrer">También puede hablar por WhatsApp <IconArrowRight size={16} /></a>
                </div>
            ) : (
                <>
                    <h2>Evaluemos una alianza</h2>
                    <p className={styles.formDescription}>Cuéntenos sobre su empresa y el tipo de cartera.</p>
                    <form onSubmit={handleSubmit} onChange={handleChange} aria-label="Solicitud de alianza inmobiliaria">
                        <fieldset disabled={status === 'sending'} className={styles.formFields}>
                            <label htmlFor="partner-name">Nombre<input id="partner-name" name="name" autoComplete="name" placeholder="Su nombre" required minLength={2} maxLength={120} /></label>
                            <label htmlFor="partner-company">Empresa<input id="partner-company" name="company" autoComplete="organization" placeholder="Nombre de su empresa" required minLength={2} maxLength={160} /></label>
                            <label htmlFor="partner-email">Correo de trabajo<input id="partner-email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="nombre@empresa.cl" required maxLength={254} /></label>
                            <fieldset className={styles.operationField}>
                                <legend>Tipo de operación de interés</legend>
                                <div className={styles.operationChoices}>{([
                                    { value: 'venta', label: 'Venta' }, { value: 'arriendo', label: 'Arriendo' }, { value: 'ambas', label: 'Ambas' },
                                ] as const).map((item) => (
                                    <label className={styles.operationOption} key={item.value}>
                                        <input className={styles.srOnly} name="operation" type="radio" value={item.value} checked={operation === item.value} onChange={() => setOperation(item.value)} />
                                        <span>{item.label}</span>
                                    </label>
                                ))}</div>
                            </fieldset>
                            <div className={styles.honeypot} aria-hidden="true"><label htmlFor="partner-website">Sitio web<input id="partner-website" name="website" type="text" tabIndex={-1} autoComplete="off" /></label></div>
                            <label className={styles.consent}><input type="checkbox" name="consent" required /><span>Autorizo que Simple me contacte sobre esta solicitud. <Link href="/privacidad" target="_blank" rel="noopener noreferrer">Privacidad</Link>.</span></label>
                        </fieldset>
                        {error ? <p className={styles.formError} role="alert">{error}</p> : null}
                        <button type="submit" className={styles.submitButton} disabled={status === 'sending'}>
                            {status === 'sending' ? <><IconLoader2 size={18} className={styles.spinner} /> Enviando solicitud…</> : <>Quiero evaluar una alianza <IconArrowRight size={18} /></>}
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}
