"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { vietmapService, type AddressSuggestion, type VietmapAddress } from "@/services/vietmap.service";

type Props = { value?: VietmapAddress | null; initialDisplay?: string; disabled?: boolean; onChange: (value: VietmapAddress | null) => void };
function message(error: unknown) {
  return axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
    ? error.response.data.message : "Không thể tìm địa chỉ. Vui lòng thử lại.";
}
export default function VietmapAddressPicker({ value, initialDisplay = "", disabled = false, onChange }: Props) {
  const [query, setQuery] = useState(value?.display ?? initialDisplay);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [resolving, setResolving] = useState(false);
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const callback = useRef(onChange);
  const selectedDisplay = useRef(value?.display);
  useEffect(() => { callback.current = onChange; }, [onChange]);
  useEffect(() => { selectedDisplay.current = value?.display; }, [value?.display]);
  useEffect(() => () => { sequence.current++; request.current?.abort(); }, []);
  useEffect(() => {
    if (value) { setQuery(value.display); setSuggestions([]); setError(""); }
  }, [value]);
  useEffect(() => {
    if (disabled || query.trim().length < 2 || query === selectedDisplay.current) return;
    const controller = new AbortController();
    const id = ++sequence.current;
    request.current?.abort(); request.current = controller;
    const timer = setTimeout(async () => {
      if (controller.signal.aborted || id !== sequence.current) return;
      setBusy(true); setError("");
      try {
        const result = await vietmapService.autocomplete(query.trim(), controller.signal);
        if (!controller.signal.aborted && id === sequence.current) { setSuggestions(result); setSearched(true); }
      } catch (error) { if (!controller.signal.aborted && id === sequence.current) setError(message(error)); }
      finally { if (!controller.signal.aborted && id === sequence.current) setBusy(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, disabled]);
  function edit(text: string) {
    sequence.current++; request.current?.abort(); setQuery(text); setSuggestions([]); setBusy(false);
    setResolving(false); setSearched(false); setError(""); callback.current(null);
  }
  async function select(suggestion: AddressSuggestion) {
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    const id = ++sequence.current; setBusy(true); setResolving(true); setError("");
    try {
      const result = await vietmapService.place(suggestion.refId, controller.signal);
      if (!controller.signal.aborted && id === sequence.current) { callback.current(result); setQuery(result.display); setSuggestions([]); }
    } catch (error) { if (!controller.signal.aborted && id === sequence.current) setError(message(error)); }
    finally { if (!controller.signal.aborted && id === sequence.current) { setBusy(false); setResolving(false); } }
  }
  return <div className="space-y-3">
    <label className="block text-sm font-semibold">Địa chỉ
      <input aria-label="Địa chỉ" value={query} disabled={disabled} maxLength={255} autoComplete="off"
        onChange={event => edit(event.target.value)} placeholder="Nhập tên đường hoặc số nhà…"
        className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm" />
    </label>
    {!disabled && !value && <p className="text-xs text-muted-foreground">Nhập tên đường rồi chọn địa chỉ của bạn trong danh sách gợi ý.</p>}
    {busy && <p role="status" className="text-xs text-muted-foreground">{resolving ? "Đang chọn địa chỉ…" : "Đang tìm gợi ý…"}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!disabled && suggestions.length > 0 && <ul aria-label="Địa chỉ gợi ý" className="max-h-64 overflow-y-auto rounded-xl border">
      {suggestions.map((item, index) => <li key={`${item.refId}-${index}`}><button type="button" disabled={resolving} onClick={() => void select(item)} className="w-full p-3 text-left text-sm hover:bg-muted focus-visible:bg-muted disabled:opacity-50">{item.display}</button></li>)}
    </ul>}
    {!disabled && searched && !busy && !error && !value && suggestions.length === 0 && <p role="status" className="text-xs text-muted-foreground">Chưa tìm thấy địa chỉ. Thử thêm số nhà hoặc tên khu vực.</p>}
    {value && <p role="status" className="text-xs text-primary">Đã chọn địa chỉ. Bạn có thể lưu thay đổi.</p>}
  </div>;
}
