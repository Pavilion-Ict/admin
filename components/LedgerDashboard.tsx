"use client";

import { useState, useMemo } from "react";
import LedgerForm from "./LedgerForm";

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

export default function LedgerDashboard({ tableName, title, initialEntries }: { tableName: string; title: string; initialEntries: Entry[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");

  const filteredEntries = useMemo(() => {
    return initialEntries.filter((entry) => {
      // 1. Payment Filter
      if (paymentFilter !== "all" && entry.payment_method !== paymentFilter) return false;
      
      // 2. Delivery Filter
      if (deliveryFilter !== "all" && entry.delivery_method !== deliveryFilter) return false;

      // 3. Keyword Search (check across all text fields)
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const searchString = `
          ${entry.client_name} 
          ${entry.description} 
          ${entry.payment_method} 
          ${entry.delivery_method} 
          ${entry.users?.username || ''}
          ${entry.qty}
          ${entry.price}
          ${entry.entry_date || ''}
          ${new Date(entry.created_at).toLocaleDateString()}
        `.toLowerCase();
        
        if (!searchString.includes(query)) return false;
      }

      return true;
    });
  }, [initialEntries, searchQuery, paymentFilter, deliveryFilter]);

  // Calculate totals based on FILTERED entries
  const totalSales = filteredEntries.reduce((sum, e) => sum + (Number(e.qty) * Number(e.price)), 0);
  const pendingCredit = filteredEntries.filter(e => e.payment_method === 'credit').reduce((sum, e) => sum + (Number(e.qty) * Number(e.price)), 0);
  const cashReceived = filteredEntries.filter(e => e.payment_method !== 'credit').reduce((sum, e) => sum + (Number(e.qty) * Number(e.price)), 0);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">{title} Sales Ledger</h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border-l-4 border-primary p-6 rounded-2xl shadow-sm">
          <h3 className="text-primary font-bold text-xs tracking-wider uppercase mb-1">Total Sales</h3>
          <p className="text-3xl font-bold text-gray-900">₦{totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white border-l-4 border-brand-blue-100 p-6 rounded-2xl shadow-sm">
          <h3 className="text-brand-blue-100 font-bold text-xs tracking-wider uppercase mb-1">Received (Cash/POS/Cheque)</h3>
          <p className="text-3xl font-bold text-gray-900">₦{cashReceived.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white border-l-4 border-brand-yellow p-6 rounded-2xl shadow-sm">
          <h3 className="text-brand-yellow font-bold text-xs tracking-wider uppercase mb-1">Pending Credit</h3>
          <p className="text-3xl font-bold text-gray-900">₦{pendingCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      <LedgerForm tableName={tableName} />

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
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
        
        <div className="flex gap-4 w-full md:w-auto">
          <select 
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary text-gray-700 bg-gray-50"
          >
            <option value="all">All Payments</option>
            <option value="cash">Cash</option>
            <option value="pos">POS</option>
            <option value="cheque">Cheque</option>
            <option value="credit">Credit</option>
          </select>

          <select 
            value={deliveryFilter}
            onChange={(e) => setDeliveryFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary text-gray-700 bg-gray-50"
          >
            <option value="all">All Deliveries</option>
            <option value="walk in">Walk In</option>
            <option value="pickup">Pickup</option>
            <option value="dispatch">Dispatch</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-gray-900">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Client Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Service Description</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Delivery</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Admin</th>
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
                          Logged: {new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{entry.client_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{entry.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{entry.qty}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">₦{Number(entry.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">₦{total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full 
                          ${entry.payment_method === 'credit' ? 'bg-[#FFF9E5] text-[#FFCC29]' : 
                            entry.payment_method === 'cash' ? 'bg-[#E5F5FC] text-[#0098DA]' : 
                            entry.payment_method === 'pos' ? 'bg-[#EAEAF4] text-[#3E4095]' : 'bg-[#FDEBF2] text-[#ED3883]'}`}>
                          {entry.payment_method.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 capitalize">
                        {entry.delivery_method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {entry.users?.username || 'Unknown'}
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
    </div>
  );
}
