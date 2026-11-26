import { MEMBERSHIP_PAYMENT_PROVIDERS } from "@/lib/membership";
import type { MembershipPaymentProvider } from "@/types/membership.type";

interface Props {
  value: MembershipPaymentProvider;
  disabled: boolean;
  onChange: (provider: MembershipPaymentProvider) => void;
}

/** Shared by the plan checkout and the extra-use checkout. */
export default function PaymentProviderPicker({ value, disabled, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Chọn cổng thanh toán"
      data-testid="payment-provider-selection"
      className="space-y-2.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-foreground">
          Phương thức thanh toán
        </span>
        <span className="text-[11px] text-muted-foreground">
          Thanh toán trực tuyến an toàn
        </span>
      </div>

      <div className="space-y-2">
        {MEMBERSHIP_PAYMENT_PROVIDERS.map((providerOpt) => {
          const isSelected = value === providerOpt.code;
          return (
            <button
              key={providerOpt.code}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              data-testid={`payment-provider-option-${providerOpt.code}`}
              onClick={() => {
                if (disabled) return;
                onChange(providerOpt.code);
              }}
              className={`w-full rounded-2xl border p-3.5 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/15 cursor-pointer"
                  : "border-border bg-card hover:border-primary/40 cursor-pointer"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40 bg-background"
                    }`}
                  >
                    {isSelected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold text-foreground">
                        {providerOpt.label}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        {providerOpt.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {providerOpt.description}
                    </p>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
