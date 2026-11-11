import type { MembershipEthQuote } from "@/types/membership.type";

export const SEPOLIA_CHAIN_ID = 11155111;
const SEPOLIA_HEX = "0xaa36a7";
const PAY_SELECTOR = "0xfe908b7a";

export interface MetaMaskProvider {
  isMetaMask?: boolean;
  providers?: MetaMaskProvider[];
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

const address = (value: unknown): value is string =>
  typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);
const bytes32 = (value: unknown): value is string =>
  typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value);
const word = (value: bigint): string => value.toString(16).padStart(64, "0");

export function getMetaMask(): MetaMaskProvider | null {
  const injected = (window as Window & { ethereum?: MetaMaskProvider }).ethereum;
  if (!injected) return null;
  const candidates = injected.providers ?? [injected];
  return candidates.find((candidate) => candidate?.isMetaMask && typeof candidate.request === "function") ?? null;
}

export async function connectSepolia(provider: MetaMaskProvider): Promise<string> {
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  const account = Array.isArray(accounts) ? accounts[0] : null;
  if (!address(account)) throw new Error("MetaMask không trả về địa chỉ ví hợp lệ.");
  let chain = await provider.request({ method: "eth_chainId" });
  if (chain !== SEPOLIA_HEX) {
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_HEX }] });
    } catch (error) {
      if ((error as { code?: number })?.code !== 4902) throw error;
      await provider.request({ method: "wallet_addEthereumChain", params: [{
        chainId: SEPOLIA_HEX,
        chainName: "Ethereum Sepolia",
        nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: ["https://rpc.sepolia.org"],
        blockExplorerUrls: ["https://sepolia.etherscan.io"],
      }] });
    }
    chain = await provider.request({ method: "eth_chainId" });
    if (chain !== SEPOLIA_HEX) throw new Error("Ví chưa chuyển sang mạng Ethereum Sepolia.");
  }
  return account.toLowerCase();
}

export async function signWalletChallenge(provider: MetaMaskProvider, account: string, message: string): Promise<string> {
  if (!message) throw new Error("Thông điệp xác thực ví trống.");
  const signature = await provider.request({ method: "personal_sign", params: [message, account] });
  if (typeof signature !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(signature))
    throw new Error("Chữ ký xác thực ví không hợp lệ.");
  return signature;
}

export function buildMembershipEthTransaction(quote: MembershipEthQuote, account: string, amountVnd: number) {
  if (quote.chainId !== SEPOLIA_CHAIN_ID || !address(account) || !address(quote.payer)
      || account.toLowerCase() !== quote.payer.toLowerCase())
    throw new Error("Ví thanh toán hoặc mạng Sepolia không khớp báo giá.");
  if (!address(quote.contractAddress) || !address(quote.recipient) || !bytes32(quote.paymentId))
    throw new Error("Địa chỉ hoặc mã thanh toán trong báo giá không hợp lệ.");
  if (quote.amountVnd !== amountVnd || !Number.isSafeInteger(amountVnd) || amountVnd <= 0)
    throw new Error("Giá trị đơn hàng đã thay đổi. Vui lòng tạo lại đơn.");
  if (!/^[1-9]\d*$/.test(quote.amountWei) || !/^0x[0-9a-fA-F]{130}$/.test(quote.signature))
    throw new Error("Số wei hoặc chữ ký báo giá không hợp lệ.");
  const expiresMs = Date.parse(quote.expiresAt);
  if (!Number.isFinite(expiresMs) || Date.now() >= expiresMs)
    throw new Error("Báo giá ETH đã hết hạn. Vui lòng lấy báo giá mới.");
  const amountWei = BigInt(quote.amountWei);
  const expires = BigInt(Math.floor(expiresMs / 1000));
  const sig = quote.signature.slice(2).toLowerCase();
  const data = PAY_SELECTOR
    + quote.paymentId.slice(2).toLowerCase()
    + quote.payer.slice(2).toLowerCase().padStart(64, "0")
    + quote.recipient.slice(2).toLowerCase().padStart(64, "0")
    + word(amountWei)
    + word(expires)
    + word(BigInt(192))
    + word(BigInt(65))
    + sig.padEnd(192, "0");
  return {
    from: account,
    to: quote.contractAddress,
    value: `0x${amountWei.toString(16)}`,
    data,
    chainId: SEPOLIA_HEX,
  };
}

export function formatWei(wei: string): string {
  if (!/^[1-9]\d*$/.test(wei)) throw new Error("Số wei không hợp lệ.");
  const value = BigInt(wei);
  const whole = value / BigInt("1000000000000000000");
  const fraction = (value % BigInt("1000000000000000000")).toString().padStart(18, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export const isTxHash = bytes32;
