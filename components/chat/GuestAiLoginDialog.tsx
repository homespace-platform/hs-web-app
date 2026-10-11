"use client";

import { useId, useState, useSyncExternalStore } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LogIn, Sparkles, X } from "lucide-react";
import keycloak from "@/lib/keycloak";
import { guestChatState } from "@/lib/guest-ai-session";

export default function GuestAiLoginDialog() {
  const state = useSyncExternalStore(guestChatState.subscribe, guestChatState.getSnapshot, guestChatState.getSnapshot);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const titleId = useId();
  const descriptionId = useId();
  const continueLogin = async () => {
    setBusy(true); setError("");
    try {
      const redirectUri = guestChatState.prepareLogin();
      await keycloak.login({ redirectUri });
    } catch {
      setBusy(false);
      setError("Chưa mở được đăng nhập hoặc trình duyệt không cho giữ hội thoại tạm. Bạn thử lại nhé.");
    }
  };
  return <Dialog.Root open={state.loginRequired} onOpenChange={(open) => { if (!open && !busy) guestChatState.closeLogin(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm" />
      <Dialog.Content aria-labelledby={titleId} aria-describedby={descriptionId} className="fixed left-1/2 top-1/2 z-[101] max-h-[90svh] w-[calc(100%_-_2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-primary/15 bg-card p-6 shadow-2xl focus:outline-none">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="h-6 w-6" /></div>
        <Dialog.Title id={titleId} className="pr-6 text-xl font-semibold">Tiếp tục cùng HomeSpace AI</Dialog.Title>
        <Dialog.Description id={descriptionId} className="mt-3 text-sm leading-6 text-muted-foreground">
          Bạn đã sử dụng các câu hỏi trải nghiệm miễn phí. Đăng nhập để hỏi tiếp và lưu cuộc trò chuyện này vào tài khoản của bạn.
          Hội thoại khách không được lưu lịch sử; chỉ khi bạn chọn tiếp tục, nội dung mới được giữ tạm qua bước đăng nhập để chuyển vào tài khoản.
        </Dialog.Description>
        {state.pendingQuestion && <p className="mt-4 rounded-xl bg-muted/60 p-3 text-sm"><span className="font-medium">Câu hỏi đang chờ:</span> {state.pendingQuestion}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-6 flex flex-col gap-2">
          <button type="button" disabled={busy} onClick={() => void continueLogin()} className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"><LogIn className="h-4 w-4" />{busy ? "Đang mở đăng nhập…" : "Đăng nhập và tiếp tục"}</button>
          <Dialog.Close disabled={busy} className="rounded-xl px-4 py-2 text-sm text-muted-foreground hover:bg-muted">Để sau</Dialog.Close>
        </div>
        <Dialog.Close disabled={busy} aria-label="Đóng lời mời đăng nhập" className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
