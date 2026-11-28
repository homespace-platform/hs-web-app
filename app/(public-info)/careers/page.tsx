import PublicInfoPage, { publicInfoMetadata } from "../_content/PublicInfoPage";

export const metadata = publicInfoMetadata("/careers");

export default function Page() {
  return <PublicInfoPage path="/careers" />;
}
