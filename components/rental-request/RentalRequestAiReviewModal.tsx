"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, CheckCircle2, AlertTriangle, Send, Sparkles, X } from "lucide-react";
import AiMarkdownMessage from "@/components/chat/AiMarkdownMessage";
import rentalRequestReviewService from "@/services/rental-request-review.service";
import type { RentalReview, RentalReviewRow, RentalReviewTurn } from "@/types/rental-request.type";
import { getApiErrorMessage } from "@/utils/apiError";

const button = "rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50";
const SUGGESTIONS = [
  "Vì sao chọn người này?",
  "Rủi ro khi chọn người này là gì?",
  "Nếu tôi ưu tiên doanh thu ổn định thì nên chọn ai?",
];

const money = (value: number | null) =>
  value == null ? "Chưa rõ" : `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
const day = (value: string | null) => {
  if (!value) return "Chưa rõ";
  const [year, month, date] = value.slice(0, 10).split("-");
  return `${date}/${month}/${year}`;
};

function Facts({ row }: { row: RentalReviewRow }) {
  const { facts } = row;
  const items = [
    facts.leaseMonths != null && `${facts.leaseMonths} tháng`,
    facts.occupantCount != null && `${facts.occupantCount} người`,
    `Dọn vào ${day(facts.moveInDate)}`,
    `Cọc ${money(facts.depositAmount)}`,
  ].filter(Boolean) as string[];
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs">{item}</span>
      ))}
    </div>
  );
}

export default function RentalRequestAiReviewModal({ listingId, listingTitle, onClose, onAccept }: {
  listingId: string;
  listingTitle: string;
  onClose: () => void;
  /** Mở hộp thoại chấp thuận hiện có; việc duyệt luôn do chủ nhà bấm xác nhận. */
  onAccept: (requestId: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const alive = useRef(false);
  const asking = useRef(false);
  const [review, setReview] = useState<RentalReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [turns, setTurns] = useState<RentalReviewTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next = await rentalRequestReviewService.review(listingId);
      if (alive.current) setReview(next);
    } catch (e) {
      if (alive.current) {
        setReview(null);
        setError(getApiErrorMessage(e, "Chưa đánh giá được các yêu cầu lúc này. Vui lòng thử lại."));
      }
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    alive.current = true;
    void load();
    return () => { alive.current = false; };
  }, [load]);
  useEffect(() => { const el = dialog.current; el?.showModal(); return () => el?.close(); }, []);

  async function ask(text: string) {
    const content = text.trim();
    if (!content || asking.current || !review) return;
    asking.current = true;
    setBusy(true);
    setQuestion("");
    const history = turns;
    setTurns([...history, { role: "user", content }]);
    try {
      const result = await rentalRequestReviewService.ask(listingId, content, history);
      if (!alive.current) return;
      setReview(result.review);
      setTurns((current) => [...current, { role: "assistant", content: result.answer }]);
    } catch (e) {
      if (alive.current) {
        setTurns((current) => [...current, {
          role: "assistant", content: getApiErrorMessage(e, "AI chưa trả lời được lúc này. Bạn thử lại sau nhé."),
        }]);
      }
    } finally {
      asking.current = false;
      if (alive.current) setBusy(false);
    }
  }

  const best = review?.ranking.find((row) => row.requestId === review.recommendedRequestId);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="ai-review-title"
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
    >
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-card p-5">
        <div className="min-w-0">
          <h2 id="ai-review-title" className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="h-5 w-5 text-primary" />AI đánh giá yêu cầu thuê
          </h2>
          <p className="truncate text-xs text-muted-foreground">{listingTitle}</p>
        </div>
        <button type="button" className={button} onClick={onClose} aria-label="Đóng đánh giá AI"><X className="h-4 w-4" /></button>
      </header>

      <div className="space-y-4 p-5">
        {loading && <p role="status" className="text-sm text-muted-foreground">Đang đọc và so sánh các yêu cầu…</p>}
        {error && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">{error}</p>}

        {review && best && (
          <>
            <section className="space-y-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4" />Đề xuất cho chủ nhà
              </p>
              <AiMarkdownMessage content={review.summary} />
            </section>

            <ol className="space-y-3">
              {review.ranking.map((row) => (
                <li
                  key={row.requestId}
                  className={`space-y-2 rounded-xl border p-4 text-sm ${row.rank === 1 ? "border-emerald-400" : "border-border"}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">{row.rank}</span>
                      {row.renterName}
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground">{row.score}/100</p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, row.score))}%` }} />
                  </div>
                  <Facts row={row} />
                  {row.strengths.length > 0 && (
                    <ul className="space-y-0.5 text-xs text-emerald-800 dark:text-emerald-300">
                      {row.strengths.map((item) => <li key={item}>✓ {item}</li>)}
                    </ul>
                  )}
                  {row.weaknesses.length > 0 && (
                    <ul className="space-y-0.5 text-xs text-amber-800 dark:text-amber-300">
                      {row.weaknesses.map((item) => <li key={item}>• {item}</li>)}
                    </ul>
                  )}
                  <div className="flex justify-end">
                    <button type="button" className={button} onClick={() => { onClose(); onAccept(row.requestId); }}>
                      Chấp thuận yêu cầu này
                    </button>
                  </div>
                </li>
              ))}
            </ol>

            <section className="space-y-3 rounded-xl border p-4" aria-label="Hỏi AI nhanh">
              <p className="flex items-center gap-2 text-sm font-semibold"><Bot className="h-4 w-4 text-primary" />Hỏi AI nhanh</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((item) => (
                  <button key={item} type="button" disabled={busy} onClick={() => void ask(item)}
                    className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50">
                    {item}
                  </button>
                ))}
              </div>
              {turns.length > 0 && (
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {turns.map((turn, index) => (
                    <div key={index} className={turn.role === "user"
                      ? "ml-8 rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground"
                      : "mr-8 rounded-xl bg-muted/50 px-3 py-2"}>
                      {turn.role === "user" ? turn.content : <AiMarkdownMessage content={turn.content} />}
                    </div>
                  ))}
                  {busy && <p role="status" className="text-xs text-muted-foreground">AI đang trả lời…</p>}
                </div>
              )}
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void ask(question); }}>
                <input
                  value={question} maxLength={500} disabled={busy}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ví dụ: So sánh rủi ro của hai người thuê"
                  className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm"
                />
                <button type="submit" className={button} disabled={busy || !question.trim()} aria-label="Gửi câu hỏi">
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </section>

            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Điểm số tính từ dữ liệu yêu cầu theo trọng số cố định; AI chỉ giải thích. Bạn là người quyết định chấp thuận hay từ chối.
            </p>
          </>
        )}
      </div>

      <footer className="sticky bottom-0 flex justify-end gap-2 border-t bg-card p-4">
        <button type="button" className={button} disabled={loading || busy} onClick={() => void load()}>Đánh giá lại</button>
        <button type="button" className={button} onClick={onClose}>Đóng</button>
      </footer>
    </dialog>
  );
}
