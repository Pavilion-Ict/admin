import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";
import Link from "next/link";

import { supabase } from "@/lib/supabase";

async function getWeeklySummary() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const startOfWeek = new Date(now.setDate(diff));
  const startStr = startOfWeek.toISOString().split('T')[0];

  const ledgers = [
    { table: 'publishing_ledger', copTable: null }, // we need to calculate COP from catalogue for publishing
    { table: 'digital_prints_ledger', copTable: 'digital_prints_cop' },
    { table: 'tech_services_ledger', copTable: 'tech_services_cop' },
    { table: 'ecafe_ledger', copTable: 'ecafe_cop' }
  ];

  let totalRev = 0;
  let totalCop = 0;
  let totalExp = 0;

  // For Publishing COP calculation
  const { data: catData } = await supabase.from("publishing_catalogue").select("*");
  const catMap = (catData || []).reduce((acc: any, c: any) => ({ ...acc, [c.service_name]: c.cop_rate }), {});

  for (const { table, copTable } of ledgers) {
    // Fetch sales
    const { data: sales } = await supabase.from(table).select("*").gte('entry_date', startStr).order('entry_date');
    const { data: salesNull } = await supabase.from(table).select("*").is('entry_date', null).gte('created_at', startStr);
    
    const allSales = [...(sales || []), ...(salesNull || [])];

    allSales.forEach(s => {
      totalExp += Number(s.expenses || 0);
      if (table === 'publishing_ledger') {
        totalRev += Number(s.price || 0);
        totalCop += (catMap[s.description] || 0) * (Number(s.qty) || 0);
      } else if (table === 'digital_prints_ledger') {
        totalRev += Number(s.price || 0);
      } else {
        totalRev += (Number(s.qty || 1) * Number(s.price || 0));
      }
    });

    // Fetch COP (if applicable)
    if (copTable) {
      const { data: cops } = await supabase.from(copTable).select("*").gte('entry_date', startStr);
      const { data: copsNull } = await supabase.from(copTable).select("*").is('entry_date', null).gte('created_at', startStr);
      
      [...(cops || []), ...(copsNull || [])].forEach(c => {
        totalCop += Number(c.amount || 0);
      });
    }
  }

  return { totalRev, totalCop, totalExp, startStr };
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role !== "super_admin") {
    redirect("/login");
  }

  const summary = await getWeeklySummary();
  const netProfit = summary.totalRev - summary.totalCop - summary.totalExp;

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100/50 backdrop-blur-xl">
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

        {/* Weekly Summary */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-gray-800 mb-4 px-1">This Week's Overview <span className="text-sm font-normal text-gray-500 ml-2">(Since {new Date(summary.startStr).toLocaleDateString()})</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border-l-4 border-primary p-5 rounded-2xl shadow-sm">
              <h3 className="text-gray-500 font-bold text-xs tracking-wider uppercase mb-1">Total Revenue</h3>
              <p className="text-2xl font-bold text-gray-900">₦{summary.totalRev.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white border-l-4 border-brand-yellow p-5 rounded-2xl shadow-sm">
              <h3 className="text-gray-500 font-bold text-xs tracking-wider uppercase mb-1">Total COP</h3>
              <p className="text-2xl font-bold text-brand-yellow">₦{summary.totalCop.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white border-l-4 border-orange-400 p-5 rounded-2xl shadow-sm">
              <h3 className="text-gray-500 font-bold text-xs tracking-wider uppercase mb-1">Total Expenses</h3>
              <p className="text-2xl font-bold text-orange-500">₦{summary.totalExp.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className={`bg-white border-l-4 ${netProfit >= 0 ? 'border-green-500' : 'border-red-500'} p-5 rounded-2xl shadow-sm`}>
              <h3 className="text-gray-500 font-bold text-xs tracking-wider uppercase mb-1">Net Profit</h3>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₦{netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/publishing" className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-primary transform origin-bottom transition-transform duration-300 group-hover:scale-y-110"></div>
            <h2 className="text-2xl font-bold text-primary mb-2 group-hover:text-primary-hover transition-colors">Publishing Ledger &rarr;</h2>
            <p className="text-gray-500 font-medium">Manage the publishing service transactions.</p>
          </Link>
          <Link href="/digital-prints" className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group relative overflow-hidden">
             <div className="absolute top-0 left-0 w-2 h-full bg-brand-blue-100 transform origin-bottom transition-transform duration-300 group-hover:scale-y-110"></div>
            <h2 className="text-2xl font-bold text-brand-blue-100 mb-2 group-hover:text-primary-hover transition-colors">Digital Prints Ledger &rarr;</h2>
            <p className="text-gray-500 font-medium">Manage digital prints service transactions.</p>
          </Link>
          <Link href="/tech-services" className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group relative overflow-hidden">
             <div className="absolute top-0 left-0 w-2 h-full bg-brand-blue-400 transform origin-bottom transition-transform duration-300 group-hover:scale-y-110"></div>
            <h2 className="text-2xl font-bold text-brand-blue-400 mb-2 group-hover:text-primary-hover transition-colors">Tech Services Ledger &rarr;</h2>
            <p className="text-gray-500 font-medium">Manage tech services transactions.</p>
          </Link>
          <Link href="/ecafe" className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group relative overflow-hidden">
             <div className="absolute top-0 left-0 w-2 h-full bg-accent transform origin-bottom transition-transform duration-300 group-hover:scale-y-110"></div>
            <h2 className="text-2xl font-bold text-accent mb-2 group-hover:text-accent transition-colors">eCafe Ledger &rarr;</h2>
            <p className="text-gray-500 font-medium">Manage eCafe service transactions.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}