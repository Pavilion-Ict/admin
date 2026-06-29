import { supabase } from "@/lib/supabase";
import LedgerDashboard from "./LedgerDashboard";

export default async function Ledger({ tableName, title }: { tableName: string; title: string }) {
  // Fetch ledger entries
  const { data: entries, error } = await supabase
    .from(tableName)
    .select("*, users:created_by(username)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching ledger:", error);
  }

  return <LedgerDashboard tableName={tableName} title={title} initialEntries={entries || []} />;
}
