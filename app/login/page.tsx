import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    if (session.user?.role === "super_admin") {
      redirect("/"); 
    } else {
      const rolePageMap: Record<string, string> = {
        publishing: "/publishing",
        digital_prints: "/digital-prints",
        tech_services: "/tech-services",
        ecafe: "/ecafe",
      };
      const redirectPath = session.user?.role ? rolePageMap[session.user.role as string] : "/";
      redirect(redirectPath || "/");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50/50 font-sans">
      <div className="p-10 bg-white rounded-3xl shadow-xl border border-gray-100 w-[420px] backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto flex items-center justify-center mb-4">
            <img 
              src="/logo.png" 
              alt="Pavilion Logo" 
              width={200} 
              height={60} 
              className="object-contain"
            />
          </div>
          <p className="text-gray-500 text-sm mt-2 font-medium">Sign in to your dashboard</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}