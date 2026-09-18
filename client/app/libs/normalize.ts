export const normalizeValues = (raw: any): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw))
    return raw
      .map((v: any) => (typeof v === "string" ? v : v?.value ?? v?.label ?? ""))
      .map((s: string) => String(s).trim())
      .filter(Boolean);
  if (typeof raw === "object") {
    // Option object single?
    if ((raw as any).value) return [String((raw as any).value).trim()].filter(Boolean);
  }
  return String(raw)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};
