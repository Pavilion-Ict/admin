import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";
import Link from "next/link";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role !== "super_admin") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-10 bg-white p-8 rounded-2xl shadow-sm border border-gray-100/50 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <img 
              src="/icon.png" 
              alt="Pavilion Icon" 
              width={40} 
              height={40} 
              className="object-contain"
            />
            <div>
              <h1 className="text-3xl font-bold text-primary tracking-tight">Admin Dashboard</h1>
              <p className="text-gray-500 mt-1 font-medium">Welcome back, {session.user.name}</p>
            </div>
          </div>
          <SignOutButton />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/publishing" className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-primary transform origin-bottom transition-transform duration-300 group-hover:scale-y-110"></div>
            <h2 className="text-2xl font-bold text-primary mb-2 group-hover:text-primary-hover transition-colors">Publishing Ledger &rarr;</h2>
            <p className="text-gray-500 font-medium">Manage the publishing service transactions.</p>
          </Link>
          <Link href="/digital-prints" className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group relative overflow-hidden">
             <div className="absolute top-0 left-0 w-2 h-full bg-brand-blue-100 transform origin-bottom transition-transform duration-300 group-hover:scale-y-110"></div>
            <h2 className="text-2xl font-bold text-brand-blue-100 mb-2 group-hover:text-primary-hover transition-colors">Digital Prints Ledger &rarr;</h2>
            <p className="text-gray-500 font-medium">Manage digital prints service transactions.</p>
          </Link>
          <Link href="/tech-services" className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group relative overflow-hidden">
             <div className="absolute top-0 left-0 w-2 h-full bg-brand-blue-400 transform origin-bottom transition-transform duration-300 group-hover:scale-y-110"></div>
            <h2 className="text-2xl font-bold text-brand-blue-400 mb-2 group-hover:text-primary-hover transition-colors">Tech Services Ledger &rarr;</h2>
            <p className="text-gray-500 font-medium">Manage tech services transactions.</p>
          </Link>
          <Link href="/ecafe" className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group relative overflow-hidden">
             <div className="absolute top-0 left-0 w-2 h-full bg-accent transform origin-bottom transition-transform duration-300 group-hover:scale-y-110"></div>
            <h2 className="text-2xl font-bold text-accent mb-2 group-hover:text-accent transition-colors">eCafe Ledger &rarr;</h2>
            <p className="text-gray-500 font-medium">Manage eCafe service transactions.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}