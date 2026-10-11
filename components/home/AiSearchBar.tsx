"use client";

import { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Search, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFeaturedLocationsByProvince } from "@/data/featured-locations";
import { useAuth } from "@/features/auth/useAuth";
import { aiService, guestAiService } from "@/services/ai.service";
import { createHomeAiChat } from "@/lib/home-ai-chat";
import { toast } from "sonner";
import { guestChatState } from "@/lib/guest-ai-session";

const HomeAiChatPanel = dynamic(() => import("./HomeAiChatPanel"), {
  loading: () => <div role="status" className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm text-primary">Đang mở HomeSpace AI…</div>,
});

export default function AiSearchBar() {
  const { profile, authenticated, initialized } = useAuth();
  const ownerId = !initialized ? null : authenticated ? profile?.id ?? null : "guest";
  useEffect(() => { if (ownerId === "guest") return guestChatState.retain(); }, [ownerId]);
  const chatApi = authenticated ? aiService : guestAiService;
  const chat = useMemo(() => createHomeAiChat(ownerId, chatApi), [ownerId, chatApi]);
  const chatState = useSyncExternalStore(chat.subscribe, chat.getSnapshot, chat.getSnapshot);
  const [chatOpened, setChatOpened] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const customerName = authenticated ? [profile?.lastName, profile?.firstName].filter(Boolean).join(" ") || profile?.username || null : null;
  const [keyword, setKeyword] = useState("");

  // Province controls featured places only, never implicit AI search criteria.
  const [provinceCode, setProvinceCode] = useState<number | string>(79);
  const [provinceName, setProvinceName] = useState("Thành phố Hồ Chí Minh");
  const suggestions = useMemo(() => getFeaturedLocationsByProvince(provinceCode, provinceName), [provinceCode, provinceName]);
  const hasMessages = Boolean(chatState.session?.messages.length);

  useEffect(() => {
    chat.setActive(true);
    return () => chat.setActive(false);
  }, [chat]);

  const handleSearch = () => {
    setChatOpened(true);
    setChatVisible(true);
    const question = keyword.trim();
    if (!initialized || !ownerId || chatState.isSending || !question) return;
    if (question.length > 500) {
      toast.error("Câu hỏi tối đa 500 ký tự. Bạn rút gọn một chút nhé.");
      return;
    }
    void chat.send(question);
  };

  useEffect(() => {
    try {
      const draft = sessionStorage.getItem("homespace_home_ai_draft");
      if (draft) {
        setKeyword(draft);
        setChatOpened(true);
        setChatVisible(true);
        sessionStorage.removeItem("homespace_home_ai_draft");
      }
      const savedProv = localStorage.getItem("homespace_selected_province");
      if (savedProv) {
        const parsed = JSON.parse(savedProv);
        if (parsed?.code) {
          setProvinceCode(parsed.code);
          setProvinceName(parsed.name || "Thành phố Hồ Chí Minh");
        }
      }
    } catch { /* Storage may be disabled or contain invalid JSON. */ }

    const handleProvinceChanged = (event: Event) => {
      const { detail } = event as CustomEvent<{ code: number | string; name: string }>;
      if (detail?.code) {
        setProvinceCode(detail.code);
        setProvinceName(detail.name);
      }
    };
    window.addEventListener("provinceChanged", handleProvinceChanged);
    return () => window.removeEventListener("provinceChanged", handleProvinceChanged);
  }, []);

  return (
    <div className="w-full mx-auto">
      <div
        aria-hidden={chatVisible}
        inert={chatVisible}
        data-home-search=""
        className={`grid min-h-0 transition-[grid-template-rows,opacity,transform] duration-500 ease-out motion-reduce:transition-none ${chatVisible ? "grid-rows-[0fr] opacity-0 -translate-y-4" : "grid-rows-[1fr] opacity-100 translate-y-0"}`}
      >
      <div className="min-h-0 overflow-hidden">
      <div className="p-1">
      <div className="bg-card text-card-foreground rounded-2xl shadow-xl shadow-primary-dark/5 border border-border p-2 sm:p-3 relative z-30">
        <div className="mb-2 flex items-center justify-between gap-2 px-2 pt-1 text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-primary"><Sparkles className="h-3.5 w-3.5" />Tìm nơi ở theo cách của bạn</span>
          <span className="hidden sm:inline text-muted-foreground">Hỏi AI ngay tại đây</span>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); handleSearch(); }} className="flex flex-col sm:flex-row gap-2">
          <div className="flex min-w-0 flex-1 items-start px-4 py-3 rounded-xl bg-muted/60 focus-within:ring-2 focus-within:ring-primary/30 transition-colors">
            <Search className="w-5 h-5 text-primary shrink-0 mr-3 mt-1" />
            <textarea
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={2}
              maxLength={500}
              aria-label="Mô tả nhu cầu tìm nơi ở hoặc hỏi HomeSpace AI"
              placeholder="Ví dụ: Mình cần phòng cho 2 người, dưới 4 triệu, có ban công ở Phú Lợi…"
              className="w-full min-h-14 resize-none bg-transparent border-none outline-none text-sm md:text-base text-foreground placeholder:text-muted-foreground focus:ring-0 p-0"
            />
          </div>
          <Button
            type="submit"
            disabled={chatState.isSending || !initialized}
            aria-controls="home-ai-conversation"
            aria-expanded={chatVisible}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-7 py-3 h-auto sm:self-center rounded-xl shadow-md shadow-primary/20 hover:shadow-lg transition-all shrink-0 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {chatState.isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span>{chatState.isSending ? "AI đang hỗ trợ…" : "Tìm kiếm nhanh"}</span>
          </Button>
        </form>
      </div>

      {/* Once the conversation starts, keep places hidden even while collapsed. */}
      {!hasMessages && <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="text-muted-foreground font-medium flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-accent-ai" />Địa điểm nổi bật:
        </span>
        {suggestions.length === 0 && <span className="text-muted-foreground">Chưa có danh sách địa điểm nổi bật cho {provinceName}.</span>}
        {suggestions.map((item, index) => (
          <button
            key={`${item.label}-${index}`}
            type="button"
            onClick={() => setKeyword(`Tìm chỗ ở gần ${item.label}, ${provinceName}`)}
            className="bg-card/80 hover:bg-primary/10 text-foreground hover:text-primary border border-border px-3 py-1.5 rounded-full transition-all text-xs font-medium cursor-pointer"
          >{item.label}</button>
        ))}
      </div>}
      </div>
      </div>
      </div>
      {chatOpened && <HomeAiChatPanel
        key={ownerId ?? "guest"}
        open={chatVisible}
        onToggle={() => setChatVisible((visible) => !visible)}
        state={chatState}
        authenticated={authenticated}
        initialized={initialized}
        customerName={customerName}
        isAdmin={authenticated && ["ADMIN", "ROLE_ADMIN"].includes(profile?.role?.toUpperCase() || "")}
        onSend={(text) => { void chat.send(text); }}
      />}
    </div>
  );
}
