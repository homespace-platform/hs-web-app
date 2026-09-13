import CallRoom from "@/components/chat/CallRoom";

type CallPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CallPage({ searchParams }: CallPageProps) {
  const params = await searchParams;
  const conversationId = String(params.conversationId || "");
  const callId = String(params.callId || "");
  const mode = params.mode === "video" ? "video" : "voice";
  const participantName = String(
    params.participantName || "Người dùng HomeSpace",
  );

  if (!conversationId || !callId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Liên kết cuộc gọi không hợp lệ.
      </main>
    );
  }

  return (
    <CallRoom
      conversationId={conversationId}
      callId={callId}
      mode={mode}
      participantName={participantName}
    />
  );
}
