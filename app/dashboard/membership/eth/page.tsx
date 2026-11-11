"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, RefreshCw, Wallet } from "lucide-react";
import membershipService from "@/services/membership.service";
import { clearPendingMembershipOrderId, formatExactVnd, getMembershipErrorMessage } from "@/lib/membership";
import { buildMembershipEthTransaction, connectSepolia, formatWei, getMetaMask, isTxHash, signWalletChallenge } from "@/lib/membership-eth-payment";
import type { MembershipEthQuote, MembershipOrderView } from "@/types/membership.type";

type Submitted = { paymentId: string; txHash: string };
const txKey = (orderId: string) => `hs_membership_eth_tx_${orderId}`;

function EthOrder() {
  const params = useSearchParams();
  const orderId = params.get("orderId")?.trim() ?? "";
  const [order, setOrder] = useState<MembershipOrderView | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [quote, setQuote] = useState<MembershipEthQuote | null>(null);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const settling = useRef(false);

  const refreshOrder = useCallback(async () => {
    if (!orderId) return;
    const current = await membershipService.getOrder(orderId);
    setOrder(current);
    setError(null);
    if (current.status === "PAID") {
      clearPendingMembershipOrderId();
      localStorage.removeItem(txKey(orderId));
      setSubmitted(null);
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    const saved = localStorage.getItem(txKey(orderId));
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Submitted;
        if (isTxHash(parsed.paymentId) && isTxHash(parsed.txHash)) setSubmitted(parsed);
      } catch { /* Invalid local record cannot be trusted. */ }
    }
    refreshOrder().catch((cause) => setError(getMembershipErrorMessage(cause, "Không tải được đơn hàng.")));
  }, [orderId, refreshOrder]);

  const settle = useCallback(async (record: Submitted) => {
    if (!orderId || settling.current) return;
    settling.current = true;
    try {
      const updated = await membershipService.settleEth(orderId, record.paymentId, record.txHash);
      setOrder(updated);
      if (updated.status === "PAID") {
        clearPendingMembershipOrderId();
        localStorage.removeItem(txKey(orderId));
        setSubmitted(null);
        setError(null);
      }
    } catch (cause) {
      setError(getMembershipErrorMessage(cause, "Giao dịch đã gửi. Hệ thống đang chờ đủ xác nhận; thử đối soát lại sau."));
    } finally {
      settling.current = false;
    }
  }, [orderId]);

  useEffect(() => {
    if (!submitted || order?.status !== "PENDING") return;
    const timer = window.setInterval(() => settle(submitted), 8000);
    settle(submitted);
    return () => window.clearInterval(timer);
  }, [submitted, order?.status, settle]);

  async function connectAndQuote() {
    if (!order || order.status !== "PENDING" || busy) return;
    setBusy(true);
    setError(null);
    try {
      const provider = getMetaMask();
      if (!provider) throw new Error("Cần cài và mở MetaMask để thanh toán bằng Sepolia ETH.");
      const account = await connectSepolia(provider);
      setWallet(account);
      const challenge = await membershipService.getEthChallenge(order.id, account);
      const signature = await signWalletChallenge(provider, account, challenge.message);
      const nextQuote = await membershipService.getEthQuote(order.id, challenge.challengeId, signature);
      buildMembershipEthTransaction(nextQuote, account, order.amountVnd);
      setQuote(nextQuote);
    } catch (cause) {
      setError(getMembershipErrorMessage(cause, "Không lấy được báo giá ETH."));
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!order || !quote || !wallet || submitted || busy) return;
    setBusy(true);
    setError(null);
    try {
      const latest = await membershipService.getOrder(order.id);
      setOrder(latest);
      if (latest.status !== "PENDING" || latest.provider !== "ETH" || latest.amountVnd !== quote.amountVnd)
        throw new Error("Đơn hàng đã thay đổi. Không gửi giao dịch ETH.");
      const provider = getMetaMask();
      if (!provider) throw new Error("Không tìm thấy MetaMask.");
      const account = await connectSepolia(provider);
      const request = buildMembershipEthTransaction(quote, account, latest.amountVnd);
      const hash = await provider.request({ method: "eth_sendTransaction", params: [request] });
      if (!isTxHash(hash)) throw new Error("MetaMask chưa trả về mã giao dịch hợp lệ. Hãy kiểm tra lịch sử ví trước khi thử lại.");
      const record = { paymentId: quote.paymentId, txHash: hash };
      localStorage.setItem(txKey(order.id), JSON.stringify(record));
      setSubmitted(record);
      setQuote(null);
    } catch (cause) {
      setError(getMembershipErrorMessage(cause, "Không thể gửi giao dịch Sepolia."));
    } finally {
      setBusy(false);
    }
  }

  if (!orderId) return <p className="p-8">Thiếu mã đơn hàng hội viên.</p>;

  return <div className="mx-auto max-w-2xl space-y-5 p-6">
    <Link href="/dashboard/membership" className="text-sm text-primary hover:underline">← Gói hội viên</Link>
    <h1 className="text-2xl font-bold">Thanh toán gói bằng Sepolia ETH</h1>
    {!order ? error
      ? <div role="alert" className="space-y-2 rounded-lg border border-red-300 bg-red-50 p-3 text-red-700"><p>{error}</p><button type="button" onClick={() => refreshOrder().catch((cause) => setError(getMembershipErrorMessage(cause, "Không tải được đơn hàng.")))} className="rounded-lg border border-red-300 px-3 py-1.5">Thử tải lại</button></div>
      : <p className="flex items-center gap-2"><Loader2 className="animate-spin" /> Đang tải đơn hàng...</p>
    : <>
      <div className="rounded-xl border bg-card p-5 space-y-2 text-sm">
        <p>Đơn hàng: <strong>{order.id}</strong></p>
        <p>Gói: <strong>{order.tier}</strong></p>
        <p>Giá: <strong>{formatExactVnd(order.amountVnd)}</strong></p>
        <p>Trạng thái: <strong>{order.status}</strong></p>
      </div>
      {order.provider !== "ETH" ? <p className="text-red-600">Đơn này không sử dụng Sepolia ETH.</p> : null}
      {order.status === "PAID" ? <p className="rounded-xl border border-green-300 bg-green-50 p-4 text-green-800">HomeSpace đã đối soát giao dịch và kích hoạt gói hội viên.</p> : null}
      {order.status === "REVIEW" ? <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">Đơn cần đối soát thủ công. Không gửi thêm ETH.</p> : null}
      {order.status === "PENDING" && order.provider === "ETH" && <div className="rounded-xl border bg-card p-5 space-y-4 text-sm">
        {submitted ? <>
          <p>Giao dịch đã gửi: <a className="text-primary underline" target="_blank" rel="noopener noreferrer" href={`https://sepolia.etherscan.io/tx/${submitted.txHash}`}>{submitted.txHash}</a></p>
          <p>Hệ thống cần ít nhất 3 block xác nhận. Trang sẽ tự thử đối soát lại; đừng chuyển ETH lần nữa.</p>
          <button type="button" onClick={() => settle(submitted)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white"><RefreshCw className="h-4 w-4" /> Đối soát lại</button>
        </> : <>
          <button type="button" disabled={busy} onClick={connectAndQuote} className="flex items-center gap-2 rounded-lg border px-4 py-2 disabled:opacity-50"><Wallet className="h-4 w-4" /> {wallet ? "Lấy lại báo giá" : "Kết nối MetaMask và lấy báo giá"}</button>
          {quote && <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p>Ví trả: <strong className="break-all">{quote.payer}</strong></p>
            <p>Ví nền tảng nhận ETH: <strong className="break-all">{quote.recipient}</strong></p>
            <p>Số ETH: <strong>{formatWei(quote.amountWei)} Sepolia ETH</strong> + phí gas</p>
            <p>Tỷ giá tham chiếu: 1 ETH = {formatExactVnd(quote.ethVnd)}; hết hạn {new Date(quote.expiresAt).toLocaleString("vi-VN")}</p>
            <p className="text-xs">Sepolia ETH chỉ dùng để thử nghiệm, không có giá thị trường như ETH Mainnet.</p>
            <button type="button" disabled={busy} onClick={pay} className="rounded-lg bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50">Xác nhận giao dịch trong MetaMask</button>
          </div>}
        </>}
      </div>}
      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </>}
  </div>;
}

export default function MembershipEthPage() {
  return <Suspense fallback={<p className="p-8">Đang tải...</p>}><EthOrder /></Suspense>;
}
