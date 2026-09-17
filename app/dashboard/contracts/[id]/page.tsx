"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { contractService } from "@/services/contract.service";
import type {
  ContractCompletenessResponse,
  ContractDocumentResponse,
  ContractPaymentBreakdownResponse,
  ContractResponse,
  ContractRevisionResponse,
} from "@/types/contract.type";
import { useAuth } from "@/features/auth/useAuth";
import { getApiErrorMessage } from "@/utils/apiError";

import ContractHeader from "@/components/contract/detail/ContractHeader";
import ContractPartiesSection from "@/components/contract/detail/ContractPartiesSection";
import ContractPropertySection from "@/components/contract/detail/ContractPropertySection";
import ContractLeaseSection from "@/components/contract/detail/ContractLeaseSection";
import ContractFinancialSection from "@/components/contract/detail/ContractFinancialSection";
import ContractInitialPaymentSection from "@/components/contract/detail/ContractInitialPaymentSection";
import ContractAmenitiesSection from "@/components/contract/detail/ContractAmenitiesSection";
import ContractChargesSection from "@/components/contract/detail/ContractChargesSection";
import ContractEquipmentSection from "@/components/contract/detail/ContractEquipmentSection";
import ContractPoliciesSection from "@/components/contract/detail/ContractPoliciesSection";
import ContractHandoverSection from "@/components/contract/detail/ContractHandoverSection";
import ContractDocumentSection from "@/components/contract/detail/ContractDocumentSection";
import ContractSignaturePanel from "@/components/contract/detail/ContractSignaturePanel";

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const contractId = String(params?.id || "");

  const [contract, setContract] = useState<ContractResponse | null>(null);
  const [revision, setRevision] = useState<ContractRevisionResponse | null>(null);
  const [completeness, setCompleteness] = useState<ContractCompletenessResponse | null>(null);
  const [documents, setDocuments] = useState<ContractDocumentResponse[]>([]);
  const [payment, setPayment] = useState<ContractPaymentBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [rendering, setRendering] = useState(false);
  const [sending, setSending] = useState(false);
  const [signing, setSigning] = useState(false);

  // Meter states for draft editing
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
      toast.error(getApiErrorMessage(err, "Không thể tải dữ liệu hợp đồng."));
      router.replace("/dashboard/contracts");
    } finally {
      setLoading(false);
    }
  }, [contractId, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const latestDoc = useMemo(() => {
    const ready = documents.filter(
      (d) => d.status === "READY" && (d.viewUrl || d.downloadUrl)
    );
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

  const isWaterPerPerson = useMemo(() => {
    return (revision?.charges || []).some(
      (charge) =>
        charge.chargeType === "WATER" &&
        charge.billingMethod === "PER_PERSON_MONTH"
    );
  }, [revision?.charges]);

  // ACTION: TRIGGER PREVIEW
  async function handleRender() {
    if (!contractId || !revision) return;
    setRendering(true);
    try {
      const doc = await contractService.triggerPreview(contractId);
      toast.success(
        `Đã kết xuất bản xem trước của bản sửa đổi số ${revision.revisionNumber}.`
      );
      setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
      const refreshedDocs = await contractService.getDocuments(contractId);
      setDocuments(refreshedDocs);
      const comp = await contractService.getCompleteness(contractId);
      setCompleteness(comp);
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, "Không thể kết xuất bản xem trước hợp đồng.")
      );
    } finally {
      setRendering(false);
    }
  }

  // ACTION: SAVE SPECIAL TERMS
  async function handleSaveSpecialTerms(terms: string) {
    if (!contractId || !revision) return;
    try {
      const updated = await contractService.updateRevision(contractId, {
        landlord: revision.landlord || {},
        tenant: revision.tenant || {},
        property: revision.property || {},
        lease: revision.lease || {},
        financial: revision.financial || {},
        initialPayment: revision.initialPayment || undefined,
        amenities: revision.amenities || undefined,
        charges: revision.charges || [],
        equipments: revision.equipments || [],
        policies: revision.policies || undefined,
        meters: {
          ...(revision.meters || {}),
          electricityInitial: electricityInitial.trim(),
          waterInitial: isWaterPerPerson
            ? "Không áp dụng đồng hồ nước"
            : waterInitial.trim(),
        },
        specialTerms: terms,
        revisionNote: "Cập nhật điều khoản thỏa thuận riêng.",
      });
      setRevision(updated);
      toast.success(`Đã lưu bản sửa đổi số ${updated.revisionNumber}.`);
      const comp = await contractService.getCompleteness(contractId);
      setCompleteness(comp);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể cập nhật điều khoản hợp đồng."));
    }
  }

  // ACTION: SEND TO TENANT
  async function handleSendToTenant() {
    if (!contractId) return;
    if (!hasReadyCurrentDocument) {
      toast.warning(
        "Dữ liệu đã thay đổi hoặc chưa có file kết xuất. Vui lòng kết xuất file xem trước trước khi gửi."
      );
      return;
    }
    setSending(true);
    try {
      const sent = await contractService.sendToTenant(contractId);
      setContract(sent);
      const refreshedDocs = await contractService.getDocuments(contractId);
      setDocuments(refreshedDocs);
      toast.success("Đã xác nhận nội dung và gửi hợp đồng cho người thuê.");
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, "Không thể gửi hợp đồng cho người thuê.")
      );
    } finally {
      setSending(false);
    }
  }

  // ACTION: TENANT CONFIRM / SIGN
  async function handleSign() {
    if (!contractId) return;
    if (contract?.status !== "PENDING_REVIEW") {
      toast.error("Bạn chưa thể xác nhận vì hợp đồng chưa ở trạng thái chờ ký.");
      return;
    }
    setSigning(true);
    try {
      const signed = await contractService.sign(contractId);
      setContract(signed);
      toast.success("Đã xác nhận đồng ý hợp đồng. Hợp đồng đã có hiệu lực.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể xác nhận ký hợp đồng."));
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        Đang tải thông tin hợp đồng...
      </div>
    );
  }

  if (!contract || !revision) return null;

  const isDraft = contract.status === "DRAFT";
  const landlord = revision.landlord || {};
  const tenant = revision.tenant || {};
  const property = revision.property || {};
  const lease = revision.lease || {};
  const financial = revision.financial || {};
  const initialPayment = revision.initialPayment;
  const amenities = revision.amenities || [];
  const charges = revision.charges || [];
  const equipments = revision.equipments || [];
  const policies = revision.policies;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200 pb-12 max-w-6xl mx-auto">
      {/* 1. CONTRACT HEADER */}
      <ContractHeader
        contract={contract}
        revision={revision}
        completeness={completeness}
        latestDoc={latestDoc}
        hasReadyDoc={hasReadyCurrentDocument}
        isLandlord={isLandlord}
        isTenant={isTenant}
        rendering={rendering}
        sending={sending}
        onRender={handleRender}
        onSend={handleSendToTenant}
      />

      {/* 2. WARNING BANNER: INCOMPLETE FIELDS FOR TEMPLATE */}
      {completeness && !completeness.complete && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Mẫu Word còn {completeness.missingFields.length} trường bắt buộc chưa có dữ liệu
              </p>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/90">
                Đã điền {completeness.filledFields}/{completeness.totalFields} trường. Vui lòng rà soát hồ sơ hoặc bổ sung trước khi xuất bản hợp đồng.
              </p>
              <ul className="text-[11px] text-amber-900 dark:text-amber-200 list-disc pl-4 space-y-0.5 pt-1">
                {completeness.missingFields.slice(0, 6).map((f) => (
                  <li key={f.key}>
                    {f.label} <span className="opacity-70">({f.key})</span>
                  </li>
                ))}
                {completeness.missingFields.length > 6 && (
                  <li>… và {completeness.missingFields.length - 6} trường khác</li>
                )}
              </ul>
              {isLandlord &&
                completeness.missingFields.some(
                  (f) => f.key === "landlord.permanentAddress"
                ) && (
                  <Link
                    href="/settings/profile"
                    className="inline-flex text-xs font-semibold text-amber-900 underline underline-offset-2 dark:text-amber-200 pt-1"
                  >
                    Cập nhật nơi thường trú trong hồ sơ cá nhân
                  </Link>
                )}
            </div>
          </div>
        </div>
      )}

      {/* 3. SIGNATURE & CONFIRMATION PANEL (PROMINENT AT TOP / BOTTOM) */}
      <ContractSignaturePanel
        contract={contract}
        isLandlord={isLandlord}
        isTenant={isTenant}
        canSend={Boolean(completeness?.complete && hasReadyCurrentDocument)}
        sending={sending}
        signing={signing}
        onSend={handleSendToTenant}
        onSign={handleSign}
      />

      {/* 4. MAIN CONTRACT SECTIONS */}
      <div className="space-y-6">
        {/* CHỦ THỂ BÊN A VÀ BÊN B */}
        <ContractPartiesSection landlord={landlord} tenant={tenant} />

        {/* THÔNG TIN BẤT ĐỘNG SẢN BÀN GIAO */}
        <ContractPropertySection property={property} />

        {/* THỜI HẠN THUÊ VÀ BÀN GIAO */}
        <ContractLeaseSection lease={lease} />

        {/* GIÁ THUÊ VÀ ĐẶT CỌC */}
        <ContractFinancialSection financial={financial} />

        {/* XÁC NHẬN THANH TOÁN BAN ĐẦU */}
        <ContractInitialPaymentSection
          initialPayment={initialPayment}
          paymentBreakdown={payment}
          paidAt={contract.paidAt}
        />

        {/* BẢNG TIỆN ÍCH DÙNG CHUNG VÀ CHÍNH SÁCH */}
        <ContractAmenitiesSection amenities={amenities} />

        {/* BẢNG PHÍ DỊCH VỤ VÀ ĐIỆN NƯỚC */}
        <ContractChargesSection charges={charges} />

        {/* BẢNG TRANG THIẾT BỊ VÀ NỘI THẤT */}
        <ContractEquipmentSection equipments={equipments} />

        {/* CHÍNH SÁCH VẬN HÀNH VÀ ĐIỀU KHOẢN THỎA THUẬN RIÊNG */}
        <ContractPoliciesSection
          policies={policies}
          specialTerms={revision.specialTerms}
          isDraft={isDraft}
          isLandlord={isLandlord}
          onSaveSpecialTerms={handleSaveSpecialTerms}
        />

        {/* CHỈ SỐ BÀN GIAO CÔNG TƠ (TÙY CHỌN) */}
        <ContractHandoverSection
          electricityInitial={electricityInitial}
          waterInitial={waterInitial}
          isWaterPerPerson={isWaterPerPerson}
          isDraft={isDraft}
          isLandlord={isLandlord}
          onElectricityChange={setElectricityInitial}
          onWaterChange={setWaterInitial}
        />

        {/* DANH SÁCH FILE VĂN BẢN KẾT XUẤT */}
        <ContractDocumentSection documents={documents} />
      </div>

      {/* FOOTER NAVIGATION */}
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span>
          Hệ thống HomeSpace quản lý hợp đồng thông qua snapshot thỏa thuận bất biến, đảm bảo toàn vẹn tính pháp lý và sự minh bạch cho cả hai bên.
        </span>
        <Link
          href={
            isLandlord
              ? "/dashboard/rental-requests"
              : "/dashboard/rental-requests/my-requests"
          }
          className="text-primary font-semibold hover:underline shrink-0"
        >
          Quay lại yêu cầu thuê →
        </Link>
      </div>
    </div>
  );
}
