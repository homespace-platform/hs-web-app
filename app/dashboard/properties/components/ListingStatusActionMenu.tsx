"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import listingService from "@/services/listing.service";
import { useAppDispatch } from "@/store/hooks";
import { fetchFavoriteIds } from "@/features/favorite/favoriteSlice";
import {
  getListingOwnerActions,
  getListingStatusConfig,
  type ListingOwnerAction,
  type ListingOwnerActionIcon,
} from "@/config/listing-status.config";
import type { ListingDetailResponse, ListingStatus } from "@/types/listing.type";
import { getApiErrorMessage } from "@/utils/apiError";

const ACTION_ICONS: Record<ListingOwnerActionIcon, LucideIcon> = {
  hide: EyeOff,
  show: Eye,
  rented: CheckCircle,
  rentedExternally: ExternalLink,
  resubmit: RotateCcw,
};

export interface ListingStatusActionTarget {
  id: string;
  title: string;
  status: ListingStatus;
  expiresAt?: string | null;
}

interface ListingStatusActionMenuProps {
  listing: ListingStatusActionTarget;
  onChanged?: (updated: ListingDetailResponse) => void;
  size?: "sm" | "md";
}

export default function ListingStatusActionMenu({
  listing,
  onChanged,
  size = "sm",
}: ListingStatusActionMenuProps) {
  const dispatch = useAppDispatch();
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<ListingOwnerAction | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const actions = getListingOwnerActions(listing.status, listing.expiresAt);
  const currentStatus = getListingStatusConfig(listing.status);

  useEffect(() => {
    if (!modalOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) {
        closeModal();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [modalOpen, submitting]);

  if (actions.length === 0) return null;

  function openModal() {
    setPendingAction(null);
    setNote("");
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
    setPendingAction(null);
    setNote("");
  }

  function selectAction(action: ListingOwnerAction) {
    setNote("");
    setPendingAction(action);
  }

  function backToPicker() {
    if (submitting) return;
    setPendingAction(null);
    setNote("");
  }

  async function confirmAction() {
    if (!pendingAction) return;

    setSubmitting(true);
    try {
      const updated = await listingService.changeStatus(
        listing.id,
        pendingAction.targetStatus,
        pendingAction.noteLabel ? note : undefined,
      );
      toast.success(
        `Đã chuyển trạng thái sang "${getListingStatusConfig(pendingAction.targetStatus).label}".`,
      );
      closeModal();
      onChanged?.(updated);

      // Đồng bộ badge số lượng tin yêu thích trên Header & Dropdown qua Redux
      dispatch(fetchFavoriteIds({ force: true }));
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Không thể đổi trạng thái tin đăng. Vui lòng thử lại."));
    } finally {
      setSubmitting(false);
    }
  }

  const triggerHeight = size === "sm" ? "py-1.5 text-xs" : "py-2 text-xs";
  const PendingIcon = pendingAction ? ACTION_ICONS[pendingAction.icon] : null;

  const modalContent = modalOpen ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in-50"
      onClick={closeModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="listing-status-modal-title"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-xl animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        {!pendingAction ? (
          <>
            {/* Picker header */}
            <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-5">
              <div className="min-w-0">
                <h3
                  id="listing-status-modal-title"
                  className="text-base font-bold text-foreground"
                >
                  Đổi trạng thái tin đăng
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Chọn hành động phù hợp với tình trạng hiện tại của bài đăng.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Listing brief */}
            <div className="border-b border-border bg-muted/30 px-6 py-4 space-y-2">
              <p className="line-clamp-2 text-sm font-bold text-foreground">{listing.title}</p>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${currentStatus.badgeClassName}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${currentStatus.dotClassName}`} />
                {currentStatus.label}
              </span>
            </div>

            {/* Action list */}
            <div className="max-h-[min(60vh,420px)] overflow-y-auto p-3 space-y-1.5">
              {actions.map((action) => {
                const Icon = ACTION_ICONS[action.icon];
                return (
                  <button
                    key={action.targetStatus}
                    type="button"
                    onClick={() => selectAction(action)}
                    className="flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition-all hover:border-border hover:bg-muted/60"
                  >
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${action.accentClassName}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-foreground">{action.label}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                        {action.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Confirm header */}
            <div className="flex items-start gap-3 border-b border-border px-6 py-5">
              <button
                type="button"
                onClick={backToPicker}
                disabled={submitting}
                className="mt-0.5 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-foreground">{pendingAction.title}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{pendingAction.description}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${pendingAction.accentClassName}`}
                >
                  {PendingIcon && <PendingIcon className="h-5 w-5" />}
                </div>
                <p className="line-clamp-2 rounded-xl border border-border/80 bg-muted/50 p-3 text-xs font-medium text-foreground flex-1">
                  &quot;{listing.title}&quot;
                </p>
              </div>

              {pendingAction.noteLabel && (
                <div className="space-y-1.5">
                  <label className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>{pendingAction.noteLabel}</span>
                    <span className="text-[11px] font-normal text-muted-foreground">
                      {note.length}/2000
                    </span>
                  </label>
                  <textarea
                    rows={3}
                    value={note}
                    maxLength={2000}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={pendingAction.notePlaceholder}
                    className="w-full resize-none rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={backToPicker}
                  disabled={submitting}
                  className="h-9 rounded-xl border border-border px-4 text-xs font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={confirmAction}
                  disabled={submitting}
                  className={`inline-flex h-9 items-center gap-2 rounded-xl px-5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-70 ${pendingAction.confirmClassName}`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <span>Xác nhận</span>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 ${triggerHeight} font-semibold text-foreground hover:bg-muted transition-colors`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span>Đổi trạng thái</span>
      </button>

      {typeof document !== "undefined" && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
