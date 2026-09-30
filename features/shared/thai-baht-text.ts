const DIGITS = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const PLACES = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];
const moneyDigits = new Intl.NumberFormat("en-US", {
  useGrouping: false,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function readInteger(value: string, hasHigherGroup = false): string {
  if (value.length > 6) {
    return (
      readInteger(value.slice(0, -6), hasHigherGroup) + "ล้าน" + readInteger(value.slice(-6), true)
    );
  }
  let words = "";
  for (let index = 0; index < value.length; index++) {
    const digit = Number(value[index]);
    const place = value.length - index - 1;
    if (!digit) continue;
    if (place === 1) {
      words += (digit === 1 ? "" : digit === 2 ? "ยี่" : DIGITS[digit]) + "สิบ";
    } else if (place === 0 && digit === 1 && (words || hasHigherGroup)) {
      words += "เอ็ด";
    } else {
      words += DIGITS[digit] + PLACES[place];
    }
  }
  return words;
}

/** Use the same two-decimal rounding as the printed numeric amount. */
export function formatThaiBahtText(value: number): string {
  if (!Number.isFinite(value)) return "-";
  const [baht, satang] = moneyDigits.format(Math.abs(value)).split(".");
  const negative = value < 0 && (Number(baht) > 0 || Number(satang) > 0) ? "ลบ" : "";
  return (
    negative +
    (readInteger(baht) || "ศูนย์") +
    "บาท" +
    (satang === "00" ? "ถ้วน" : readInteger(satang) + "สตางค์")
  );
}
