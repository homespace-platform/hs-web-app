"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Gauge,
  Loader2,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Send,
  CreditCard,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { contractService } from "@/services/contract.service";
import type {
  ContractCompletenessResponse,
  ContractDocumentResponse,
  ContractPaymentBreakdownResponse,
  ContractResponse,
  ContractRevisionResponse,
  ContractStatus,
} from "@/types/contract.type";
import { useAuth } from "@/features/auth/useAuth";
import { getApiErrorMessage } from "@/utils/apiError";

const STATUS_LABEL: Record<ContractStatus, string> = {
  DRAFT: "Bản nháp",
  PENDING_REVIEW: "Chờ thanh toán/ký",
  ACTIVE: "Đã hiệu lực",
  TERMINATED: "Đã chấm dứt",
  CANCELLED: "Đã hủy",
};

function str(v: unknown): string {
  if (v == null) return "—";
  return String(v);
}

function FieldRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-xs border-b border-border/50 last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-semibold text-foreground text-right break-words">{str(value)}</span>
    </div>
  );
}

function isBlank(value: unknown): boolean {
  return value == null || String(value).trim() === "";
}

function formatMonthlyAmount(value: unknown): string {
  if (value == null || value === "") return "—";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `${new Intl.NumberFormat("vi-VN").format(amount)} VNĐ`
    : String(value);
}

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const contractId = String(params?.id || "");

  const [contract, setContract] = useState<ContractResponse | null>(null);
  const [revision, setRevision] = useState<ContractRevisionResponse | null>(null);
  const [completeness, setCompleteness] = useState<ContractCompletenessResponse | null>(null);
  const [documents, setDocuments] = useState<ContractDocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [sending, setSending] = useState(false);
  const [payment, setPayment] = useState<ContractPaymentBreakdownResponse | null>(null);
  const [paying, setPaying] = useState(false);
  const [signing, setSigning] = useState(false);
  const [agreedToContract, setAgreedToContract] = useState(false);
  const [savingMeters, setSavingMeters] = useState(false);
  const [electricityInitial, setElectricityInitial] = useState("");
  const [waterInitial, setWaterInitial] = useState("");

  const isLandlord = Boolean(
    profile?.id && contract?.landlordId && profile.id === contract.landlordId
  );
  const isTenant = Boolean(
    profile?.id && contract?.tenantId && profile.id === contract.tenantId
  );

  const load = useCallback(async () => {
    if (!contractId) return;
    setLoading(true);
    try {
      const c = await contractService.getContract(contractId);
      const [rev, comp, docs, paymentBreakdown] = await Promise.all([
        contractService.getRevision(contractId),
        contractService.getCompleteness(contractId),
        contractService.getDocuments(contractId),
        contractService.getPaymentBreakdown(contractId),
      ]);
      setContract(c);
      setRevision(rev);
      setElectricityInitial(String(rev.meters?.electricityInitial ?? ""));
      setWaterInitial(String(rev.meters?.waterInitial ?? ""));
      setCompleteness(comp);
      setDocuments(docs);
      setPayment(paymentBreakdown);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể tải hợp đồng."));
      router.replace("/dashboard/contracts");
    } finally {
      setLoading(false);
    }
  }, [contractId, router]);

  useEffect(() => {
    // `load` updates state after its API requests resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const latestDoc = useMemo(() => {
    const ready = documents.filter((d) => d.status === "READY" && (d.viewUrl || d.downloadUrl));
    return ready[0] ?? documents[0] ?? null;
  }, [documents]);

  const hasReadyCurrentDocument = useMemo(
    () =>
      Boolean(
        revision &&
          documents.some(
            (document) =>
              document.revisionId === revision.id &&
              document.status === "READY" &&
              Boolean(document.storageObjectId)
          )
      ),
    [documents, revision]
  );

  const waterPerPersonCharge = useMemo(
    () =>
      (revision?.charges || []).find(
        (charge) =>
          charge.chargeType === "WATER" && charge.billingMethod === "PER_PERSON_MONTH"
      ),
    [revision?.charges]
  );

  async function handleRender() {
    if (!contractId) return;
    setRendering(true);
    try {
      const doc = await contractService.triggerPreview(contractId);
      toast.success("Đã kết xuất file hợp đồng.");
      setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
      const refreshed = await contractService.getDocuments(contractId);
      setDocuments(refreshed);
      const comp = await contractService.getCompleteness(contractId);
      setCompleteness(comp);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể kết xuất file hợp đồng."));
    } finally {
      setRendering(false);
    }
  }

  async function handleSaveMetersAndRender() {
    if (!contractId || !revision) return;

    const electricity = electricityInitial.trim();
    const water = waterInitial.trim();
    if (!electricity) {
      toast.error("Vui lòng nhập chỉ số điện ban đầu.");
      return;
    }
    if (!waterPerPersonCharge && !water) {
      toast.error("Vui lòng nhập chỉ số nước ban đầu.");
      return;
    }

    const landlordSnapshot = { ...(revision.landlord || {}) };
    if (isBlank(landlordSnapshot.permanentAddress) && profile?.address?.fullAddress) {
      landlordSnapshot.permanentAddress = profile.address.fullAddress;
    }

    const resolvedWater = waterPerPersonCharge
      ? water || `Không áp dụng - ${str(waterPerPersonCharge.amountAndMethod)}`
      : water;

    setSavingMeters(true);
    try {
      const updated = await contractService.updateRevision(contractId, {
        landlord: landlordSnapshot,
        tenant: revision.tenant || {},
        property: revision.property || {},
        lease: revision.lease || {},
        financial: revision.financial || {},
        charges: revision.charges || [],
        equipments: revision.equipments || [],
        meters: {
          ...(revision.meters || {}),
          electricityInitial: electricity,
          waterInitial: resolvedWater,
        },
        specialTerms: revision.specialTerms,
        revisionNote: "Cập nhật chỉ số bàn giao trước khi kết xuất hợp đồng.",
      });
      setRevision(updated);

      const checked = await contractService.getCompleteness(contractId);
      setCompleteness(checked);
      if (!checked.complete) {
        toast.warning(`Đã lưu. Hợp đồng còn thiếu ${checked.missingFields.length} trường.`);
        return;
      }

      await contractService.triggerPreview(contractId);
      toast.success("Đã lưu chỉ số và kết xuất hợp đồng đầy đủ.");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể lưu và kết xuất hợp đồng."));
    } finally {
      setSavingMeters(false);
    }
  }

  async function handleSendToTenant() {
    if (!contractId) return;
    setSending(true);
    try {
      const sent = await contractService.sendToTenant(contractId);
      setContract(sent);
      const refreshed = await contractService.getDocuments(contractId);
      setDocuments(refreshed);
      toast.success("Đã gửi hợp đồng cho người thuê.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể gửi hợp đồng cho người thuê."));
    } finally {
      setSending(false);
    }
  }

  async function handleMockPayment() {
    if (!contractId) return;
    setPaying(true);
    try {
      const paid = await contractService.payMock(contractId);
      setPayment(paid);
      setContract((current) =>
        current
          ? { ...current, paymentStatus: paid.paymentStatus, paidAt: paid.paidAt }
          : current
      );
      toast.success("Thanh toán tháng đầu thành công.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể thực hiện thanh toán."));
    } finally {
      setPaying(false);
    }
  }

  async function handleSign() {
    if (!contractId || !agreedToContract) return;
    setSigning(true);
    try {
      const signed = await contractService.sign(contractId);
      setContract(signed);
      setAgreedToContract(false);
      toast.success("Hợp đồng đã được ký và có hiệu lực.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể ký hợp đồng."));
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        Đang tải hợp đồng...
      </div>
    );
  }

  if (!contract || !revision) return null;

  const landlord = revision.landlord || {};
  const tenant = revision.tenant || {};
  const property = revision.property || {};
  const lease = revision.lease || {};
  const financial = revision.financial || {};
  const charges = revision.charges || [];
  const currentStatusLabel =
    contract.status === "PENDING_REVIEW" && payment?.paymentStatus === "PAID_MOCK"
      ? "Chờ ký hợp đồng"
      : STATUS_LABEL[contract.status];

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <button
            type="button"
            onClick={() => router.push("/dashboard/contracts")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Danh sách hợp đồng
          </button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-primary shrink-0" />
            <span className="truncate">{contract.contractNumber}</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Trạng thái: <strong>{currentStatusLabel}</strong>
            {isLandlord ? " · Bạn là Bên A (chủ nhà)" : " · Bạn là Bên B (người thuê)"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isLandlord && contract.status === "DRAFT" && (
            <button
              type="button"
              disabled={rendering || completeness?.complete === false}
              onClick={handleRender}
              title={completeness?.complete === false ? "Bổ sung đủ trường còn thiếu trước khi kết xuất" : undefined}
              className="h-9 px-3.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {rendering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Kết xuất lại file
            </button>
          )}
          {isLandlord && contract.status === "DRAFT" && (
            <button
              type="button"
              disabled={sending || !completeness?.complete || !hasReadyCurrentDocument}
              onClick={handleSendToTenant}
              title={
                !completeness?.complete
                  ? "Bổ sung đủ trường còn thiếu trước khi gửi"
                  : !hasReadyCurrentDocument
                    ? "Kết xuất file hợp đồng trước khi gửi"
                    : undefined
              }
              className="h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {sending ? "Đang gửi..." : "Gửi cho người thuê"}
            </button>
          )}
          {latestDoc?.downloadUrl && (
            <a
              href={latestDoc.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="h-9 px-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Tải file
            </a>
          )}
          {latestDoc?.viewUrl && (
            <a
              href={latestDoc.viewUrl}
              target="_blank"
              rel="noreferrer"
              className="h-9 px-3.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Xem file
            </a>
          )}
        </div>
      </div>

      {completeness && !completeness.complete && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0 space-y-1.5">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Còn {completeness.missingFields.length} trường trống trên mẫu Word
              </p>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/90">
                Đã điền {completeness.filledFields}/{completeness.totalFields}. Địa chỉ được lấy tự động
                từ hồ sơ; chỉ số bàn giao được bổ sung bên dưới trước khi kết xuất.
              </p>
              <ul className="text-[11px] text-amber-900 dark:text-amber-200 list-disc pl-4 space-y-0.5">
                {completeness.missingFields.slice(0, 8).map((f) => (
                  <li key={f.key}>
                    {f.label} <span className="opacity-70">({f.key})</span>
                  </li>
                ))}
                {completeness.missingFields.length > 8 && (
                  <li>… và {completeness.missingFields.length - 8} trường khác</li>
                )}
              </ul>
              {isLandlord && completeness.missingFields.some((f) => f.key === "landlord.permanentAddress") && (
                <Link
                  href="/settings/profile"
                  className="inline-flex text-xs font-semibold text-amber-900 underline underline-offset-2 dark:text-amber-200"
                >
                  Cập nhật địa chỉ trong hồ sơ cá nhân
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {completeness?.complete && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 dark:border-emerald-900 dark:bg-emerald-950/30 flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="w-4 h-4" />
          Đủ dữ liệu so với các mã trường trên file mẫu Word.
        </div>
      )}

      {contract.status === "PENDING_REVIEW" && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3.5 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200 flex items-start gap-2">
          <Send className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {isLandlord
              ? payment?.paymentStatus === "PAID_MOCK"
                ? "Người thuê đã thanh toán. Đang chờ người thuê xác nhận và ký hợp đồng."
                : "Hợp đồng đã được gửi. Đang chờ người thuê thanh toán và ký."
              : payment?.paymentStatus === "PAID_MOCK"
                ? "Bạn đã thanh toán. Hãy kiểm tra nội dung, xác nhận đồng ý và ký hợp đồng."
                : "Chủ nhà đã gửi hợp đồng. Bạn có thể xem file và thực hiện thanh toán tháng đầu."}
          </span>
        </div>
      )}

      {contract.status === "ACTIVE" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Hợp đồng đã được thanh toán, ký và đang có hiệu lực.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <h2 className="text-sm font-bold text-foreground mb-2">Bên A — Chủ nhà</h2>
          <FieldRow label="Họ tên" value={landlord.fullName} />
          <FieldRow label="CCCD" value={landlord.idNumber} />
          <FieldRow label="Địa chỉ" value={landlord.permanentAddress} />
          <FieldRow label="SĐT" value={landlord.phone} />
          <FieldRow label="Email" value={landlord.email} />
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <h2 className="text-sm font-bold text-foreground mb-2">Bên B — Người thuê</h2>
          <FieldRow label="Họ tên" value={tenant.fullName} />
          <FieldRow label="CCCD" value={tenant.idNumber} />
          <FieldRow label="Địa chỉ" value={tenant.permanentAddress} />
          <FieldRow label="SĐT" value={tenant.phone} />
          <FieldRow label="Email" value={tenant.email} />
          <FieldRow label="Số người ở" value={tenant.occupantCount} />
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <h2 className="text-sm font-bold text-foreground mb-2">Bất động sản & thời hạn</h2>
          <FieldRow label="Địa chỉ" value={property.fullAddress} />
          <FieldRow label="Loại hình" value={property.propertyType} />
          <FieldRow label="Diện tích" value={property.areaText} />
          <FieldRow label="Tầng / căn" value={`${str(property.floor)} / ${str(property.unitNumber)}`} />
          <FieldRow label="Hình thức thuê" value={lease.rentalMode} />
          <FieldRow label="Từ ngày" value={lease.startDateText} />
          <FieldRow label="Đến ngày" value={lease.endDateText} />
          <FieldRow label="Thời hạn" value={lease.durationText} />
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <h2 className="text-sm font-bold text-foreground mb-2">Giá thuê & cọc</h2>
          <FieldRow label="Tiền thuê" value={financial.amountNumber} />
          <FieldRow label="Bằng chữ" value={financial.amountWords} />
          <FieldRow label="Kỳ thanh toán" value={financial.paymentCycle} />
          <FieldRow label="Hạn đóng" value={financial.paymentDueDay} />
          <FieldRow label="Phương thức" value={financial.paymentMethod} />
          <FieldRow label="Tiền cọc" value={financial.depositAmountNumber} />
          <FieldRow label="Mô tả cọc" value={financial.depositDescription} />
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
        <div className="flex items-start gap-2.5 mb-3">
          <Gauge className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <h2 className="text-sm font-bold text-foreground">Chỉ số bàn giao</h2>
            {waterPerPersonCharge && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Nước tính theo đầu người: {str(waterPerPersonCharge.amountAndMethod)}
              </p>
            )}
          </div>
        </div>

        {isLandlord && contract.status === "DRAFT" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1.5 text-xs font-semibold text-foreground">
              <span>Chỉ số điện ban đầu</span>
              <input
                value={electricityInitial}
                onChange={(event) => setElectricityInitial(event.target.value)}
                placeholder="Ví dụ: 1250 kWh"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-foreground">
              <span>Chỉ số nước ban đầu</span>
              <input
                value={waterInitial}
                onChange={(event) => setWaterInitial(event.target.value)}
                disabled={Boolean(waterPerPersonCharge)}
                placeholder="Ví dụ: 85 m³"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-muted disabled:text-muted-foreground"
              />
            </label>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="button"
                disabled={savingMeters}
                onClick={handleSaveMetersAndRender}
                className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingMeters ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                {savingMeters ? "Đang kiểm tra..." : "Lưu và kết xuất hợp đồng"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <FieldRow label="Điện ban đầu" value={revision.meters?.electricityInitial} />
            <FieldRow label="Nước ban đầu" value={revision.meters?.waterInitial} />
          </div>
        )}
      </section>

      {charges.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-2xs overflow-x-auto">
          <h2 className="text-sm font-bold text-foreground mb-3">Phí dịch vụ / tiện ích</h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-3 font-semibold">Khoản phí</th>
                <th className="py-2 pr-3 font-semibold">Cách tính</th>
                <th className="py-2 pr-3 font-semibold">Ước tính/tháng</th>
                <th className="py-2 font-semibold">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((row, idx) => (
                <tr key={idx} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3 font-medium text-foreground">{str(row.name)}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{str(row.amountAndMethod)}</td>
                  <td className="py-2 pr-3 text-foreground">
                    {row.estimatedMonthlyAmount != null
                      ? formatMonthlyAmount(row.estimatedMonthlyAmount)
                      : row.billingMethod === "PER_KWH" || row.billingMethod === "PER_M3"
                        ? "Theo công tơ (sau ký)"
                        : "—"}
                  </td>
                  <td className="py-2 text-muted-foreground">{str(row.note)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {payment && contract.status !== "DRAFT" && (
        <section className="rounded-lg border border-border bg-card p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-4">
            <div className="flex items-start gap-2.5">
              <CreditCard className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <h2 className="text-sm font-bold text-foreground">Thanh toán tháng đầu</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {payment.paymentStatus === "PAID_MOCK"
                    ? "Đã thanh toán trên môi trường giả lập."
                    : "Chưa thanh toán."}
                </p>
              </div>
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border self-start ${
              payment.paymentStatus === "PAID_MOCK"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
            }`}>
              {payment.paymentStatus === "PAID_MOCK" ? "Đã thanh toán" : "Chưa thanh toán"}
            </span>
          </div>

          <div className="divide-y divide-border/60 border-y border-border/60">
            <FieldRow label="Tiền thuê tháng đầu" value={formatMonthlyAmount(payment.monthlyRent)} />
            <FieldRow label="Tiền cọc" value={formatMonthlyAmount(payment.deposit)} />
            {payment.charges.map((charge) => (
              <FieldRow
                key={`${charge.name}-${charge.amount}`}
                label={charge.name}
                value={formatMonthlyAmount(charge.amount)}
              />
            ))}
            <div className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="font-bold text-foreground">Tổng thanh toán</span>
              <span className="font-extrabold text-primary text-right">
                {formatMonthlyAmount(payment.totalAmount)}
              </span>
            </div>
          </div>

          {payment.excludedMeterCharges.length > 0 && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              {payment.excludedMeterCharges.join(", ")} tính theo công tơ chưa bao gồm trong lần thanh toán này.
            </p>
          )}

          {isTenant && contract.status === "PENDING_REVIEW" && payment.paymentStatus === "UNPAID" && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={paying}
                onClick={handleMockPayment}
                className="h-9 px-3.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {paying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                {paying ? "Đang thanh toán..." : "Thanh toán giả lập"}
              </button>
            </div>
          )}

          {isTenant && contract.status === "PENDING_REVIEW" && payment.paymentStatus === "PAID_MOCK" && (
            <div className="mt-4 border-t border-border pt-4 space-y-3">
              <label className="flex items-start gap-2.5 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToContract}
                  onChange={(event) => setAgreedToContract(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                />
                <span>Tôi đã đọc và đồng ý với nội dung hợp đồng.</span>
              </label>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={signing || !agreedToContract}
                  onClick={handleSign}
                  title={!agreedToContract ? "Xác nhận đã đọc và đồng ý trước khi ký" : undefined}
                  className="h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {signing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenLine className="w-3.5 h-3.5" />}
                  {signing ? "Đang ký..." : "Ký hợp đồng"}
                </button>
              </div>
            </div>
          )}

          {isLandlord && contract.status === "PENDING_REVIEW" && (
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              {payment.paymentStatus === "PAID_MOCK"
                ? "Người thuê đã thanh toán. Đang chờ người thuê xác nhận và ký hợp đồng."
                : "Đang chờ người thuê thanh toán và ký hợp đồng."}
            </p>
          )}
        </section>
      )}

      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground">
        {contract.status === "DRAFT"
          ? "Kiểm tra dữ liệu, kết xuất file rồi gửi hợp đồng cho người thuê."
          : contract.status === "ACTIVE"
            ? "Hợp đồng đã có hiệu lực. Tin đăng đã chuyển sang trạng thái đã cho thuê."
            : "Hai bên có thể xem và tải tài liệu hợp đồng; người thuê hoàn tất thanh toán và ký tại trang này."}
        {(isLandlord || isTenant) && (
          <>
            {" "}
            <Link
              href={isLandlord ? "/dashboard/rental-requests" : "/dashboard/rental-requests/my-requests"}
              className="text-primary font-semibold hover:underline"
            >
              Quay lại yêu cầu thuê
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
