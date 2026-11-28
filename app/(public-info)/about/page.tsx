import PublicInfoPage, { publicInfoMetadata } from "../_content/PublicInfoPage";

export const metadata = publicInfoMetadata("/about");

export default function Page() {
  return <PublicInfoPage path="/about" />;
}
