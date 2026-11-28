import PublicInfoPage, { publicInfoMetadata } from "../_content/PublicInfoPage";

export const metadata = publicInfoMetadata("/housing-criteria");

export default function Page() {
  return <PublicInfoPage path="/housing-criteria" />;
}
