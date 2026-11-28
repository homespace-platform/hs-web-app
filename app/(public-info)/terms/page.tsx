import PublicInfoPage, { publicInfoMetadata } from "../_content/PublicInfoPage";

export const metadata = publicInfoMetadata("/terms");

export default function Page() {
  return <PublicInfoPage path="/terms" />;
}
