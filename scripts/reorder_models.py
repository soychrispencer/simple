import re
from pathlib import Path

FILE_PATH = Path(r"c:\Users\chris\OneDrive\Desktop\Simple\backend\supabase\migrations\20251114000001_seed_data_complete.sql")

def load_models(sql: str):
    pattern = re.compile(
        r"\(\(SELECT id FROM public\.brands WHERE name = '([^']+)'\), '([^']+)', \(SELECT id FROM public\.vehicle_types WHERE name = '([^']+)'(?: LIMIT 1)?\), ([^,\)]+), ([^\)]+)\)",
        re.MULTILINE,
    )
    entries = []
    seen = set()
    for match in pattern.finditer(sql):
        brand, model, vtype, year_from, year_to = match.groups()
        key = (brand, model)
        if key in seen:
            continue
        seen.add(key)
        entries.append(
            {
                "brand": brand,
                "model": model,
                "type": vtype,
                "year_from": year_from.strip(),
                "year_to": year_to.strip(),
            }
        )
    return entries


def escape(value: str) -> str:
    return value.replace("'", "''")


def build_insert_block(entries):
    type_order = [
        'Auto',
        'SUV',
        'Pickup',
        'Van',
        'Moto',
        'Camión',
        'Bus',
        'Maquinaria',
        'Otro',
    ]
    grouped = {t: [] for t in type_order}
    for entry in entries:
        grouped.setdefault(entry['type'], []).append(entry)
    for models in grouped.values():
        models.sort(key=lambda x: (x['brand'], x['model']))
    lines = []
    lines.append('-- ===========================================')
    lines.append('-- MODELOS POR TIPO DE VEHÍCULO')
    lines.append('-- ===========================================')
    lines.append('')
    lines.append('DO $$')
    lines.append('BEGIN')
    for vtype in type_order:
        models = grouped.get(vtype) or []
        if not models:
            continue
        lines.append(f"    -- {vtype}s" if vtype not in ['Camión', 'Bus'] else f"    -- {vtype}s")
        lines.append('    INSERT INTO public.models (brand_id, name, vehicle_type_id, year_from, year_to) VALUES')
        row_lines = []
        for entry in models:
            row = (
                "        ((SELECT id FROM public.brands WHERE name = '{brand}'), '{model}', "
                "(SELECT id FROM public.vehicle_types WHERE name = '{vtype}' LIMIT 1), {year_from}, {year_to})"
            ).format(
                brand=escape(entry['brand']),
                model=escape(entry['model']),
                vtype=entry['type'],
                year_from=entry['year_from'],
                year_to=entry['year_to'],
            )
            row_lines.append(row)
        lines.append(',\n'.join(row_lines))
        lines.append('    ON CONFLICT (brand_id, name) DO NOTHING;')
        lines.append('')
    lines.append('END;')
    lines.append('$$ LANGUAGE plpgsql;')
    lines.append('')
    return '\r\n'.join(lines)


def main():
    sql = FILE_PATH.read_text(encoding='utf-8')
    entries = load_models(sql)
    if not entries:
        raise SystemExit('No se encontraron modelos para reorganizar.')
    block = build_insert_block(entries)
    start_marker = '-- ===========================================\r\n-- EJECUCIÓN DEL SEED DATA'
    end_marker = '-- Asegurar que la columna features'
    start_idx = sql.find(start_marker)
    if start_idx == -1:
        raise SystemExit('No se encontró el inicio del bloque de modelos.')
    end_idx = sql.find(end_marker, start_idx)
    if end_idx == -1:
        raise SystemExit('No se encontró el final del bloque de modelos.')
    new_sql = sql[:start_idx] + block + '\r\n' + sql[end_idx:]
    FILE_PATH.write_text(new_sql, encoding='utf-8')
    print(f'Se reorganizaron {len(entries)} modelos por tipo de vehículo.')


if __name__ == '__main__':
    main()
