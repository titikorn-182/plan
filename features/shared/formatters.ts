const thaiIntegerFormatter = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 0,
});
const thaiDecimalFormatter = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const thaiMoneyFormatter = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const formatterCache = new Map<string, Intl.NumberFormat>();

export function formatThaiNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  const key = JSON.stringify(options);
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("th-TH", options);
    formatterCache.set(key, formatter);
  }
  return formatter.format(value);
}

export function formatThaiInteger(value: number): string {
  return thaiIntegerFormatter.format(value);
}

export function formatThaiDecimal(value: number): string {
  return thaiDecimalFormatter.format(value);
}

export function formatMillionBaht(value: number): string {
  return thaiMoneyFormatter.format(value / 1_000_000);
}

export function formatThaiMoney(value: number): string {
  return thaiMoneyFormatter.format(value);
}

export function formatPercent(value: number): string {
  return `${formatThaiDecimal(value)}%`;
}
