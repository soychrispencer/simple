export type ClassValue =
  | string
  | number
  | false
  | null
  | undefined
  | ClassValue[]
  | Record<string, boolean | null | undefined>;

function appendClass(value: ClassValue, target: string[]) {
  if (!value) return;

  if (typeof value === "string" || typeof value === "number") {
    target.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) appendClass(item, target);
    return;
  }

  if (typeof value === "object") {
    for (const [key, enabled] of Object.entries(value)) {
      if (enabled) target.push(key);
    }
  }
}

export function cn(...values: ClassValue[]): string {
  const tokens: string[] = [];
  for (const value of values) appendClass(value, tokens);
  return tokens.join(" ").trim();
}
