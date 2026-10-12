import { useId } from "react";

type Reading = string | number | undefined;
const readingNumber = (value: Reading) => value == null || String(value).trim() === ""
  ? undefined : Number.isFinite(Number(value)) ? Number(value) : undefined;
const format = (value: Reading) => {
  const number = readingNumber(value);
  return number == null ? "Chưa có" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(number);
};

export function MeterReadingInput({ name, unit, start, end, onChange }: {
  name: "điện" | "nước"; unit: "kWh" | "m³"; start: Reading; end: string;
  onChange: (value: string) => void;
}) {
  const inputId = useId();
  const startNumber = readingNumber(start);
  const endNumber = readingNumber(end);
  const consumption = startNumber != null && endNumber != null
    ? Math.round((endNumber - startNumber) * 1000) / 1000 : undefined;

  return <div className="space-y-3 rounded-xl border border-border bg-background p-3">
    <p className="text-sm font-semibold">Công tơ {name}</p>
    <div className="grid grid-cols-2 gap-3 text-xs">
      <div>
        <p className="text-muted-foreground">Chỉ số {name} đầu kỳ ({unit})</p>
        <p className="mt-1 font-semibold tabular-nums">{format(start)}</p>
        <p className="mt-1 text-muted-foreground">Số đã ghi nhận từ đầu kỳ, không cần nhập lại.</p>
      </div>
      <div>
        <label htmlFor={inputId} className="font-medium">Chỉ số {name} cuối kỳ ({unit})</label>
        <input id={inputId} type="number" min={startNumber ?? 0} step="0.001" value={end}
          aria-describedby={`${inputId}-help`} placeholder="Nhập số trên công tơ"
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
      </div>
    </div>
    <p id={`${inputId}-help`} className="text-xs text-muted-foreground">
      Nhập số đang hiển thị trên công tơ cuối kỳ, không nhập lượng đã dùng.
    </p>
    <p aria-live="polite" className={`rounded-lg p-2 text-xs ${consumption != null && consumption <= 0 ? "bg-amber-50 text-amber-900" : "bg-blue-50 text-blue-800"}`}>
      {consumption == null ? "Lượng sử dụng = chỉ số cuối kỳ − chỉ số đầu kỳ."
        : consumption < 0 ? "Chỉ số cuối kỳ không được thấp hơn chỉ số đầu kỳ."
          : <>Lượng sử dụng: {format(end)} − {format(start)} = <strong>{format(consumption)} {unit}</strong>.
            {consumption === 0 && " Hai chỉ số bằng nhau nên tiền tiêu thụ bằng 0. Hãy kiểm tra lại trước khi phát hành."}</>}
    </p>
  </div>;
}

export function MeterReadingSummary({ start, end, quantity, unit }: {
  start: Reading; end: Reading; quantity: number; unit: "kWh" | "m³";
}) {
  return <p className="mt-1 text-xs text-muted-foreground">
    Chỉ số đầu kỳ: <span className="font-medium tabular-nums">{format(start)} {unit}</span>
    {" · "}Chỉ số cuối kỳ: <span className="font-medium tabular-nums">{format(end)} {unit}</span>
    {" · "}Đã dùng: <span className="font-medium tabular-nums">{format(quantity)} {unit}</span>
  </p>;
}
