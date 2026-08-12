import { AuthProvider } from "@/components/auth/AuthProvider";
import AuthGuard from "@/components/auth/AuthGuard";
import HomeClient from "@/components/home/HomeClient";

export default function Home() {
  return (
    <AuthProvider>
      <AuthGuard>
        <HomeClient />
      </AuthGuard>
    </AuthProvider>
  );
}