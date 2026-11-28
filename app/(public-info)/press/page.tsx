import PublicInfoPage, { publicInfoMetadata } from "../_content/PublicInfoPage";

export const metadata = publicInfoMetadata("/press");

export default function Page() {
  return <PublicInfoPage path="/press" />;
}
