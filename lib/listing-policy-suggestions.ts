import data from "@/data/listing-policy-suggestions.json";
import type { ListingPolicyDefinition, ListingPolicyInput } from "@/types/listing-policy.type";

// category -> policy code -> key (a PERMISSION choice, "note" for INTEGER, "value" for TEXT)
const catalog: Record<string, Record<string, Record<string, string>>> = data;

export function policySuggestion(category: string, code: string, key: string): string | undefined {
  return catalog[category]?.[code]?.[key];
}

function isSuggestion(code: string, text: string) {
  return Object.values(catalog).some(codes => Object.values(codes[code] ?? {}).includes(text));
}

/** True when overwriting cannot lose user-written text. */
export function canReplacePolicyText(code: string, text = "") {
  return !text.trim() || isSuggestion(code, text);
}

export function selectPermission(row: ListingPolicyInput, value: string, category: string): ListingPolicyInput {
  const note = canReplacePolicyText(row.code, row.note) ? policySuggestion(category, row.code, value) ?? "" : row.note;
  return { ...row, value, note };
}

/** Fixed by the platform, same as the core-api fallbacks (ContractDataBuilder). Landlords cannot change them. */
export const systemPolicyValues: Record<string, string> = {
  propertyInspectionNotice: "24",
  noticeDaysBeforeTermination: "30",
  depositRefundDays: "15",
};

/** What the form shows and submits: system rules override anything typed or previously saved. */
export function withSystemRules(rows: ListingPolicyInput[], definitions: ListingPolicyDefinition[], category: string): ListingPolicyInput[] {
  const fixed = definitions.filter(d => d.code in systemPolicyValues)
    .map(d => ({ code: d.code, value: systemPolicyValues[d.code], note: policySuggestion(category, d.code, "note") ?? "" }));
  return fixed.length ? [...rows.filter(r => !fixed.some(f => f.code === r.code)), ...fixed] : rows;
}

/** New listings only: unanswered permissions start as ALLOWED and text rules are prefilled. A row the user touched (even cleared) stays. */
export function withDefaultSuggestions(rows: ListingPolicyInput[], definitions: ListingPolicyDefinition[], category: string): ListingPolicyInput[] {
  const added = definitions.filter(d => !rows.some(r => r.code === d.code)).flatMap(d => {
    const blank = { code: d.code, value: "", note: "" };
    if (d.valueType === "PERMISSION") return !d.choices?.length || d.choices.some(c => c.value === "ALLOWED") ? [selectPermission(blank, "ALLOWED", category)] : [];
    const value = d.valueType === "TEXT" ? policySuggestion(category, d.code, "value") : undefined;
    return value ? [{ ...blank, value }] : [];
  });
  return added.length ? [...rows, ...added] : rows;
}

/** For a user-initiated category change only; never run it on loaded listing data. */
export function swapPolicySuggestions(rows: ListingPolicyInput[], category: string): ListingPolicyInput[] {
  return rows.map(row => {
    const value = policySuggestion(category, row.code, "value");
    if (value) return isSuggestion(row.code, row.value) ? { ...row, value } : row;
    const note = policySuggestion(category, row.code, "note") ?? policySuggestion(category, row.code, row.value);
    return note && row.note && isSuggestion(row.code, row.note) ? { ...row, note } : row;
  });
}
