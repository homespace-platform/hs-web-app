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
} from "lucide-react";
import { toast } from "sonner";
import { contractService } from "@/services/contract.service";
import type {
  ContractCompletenessResponse,
  ContractDocumentResponse,
  ContractResponse,
  ContractRevisionResponse,
  ContractStatus,
} from "@/types/contract.type";
import { useAuth } from "@/features/auth/useAuth";
import { getApiErrorMessage } from "@/utils/apiError";

const STATUS_LABEL: Record<ContractStatus, string> = {
  DRAFT: "Bản nháp",
  PENDING_REVIEW: "Chờ người thuê xem",
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
  const [savingMeters, setSavingMeters] = useState(false);
  const [electricityInitial, setElectricityInitial] = useState("");
  const [waterInitial, setWaterInitial] = useState("");

  const isLandlord = Boolean(
    profile?.id && contract?.landlordId && profile.id === contract.landlordId
  );

  const load = useCallback(async () => {
    if (!contractId) return;
    setLoading(true);
    try {
      const [c, rev, comp, docs] = await Promise.all([
        contractService.getContract(contractId),
        contractService.getRevision(contractId),
        contractService.getCompleteness(contractId),
        contractService.getDocuments(contractId),
      ]);
      setContract(c);
      setRevision(rev);
      setElectricityInitial(String(rev.meters?.electricityInitial ?? ""));
      setWaterInitial(String(rev.meters?.waterInitial ?? ""));
      setCompleteness(comp);
      setDocuments(docs);
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
            Trạng thái: <strong>{STATUS_LABEL[contract.status]}</strong>
            {isLandlord ? " · Bạn là Bên A (chủ nhà)" : " · Bạn là Bên B (người thuê)"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isLandlord && (
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

        {isLandlord && (contract.status === "DRAFT" || contract.status === "PENDING_REVIEW") ? (
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

      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground">
        Phase A: tạo bản nháp, xem dữ liệu đã điền và tải file Word/PDF. Bước{" "}
        <strong>Gửi cho người thuê → thanh toán ảo → ký</strong> sẽ làm ở Phase B/C.
        {isLandlord && (
          <>
            {" "}
            <Link href="/dashboard/rental-requests" className="text-primary font-semibold hover:underline">
              Quay lại yêu cầu thuê
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
