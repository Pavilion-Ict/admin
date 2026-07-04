import PublishingLedgerDashboard from "@/components/PublishingLedgerDashboard";
import SignOutButton from "@/components/SignOutButton";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";
import { getCatalogue, getStockLogs } from "@/app/actions/publishing";

export default async function PublishingPage() {
  const session = await getServerSession(authOptions);
  const isSuperAdmin = session?.user?.role === "super_admin";

  // Fetch ledger entries
  const { data: entries, error: entriesError } = await supabase
    .from("publishing_ledger")
    .select("*")
    .order("created_at", { ascending: false });

  if (entriesError) {
    console.error("Error fetching publishing ledger:", entriesError);
  }

  // Fetch catalogue and stock logs using the new server actions
  const catalogueItems = await getCatalogue();
  const stockLogs = await getStockLogs();

  // Convert catalogue list to map
  const catalogueMap = catalogueItems.reduce((acc, item) => {
    acc[item.service_name] = { cop: item.cop_rate };
    return acc;
  }, {} as Record<string, { cop: number }>);
  
  // If catalogue is empty (first run before migration), provide defaults
  const finalCatalogue = Object.keys(catalogueMap).length > 0 ? catalogueMap : {
    "Printing":         { cop: 380 },
    "Soft Binding":     { cop: 150 },
    "Hard Binding":     { cop: 429 },
    "Binding - Stitch": { cop: 250 },
    "Embossing":        { cop: 120 },
    "Lamination":       { cop: 90  },
    "Editing":          { cop: 500 },
    "Pantry":           { cop: 200 },
    "Scanning":         { cop: 60  },
    "Photocopying":     { cop: 10  },
    "Custom":           { cop: 0   }
  };

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
        <PublishingLedgerDashboard 
          initialRows={entries || []} 
          initialCatalogue={finalCatalogue} 
          initialStockLogs={stockLogs || []} 
        />
      </main>
    </div>
  );
}
