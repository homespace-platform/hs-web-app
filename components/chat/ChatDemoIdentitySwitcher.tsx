"use client";

import { DEMO_USERS } from "@/lib/chat-demo-state";

export default function ChatDemoIdentitySwitcher({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
      <span className="shrink-0">Tài khoản mô phỏng</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-semibold text-foreground outline-none focus:border-primary"
      >
        {DEMO_USERS.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
    </label>
  );
}
