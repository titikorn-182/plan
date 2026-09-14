export const removeAt = <T>(items: readonly T[], index: number): T[] =>
  items.filter((_, itemIndex) => itemIndex !== index);

export const replaceAt = <T>(items: readonly T[], index: number, value: T): T[] =>
  items.map((item, itemIndex) => (itemIndex === index ? value : item));
