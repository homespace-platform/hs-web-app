export type InitialMeterField = "electricity" | "water";

export function validateInitialMeterReading(value: string, required: boolean, label: string): string | undefined {
  const reading = value.trim();
  if (!reading) return required ? `Vui lòng nhập ${label}.` : undefined;
  if (reading.length > 20 || !/^\d+(\.\d+)?$/.test(reading))
    return `${label} phải là số không âm, tối đa 20 ký tự (ví dụ: 0 hoặc 1250.5).`;
  return undefined;
}

/** Use committed revision data, never the text being typed, so the editor moves only after saving. */
export function missingRequiredInitialMeters(meters: Record<string, unknown> | null | undefined,
  electricityRequired: boolean, waterRequired: boolean): InitialMeterField[] {
  const missing: InitialMeterField[] = [];
  if (electricityRequired && validateInitialMeterReading(String(meters?.electricityInitial ?? ""), true, "Chỉ số điện"))
    missing.push("electricity");
  if (waterRequired && validateInitialMeterReading(String(meters?.waterInitial ?? ""), true, "Chỉ số nước"))
    missing.push("water");
  return missing;
}
