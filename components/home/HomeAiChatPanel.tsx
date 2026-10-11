"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Loader2, LogIn, Sparkles } from "lucide-react";
import AiChatWindow from "@/components/chat/AiChatWindow";
import { aiConversationHref } from "@/lib/ai-conversation";
import type { HomeChatSnapshot } from "@/lib/home-ai-chat";

interface Props {
  open: boolean;
  onToggle: () => void;
  state: HomeChatSnapshot;
  authenticated: boolean;
  initialized: boolean;
  customerName: string | null;
  isAdmin?: boolean;
  onLogin: () => void;
  onSend: (text: string) => void;
}

// Center in the usable viewport below Home's fixed 80px navigation bar.
export function homeChatScrollTarget(panelTop: number, panelHeight: number, scrollTop: number, viewportHeight: number) {
  const topInset = Math.max(80, (viewportHeight + 80 - panelHeight) / 2);
  return Math.max(0, scrollTop + panelTop - topInset);
}

// Home adapts conversation/auth state only. All chat UI lives in AiChatWindow.
export default function HomeAiChatPanel({ open, onToggle, state, authenticated, initialized, customerName, isAdmin, onLogin, onSend }: Props) {
  const [ready, setReady] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let nextFrame = 0;
    const frame = requestAnimationFrame(() => { nextFrame = requestAnimationFrame(() => setReady(true)); });
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(nextFrame); };
  }, []);
  const expanded = open && ready;
  useEffect(() => {
    if (!expanded) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Wait for BOTH the upper search collapse and shared chat expansion to settle.
    // Center once on open, never on new messages or card hydration.
    const timer = window.setTimeout(() => {
      const panel = panelRef.current?.getBoundingClientRect();
      if (!panel) return;
      window.scrollTo({
        top: homeChatScrollTarget(panel.top, panel.height, window.scrollY, window.innerHeight),
        behavior: reduceMotion ? "instant" : "smooth",
      });
    }, reduceMotion ? 0 : 550);
    return () => window.clearTimeout(timer);
  }, [expanded]);
  return (
    <section ref={panelRef} aria-label="Trợ lý AI ngay trên trang chủ" className={`overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-lg shadow-primary/5 transition-[margin,opacity,transform] duration-500 ease-out motion-reduce:transition-none ${open ? "mt-0" : "mt-4"} ${ready ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}`}>
      <AiChatWindow
        size="compact"
        session={state.session}
        customerName={customerName}
        isAdmin={isAdmin}
        isSending={state.isSending}
        isVisible={expanded}
        onToggleCollapse={onToggle}
        regionId="home-ai-conversation"
        onSendMessage={(_, text) => onSend(text)}
        onSelectTopic={onSend}
        headerActions={
          <Link href={aiConversationHref(state.session?.id)} prefetch={false} aria-disabled={state.isSending} onClick={(event) => { if (state.isSending) event.preventDefault(); }} className={`flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium text-primary hover:bg-primary/10 ${state.isSending ? "pointer-events-none opacity-40" : ""}`}>
            <span className="hidden sm:inline">Mở trang chat</span><ArrowUpRight className="h-4 w-4" /><span className="sr-only sm:hidden">Mở trang chat</span>
          </Link>
        }
        notice={state.error && <div role="alert" className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">{state.error}</div>}
        bodyOverride={!initialized ? <div role="status" className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Đang chuẩn bị trợ lý…</div>
            : !authenticated ? <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-5 py-10 text-center">
              <Sparkles className="mb-3 h-7 w-7 text-primary" />
              <h3 className="text-lg font-bold">Mình sẵn sàng giúp bạn tìm nơi ở!</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Đăng nhập để hỏi AI và lưu hội thoại riêng của bạn. Câu hỏi vẫn ở ô tìm kiếm; bạn có thể gửi khi sẵn sàng.</p>
              <button type="button" onClick={onLogin} className="mt-5 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"><LogIn className="h-4 w-4" />Đăng nhập để trò chuyện</button>
            </div>
            : undefined}
      />
    </section>
  );
}
