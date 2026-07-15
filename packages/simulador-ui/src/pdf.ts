/**
 * Resumen imprimible de una simulación (jsPDF vía import dinámico).
 */

export type SimulacionPdfFila = { label: string; valor: string };

export type SimulacionPdfSeccion = {
    titulo: string;
    filas: SimulacionPdfFila[];
};

export type SimulacionPdfInput = {
    marca: string;
    titulo: string;
    referencia?: string;
    resumen: { etiqueta: string; valor: string; detalle?: string };
    secciones: SimulacionPdfSeccion[];
    advertencias?: string[];
    disclaimer: string;
    nombreArchivo: string;
};

function hoyChile(): string {
    return new Date().toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function sanitizeFilename(name: string): string {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
}

export async function descargarSimulacionPdf(input: SimulacionPdfInput): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 18;
    const pageW = doc.internal.pageSize.getWidth();
    const maxW = pageW - margin * 2;
    let y = 20;

    const ensureSpace = (needed: number) => {
        if (y + needed > 280) {
            doc.addPage();
            y = 20;
        }
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text(input.marca, margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(hoyChile(), margin, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(20, 20, 20);
    doc.text(input.titulo, margin, y);
    y += 8;

    if (input.referencia) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(70, 70, 70);
        const lines = doc.splitTextToSize(`Referencia: ${input.referencia}`, maxW);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 4;
    }

    ensureSpace(28);
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(margin, y, maxW, 24, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(input.resumen.etiqueta, margin + 4, y + 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(20, 20, 20);
    doc.text(input.resumen.valor, margin + 4, y + 16);
    if (input.resumen.detalle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(input.resumen.detalle, margin + 4, y + 21);
    }
    y += 30;

    for (const seccion of input.secciones) {
        ensureSpace(14 + seccion.filas.length * 7);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 30);
        doc.text(seccion.titulo, margin, y);
        y += 6;

        for (const fila of seccion.filas) {
            ensureSpace(8);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(90, 90, 90);
            doc.text(fila.label, margin, y);
            doc.setTextColor(25, 25, 25);
            doc.text(fila.valor, pageW - margin, y, { align: 'right' });
            y += 6;
        }
        y += 4;
    }

    if (input.advertencias?.length) {
        ensureSpace(12 + input.advertencias.length * 8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 30);
        doc.text('Alertas', margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(120, 80, 20);
        for (const aviso of input.advertencias) {
            const lines = doc.splitTextToSize(`• ${aviso}`, maxW);
            ensureSpace(lines.length * 4.5 + 2);
            doc.text(lines, margin, y);
            y += lines.length * 4.5 + 2;
        }
        y += 2;
    }

    ensureSpace(20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    const disc = doc.splitTextToSize(input.disclaimer, maxW);
    doc.text(disc, margin, y);

    const filename = sanitizeFilename(input.nombreArchivo.endsWith('.pdf')
        ? input.nombreArchivo
        : `${input.nombreArchivo}.pdf`);
    doc.save(filename);
}
