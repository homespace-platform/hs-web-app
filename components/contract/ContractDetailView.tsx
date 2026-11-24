"use client";

import RentalOnboardingPanel from "@/components/rental-request/RentalOnboardingPanel";
import DepositAgreementPanel from "@/components/rental-request/DepositAgreementPanel";

import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Banknote, CalendarRange, Loader2, MapPin, User } from "lucide-react";
import { toast } from "sonner";
import { contractService } from "@/services/contract.service";
import type {
  ContractCompletenessResponse,
  ContractListingSyncPreview,
  ContractDocumentResponse,
  ContractResponse,
  ContractRevisionResponse,
  UpdateContractRevisionRequest,
  SignatureStateResponse,
} from "@/types/contract.type";
import { useAuth } from "@/features/auth/useAuth";
import { useAgreementChangeSync } from "@/hooks/useAgreementChangeSync";
import { useDetailTab } from "@/hooks/useDetailTab";
import { getApiErrorMessage } from "@/utils/apiError";
import { useActionDialog } from "@/components/common/ActionDialog";
import { PolicyNotice } from "@/components/common/PolicyDialog";
import { contractStatus, describeNextAction, toneClasses, type DetailTab, type Role } from "@/lib/rental-labels";

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
import { ContractSnapshotReadOnly, isZeroDeposit } from "@/components/contract/detail/utils";
import ContractDocumentSection from "@/components/contract/detail/ContractDocumentSection";
import ContractSignaturePanel from "@/components/contract/detail/ContractSignaturePanel";
import SmartCaSignaturePanel from "@/components/contract/detail/SmartCaSignaturePanel";
import ContractAmendmentPanel from "@/components/contract/detail/ContractAmendmentPanel";
import ContractAmendmentWorkspace, { ContractTermsNotice } from "@/components/contract/detail/ContractAmendmentWorkspace";
import { ContractDraftEditor, draftContentPatch, draftEditorValues } from "@/components/contract/detail/ContractDraftEditor";
import ListingSyncControl from "@/components/contract/detail/ListingSyncControl";
import ContractPage from "@/components/contract/page/ContractPage";
import ContractSummary, { type Fact } from "@/components/contract/page/ContractSummary";
import DraftActionsCard from "@/components/contract/page/DraftActionsCard";
import EndTab, { AmendmentSlot } from "@/components/contract/page/EndTab";
import HistoryTab from "@/components/contract/page/HistoryTab";
import OverviewTab, { type InfoCardData } from "@/components/contract/page/OverviewTab";
import PaymentTab from "@/components/contract/page/PaymentTab";
import { leaseTimeline } from "@/components/contract/page/timeline";
import { ContractPageSkeleton } from "@/components/contract/page/ui";
import { useOnboardingNextAction } from "@/components/contract/page/useOnboardingNextAction";
import { contractListPath, contractDetailPath } from "@/lib/contract-routes";
import { generateContractPreview } from "@/lib/contract-preview";
import { missingRequiredInitialMeters, validateInitialMeterReading } from "@/lib/contract-initial-meters";
import { VIETNAMESE_PHONE_REGEX } from "@/validation/user.schema";
import type { AmendmentTerms } from "@/types/contract-amendment.type";

const DRAFT_FORM_ID = "lease-draft-form";
const POST_ACTIVE = ["ACTIVE", "EXPIRED", "CLOSED", "TERMINATED"];
const money = (n: number) => `${n.toLocaleString("vi-VN")} đ`;
const isoDate = (s: string) => s.split("T")[0].split("-").reverse().join("/");

export default function ContractDetailView({ perspective }: { perspective: "landlord" | "tenant" }) {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const contractId = String(params?.id || "");

  const [contract, setContract] = useState<ContractResponse | null>(null);
  const [revision, setRevision] = useState<ContractRevisionResponse | null>(null);
  const [completeness, setCompleteness] = useState<ContractCompletenessResponse | null>(null);
  const [documents, setDocuments] = useState<ContractDocumentResponse[]>([]);
  const [currentPreview, setCurrentPreview] = useState<ContractDocumentResponse | null>(null);
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

  const role: Role = isLandlord ? "LANDLORD" : "TENANT";
  const isDepositKind = contract?.agreementKind === "DEPOSIT";
  // Pre-tenancy: the deposit agreement, or a lease that is not yet in effect. The server then names the single next step.
  const preActive = Boolean(contract && contract.agreementKind !== "WORKFLOW" && !contract.parentContractId
    && (isDepositKind || !POST_ACTIVE.includes(contract.status)));
  const { view: onboarding, nextAction, error: onboardingError, reload: reloadOnboarding, accept } =
    useOnboardingNextAction(contract?.rentalRequestId, role, preActive && (isLandlord || isTenant));
  const nextView = describeNextAction(nextAction, role);
  const [tab, setTab] = useDetailTab(preActive && nextView?.mine ? nextView.tab : "overview");
  const [syncTick, setSyncTick] = useState(0);
  const { confirm, dialog } = useActionDialog();

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
      if (c.agreementKind === "DEPOSIT" || c.agreementKind === "WORKFLOW") {
        setContract(c);
        setRevision(null);
        return; // Deposit/workflow documents must not load lease billing, meters or amendment tools.
      }
      const [rev, comp, docs, sigState, preview] = await Promise.all([
        contractService.getRevision(contractId),
        contractService.getCompleteness(contractId),
        contractService.getDocuments(contractId),
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
      setSignatureState(sigState);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể tải dữ liệu hợp đồng."));
      router.replace(contractListPath(perspective));
    } finally {
      setLoading(false);
    }
  }, [contractId, router, perspective]);

  // One signed-state read at a time: callers arriving meanwhile (signal, panel onUpdated, poll) share it and get one fresh
  // follow-up, even after a failed read, so an older response can never overwrite a newer one. Only signed-state fields are
  // written: drafts, selected PDF and the signer's consent/certificate/busy state live outside this and survive.
  const epoch = useRef(0); // bumped on contract change/unmount: late results of the old document or account are dropped
  const signedStateRun = useRef<Promise<void> | null>(null);
  const signedStateDirty = useRef(false);
  useEffect(() => () => { epoch.current++; signedStateRun.current = null; signedStateDirty.current = false; }, [contractId]);
  const refreshSignedState = useCallback((): Promise<void> => {
    if (!contractId) return Promise.resolve();
    if (signedStateRun.current) { signedStateDirty.current = true; return signedStateRun.current; }
    const mine = epoch.current;
    let done = false;
    const run = (async () => {
      let failure: unknown;
      try {
        do {
          signedStateDirty.current = false;
          failure = undefined;
          try {
            const [updatedContract, docs, state] = await Promise.all([
              contractService.getContract(contractId),
              contractService.getDocuments(contractId),
              contractService.getSignatureState(contractId),
            ]);
            if (epoch.current !== mine) return;
            setContract(updatedContract);
            setDocuments(docs);
            setSignatureState(state);
          } catch (error) { failure = error; }
        } while (signedStateDirty.current && epoch.current === mine);
      } finally { done = true; if (epoch.current === mine) signedStateRun.current = null; }
      if (epoch.current !== mine) return;
      if (failure) throw failure;
    })();
    if (!done) signedStateRun.current = run;
    return run;
  }, [contractId]);
  // Signing notices for this exact document (or generic recovery). A deposit root is refreshed by its own panel.
  // After any panel changed something: refresh the signed state, the next-step card and the onboarding view.
  const afterUpdate = useCallback(async () => {
    try { await refreshSignedState(); }
    catch { toast.info("Đã cập nhật, chưa tải lại được dữ liệu."); } // the action itself succeeded; callers must not report it as failed
    finally { setSyncTick((n) => n + 1); if (preActive) void reloadOnboarding(); }
  }, [refreshSignedState, preActive, reloadOnboarding]);
  useAgreementChangeSync(id => !id || id === contractId, afterUpdate, contract?.agreementKind !== "DEPOSIT");

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
  // Field errors are shown in the content tab: bring the landlord there when a save was refused from another tab.
  useEffect(() => {
    if (reviewDraft && tab !== "content" && (meterErrors.electricity || meterErrors.water || feeError)) setTab("content");
  }, [reviewDraft, tab, setTab, meterErrors, feeError]);
  async function reloadDraft() {
    if (!draftDirty || await confirm({ title: "Tải bản mới?", description: "Tải bản mới và bỏ các chỉnh sửa chưa lưu trên trang này.", tone: "warning", confirmLabel: "Tải lại" })) void load();
  }

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
      void afterUpdate();
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
      void afterUpdate();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể xác nhận ký hợp đồng."));
    } finally {
      setSigning(false);
    }
  }

  if (loading) return <ContractPageSkeleton />;

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

  if (contract.agreementKind === "WORKFLOW") return <div className="mx-auto max-w-4xl space-y-3 rounded-2xl border bg-card p-5 pb-8 text-sm">
    <p className="font-semibold">Văn bản ký riêng của hồ sơ trả nhà / chấm dứt sớm</p>
    <p className="text-muted-foreground">Văn bản này được xem và ký cùng hồ sơ của hợp đồng gốc, nơi có đủ nội dung và kiểm tra phiên bản đang áp dụng.</p>
    {contract.parentContractId && <Link href={contractDetailPath(perspective, contract.parentContractId)} className="font-semibold text-primary underline">Mở hợp đồng gốc →</Link>}
  </div>;

  const status = contractStatus(contract.status, isDepositKind ? "DEPOSIT" : "LEASE");
  const pageProps = {
    perspective, role, actorId: profile.id, contract, nextAction, onboardingMessage: onboarding?.message,
    onboardingLoaded: Boolean(onboarding), onboardingError, onRetryOnboarding: reloadOnboarding, tab, setTab, syncTick,
  };
  const statusProps = { statusLabel: status.label, statusClassName: toneClasses[status.tone] };

  if (isDepositKind) {
    const available: DetailTab[] = ["overview", "sign", "payment", "end", "history"];
    const deposit = onboarding?.deposit;
    const facts: Fact[] = [
      { label: "Tiền cọc", icon: <Banknote className="h-3.5 w-3.5" aria-hidden="true" />, value: deposit?.originalAmount != null ? money(deposit.originalAmount) : undefined },
      { label: "Thời hạn thuê", icon: <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />, value: onboarding ? `${isoDate(onboarding.startsOn)} – ${isoDate(onboarding.endExclusive)}` : undefined },
    ];
    return <ContractAmendmentWorkspace contractId={contract.id} actorId={profile.id} perspective={perspective} enabled={false}>
      <ContractPage key={contract.id} {...pageProps} preActive available={available}
        header={<ContractHeader backPath={`${contractListPath(perspective)}?kind=DEPOSIT`} contract={contract} revision={null} completeness={null}
          latestDoc={null} hasReadyDoc={false} isLandlord={isLandlord} isTenant={isTenant} rendering={false} sending={false}
          onRender={handleRender} onSend={handleSendToTenant} kindLabel="HĐ cọc" {...statusProps} summary={<ContractSummary facts={facts} />} />}
        panels={{
          overview: <OverviewTab role={role} contractId={contract.id} showInvoices={false}
            cards={[{ title: "Hợp đồng cọc & giữ phòng", rows: [["Trạng thái", status.label], ["Tiền cọc", deposit?.originalAmount != null ? money(deposit.originalAmount) : undefined],
              ["Đang giữ", deposit?.heldAmount != null ? money(deposit.heldAmount) : undefined]] }]}
            onboardingSummary={<RentalOnboardingPanel rentalRequestId={contract.rentalRequestId} isLandlord={isLandlord} showDepositAgreement={false} sections={["summary"]} onSnapshot={accept} onUpdated={afterUpdate} />} />,
          sign: <>
            <DepositAgreementPanel rentalRequestId={contract.rentalRequestId} isLandlord={isLandlord} onUpdated={afterUpdate} />
            <RentalOnboardingPanel rentalRequestId={contract.rentalRequestId} isLandlord={isLandlord} showDepositAgreement={false} sections={["sign"]} onSnapshot={accept} onUpdated={afterUpdate} />
          </>,
          payment: <PaymentTab contract={contract} isLandlord={isLandlord} preActive onUpdated={afterUpdate} onSnapshot={accept} />,
          end: <EndTab contract={contract} isLandlord={isLandlord} actorId={profile.id} perspective={perspective} preActive onUpdated={afterUpdate} onSnapshot={accept} />,
          history: <HistoryTab contract={contract} isLandlord={isLandlord} perspective={perspective} preActive onUpdated={afterUpdate} onSnapshot={accept} />,
        }} />
      {dialog}
    </ContractAmendmentWorkspace>;
  }
  if (!revision) return null;

  const listingSyncAction = reviewDraft && <ListingSyncControl contractId={contractId} baseRevisionId={revision.id}
    disabled={reviewLocked || draftBusy} onBusyChange={setSyncingListing} onSelect={async source => {
      if (previewRequest.current) return;
      setListingSyncPreview(source);
      await handleRender(source);
    }} />;
  const isDraft = contract.status === "DRAFT" && !contract.parentContractId;
  const isAmendment = contract.agreementKind === "AMENDMENT";
  const isChild = Boolean(contract.parentContractId);
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
    <ContractLeaseSection lease={lease} agreedEarlyEndExclusive={contract.agreedEarlyEndExclusive} />
    <ContractFinancialSection financial={financial} />
    <ContractAmenitiesSection amenities={amenities} />
    <ContractChargesSection charges={charges} />
    <ContractEquipmentSection equipments={equipments} />
    {policiesSection}
  </>;

  const afterEffective = !isChild && POST_ACTIVE.includes(contract.status);
  const available: DetailTab[] = isChild ? ["overview", "sign", "content"] : ["overview", "sign", "payment", "end", "content", "history"];
  const text = (value: unknown) => (value == null || String(value).trim() === "" ? undefined : String(value));
  const counterpart = isLandlord ? tenant : landlord;
  // Signed early-termination addendum: the effective last rental day is (agreed exclusive end - 1 day); the original text stays on the content tab.
  const earlyEnd = !isChild && contract.agreedEarlyEndExclusive ? new Date(`${contract.agreedEarlyEndExclusive.split("T")[0]}T00:00:00Z`) : null;
  if (earlyEnd && !Number.isNaN(earlyEnd.getTime())) earlyEnd.setUTCDate(earlyEnd.getUTCDate() - 1);
  const effectiveEndText = earlyEnd && !Number.isNaN(earlyEnd.getTime()) ? isoDate(earlyEnd.toISOString()) : undefined;
  const leaseEndText = effectiveEndText ?? text(lease.endDateText);
  const title = text(property.title) ?? text(property.listingTitle) ?? text(property.propertyType);
  const address = text(property.fullAddress);
  const facts: Fact[] = [
    { label: isLandlord ? "Người thuê" : "Chủ nhà", icon: <User className="h-3.5 w-3.5" aria-hidden="true" />, value: text(counterpart.fullName) },
    { label: "Bất động sản", icon: <MapPin className="h-3.5 w-3.5" aria-hidden="true" />,
      value: title || address ? <>{title ?? address}{title && address ? <span className="block font-normal text-muted-foreground">{address}</span> : null}</> : undefined },
    { label: "Tiền thuê · Tiền cọc", icon: <Banknote className="h-3.5 w-3.5" aria-hidden="true" />,
      value: text(financial.amountNumber) ? <>{text(financial.amountNumber)}<span className="block font-normal text-muted-foreground">Cọc: {isZeroDeposit(financial.depositAmountValue ?? financial.depositAmountNumber) ? "không đặt cọc" : text(financial.depositAmountNumber) ?? "—"}</span></> : undefined },
    { label: "Thời hạn thuê", icon: <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />,
      value: text(lease.startDateText) && leaseEndText ? `${text(lease.startDateText)} – ${leaseEndText}` : undefined },
  ];
  const cards: InfoCardData[] = [
    { title: "Các bên", rows: [["Chủ nhà (Bên A)", text(landlord.fullName)], ["Người thuê (Bên B)", text(tenant.fullName)],
      [isLandlord ? "Điện thoại người thuê" : "Điện thoại chủ nhà", text(counterpart.phone)]] },
    { title: "Bất động sản", rows: [["Địa chỉ", address], ["Loại hình", text(property.propertyType)], ["Diện tích", text(property.areaText)],
      ["Số căn / phòng", text(property.unitNumber)], ["Tầng", text(property.floor)]] },
    { title: "Thời hạn thuê", rows: [["Bắt đầu", text(lease.startDateText)], ["Kết thúc", leaseEndText], effectiveEndText ? ["Thời hạn", "Rút ngắn theo phụ lục chấm dứt sớm"] : ["Thời hạn", text(lease.durationText) ?? (text(lease.durationMonths) ? `${text(lease.durationMonths)} tháng` : undefined)],
      ["Bàn giao", text(lease.handoverDateText)]] },
    { title: "Tiền thuê & cọc", rows: [["Tiền thuê", text(financial.amountNumber)], ["Tiền cọc", isZeroDeposit(financial.depositAmountValue ?? financial.depositAmountNumber) ? "Không đặt cọc" : text(financial.depositAmountNumber)],
      ["Kỳ thanh toán", text(financial.paymentCycle)], ["Phương thức", text(financial.paymentMethod)]] },
  ];
  const depositSigned = !isChild && onboarding?.depositAgreementContractId && onboarding.depositAgreementRequired !== false
    ? POST_ACTIVE.includes(onboarding.depositAgreementStatus ?? "") : undefined;

  const documentsAvailable = hasReadyCurrentDocument && !draftDirty && !draftConflict;
  const header = <ContractHeader
    backPath={isAmendment && contract.parentContractId ? contractDetailPath(perspective, contract.parentContractId) : contractListPath(perspective)}
    contract={contract}
    revision={revision}
    completeness={completeness}
    latestDoc={draftDirty || draftConflict ? null : latestDoc}
    hasReadyDoc={documentsAvailable}
    isLandlord={isLandlord}
    isTenant={isTenant}
    rendering={rendering}
    reconcilingPreview={reconcilingPreview}
    sending={sending}
    onRender={handleRender}
    draftReview={reviewDraft ? { formId: DRAFT_FORM_ID, saving: savingDraft || syncingListing, retry: retryPreview && !draftDirty, locked: reviewLocked } : undefined}
    listingSyncAction={listingSyncAction}
    onSend={handleSendToTenant}
    smartCaMode={signatureState?.signatureMode === "SMARTCA"}
    cancellationRefundPending={onboarding?.stage === "CANCELLATION_REFUND_PENDING"}
    kindLabel={isAmendment ? "Phụ lục" : "HĐ thuê"}
    {...statusProps}
    summary={<ContractSummary facts={facts} />}
    onOpenDocuments={() => setTab("sign")}
  />;

  const signaturePanel = signatureState?.signatureMode === "SMARTCA" ? <SmartCaSignaturePanel
    contract={contract}
    signingAllowed={Boolean(contract.parentContractId || onboarding?.canSign)}
    blockedReason={onboarding?.message ?? "Đang kiểm tra ngày bắt đầu thuê và trạng thái thanh toán…"}
    state={signatureState}
    isLandlord={isLandlord}
    isTenant={isTenant}
    hasReadyPdf={Boolean(readyToSign && documents.some(d => d.revisionId === revision.id && d.documentType === "PDF" && d.status === "READY"))}
    onUpdated={afterUpdate}
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
  />;

  const panels: Partial<Record<DetailTab, ReactNode>> = {
    overview: <OverviewTab role={role} contractId={contract.id} cards={cards} showInvoices={afterEffective}
      timeline={isChild ? undefined : leaseTimeline(contract, depositSigned)}
      onboardingSummary={preActive ? <RentalOnboardingPanel rentalRequestId={contract.rentalRequestId} isLandlord={isLandlord} showDepositAgreement={false} sections={["summary"]} onSnapshot={accept} onUpdated={afterUpdate} /> : undefined} />,
    sign: <>
      {reviewDraft && <DraftActionsCard dirty={draftDirty} conflict={draftConflict} signatureLocked={signatureLocked} missingMeters={missingMeterReadings.length > 0}
        onReviewContent={() => setTab("content")} onReload={() => void reloadDraft()} />}
      {missingFieldsNotice}
      {isTenant && isDraft && <PolicyNotice title="Bản nháp hợp đồng" summary="Bản nháp để xem trước · Chưa có hiệu lực">
        <p>Chủ nhà vẫn có thể cập nhật nội dung. Bạn có thể xem văn bản và đề nghị nhận nhà, bắt đầu hợp đồng sớm trong mục Thanh toán &amp; cọc. Chấp nhận đề nghị sẽ đổi ngày thuê và các kỳ hóa đơn; không chỉ mở ký trước ngày thuê cũ.</p>
      </PolicyNotice>}
      {preActive && <RentalOnboardingPanel rentalRequestId={contract.rentalRequestId} isLandlord={isLandlord} sections={["sign"]} onSnapshot={accept} onUpdated={afterUpdate} />}
      {isChild && <div className="space-y-2">
        <PolicyNotice tone="info" title={isAmendment ? "Phụ lục hợp đồng" : "Văn bản gia hạn hợp đồng"} summary={isAmendment ? "Phụ lục này ghi nhận điều khoản đã thống nhất với ngày áp dụng riêng." : "Đây là văn bản gia hạn liên kết hợp đồng gốc."}>
          <p>{isAmendment ? "Phụ lục này ghi nhận điều khoản đã thống nhất với ngày áp dụng riêng. Xem bảng thay đổi và PDF trước khi ký. Hợp đồng gốc và lịch sử thanh toán được giữ nguyên."
            : "Đây là văn bản gia hạn liên kết hợp đồng gốc. Không thu lại cọc hoặc tiền thuê tháng đầu; giữ nguyên điều kiện đã chốt. Chỉ có hiệu lực sau đủ chữ ký hai bên."}</p>
        </PolicyNotice>
        <Link href={contractDetailPath(perspective, contract.parentContractId!)} className="mt-2 block text-sm font-semibold text-primary underline">Mở hợp đồng gốc để theo dõi thời hạn, hóa đơn và cọc →</Link>
      </div>}
      {isAmendment && contract.parentContractId && <ContractAmendmentPanel contractId={contract.parentContractId} actorId={profile.id} perspective={perspective} agreementId={contract.id} />}
      {signaturePanel}
      <ContractDocumentSection documents={documents} contract={contract} />
    </>,
    payment: <PaymentTab contract={contract} revision={revision} isLandlord={isLandlord} preActive={preActive} onUpdated={afterUpdate} onSnapshot={accept}
      initialPayment={<ContractInitialPaymentSection initialPayment={revision.initialPayment} />} />,
    end: <EndTab contract={contract} isLandlord={isLandlord} actorId={profile.id} perspective={perspective} preActive={preActive} onUpdated={afterUpdate} onSnapshot={accept} />,
    content: <>
      {reviewDraft && <>
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold">Rà soát bản nháp trước khi ký</h2>
          <PolicyNotice tone="info" title="Soạn bản nháp hợp đồng" summary="Kiểm tra và sửa trực tiếp các ô bên dưới."><p>Kiểm tra và sửa trực tiếp các ô bên dưới. Bấm <strong>Lưu</strong> để lưu bản nháp và tự tạo PDF xem trước.</p></PolicyNotice>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-primary">
            <a href="#contract-handover">Chỉ số điện nước</a>
            <a href="#contract-parties">Thông tin hai bên</a>
            <a href="#contract-property">Thông tin bất động sản</a>
            <a href="#contract-policies">Phí chậm trả &amp; thỏa thuận</a>
          </div>
          {draftDirty && <p role="status" className="text-sm font-medium text-amber-700 dark:text-amber-400">Có thay đổi chưa lưu</p>}
          {listingSyncPreview && <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>Đã tải dữ liệu bài đăng. Hoàn thiện các ô còn thiếu để lưu và kết xuất.</span>
            <button type="button" className="text-primary underline" disabled={draftBusy || reviewLocked}
              onClick={() => setListingSyncPreview(null)}>Bỏ dữ liệu vừa lấy</button>
          </div>}
          {draftConflict && <div role="alert" className="space-y-2 text-sm text-amber-800 dark:text-amber-300">
            <p>Bản nháp đã thay đổi ở nơi khác. Hãy đối chiếu nội dung trước khi chỉnh sửa lại.</p>
            <button type="button" className="font-semibold underline" onClick={() => void reloadDraft()}>Tải lại bản nháp</button>
          </div>}
          {signatureLocked && <p className="text-sm text-amber-800 dark:text-amber-300">Bản nháp đang xử lý chữ ký. Hãy theo dõi trạng thái ở mục Ký số &amp; tài liệu.</p>}
        </section>
        {!prioritizeMeters && missingFieldsNotice}
        {handoverSection}
      </>}
      {!reviewDraft && prioritizeMeters && handoverSection}

      {isLandlord && isDraft && !contract.parentContractId && <PolicyNotice tone="neutral" title="Nguồn nội dung hợp đồng nháp" summary="Các nội dung chính lấy từ hồ sơ thuê đã chấp thuận.">
        <p>Ngày thuê, thời hạn, tiền thuê, tiền cọc và số người/xe lấy từ hồ sơ đã chấp thuận. Đổi ngày nhận nhà dùng đề nghị nhận nhà sớm trong mục Thanh toán &amp; cọc. Các điều khoản sau ký được điều chỉnh qua phụ lục.</p>
      </PolicyNotice>}
      {afterEffective && <ContractTermsNotice />}
      <AmendmentSlot where="content" contractId={contract.id} actorId={profile.id} perspective={perspective} />
      {reviewDraft ? <form id={DRAFT_FORM_ID} aria-label="Nội dung bản nháp hợp đồng" noValidate className="space-y-6"
        onInvalidCapture={() => { if (tab !== "content") setTab("content"); }}
        onSubmit={event => { event.preventDefault(); void handleRender(); }}>
        <ContractDraftEditor.Provider value={{ base: baseTerms, values: { ...baseTerms, ...draftEdits },
          busy: reviewLocked || draftBusy,
          patch: (group, value) => setDraftEdits(previous => ({ ...previous, [group]: value })) }}>
          {contractSections}
        </ContractDraftEditor.Provider>
      </form> : contractSections}
      {!reviewDraft && !prioritizeMeters && handoverSection}
    </>,
    history: <HistoryTab contract={contract} isLandlord={isLandlord} perspective={perspective} preActive={preActive} onUpdated={afterUpdate} onSnapshot={accept} />,
  };

  return (
    <ContractAmendmentWorkspace contractId={contract.id} actorId={profile.id} perspective={perspective} enabled={afterEffective}>
    <ContractSnapshotReadOnly.Provider value={isDraft}>
      <ContractPage key={contract.id} {...pageProps} preActive={preActive} available={available} header={header} panels={panels} keepMounted={reviewDraft ? "content" : undefined} />
      {dialog}
    </ContractSnapshotReadOnly.Provider>
    </ContractAmendmentWorkspace>
  );
}
