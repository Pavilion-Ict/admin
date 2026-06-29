import Ledger from "@/components/Ledger";
import SignOutButton from "@/components/SignOutButton";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function PublishingPage() {
  const session = await getServerSession(authOptions);
  const isSuperAdmin = session?.user?.role === "super_admin";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {isSuperAdmin && (
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                &larr; Back
              </Link>
            )}
            <h1 className="text-xl font-semibold text-gray-800">Publishing Admin</h1>
          </div>
          <SignOutButton />
        </div>
      </header>
      
      <main className="py-8">
        <Ledger tableName="publishing_ledger" title="Publishing" />
      </main>
    </div>
  );
}
