import PublicInfoPage, { publicInfoMetadata } from "../_content/PublicInfoPage";

export const metadata = publicInfoMetadata("/privacy");

export default function Page() {
  return <PublicInfoPage path="/privacy" />;
}
