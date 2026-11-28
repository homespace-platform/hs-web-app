import PublicInfoPage, { publicInfoMetadata } from "../_content/PublicInfoPage";

export const metadata = publicInfoMetadata("/deposit-guide");

export default function Page() {
  return <PublicInfoPage path="/deposit-guide" />;
}
