import type { DepositAgreementView } from "@/services/deposit-agreement.service";
import type { SignatureStateResponse } from "@/types/contract.type";

/** A signing-service failure must not hide an already available agreement/PDF. */
export async function loadDepositAgreement(
  rentalId: string,
  api: {
    getAgreement: (id: string) => Promise<DepositAgreementView>;
    getSignatureState: (id: string) => Promise<SignatureStateResponse>;
  },
  receive: {
    agreement: (view: DepositAgreementView) => void;
    signature: (state: SignatureStateResponse | null) => void;
    signatureError: (error: unknown) => void;
  },
): Promise<void> {
  const view = await api.getAgreement(rentalId);
  receive.agreement(view);
  if (!view.agreement) {
    receive.signature(null);
    return;
  }
  try {
    receive.signature(await api.getSignatureState(view.agreement.id));
  } catch (error) {
    receive.signature(null);
    receive.signatureError(error);
  }
}
