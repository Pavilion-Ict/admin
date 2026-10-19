import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";
import Link from "next/link";
import GlobalExportButton from "@/components/GlobalExportButton";
import DashboardChart from "@/components/DashboardChart";

import { supabase } from "@/lib/supabase";

async function getWeeklySummary() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const startOfWeek = new Date(now.setHours(0,0,0,0));
  startOfWeek.setDate(diff);
  const startStr = startOfWeek.toISOString().split('T')[0];

  const startOfPrevWeek = new Date(startOfWeek);
  startOfPrevWeek.setDate(startOfPrevWeek.getDate() - 7);
  const startPrevStr = startOfPrevWeek.toISOString().split('T')[0];

  const endOfPrevWeek = new Date(startOfWeek);
  endOfPrevWeek.setDate(endOfPrevWeek.getDate() - 1);
  const endPrevStr = endOfPrevWeek.toISOString().split('T')[0];

  const ledgers = [
    { table: 'publishing_ledger', copTable: null },
    { table: 'digital_prints_ledger', copTable: 'digital_prints_cop' },
    { table: 'tech_services_ledger', copTable: 'tech_services_cop' },
    { table: 'ecafe_ledger', copTable: 'ecafe_cop' }
  ];

  let totalRev = 0; let totalCop = 0; let totalExp = 0; let totalInc = 0;
  let prevRev = 0; let prevCop = 0; let prevExp = 0; let prevInc = 0;

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const chartData = days.map(d => ({ name: d, Revenue: 0, Expenses: 0 }));
  const getDayIndex = (dateStr: string) => {
    const d = new Date(dateStr);
    const dayIndex = d.getDay();
    return dayIndex === 0 ? 6 : dayIndex - 1;
  };

  const { data: catData } = await supabase.from("publishing_catalogue").select("*");
  const catMap = (catData || []).reduce((acc: any, c: any) => ({ ...acc, [c.service_name]: c.cop_rate }), {});

  const itemMap: Record<string, { quantity: number; revenue: number; cop: number }> = {};
  let totalUnitsSold = 0;

  for (const { table, copTable } of ledgers) {
    const { data: sales } = await supabase.from(table).select("*").gte('entry_date', startPrevStr).order('entry_date');
    const { data: salesNull } = await supabase.from(table).select("*").is('entry_date', null).gte('created_at', startPrevStr);
    const allSales = [...(sales || []), ...(salesNull || [])];

    allSales.forEach(s => {
      const dStr = s.entry_date || s.created_at.split('T')[0];
      let rev = 0;
      let cop = 0;
      let exp = Number(s.expenses || 0);

      if (table === 'publishing_ledger') {
        rev = Number(s.price || 0);
        const qty = Number(s.qty) || 0;
        const unitCop = catMap[s.description] || 0;
        cop = unitCop * qty;

        if (dStr >= startStr) {
          const name = s.description || "Other";
          if (!itemMap[name]) {
            itemMap[name] = { quantity: 0, revenue: 0, cop: 0 };
          }
          itemMap[name].quantity += qty;
          itemMap[name].revenue += rev;
          itemMap[name].cop += cop;
          totalUnitsSold += qty;
        }
      } else if (table === 'digital_prints_ledger') {
        rev = Number(s.price || 0);
      } else {
        rev = (Number(s.qty || 1) * Number(s.price || 0));
      }

      if (dStr >= startStr) {
        totalRev += rev; totalCop += cop; totalExp += exp;
        const idx = getDayIndex(dStr);
        if (idx >= 0 && idx < 7) {
          chartData[idx].Revenue += rev;
          chartData[idx].Expenses += exp;
        }
      } else if (dStr >= startPrevStr && dStr <= endPrevStr) {
        prevRev += rev; prevCop += cop; prevExp += exp;
      }
    });

    if (copTable) {
      const { data: cops } = await supabase.from(copTable).select("*").gte('entry_date', startPrevStr);
      const { data: copsNull } = await supabase.from(copTable).select("*").is('entry_date', null).gte('created_at', startPrevStr);
      
      [...(cops || []), ...(copsNull || [])].forEach(c => {
        const dStr = c.entry_date || c.created_at.split('T')[0];
        const amt = Number(c.amount || 0);
        if (dStr >= startStr) totalCop += amt;
        else if (dStr >= startPrevStr && dStr <= endPrevStr) prevCop += amt;
      });
    }
  }

  const { data: globalExpData } = await supabase.from('company_expenses').select("*").gte('entry_date', startPrevStr);
  const { data: globalExpNull } = await supabase.from('company_expenses').select("*").is('entry_date', null).gte('created_at', startPrevStr);
  [...(globalExpData || []), ...(globalExpNull || [])].forEach(e => {
    const dStr = e.entry_date || e.created_at.split('T')[0];
    const amt = Number(e.amount || 0);
    if (dStr >= startStr) {
      totalExp += amt;
      const idx = getDayIndex(dStr);
      if (idx >= 0 && idx < 7) chartData[idx].Expenses += amt;
    }
    else if (dStr >= startPrevStr && dStr <= endPrevStr) prevExp += amt;
  });

  const { data: globalIncData } = await supabase.from('company_income').select("*").gte('entry_date', startPrevStr);
  const { data: globalIncNull } = await supabase.from('company_income').select("*").is('entry_date', null).gte('created_at', startPrevStr);
  [...(globalIncData || []), ...(globalIncNull || [])].forEach(e => {
    const dStr = e.entry_date || e.created_at.split('T')[0];
    const amt = Number(e.amount || 0);
    if (dStr >= startStr) {
      totalInc += amt;
      const idx = getDayIndex(dStr);
      if (idx >= 0 && idx < 7) chartData[idx].Revenue += amt;
    }
    else if (dStr >= startPrevStr && dStr <= endPrevStr) prevInc += amt;
  });

  const inventoryItemSummary = Object.entries(itemMap)
    .map(([name, data]) => ({
      name,
      quantity: data.quantity,
      revenue: data.revenue,
      cop: data.cop,
      profit: data.revenue - data.cop,
      unitCop: catMap[name] ?? (data.quantity > 0 ? data.cop / data.quantity : 0)
    }))
    .sort((a, b) => b.quantity - a.quantity);

  return { 
    totalRev, 
    totalCop, 
    totalExp, 
    totalInc, 
    prevRev, 
    prevCop, 
    prevExp, 
    prevInc, 
    startStr, 
    chartData,
    inventoryItemSummary,
    totalUnitsSold
  };
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
  const netProfit = summary.totalRev - summary.totalCop - summary.totalExp + summary.totalInc;
  const grossProfit = summary.totalRev + summary.totalInc - summary.totalCop;

  const prevNetProfit = summary.prevRev - summary.prevCop - summary.prevExp + summary.prevInc;
  const prevGrossProfit = summary.prevRev + summary.prevInc - summary.prevCop;

  const getDelta = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? { val: 100, up: true, diff: curr } : { val: 0, up: true, diff: 0 };
    const pct = ((curr - prev) / Math.abs(prev)) * 100;
    return { val: Math.abs(pct), up: pct >= 0, diff: curr - prev };
  };

  const renderTrend = (curr: number, prev: number, invertColors = false) => {
    const delta = getDelta(curr, prev);
    if (delta.diff === 0) return <span className="text-gray-400 text-xs font-medium">— No change from last week</span>;
    const isPositive = delta.up;
    const colorClass = isPositive 
      ? (invertColors ? "text-red-500" : "text-green-500") 
      : (invertColors ? "text-green-500" : "text-red-500");
    const arrow = isPositive ? "↑" : "↓";
    return (
      <span className="text-gray-500 text-xs font-medium flex items-center gap-1 mt-2">
        <span className={`${colorClass} font-bold bg-${colorClass.split('-')[1]}-50 px-1 rounded`}>
          {arrow} {delta.val.toFixed(1)}%
        </span> 
        vs last week
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-6 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100/50 backdrop-blur-xl">
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
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 px-1">This Week's Overview <span className="text-sm font-normal text-gray-500 ml-2">(Since {new Date(summary.startStr).toLocaleDateString()})</span></h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white border-l-4 border-primary p-5 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-gray-600 font-extrabold text-[13px] tracking-wider uppercase mb-1">Total Revenue</h3>
                <p className="text-2xl font-bold text-gray-900">₦{summary.totalRev.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              {renderTrend(summary.totalRev, summary.prevRev)}
            </div>
            <div className="bg-white border-l-4 border-amber-500 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-gray-600 font-extrabold text-[13px] tracking-wider uppercase mb-1">Total COP</h3>
                <p className="text-2xl font-bold text-amber-700">₦{summary.totalCop.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              {renderTrend(summary.totalCop, summary.prevCop, true)}
            </div>
            <div className="bg-white border-l-4 border-orange-400 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-gray-600 font-extrabold text-[13px] tracking-wider uppercase mb-1">Total Expenses</h3>
                <p className="text-2xl font-bold text-orange-500">₦{summary.totalExp.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              {renderTrend(summary.totalExp, summary.prevExp, true)}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`bg-white border-l-4 ${grossProfit >= 0 ? 'border-green-500' : 'border-red-500'} p-5 rounded-2xl shadow-sm flex flex-col justify-between`}>
              <div>
                <h3 className="text-gray-600 font-extrabold text-[13px] tracking-wider uppercase mb-1">Gross Profit</h3>
                <p className={`text-3xl font-bold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₦{grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              {renderTrend(grossProfit, prevGrossProfit)}
            </div>
            <div className={`bg-white border-l-4 ${netProfit >= 0 ? 'border-green-500' : 'border-red-500'} p-5 rounded-2xl shadow-sm flex flex-col justify-between`}>
              <div>
                <h3 className="text-gray-600 font-extrabold text-[13px] tracking-wider uppercase mb-1">Net Profit</h3>
                <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₦{netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              {renderTrend(netProfit, prevNetProfit)}
            </div>
          </div>
        </div>

        <div className="mb-6 h-[400px]">
          <DashboardChart data={summary.chartData} />
        </div>

        {/* Inventory Items Summary */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">📦</span>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Inventory Items Summary</h3>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Publishing catalogue units moved and performance this week
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                {summary.totalUnitsSold.toLocaleString()} Total Units Sold
              </span>
            </div>
          </div>

          {summary.inventoryItemSummary.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-medium">
              <p className="text-3xl mb-2">📦</p>
              <p>No inventory items sold this week.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {summary.inventoryItemSummary.map((item, idx) => {
                const sharePct = summary.totalUnitsSold > 0 ? (item.quantity / summary.totalUnitsSold) * 100 : 0;
                return (
                  <div key={item.name} className="p-4 rounded-xl bg-gray-50/70 border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                          idx === 0 
                            ? "bg-amber-100 text-amber-800 border border-amber-200" 
                            : idx === 1 
                            ? "bg-slate-200 text-slate-700" 
                            : idx === 2 
                            ? "bg-amber-50 text-amber-700" 
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-gray-900 text-sm sm:text-base">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs sm:text-sm">
                        <span className="font-bold px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-800 shadow-xs">
                          {item.quantity.toLocaleString()} {item.quantity === 1 ? 'unit' : 'units'}
                        </span>
                        <span className="font-semibold text-gray-500">
                          {sharePct.toFixed(1)}% of volume
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200/80 rounded-full h-2.5 overflow-hidden mb-3">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          idx === 0 ? "bg-primary" : idx === 1 ? "bg-brand-blue-100" : "bg-primary/70"
                        }`}
                        style={{ width: `${Math.max(sharePct, 2)}%` }}
                      ></div>
                    </div>

                    {/* Financial Metrics */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200/60 text-xs">
                      <div>
                        <span className="text-gray-400 block uppercase tracking-wider text-[10px] font-semibold">Revenue</span>
                        <span className="font-bold text-gray-900">₦{item.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block uppercase tracking-wider text-[10px] font-semibold">Total COP</span>
                        <span className="font-bold text-amber-700">₦{item.cop.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="text-right sm:text-left">
                        <span className="text-gray-400 block uppercase tracking-wider text-[10px] font-semibold">Profit</span>
                        <span className={`font-bold ${item.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          ₦{item.profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <GlobalExportButton />

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
          <Link href="/income-expenses" className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group relative overflow-hidden md:col-span-2">
             <div className="absolute top-0 left-0 w-2 h-full bg-purple-500 transform origin-bottom transition-transform duration-300 group-hover:scale-y-110"></div>
            <h2 className="text-2xl font-bold text-purple-500 mb-2 group-hover:text-purple-600 transition-colors">Global Income & Expenses &rarr;</h2>
            <p className="text-gray-500 font-medium">Manage company-wide additional income and expenses.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}