"use client";

import { useState, useMemo } from "react";
import { exportSummaryPDF } from "@/lib/pdfUtils";

export default function SummaryPanel({ 
  rows, 
  copRows, 
  stockLogs = [],
  catalogue,
  onClose,
  title
}: { 
  rows: any[]; 
  copRows: any[]; 
  stockLogs?: any[];
  catalogue?: Record<string, { cop: number }> | Record<string, any>;
  onClose: () => void;
  title: string;
}) {
  const TODAY = new Date().toISOString().split('T')[0];
  
  const allDates = [
    ...rows.map(r => r.entry_date || r.created_at.split('T')[0]),
    ...copRows.map(r => r.entry_date || r.created_at.split('T')[0]),
    ...(stockLogs || []).map(r => r.date || r.created_at?.split('T')[0])
  ].filter(Boolean).sort();
  const minDate = allDates[0] || TODAY;
  const maxDate = allDates[allDates.length - 1] || TODAY;
  
  const [from, setFrom] = useState(minDate);
  const [to, setTo] = useState(maxDate);

  const inRange = useMemo(() => {
    return rows.filter(r => {
      const d = r.entry_date || r.created_at.split('T')[0];
      return d >= from && d <= to;
    });
  }, [rows, from, to]);

  const copInRange = useMemo(() => {
    return copRows.filter(r => {
      const d = r.entry_date || r.created_at.split('T')[0];
      return d >= from && d <= to;
    });
  }, [copRows, from, to]);

  const stockInRange = useMemo(() => {
    return (stockLogs || []).filter(s => {
      const d = s.date || s.created_at?.split('T')[0];
      return d >= from && d <= to;
    });
  }, [stockLogs, from, to]);

  const itemSummary = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; revenue: number; cop: number; unitCop: number }> = {};
    let totalUnits = 0;

    inRange.forEach((r: any) => {
      const name = r.description || "Other";
      const qty = Number(r.qty) || 0;
      const isPublishingOrPrints = title.toLowerCase().includes("publishing") || title.toLowerCase().includes("digital prints");
      const rev = isPublishingOrPrints ? Number(r.price || 0) : Number(r.price || 0) * (qty || 1);

      let unitCop = 0;
      if (catalogue && catalogue[name]) {
        unitCop = typeof catalogue[name] === "object" ? Number(catalogue[name].cop || 0) : Number(catalogue[name] || 0);
      }
      const cop = unitCop * qty;

      if (!map[name]) {
        map[name] = { name, quantity: 0, revenue: 0, cop: 0, unitCop };
      }
      map[name].quantity += qty;
      map[name].revenue += rev;
      map[name].cop += cop;
      totalUnits += qty;
    });

    return Object.values(map)
      .map(item => ({
        ...item,
        profit: item.revenue - item.cop,
        sharePct: totalUnits > 0 ? (item.quantity / totalUnits) * 100 : 0
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [inRange, catalogue, title]);

  const totalUnitsSold = useMemo(() => {
    return itemSummary.reduce((sum, item) => sum + item.quantity, 0);
  }, [itemSummary]);

  const byDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    inRange.forEach(r => { 
      const d = r.entry_date || r.created_at.split('T')[0];
      if (!map[d]) map[d] = []; 
      map[d].push(r); 
    });
    stockInRange.forEach(s => {
      const d = s.date || s.created_at?.split('T')[0];
      if (!map[d]) map[d] = [];
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [inRange, stockInRange]);

  const totalRevenue = inRange.reduce((s, r) => {
    return (title.includes("Publishing") || title.includes("Digital Prints"))
      ? s + Number(r.price) 
      : s + (Number(r.qty) * Number(r.price));
  }, 0);
  const totalCop = copInRange.reduce((s, r) => s + Number(r.amount), 0);
  const grossProfit = totalRevenue - totalCop;

  const handleExport = () => {
    exportSummaryPDF({
      byDate,
      inRange,
      totalRevenue,
      totalCop,
      grossProfit,
      copRows: copInRange,
      stockLogs: stockInRange,
      itemSummary,
      totalUnitsSold,
      catalogue,
      from,
      to,
      title
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex justify-between items-center z-10 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title} Summary Report</h2>
            <p className="text-sm text-gray-500 mt-1">
              {inRange.length} entr{inRange.length !== 1 ? "ies" : "y"} · {new Date(from).toLocaleDateString()} &rarr; {new Date(to).toLocaleDateString()}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-end gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
            <div className="w-full sm:w-auto">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">From Date</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm" />
            </div>
            <div className="w-full sm:w-auto">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">To Date</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm" />
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:ml-auto mt-2 sm:mt-0">
              <button onClick={() => { setFrom(minDate); setTo(maxDate); }} className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">All time</button>
              <button onClick={() => { setFrom(TODAY); setTo(TODAY); }} className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Today</button>
              <button onClick={handleExport} className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-sm hover:bg-primary-hover">⬇ Export PDF</button>
            </div>
          </div>

          {/* Totals Banner */}
          <div className="flex flex-col md:flex-row rounded-xl overflow-hidden mb-8 border border-gray-100 shadow-sm divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div className="flex-1 p-4 bg-white">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Revenue</div>
              <div className="text-2xl font-bold text-primary">₦{totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="flex-1 p-4 bg-white">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total COP</div>
              <div className="text-2xl font-bold text-brand-yellow">₦{totalCop.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="flex-1 p-4 bg-gray-50 border-l border-gray-100">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Gross Profit</div>
              <div className={`text-2xl font-bold ${grossProfit >= 0 ? "text-green-600" : "text-red-600"}`}>₦{grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          {/* Inventory Items Summary Table */}
          {itemSummary.length > 0 && (
            <div className="mb-8 rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gray-100 px-5 py-3.5 border-b border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📦</span>
                  <h3 className="font-bold text-gray-800">Inventory Items Summary</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-700 shadow-xs">
                    {totalUnitsSold.toLocaleString()} total units sold
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    ({inRange.length > 0 ? (totalUnitsSold / inRange.length).toFixed(1) : "0"} avg/tx)
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item / Service</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Quantity Sold</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Unit COP (₦)</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total COP (₦)</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total Revenue (₦)</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Gross Profit (₦)</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Share of Units (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itemSummary.map((item, idx) => {
                      const isTopPerformer = idx === 0 && itemSummary.length > 1;
                      return (
                        <tr key={item.name} className={`hover:bg-gray-50 transition-colors ${isTopPerformer ? "bg-amber-50/25" : ""}`}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 flex items-center gap-2">
                            <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                              idx === 0 
                                ? "bg-amber-100 text-amber-800" 
                                : idx === 1 
                                ? "bg-slate-100 text-slate-700" 
                                : "bg-gray-50 text-gray-400"
                            }`}>
                              #{idx + 1}
                            </span>
                            <span>{item.name}</span>
                            {isTopPerformer && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                                Top Seller
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                            {item.quantity.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">
                            {item.unitCop > 0 ? item.unitCop.toLocaleString('en-US', { minimumFractionDigits: 2 }) : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-amber-700">
                            {item.cop.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-primary">
                            {item.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-bold ${item.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {item.profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">
                            <div className="flex items-center justify-end gap-2">
                              <span>{item.sharePct.toFixed(1)}%</span>
                              <div className="w-12 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-primary h-full rounded-full" style={{ width: `${item.sharePct}%` }}></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold text-xs uppercase text-gray-700">
                      <td className="px-4 py-3">Total / Summary</td>
                      <td className="px-4 py-3 text-right font-extrabold text-sm text-gray-900">
                        {totalUnitsSold.toLocaleString()} units
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">—</td>
                      <td className="px-4 py-3 text-right font-bold text-amber-700 text-sm">
                        ₦{itemSummary.reduce((s, it) => s + it.cop, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-primary text-sm">
                        ₦{itemSummary.reduce((s, it) => s + it.revenue, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold text-sm ${
                        itemSummary.reduce((s, it) => s + it.profit, 0) >= 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        ₦{itemSummary.reduce((s, it) => s + it.profit, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right">100.0%</td>
                    </tr>
                    <tr className="bg-gray-50/50 text-[11px] text-gray-500 font-medium">
                      <td colSpan={7} className="px-4 py-2 border-t border-gray-100">
                        <span>Average volume per transaction: </span>
                        <span className="font-bold text-gray-800">
                          {inRange.length > 0 ? (totalUnitsSold / inRange.length).toFixed(1) : "0"} units
                        </span>
                        <span className="mx-2">·</span>
                        <span>Catalogue items active: </span>
                        <span className="font-bold text-gray-800">{itemSummary.length}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* By Date Blocks */}
          {byDate.length === 0 && (
            <div className="text-center py-12 text-gray-400 font-medium">No sales or stock records found in this date range.</div>
          )}

          {byDate.map(([date, dRows]) => {
            const isNoMultiply = title.includes("Publishing") || title.includes("Digital Prints");
            const rev = dRows.reduce((s, r) => {
              return isNoMultiply
                ? s + Number(r.price) 
                : s + (Number(r.qty) * Number(r.price));
            }, 0);
            const dayStock = stockInRange.find(s => (s.date || s.created_at?.split('T')[0]) === date);

            return (
              <div key={date} className="mb-6 rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800">{new Date(date).toLocaleDateString()}</h3>
                  <span className="text-sm font-medium text-gray-600">{dRows.length} entries &middot; <span className="font-bold text-gray-900">₦{rev.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></span>
                </div>
                {dRows.length > 0 && (
                  <div className="overflow-x-auto bg-white">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Client</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Description</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Qty</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Total (₦)</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Payment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {dRows.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{r.client_name}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-600">{r.description}</td>
                            <td className="px-4 py-2.5 text-sm text-right text-gray-900">{r.qty}</td>
                            <td className="px-4 py-2.5 text-sm text-right font-bold text-gray-900">{(isNoMultiply ? Number(r.price) : Number(r.qty) * Number(r.price)).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            <td className="px-4 py-2.5 text-sm text-center capitalize text-gray-600">{r.payment_method}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {dayStock && (
                  <div className="bg-amber-50/40 border-t border-amber-200/60 p-4">
                    <div className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span>📦</span> Daily Stock Log ({new Date(date).toLocaleDateString()})
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="bg-white p-2.5 rounded border border-amber-100 shadow-sm">
                        <span className="text-gray-500 font-bold block text-[10px] uppercase mb-1">Opening Stock</span>
                        <p className="text-gray-900 whitespace-pre-wrap">{dayStock.opening_stock || "—"}</p>
                      </div>
                      <div className="bg-white p-2.5 rounded border border-amber-100 shadow-sm">
                        <span className="text-gray-500 font-bold block text-[10px] uppercase mb-1">Additional Notes</span>
                        <p className="text-gray-900 whitespace-pre-wrap">{dayStock.additional_notes || "—"}</p>
                      </div>
                      <div className="bg-white p-2.5 rounded border border-amber-100 shadow-sm">
                        <span className="text-gray-500 font-bold block text-[10px] uppercase mb-1">Closing Stock</span>
                        <p className="text-gray-900 whitespace-pre-wrap">{dayStock.closing_stock || "—"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* COP Table */}
          {copInRange.length > 0 && (
            <div className="mb-6 rounded-xl border border-brand-yellow overflow-hidden shadow-sm mt-10">
              <div className="bg-[#FFF9E5] px-4 py-3 border-b border-brand-yellow flex justify-between items-center">
                <h3 className="font-bold text-yellow-800">Production Cost (COP) Breakdown</h3>
              </div>
              <div className="overflow-x-auto bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Cost Item</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Note</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Amount (₦)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {copInRange.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-sm text-gray-600">{new Date(r.entry_date || r.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{r.item}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">{r.note}</td>
                        <td className="px-4 py-2.5 text-sm text-right font-bold text-brand-yellow">{Number(r.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td colSpan={3} className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Total COP</td>
                      <td className="px-4 py-3 text-right font-bold text-brand-yellow text-lg">₦{totalCop.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
