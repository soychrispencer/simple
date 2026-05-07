'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { IconArrowLeft, IconArrowRight, IconMapPin, IconMoon, IconSun } from '@tabler/icons-react';
import { BrandLogo } from '@simple/ui';
import type { MariachiComunaConfig } from '@/lib/mariachis-comunas';

const REGISTRO_CLIENTE = `/auth/registro?tipo=cliente&next=${encodeURIComponent('/solicitar')}`;

type Props = { config: MariachiComunaConfig };

export function ComunaMariachisLanding({ config }: Props) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, var(--surface) 0%, var(--bg) 360px)' }}>
      <nav className="flex items-center justify-between px-4 sm:px-8 py-3 border-b bg-[var(--surface)]/90 backdrop-blur-sm" style={{ borderColor: 'var(--border)' }}>
        <Link href="/" className="group shrink-0 inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--fg-secondary)' }}>
          <IconArrowLeft size={18} aria-hidden />
          <span className="hidden sm:inline">Inicio</span>
        </Link>
        <BrandLogo appId="simpleserenatas" className="min-w-0" />
        <div className="flex items-center gap-2">
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-subtle)]"
              aria-label="Cambiar tema"
              style={{ color: 'var(--fg-secondary)' }}
            >
              {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </button>
          )}
          <Link
            href={REGISTRO_CLIENTE}
            className="serenatas-interactive px-4 py-2 rounded-xl font-medium text-sm transition-colors hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
          >
            Solicitar
          </Link>
        </div>
      </nav>

      <header className="border-b" style={{ borderColor: 'var(--border)', background: 'linear-gradient(145deg, var(--surface) 0%, var(--bg-subtle) 100%)' }}>
        <div className="max-w-3xl mx-auto px-6 py-14 lg:py-16">
          <p className="inline-flex items-center gap-2 text-xs font-medium rounded-full px-3 py-1 mb-4" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
            <IconMapPin size={14} aria-hidden /> {config.comunName}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-5" style={{ color: 'var(--fg)' }}>
            Mariachis y serenatas a domicilio en {config.comunName}
          </h1>
          <p className="text-lg leading-relaxed mb-6" style={{ color: 'var(--fg-secondary)' }}>
            {config.heroLead}
          </p>
          <p className="text-sm mb-8" style={{ color: 'var(--fg-muted)' }}>
            Tarifas orientativas desde <span className="font-semibold" style={{ color: 'var(--fg)' }}>$50.000</span>. El monto final depende de duración, día y traslado dentro de la comuna o hacia sectores
            colindantes.
          </p>
          <Link
            href={REGISTRO_CLIENTE}
            className="serenatas-interactive inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-semibold transition-all hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
          >
            Solicitar ahora
            <IconArrowRight size={20} aria-hidden />
          </Link>
        </div>
      </header>

      <section className="py-12 px-6 max-w-3xl mx-auto">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--fg)' }}>
          Detalles para coordinar en {config.comunName}
        </h2>
        <ul className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
          {config.localHighlights.map((line) => (
            <li key={line} className="flex gap-2">
              <span style={{ color: 'var(--accent)' }} aria-hidden>
                ·
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="py-10 px-6 border-t" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--fg)' }}>
              ¿Fuera de {config.comunName}?
            </h2>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
              También puedes partir desde la landing general o elegir otra comuna cercana.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="text-sm font-medium underline underline-offset-2" style={{ color: 'var(--accent)' }}>
              Inicio cliente
            </Link>
            <Link href="/profesionales" className="text-sm font-medium" style={{ color: 'var(--fg-secondary)' }}>
              Profesionales
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-8 px-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <p className="text-center text-xs" style={{ color: 'var(--fg-muted)' }}>
          © SimpleSerenatas · {config.comunName}
        </p>
      </footer>
    </div>
  );
}
