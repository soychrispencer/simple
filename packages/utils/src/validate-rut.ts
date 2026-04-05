export function validateRut(rut: string): boolean {
    if (!/^[0-9]+-[0-9kK]{1}$/.test(rut)) return false;
    const [num, dv] = rut.split('-');
    let sum = 0;
    let mul = 2;
    for (let i = num.length - 1; i >= 0; i--) {
        sum += parseInt(num[i]) * mul;
        mul = mul === 7 ? 2 : mul + 1;
    }
    const res = 11 - (sum % 11);
    const calculatedDv = res === 11 ? '0' : res === 10 ? 'K' : res.toString();
    return calculatedDv.toUpperCase() === dv.toUpperCase();
}

export function formatRut(rut: string): string {
    const raw = rut.replace(/[^\dkK]/g, '');
    if (raw.length < 2) return raw;
    const dv = raw.slice(-1);
    const num = raw.slice(0, -1);
    return `${num}-${dv}`;
}
