import PublicInfoPage, { publicInfoMetadata } from "../_content/PublicInfoPage";

export const metadata = publicInfoMetadata("/support");

export default function Page() {
  return <PublicInfoPage path="/support" />;
}
