export function formatTimestamp(timestamp: number) {
    const date = new Date(timestamp * 1000);
    const Y = String(date.getUTCFullYear()).slice(-2);
    const M = String(date.getUTCMonth() + 1).padStart(2, '0');
    const D = String(date.getUTCDate()).padStart(2, '0');
    const h = String(date.getUTCHours()).padStart(2, '0');
    const m = String(date.getUTCMinutes()).padStart(2, '0');
    const s = String(date.getUTCSeconds()).padStart(2, '0');
    return `${Y}${M}${D}-${h}${m}${s}`;
}

export function formatAmdBalance(balance: BigInt): string {
    const divisor = BigInt(10)**BigInt(18);
    const result = balance;
    return result.toString();
}

export function formatAimBalance(balance: BigInt): string {
    const divisor = BigInt(10)**BigInt(8);
    const result = balance;
    return result.toString();
}