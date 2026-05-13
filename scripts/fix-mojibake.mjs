#!/usr/bin/env node
// Repara mojibake originado por interpretar UTF-8 como Windows-1252 (CP1252)
// y guardarlo de nuevo como UTF-8.
//
// Algoritmo:
// 1) Para cada char Unicode, intentar mapearlo de vuelta a su byte CP1252 original.
// 2) Acumular secuencias de bytes consecutivos.
// 3) Si la secuencia es UTF-8 válido y representa texto razonable, sustituirla.

import { readFile, writeFile } from 'node:fs/promises';

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('Usage: node fix-mojibake.mjs <file>...');
    process.exit(2);
}

// Tabla CP1252 → byte. Cubre 0x80-0xFF.
const CP1252_HIGH = {
    0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84,
    0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88,
    0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C,
    0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93,
    0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
    0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
    0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F,
};

function charToByte(code) {
    if (code <= 0x7F) return code;
    if (code >= 0xA0 && code <= 0xFF) return code;
    if (code in CP1252_HIGH) return CP1252_HIGH[code];
    // Fallback: chars en C1 control range (U+0080-U+009F) que no están en CP1252
    // estándar suelen mapear directamente al byte equivalente en archivos mal codificados.
    if (code >= 0x80 && code <= 0x9F) return code;
    return null;
}

function tryDecodeRange(bytes) {
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
        return null;
    }
}

function fixMojibake(input) {
    const out = [];
    const len = input.length;
    let i = 0;
    while (i < len) {
        const code = input.charCodeAt(i);
        // Solo intentar conversión si el char está fuera de ASCII puro
        // y es un posible byte UTF-8 lead (0xC2-0xF4 cuando se interpreta como byte).
        const firstByte = charToByte(code);
        if (firstByte !== null && firstByte >= 0xC2 && firstByte <= 0xF4) {
            // Determinar longitud UTF-8 esperada
            let expected;
            if (firstByte >= 0xF0) expected = 4;
            else if (firstByte >= 0xE0) expected = 3;
            else expected = 2;
            // Recolectar bytes
            const bytes = [firstByte];
            let j = i + 1;
            for (let k = 1; k < expected && j < len; k++, j++) {
                const b = charToByte(input.charCodeAt(j));
                if (b === null || b < 0x80 || b > 0xBF) {
                    bytes.length = 0;
                    break;
                }
                bytes.push(b);
            }
            if (bytes.length === expected) {
                const decoded = tryDecodeRange(new Uint8Array(bytes));
                if (decoded && decoded.length >= 1) {
                    // Solo aceptar si no quedan replacement chars
                    if (!decoded.includes('\uFFFD')) {
                        out.push(decoded);
                        i = j;
                        continue;
                    }
                }
            }
        }
        out.push(input[i]);
        i++;
    }
    return out.join('');
}

let updated = 0;
for (const file of args) {
    const original = await readFile(file, 'utf8');
    const fixed = fixMojibake(original);
    if (fixed !== original) {
        await writeFile(file, fixed, 'utf8');
        const diff = original.length - fixed.length;
        console.log(`fixed ${file} (${diff} chars saved)`);
        updated++;
    }
}
console.log(`Files updated: ${updated}`);
