import PublicInfoPage, { publicInfoMetadata } from "../_content/PublicInfoPage";

export const metadata = publicInfoMetadata("/projects");

export default function Page() {
  return <PublicInfoPage path="/projects" />;
}
