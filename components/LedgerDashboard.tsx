"use client";

import { useState, useMemo } from "react";
import LedgerForm from "./LedgerForm";
import CopForm from "./CopForm";
import SummaryPanel from "./SummaryPanel";
import { generateReceipt, exportLedgerPDF } from "@/lib/pdfUtils";

type Entry = {
  id: string;
  created_at: string;
  entry_date?: string;
  client_name: string;
  description: string;
  qty: number;
  price: number;
  payment_method: string;
  delivery_method: string;
  users: { username: string } | null;
};

type CopEntry = {
  id: string;
  created_at: string;
  entry_date?: string;
  item: string;
  note: string;
  amount: number;
  users: { username: string } | null;
};

export default function LedgerDashboard({ 
  tableName, 
  title, 
  initialEntries,
  initialCopEntries
}: { 
  tableName: string; 
  title: string; 
  initialEntries: Entry[];
  initialCopEntries: CopEntry[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [showSummary, setShowSummary] = useState(false);

  const filteredEntries = useMemo(() => {
    return initialEntries.filter((entry) => {
      if (paymentFilter !== "all" && entry.payment_method !== paymentFilter) return false;
      if (deliveryFilter !== "all" && entry.delivery_method !== deliveryFilter) return false;

      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const searchString = `
          ${entry.client_name} 
          ${entry.description} 
          ${entry.payment_method} 
          ${entry.delivery_method} 
          ${entry.note || ''}
          ${entry.users?.username || ''}
          ${entry.qty}
          ${entry.price}
          ${entry.balance || ''}
          ${entry.entry_date || ''}
          ${new Date(entry.created_at).toLocaleDateString()}
        `.toLowerCase();
        
        if (!searchString.includes(query)) return false;
      }
      return true;
    });
  }, [initialEntries, searchQuery, paymentFilter, deliveryFilter]);

  const totalRevenue = filteredEntries.reduce((sum, e) => sum + (Number(e.qty) * Number(e.price)), 0);
  const totalCop = initialCopEntries.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = totalRevenue - totalCop;

  const handleExportPDF = () => {
    exportLedgerPDF({
      filteredRows: filteredEntries,
      totalRevenue,
      totalCop,
      copRows: initialCopEntries,
      title
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 relative">
      
      {showSummary && (
        <SummaryPanel 
          rows={initialEntries} 
          copRows={initialCopEntries} 
          onClose={() => setShowSummary(false)} 
          title={title}
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-800">{title} Sales Ledger</h1>
        <div className="flex gap-3">
          <button onClick={() => setShowSummary(true)} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 flex items-center gap-2">
            <span>📊</span> Summary
          </button>
          <button onClick={handleExportPDF} className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-sm hover:bg-primary-hover flex items-center gap-2">
            <span>⬇</span> Export PDF
          </button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border-l-4 border-primary p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <h3 className="text-gray-500 font-bold text-xs tracking-wider uppercase mb-1">Revenue</h3>
          <p className="text-2xl font-bold text-gray-900">₦{totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white border-l-4 border-brand-yellow p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <h3 className="text-gray-500 font-bold text-xs tracking-wider uppercase mb-1">Total COP</h3>
          <p className="text-2xl font-bold text-brand-yellow">₦{totalCop.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className={`bg-white border-l-4 ${netProfit >= 0 ? 'border-green-500' : 'border-red-500'} p-5 rounded-2xl shadow-sm flex flex-col justify-center`}>
          <h3 className="text-gray-500 font-bold text-xs tracking-wider uppercase mb-1">Net Profit</h3>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₦{netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white border-l-4 border-gray-300 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <h3 className="text-gray-500 font-bold text-xs tracking-wider uppercase mb-1">Entries</h3>
          <p className="text-2xl font-bold text-gray-600">{filteredEntries.length}</p>
        </div>
      </div>

      {/* Forms */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <LedgerForm tableName={tableName} />
        <CopForm tableName={tableName} />
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="w-full md:w-1/3 relative">
          <svg className="w-5 h-5 absolute left-3 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input 
            type="text" 
            placeholder="Search all fields..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm text-gray-900"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary text-gray-700 bg-gray-50">
            <option value="all">All Payments</option>
            <option value="Transfer">Transfer</option>
            <option value="Cash">Cash</option>
            <option value="POS">POS</option>
            <option value="Cheque">Cheque</option>
            <option value="Credit">Credit</option>
          </select>
          <select value={deliveryFilter} onChange={(e) => setDeliveryFilter(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary text-gray-700 bg-gray-50">
            <option value="all">All Deliveries</option>
            <option value="Pick Up">Pick Up</option>
            <option value="Dispatch">Dispatch</option>
            <option value="Express Delivery">Express Delivery</option>
            <option value="Evening Delivery">Evening Delivery</option>
            <option value="Walk-In">Walk-In</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-700 uppercase tracking-wider text-xs">Sales Record</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-gray-900">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Client Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Delivery</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Note</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEntries.length > 0 ? (
                filteredEntries.map((entry) => {
                  const total = Number(entry.qty) * Number(entry.price);
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="font-bold text-gray-900 block">
                          {entry.entry_date ? new Date(entry.entry_date).toLocaleDateString() : new Date(entry.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-gray-400">
                          Logged: {new Date(entry.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{entry.client_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">{entry.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{entry.qty}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">₦{Number(entry.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">₦{total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-500">₦{Number(entry.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full 
                          ${entry.payment_method === 'Credit' ? 'bg-[#FFF9E5] text-[#FFCC29]' : 
                            entry.payment_method === 'Cash' ? 'bg-[#E5F5FC] text-[#0098DA]' : 
                            entry.payment_method === 'POS' ? 'bg-[#EAEAF4] text-[#3E4095]' : 
                            entry.payment_method === 'Transfer' ? 'bg-green-100 text-green-700' : 
                            'bg-[#FDEBF2] text-[#ED3883]'}`}>
                          {entry.payment_method.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 capitalize">
                        {entry.delivery_method}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-[150px] truncate" title={entry.note}>
                        {entry.note || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <button onClick={() => generateReceipt(entry, title)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-200">
                          🧾 Receipt
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-sm text-gray-500">
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* COP Table */}
      <div className="bg-white rounded-xl shadow-sm border border-brand-yellow overflow-hidden">
        <div className="bg-[#FFF9E5] px-6 py-3 border-b border-brand-yellow flex justify-between items-center">
          <h3 className="font-bold text-yellow-800 uppercase tracking-wider text-xs">Production Cost (COP)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cost Item</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Note</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Amount (₦)</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Admin</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {initialCopEntries.length > 0 ? (
                initialCopEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="font-bold text-gray-900 block">
                        {entry.entry_date ? new Date(entry.entry_date).toLocaleDateString() : new Date(entry.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{entry.item}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{entry.note || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-brand-yellow">
                      ₦{Number(entry.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {entry.users?.username || 'Unknown'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    No production costs recorded.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={3} className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total COP</td>
                <td className="px-6 py-4 text-right font-bold text-brand-yellow text-lg">₦{totalCop.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
}
