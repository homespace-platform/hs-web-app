interface InvoicePeriod {
  periodStart: string;
  periodEndExclusive: string;
}

function nextMonthStart(month: string): string | undefined {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || monthNumber < 1 || monthNumber > 12) return undefined;

  return monthNumber === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(monthNumber + 1).padStart(2, "0")}-01`;
}

export function invoiceMatchesPeriodFilter(
  invoice: InvoicePeriod,
  selectedDate?: string,
  selectedMonth?: string,
): boolean {
  if (selectedDate) {
    return invoice.periodStart <= selectedDate && selectedDate < invoice.periodEndExclusive;
  }

  if (!selectedMonth) return true;

  const monthEndExclusive = nextMonthStart(selectedMonth);
  if (!monthEndExclusive) return true;

  const monthStart = `${selectedMonth}-01`;
  return invoice.periodStart < monthEndExclusive && invoice.periodEndExclusive > monthStart;
}
