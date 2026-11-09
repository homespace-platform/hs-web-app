"use client";

import RentalOnboardingPanel from "@/components/rental-request/RentalOnboardingPanel";
import DepositAgreementPanel from "@/components/rental-request/DepositAgreementPanel";
import type { RentalOnboarding } from "@/services/rental-onboarding.service";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { contractService } from "@/services/contract.service";
import type {
  ContractCompletenessResponse,
  ContractListingSyncPreview,
  ContractDocumentResponse,
  ContractPaymentBreakdownResponse,
  ContractResponse,
  ContractRevisionResponse,
  UpdateContractRevisionRequest,
  SignatureStateResponse,
} from "@/types/contract.type";
import { useAuth } from "@/features/auth/useAuth";
import { getApiErrorMessage } from "@/utils/apiError";

import ContractHeader from "@/components/contract/detail/ContractHeader";
import ContractPartiesSection from "@/components/contract/detail/ContractPartiesSection";
import ContractPropertySection from "@/components/contract/detail/ContractPropertySection";
import ContractLeaseSection from "@/components/contract/detail/ContractLeaseSection";
import ContractFinancialSection from "@/components/contract/detail/ContractFinancialSection";
import ContractAmenitiesSection from "@/components/contract/detail/ContractAmenitiesSection";
import ContractChargesSection from "@/components/contract/detail/ContractChargesSection";
import ContractEquipmentSection from "@/components/contract/detail/ContractEquipmentSection";
import ContractPoliciesSection, { type DraftPolicyFields } from "@/components/contract/detail/ContractPoliciesSection";
import ContractHandoverSection from "@/components/contract/detail/ContractHandoverSection";
import ContractMissingFieldsNotice from "@/components/contract/detail/ContractMissingFieldsNotice";
import ContractInitialPaymentSection from "@/components/contract/detail/ContractInitialPaymentSection";
import { ContractFieldLegend } from "@/components/contract/detail/ContractFieldState";
import { ContractSnapshotReadOnly } from "@/components/contract/detail/utils";
import ContractDocumentSection from "@/components/contract/detail/ContractDocumentSection";
import ContractSignaturePanel from "@/components/contract/detail/ContractSignaturePanel";
import SmartCaSignaturePanel from "@/components/contract/detail/SmartCaSignaturePanel";
import ContractLifecyclePanel from "@/components/contract/detail/ContractLifecyclePanel";
import ComplaintPanel from "@/components/complaint/ComplaintPanel";
import RentalWorkflowPanel from "@/components/rental-request/RentalWorkflowPanel";
import ContractAmendmentPanel from "@/components/contract/detail/ContractAmendmentPanel";
import ContractAmendmentWorkspace, { ContractTermsNotice } from "@/components/contract/detail/ContractAmendmentWorkspace";
import { contractListPath, contractDetailPath, invoiceDetailPath } from "@/lib/contract-routes";
import { generateContractPreview } from "@/lib/contract-preview";
import { missingRequiredInitialMeters, validateInitialMeterReading } from "@/lib/contract-initial-meters";
import { VIETNAMESE_PHONE_REGEX } from "@/validation/user.schema";
import type { AmendmentTerms } from "@/types/contract-amendment.type";
import { ContractDraftEditor, draftContentPatch, draftEditorValues } from "@/components/contract/detail/ContractDraftEditor";
import ListingSyncControl from "@/components/contract/detail/ListingSyncControl";

const DRAFT_FORM_ID = "lease-draft-form";

export default function ContractDetailView({ perspective }: { perspective: "landlord" | "tenant" }) {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const contractId = String(params?.id || "");

  const [contract, setContract] = useState<ContractResponse | null>(null);
  const [onboarding, setOnboarding] = useState<RentalOnboarding | null>(null);
  useEffect(() => { setOnboarding(null); }, [contractId]);
  const [revision, setRevision] = useState<ContractRevisionResponse | null>(null);
  const [completeness, setCompleteness] = useState<ContractCompletenessResponse | null>(null);
  const [documents, setDocuments] = useState<ContractDocumentResponse[]>([]);
  const [currentPreview, setCurrentPreview] = useState<ContractDocumentResponse | null>(null);
  const [payment, setPayment] = useState<ContractPaymentBreakdownResponse | null>(null);
  const [signatureState, setSignatureState] = useState<SignatureStateResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [rendering, setRendering] = useState(false);
  const previewRequest = useRef<AbortController | null>(null);
  const [reconcilingPreview, setReconcilingPreview] = useState(false);

  useEffect(() => () => { previewRequest.current?.abort(); previewRequest.current = null; }, [contractId]);
  const [sending, setSending] = useState(false);
  const [signing, setSigning] = useState(false);

  // Meter states for draft editing
  const [electricityInitial, setElectricityInitial] = useState("");
  const [waterInitial, setWaterInitial] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftPolicy, setDraftPolicy] = useState<Partial<DraftPolicyFields>>({});
  const [feeError, setFeeError] = useState<string>();
  const [retryPreview, setRetryPreview] = useState(false);
  const [draftConflict, setDraftConflict] = useState(false);
  const [meterErrors, setMeterErrors] = useState<{ electricity?: string; water?: string }>({});
  const [draftEdits, setDraftEdits] = useState<Partial<AmendmentTerms>>({});
  const [listingSyncPreview, setListingSyncPreview] = useState<ContractListingSyncPreview | null>(null);
  const [syncingListing, setSyncingListing] = useState(false);

  const isLandlord = Boolean(
    perspective === "landlord" && profile?.id && contract?.landlordId && profile.id === contract.landlordId
  );
  const isTenant = Boolean(
    perspective === "tenant" && profile?.id && contract?.tenantId && profile.id === contract.tenantId
  );

  const load = useCallback(async () => {
    if (!contractId) return;
    setLoading(true);
    setRendering(false);
    setReconcilingPreview(false);
    setCurrentPreview(null);
    setDraftPolicy({});
    setDraftConflict(false);
    setRetryPreview(false);
    setSavingDraft(false);
    setMeterErrors({});
    setFeeError(undefined);
    setDraftEdits({});
    setListingSyncPreview(null);
    setSyncingListing(false);
    try {
      const c = await contractService.getContract(contractId);
      if (c.agreementKind === "DEPOSIT") {
        setContract(c);
        setRevision(null);
        return; // Deposit documents must not load lease billing, meters or amendment tools.
      }
      const [rev, comp, docs, paymentBreakdown, sigState, preview] = await Promise.all([
        contractService.getRevision(contractId),
        contractService.getCompleteness(contractId),
        contractService.getDocuments(contractId),
        contractService.getPaymentBreakdown(contractId),
        contractService.getSignatureState(contractId),
        c.status === "DRAFT" ? contractService.getPreviewStatus(contractId) : Promise.resolve(null),
      ]);
      setContract(c);
      setRevision(rev);
      setElectricityInitial(String(rev.meters?.electricityInitial ?? ""));
      setWaterInitial(String(rev.meters?.waterInitial ?? ""));
      setCompleteness(comp);
      setDocuments(docs);
      setCurrentPreview(preview);
      setPayment(paymentBreakdown);
      setSignatureState(sigState);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể tải dữ liệu hợp đồng."));
      router.replace(contractListPath(perspective));
    } finally {
      setLoading(false);
    }
  }, [contractId, router, perspective]);

  const refreshSignedState = useCallback(async () => {
    if (!contractId) return;
    const [updatedContract, docs, state] = await Promise.all([
      contractService.getContract(contractId),
      contractService.getDocuments(contractId),
      contractService.getSignatureState(contractId),
    ]);
    setContract(updatedContract);
    setDocuments(docs);
    setSignatureState(state);
  }, [contractId]);

  useEffect(() => {
    void load();
  }, [load]);

  const latestDoc = useMemo(() => {
    if (contract?.status === "DRAFT") return documents.find((doc) =>
      doc.id === currentPreview?.id && doc.revisionId === revision?.id && doc.status === "READY"
    ) ?? null;
    const ready = documents.filter(
      (d) => d.status === "READY" && (d.viewUrl || d.downloadUrl || (d.documentType === "PDF" && d.purpose === "SIGNED_FINAL" && d.storageObjectId))
    );
    const preferred = ["SIGNED_FINAL", "SIGNED_LANDLORD", "OFFICIAL", "PREVIEW"];
    return ready.sort((a, b) => preferred.indexOf(a.purpose) - preferred.indexOf(b.purpose))[0]
      ?? documents[0] ?? null;
  }, [documents, contract?.status, currentPreview, revision?.id]);

  const hasReadyCurrentDocument = useMemo(
    () =>
      Boolean(
        revision &&
          (contract?.status !== "DRAFT" || currentPreview?.revisionId === revision.id) &&
          documents.some(
            (document) =>
              document.revisionId === revision.id &&
              (contract?.status !== "DRAFT" || document.id === currentPreview?.id) &&
              ((signatureState?.signatureMode !== "SMARTCA" && (contract?.status !== "DRAFT" || contract.parentContractId)) || document.documentType === "PDF") &&
              document.status === "READY" &&
              Boolean(document.storageObjectId)
          )
      ),
    [documents, revision, contract, currentPreview, signatureState?.signatureMode]
  );

  const draftCharges = useMemo(() => listingSyncPreview?.terms.charges ?? revision?.charges ?? [],
    [listingSyncPreview?.terms.charges, revision?.charges]);
  const electricityRequired = useMemo(() =>
    draftCharges.some((charge) =>
      charge.chargeType === "ELECTRICITY" && charge.billingMethod === "PER_KWH"
    ), [draftCharges]);

  const waterRequired = useMemo(() =>
    draftCharges.some((charge) =>
      charge.chargeType === "WATER" && ["PER_M3", "STATE_WATER_RATE"].includes(String(charge.billingMethod))
    ), [draftCharges]);

  const isWaterPerPerson = useMemo(() =>
    !waterRequired && draftCharges.some((charge) =>
      charge.chargeType === "WATER" && charge.billingMethod === "PER_PERSON_MONTH"
    ), [draftCharges, waterRequired]);

  const metersDirty = Boolean(revision && (
    electricityInitial.trim() !== String(revision.meters?.electricityInitial ?? "").trim() ||
    (!isWaterPerPerson && waterInitial.trim() !== String(revision.meters?.waterInitial ?? "").trim())
  ));

  const reviewDraft = Boolean(isLandlord && contract?.status === "DRAFT" && !contract.parentContractId);
  const signatureLocked = Boolean(contract?.landlordConfirmedAt || signatureState?.allRequests?.some(({status}) =>
    ["CREATED", "PENDING_USER_CONFIRMATION", "PROVIDER_SIGNED", "EMBEDDING", "SIGNED"].includes(status)));
  const reviewLocked = draftConflict || signatureLocked || onboarding?.stage === "CANCELLATION_REFUND_PENDING";
  const savedFeeMode = (revision?.policies?.latePaymentFeeMode as DraftPolicyFields["feeMode"]) ?? "NONE";
  const savedFeeAmount = String(revision?.policies?.latePaymentFeeAmount ?? "");
  const draftFields: DraftPolicyFields = {
    feeMode: draftPolicy.feeMode ?? savedFeeMode,
    feeAmount: draftPolicy.feeAmount ?? savedFeeAmount,
    additionalTerms: draftPolicy.additionalTerms ?? revision?.additionalTerms ?? undefined,
  };
  const feeDirty = draftFields.feeMode !== savedFeeMode ||
    (draftFields.feeMode !== "NONE" && Number(draftFields.feeAmount) !== Number(savedFeeAmount));
  const termsDirty = (draftFields.additionalTerms ?? "").trim() !== (revision?.additionalTerms ?? "").trim();
  const baseTerms = useMemo(() => draftEditorValues(revision), [revision]);
  const draftContent = useMemo(() => draftContentPatch(baseTerms, draftEdits), [baseTerms, draftEdits]);
  const draftDirty = reviewDraft && Boolean(metersDirty || feeDirty || termsDirty || draftContent || listingSyncPreview);

  async function handleRender(sourceOverride?: ContractListingSyncPreview) {
    if (!contractId || !revision || previewRequest.current || (reviewDraft && reviewLocked)) return;
    const source = sourceOverride ?? listingSyncPreview;
    const needsSave = draftDirty || Boolean(reviewDraft && source);
    if (sourceOverride && sourceOverride.baseRevisionId !== revision.id) {
      toast.error("Phiên bản hợp đồng đã thay đổi. Tải lại trang trước khi cập nhật.");
      return;
    }
    if (reviewDraft) {
      const errors = {
        electricity: validateInitialMeterReading(electricityInitial, electricityRequired, "chỉ số điện ban đầu"),
        water: isWaterPerPerson ? undefined : validateInitialMeterReading(waterInitial, waterRequired, "chỉ số nước ban đầu"),
      };
      setMeterErrors(errors);
      const amount = Number(draftFields.feeAmount);
      const invalidFee = draftFields.feeMode !== "NONE" && (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000_000);
      setFeeError(invalidFee ? "Nhập mức phạt là số tiền nguyên dương, tối đa 1 tỷ đồng." : undefined);
      const invalidPhone = [draftContent?.landlord, draftContent?.tenant].some(party =>
        party?.phone !== undefined && !VIETNAMESE_PHONE_REGEX.test(String(party.phone).trim()));
      const form = document.getElementById(DRAFT_FORM_ID) as HTMLFormElement | null;
      if (errors.electricity || errors.water || invalidFee || invalidPhone) {
        const section = errors.electricity || errors.water ? "contract-handover"
          : invalidPhone ? "contract-parties" : "contract-policies";
        if (invalidPhone) toast.error("Nhập số điện thoại di động Việt Nam hợp lệ.");
        document.getElementById(section)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (form && !form.reportValidity()) return;
    }

    const request = new AbortController();
    previewRequest.current = request;
    let targetRevision = revision;
    let draftSaved = false;
    let previewReady = false;
    try {
      if (needsSave) {
        setSavingDraft(true);
        const payload: UpdateContractRevisionRequest = { baseRevisionId: revision.id, revisionNote: "Hoàn thiện bản nháp hợp đồng." };
        if (metersDirty) payload.meters = {
          electricityInitial: electricityInitial.trim(),
          ...(isWaterPerPerson ? {} : { waterInitial: waterInitial.trim() }),
        };
        if (termsDirty) payload.additionalTerms = draftFields.additionalTerms?.trim();
        if (draftContent) payload.draftContent = draftContent;
        if (source) payload.listingSourceVersion = source.sourceVersion;
        if (feeDirty) payload.policies = {
          latePaymentFeeMode: draftFields.feeMode,
          latePaymentFeeAmount: draftFields.feeMode === "NONE" ? 0 : Number(draftFields.feeAmount),
        };
        targetRevision = await contractService.updateRevision(contractId, payload, request.signal);
        if (request.signal.aborted) return;
        draftSaved = true;
        setRevision(targetRevision);
        setCurrentPreview(null);
        setDraftPolicy({});
        setDraftEdits({});
        setListingSyncPreview(null);
        setElectricityInitial(String(targetRevision.meters?.electricityInitial ?? ""));
        setWaterInitial(String(targetRevision.meters?.waterInitial ?? ""));
        setSavingDraft(false);
      }

      setRendering(true);
      setReconcilingPreview(false);
      const doc = await generateContractPreview({
        trigger: (signal) => contractService.triggerPreview(contractId, signal, reviewDraft ? targetRevision.id : undefined),
        status: (signal) => contractService.getPreviewStatus(contractId, signal),
      }, targetRevision.id, request.signal, () => setReconcilingPreview(true), {requirePdf: reviewDraft});
      if (request.signal.aborted) return;
      setRetryPreview(!doc);
      if (doc) {
        previewReady = true;
        setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
        setCurrentPreview(doc);
        toast.success(draftSaved ? "Đã lưu và kết xuất PDF. Bạn có thể xem lại trước khi ký." : "Đã tạo bản xem trước hợp đồng.");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toast.info(draftSaved ? "Đã lưu bản nháp. Chưa xác nhận được kết quả kết xuất PDF." : "Chưa xác nhận được kết quả kết xuất. Bạn có thể thử kết xuất lại.");
      }
    } catch (error) {
      if (request.signal.aborted) return;
      const code = (error as { response?: { data?: { code?: number | string } } })?.response?.data?.code;
      if (String(code) === "6072") {
        setDraftConflict(true);
        setCurrentPreview(null);
      }
      setRetryPreview(reviewDraft && (!needsSave || draftSaved));
      const message = getApiErrorMessage(error, needsSave && !draftSaved ? "Không thể lưu bản nháp." : "Không thể kết xuất bản xem trước.");
      toast.error(draftSaved ? "Đã lưu bản nháp. " + message : message);
    } finally {
      if (previewRequest.current === request) {
        if (draftSaved || previewReady) {
          const [comp, docs] = await Promise.allSettled([contractService.getCompleteness(contractId), contractService.getDocuments(contractId)]);
          if (!request.signal.aborted && comp.status === "fulfilled" && comp.value.revisionId === targetRevision.id) setCompleteness(comp.value);
          if (!request.signal.aborted && docs.status === "fulfilled") {
            setDocuments((prev) => [...docs.value, ...prev.filter(d => d.revisionId === targetRevision.id && !docs.value.some(item => item.id === d.id))]);
          }
        }
        if (previewRequest.current === request) {
          previewRequest.current = null;
          setSavingDraft(false);
          setRendering(false);
          setReconcilingPreview(false);
        }
      }
    }
  }

  const draftBusy = savingDraft || rendering || reconcilingPreview || syncingListing;
  const readyToSign = hasReadyCurrentDocument && !draftDirty && !draftBusy && !draftConflict;

  // ACTION: SEND TO TENANT
  async function handleSendToTenant() {
    if (!contractId) return;
    if (!readyToSign || previewRequest.current) {
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

  if (!contract) return null;

  if (!profile?.id) return <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Loader2 className="h-4 w-4 animate-spin" />Đang xác thực tài khoản…
  </div>;

  if (profile?.id && !isLandlord && !isTenant) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
      Hợp đồng này không thuộc vai trò {perspective === "landlord" ? "cho thuê" : "đi thuê"} của bạn. {" "}
      <Link href={contractListPath(perspective)} className="font-semibold underline">Về danh sách hợp đồng</Link>
    </div>;
  }

  if (contract.agreementKind === "DEPOSIT") return <div className="mx-auto max-w-4xl space-y-4 pb-8">
    <Link href={`${contractListPath(perspective)}?kind=DEPOSIT`} className="text-sm text-primary underline">← Hợp đồng cọc của tôi</Link>
    <div className="rounded-2xl border bg-card p-4"><h1 className="text-xl font-bold">Hợp đồng cọc & giữ phòng</h1><p className="mt-2 text-sm text-muted-foreground">1. Xác nhận cọc → 2. Ký HĐ cọc → 3. Thanh toán tháng đầu và ký HĐ thuê.</p></div>
    <DepositAgreementPanel rentalRequestId={contract.rentalRequestId} isLandlord={isLandlord} onUpdated={refreshSignedState}/>
    <RentalOnboardingPanel rentalRequestId={contract.rentalRequestId} isLandlord={isLandlord} showDepositAgreement={false} onUpdated={refreshSignedState}/>
  </div>;
  if (!revision) return null;

  const isDraft = contract.status === "DRAFT" && !contract.parentContractId;
  const isAmendment = contract.agreementKind === "AMENDMENT";
  const landlord = revision.landlord || {};
  const tenant = revision.tenant || {};
  const property = listingSyncPreview?.terms.property ?? revision.property ?? {};
  const lease = listingSyncPreview?.terms.lease ?? revision.lease ?? {};
  const financial = listingSyncPreview?.terms.financial ?? revision.financial ?? {};
  const amenities = listingSyncPreview?.terms.amenities ?? revision.amenities ?? [];
  const charges = listingSyncPreview?.terms.charges ?? revision.charges ?? [];
  const equipments = listingSyncPreview?.terms.equipments ?? revision.equipments ?? [];
  const policies = listingSyncPreview?.terms.policies ?? revision.policies;
  const missingMeterReadings = missingRequiredInitialMeters(
    reviewDraft ? { electricityInitial, waterInitial } : revision.meters, electricityRequired, waterRequired
  );
  const prioritizeMeters = isDraft && missingMeterReadings.length > 0;
  const missingFieldsNotice = <ContractMissingFieldsNotice completeness={completeness} isLandlord={isLandlord}
    meterFields={reviewDraft || prioritizeMeters ? missingMeterReadings : undefined}
    hasLandlordPhone={reviewDraft && VIETNAMESE_PHONE_REGEX.test(String(draftEdits.landlord?.phone ?? "").trim())} />;
  const handoverSection = <ContractHandoverSection
    formId={reviewDraft ? DRAFT_FORM_ID : undefined}
    originalElectricityInitial={String(revision.meters?.electricityInitial??"")}
    originalWaterInitial={String(revision.meters?.waterInitial??"")}
    electricityInitial={electricityInitial}
    waterInitial={waterInitial}
    isWaterPerPerson={isWaterPerPerson}
    electricityRequired={electricityRequired}
    waterRequired={waterRequired}
    isDraft={isDraft}
    isLandlord={isLandlord}
    disabled={reviewLocked || draftBusy}
    priority={prioritizeMeters}
    missingFieldsNotice={missingFieldsNotice}
    errors={meterErrors}
    onElectricityChange={(value) => { setElectricityInitial(value); setMeterErrors((prev) => ({ ...prev, electricity: undefined })); }}
    onWaterChange={(value) => { setWaterInitial(value); setMeterErrors((prev) => ({ ...prev, water: undefined })); }}
  />;
  const policiesSection = <ContractPoliciesSection
    policies={policies}
    financial={financial}
    specialTerms={revision.specialTerms}
    isDraft={isDraft}
    draft={reviewDraft ? draftFields : undefined}
    draftSystemTerms={reviewDraft ? revision.systemTerms ?? revision.specialTerms : undefined}
    originalAdditionalTerms={revision.additionalTerms}
    draftDisabled={reviewLocked || draftBusy}
    feeError={feeError}
    onDraftChange={(changes) => { setDraftPolicy((prev) => ({ ...prev, ...changes })); setFeeError(undefined); }}
  />;
  const contractSections = <>
    <ContractFieldLegend draft={isDraft} />
    <ContractPartiesSection landlord={landlord} tenant={tenant} />
    <ContractPropertySection property={property} />
    <ContractLeaseSection lease={lease} />
    <ContractFinancialSection financial={financial} />
    <ContractInitialPaymentSection initialPayment={revision.initialPayment} />
    <ContractAmenitiesSection amenities={amenities} />
    <ContractChargesSection charges={charges} />
    <ContractEquipmentSection equipments={equipments} />
    {policiesSection}
  </>;

  return (
    <ContractAmendmentWorkspace contractId={contract.id} actorId={profile.id} perspective={perspective} enabled={!contract.parentContractId && ["ACTIVE", "EXPIRED", "CLOSED", "TERMINATED"].includes(contract.status)}>
    <ContractSnapshotReadOnly.Provider value={isDraft}>
    <div className="space-y-6 animate-in fade-in-50 duration-200 pb-52 max-w-6xl mx-auto">
      <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
        <p className="font-semibold">{isAmendment ? "Phụ lục điều chỉnh hợp đồng" : perspective === "landlord" ? "Hợp đồng cho thuê" : "Hợp đồng đi thuê"}</p>
        <p className="text-xs text-muted-foreground">{perspective === "landlord"
          ? "Quản lý nội dung, tài liệu và chữ ký với tư cách bên cho thuê."
          : "Xem nội dung, tài liệu và xác nhận ký với tư cách bên đi thuê."}</p>
      </div>
      {/* 1. CONTRACT HEADER */}
      <ContractHeader
        backPath={isAmendment && contract.parentContractId ? contractDetailPath(perspective, contract.parentContractId) : contractListPath(perspective)}
        contract={contract}
        revision={revision}
        completeness={completeness}
        latestDoc={draftDirty || draftConflict ? null : latestDoc}
        hasReadyDoc={hasReadyCurrentDocument && !draftDirty && !draftConflict}
        isLandlord={isLandlord}
        isTenant={isTenant}
        rendering={rendering}
        reconcilingPreview={reconcilingPreview}
        sending={sending}
        onRender={handleRender}
        draftReview={reviewDraft ? { formId: DRAFT_FORM_ID, saving: savingDraft || syncingListing, retry: retryPreview && !draftDirty, locked: reviewLocked } : undefined}
        listingSyncAction={reviewDraft && <ListingSyncControl contractId={contractId} baseRevisionId={revision.id}
          disabled={reviewLocked || draftBusy} onBusyChange={setSyncingListing} onSelect={async source => {
            if (previewRequest.current) return;
            setListingSyncPreview(source);
            await handleRender(source);
          }} />}
        onSend={handleSendToTenant}
        smartCaMode={signatureState?.signatureMode === "SMARTCA"}
        cancellationRefundPending={onboarding?.stage === "CANCELLATION_REFUND_PENDING"}
      />

      {reviewDraft && <>
        <section className="space-y-2 rounded-xl border bg-card p-4 text-sm">
          <h2 className="font-semibold">Rà soát bản nháp trước khi ký</h2>
          <p>Kiểm tra và sửa trực tiếp các ô bên dưới. Bấm <strong>Lưu</strong> để lưu bản nháp và tự tạo PDF xem trước.</p>
          <div className="flex flex-wrap gap-4 text-xs font-semibold text-primary">
            <a href="#contract-handover">Chỉ số điện nước</a>
            <a href="#contract-parties">Thông tin hai bên</a>
            <a href="#contract-property">Thông tin bất động sản</a>
            <a href="#contract-policies">Phí chậm trả & thỏa thuận</a>
          </div>
          {draftDirty && <p role="status" className="text-xs font-medium text-amber-700 dark:text-amber-400">Có thay đổi chưa lưu</p>}
          {listingSyncPreview && <div className="flex flex-wrap items-center gap-3 text-xs">
            <span>Đã tải dữ liệu bài đăng. Hoàn thiện các ô còn thiếu để lưu và kết xuất.</span>
            <button type="button" className="text-primary underline" disabled={draftBusy || reviewLocked}
              onClick={() => setListingSyncPreview(null)}>Bỏ dữ liệu vừa lấy</button>
          </div>}
          {draftConflict && <div role="alert" className="space-y-2 text-amber-800">
            <p>Bản nháp đã thay đổi ở nơi khác. Hãy đối chiếu nội dung trước khi chỉnh sửa lại.</p>
            <button type="button" className="underline" onClick={() => {
              if (!draftDirty || window.confirm("Tải bản mới và bỏ các chỉnh sửa chưa lưu trên trang này?")) void load();
            }}>Tải lại bản nháp</button>
          </div>}
          {signatureLocked && <p className="text-amber-800">Bản nháp đang xử lý chữ ký. Hãy theo dõi trạng thái ký bên dưới.</p>}
        </section>
        {!prioritizeMeters && missingFieldsNotice}
        {handoverSection}
      </>}
      {!reviewDraft && (prioritizeMeters ? handoverSection : missingFieldsNotice)}

      {isLandlord && isDraft && !contract.parentContractId && <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        Ngày thuê, thời hạn, tiền thuê, tiền cọc và số người/xe lấy từ hồ sơ đã chấp thuận. Đổi ngày nhận nhà dùng đề nghị nhận nhà sớm bên dưới. Các điều khoản sau ký được điều chỉnh qua phụ lục.
      </p>}

      {isTenant && isDraft && <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <p className="font-semibold">Bản nháp để xem trước · Chưa có hiệu lực</p>
        <p className="mt-1">Chủ nhà vẫn có thể cập nhật nội dung. Bạn có thể xem văn bản và đề nghị nhận nhà, bắt đầu hợp đồng sớm trong phần bên dưới. Chấp nhận đề nghị sẽ đổi ngày thuê và các kỳ hóa đơn; không chỉ mở ký trước ngày thuê cũ.</p>
      </div>}
      {!contract.parentContractId && !["ACTIVE","EXPIRED","CLOSED","TERMINATED"].includes(contract.status) && <RentalOnboardingPanel rentalRequestId={contract.rentalRequestId} isLandlord={isLandlord} onSnapshot={setOnboarding} onUpdated={refreshSignedState} />}
      {/* 3. SIGNATURE & CONFIRMATION PANEL (PROMINENT AT TOP / BOTTOM) */}
      {contract.parentContractId && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        {isAmendment ? "Phụ lục này ghi nhận điều khoản đã thống nhất với ngày áp dụng riêng. Xem bảng thay đổi và PDF trước khi ký. Hợp đồng gốc và lịch sử thanh toán được giữ nguyên."
          : "Đây là văn bản gia hạn liên kết hợp đồng gốc. Không thu lại cọc hoặc thanh toán INITIAL; giữ nguyên điều kiện đã chốt. Chỉ có hiệu lực sau đủ chữ ký hai bên."}
        <Link href={contractDetailPath(perspective, contract.parentContractId)} className="mt-2 block font-semibold underline">Mở hợp đồng gốc để theo dõi thời hạn, hóa đơn và cọc →</Link>
      </div>}
      {isAmendment && contract.parentContractId && <ContractAmendmentPanel contractId={contract.parentContractId} actorId={profile.id} perspective={perspective} agreementId={contract.id} />}
      {signatureState?.signatureMode === "SMARTCA" ? <SmartCaSignaturePanel
        contract={contract}
        signingAllowed={Boolean(contract.parentContractId || onboarding?.canSign)}
        blockedReason={onboarding?.message ?? "Đang kiểm tra ngày bắt đầu thuê và trạng thái thanh toán…"}
        state={signatureState}
        isLandlord={isLandlord}
        isTenant={isTenant}
        hasReadyPdf={Boolean(readyToSign && documents.some(d => d.revisionId === revision.id && d.documentType === "PDF" && d.status === "READY"))}
        onUpdated={refreshSignedState}
      /> : <ContractSignaturePanel
        contract={contract}
        signingAllowed={Boolean(contract.parentContractId || onboarding?.canSign)}
        blockedReason={onboarding?.message ?? "Đang kiểm tra ngày bắt đầu thuê và trạng thái thanh toán…"}
        isLandlord={isLandlord}
        isTenant={isTenant}
        canSend={Boolean(completeness?.complete && readyToSign)}
        sending={sending}
        signing={signing}
        onSend={handleSendToTenant}
        onSign={handleSign}
      />}

      {!contract.parentContractId && ["ACTIVE", "EXPIRED", "CLOSED"].includes(contract.status) && <>
        {contract.status === "ACTIVE" && <ContractLifecyclePanel contractId={contract.id} isLandlord={isLandlord} onUpdated={refreshSignedState} mode="renewal" />}
        <ContractAmendmentPanel contractId={contract.id} actorId={profile.id} perspective={perspective} />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"><div><p className="font-semibold">Hóa đơn & thanh toán</p><p className="mt-1 text-sm text-muted-foreground">Thanh toán ban đầu, hóa đơn theo kỳ và bàn giao / hoàn cọc được quản lý trong một hồ sơ riêng.</p></div><Link href={invoiceDetailPath(contract.id)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Mở hồ sơ thanh toán →</Link></div>
      </>}
      {/* 4. MAIN CONTRACT SECTIONS */}
      {!contract.parentContractId && ["EXPIRED","CLOSED","TERMINATED"].includes(contract.status) && <><RentalWorkflowPanel rentalRequestId={contract.rentalRequestId} kind="move-in" onUpdated={refreshSignedState}/><RentalWorkflowPanel rentalRequestId={contract.rentalRequestId} kind="early-exit" onUpdated={refreshSignedState}/><ComplaintPanel rentalRequestId={contract.rentalRequestId} onUpdated={refreshSignedState}/></>}
      <div className="space-y-6">
        <>
        {!contract.parentContractId && ["ACTIVE", "EXPIRED", "CLOSED", "TERMINATED"].includes(contract.status) && <ContractTermsNotice />}
        {reviewDraft ? <form id={DRAFT_FORM_ID} aria-label="Nội dung bản nháp hợp đồng" noValidate className="space-y-6"
          onSubmit={event => { event.preventDefault(); void handleRender(); }}>
          <ContractDraftEditor.Provider value={{ base: baseTerms, values: { ...baseTerms, ...draftEdits },
            busy: reviewLocked || draftBusy,
            patch: (group, value) => setDraftEdits(previous => ({ ...previous, [group]: value })) }}>
            {contractSections}
          </ContractDraftEditor.Provider>
        </form> : contractSections}

        {/* CHỈ SỐ BAN ĐẦU ĐƯA VÀO HỢP ĐỒNG */}
        {!reviewDraft && !prioritizeMeters && handoverSection}

        </>
        {/* DANH SÁCH FILE VĂN BẢN KẾT XUẤT */}
        <ContractDocumentSection documents={documents} contract={contract} />
        {!contract.parentContractId && ["ACTIVE", "EXPIRED", "CLOSED", "TERMINATED"].includes(contract.status) && <Link
          href={invoiceDetailPath(contract.id)}
          className="block rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm font-semibold text-primary hover:bg-primary/10"
        >
          Xem và quản lý hóa đơn của hợp đồng này →
        </Link>}
      </div>

      {/* FOOTER NAVIGATION */}
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span>
          Hợp đồng gốc, các phụ lục và bản đã ký được giữ nguyên để cả hai bên xem lại. Nội dung điều chỉnh chỉ áp dụng sau khi hoàn tất ký và đến mốc hiệu lực.
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
    </ContractSnapshotReadOnly.Provider>
    </ContractAmendmentWorkspace>
  );
}
