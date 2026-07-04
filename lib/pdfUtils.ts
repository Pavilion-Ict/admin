export const APP_VERSION = "1.0.0";
export const BUSINESS_NAME = "PAVILION";

const fmt = (n: any) => (n === "" || n == null || isNaN(Number(n))) ? "—" : Number(n).toLocaleString("en-NG");
const fmtN = (n: any) => isNaN(Number(n)) ? 0 : Number(n);
const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return d; } };

function openPrintWindow(html: string) {
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    alert("Please allow popups for this site to print and export PDFs.");
  }
}

const PDF_BASE_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; margin: 0; padding: 20px; }
  h1 { margin: 0; font-size: 22px; letter-spacing: 2px; text-transform: uppercase; }
  .biz-header { text-align: center; border-bottom: 3px solid #111; padding-bottom: 12px; margin-bottom: 14px; }
  .biz-sub { font-size: 11px; color: #555; margin-top: 3px; }
  .meta { font-size: 10px; color: #666; margin-bottom: 12px; }
  .summary-grid { display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
  .sum-card { flex: 1; min-width: 90px; padding: 8px 10px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; }
  .sum-card .lbl { font-size: 8px; text-transform: uppercase; color: #888; margin-bottom: 2px; letter-spacing: 0.5px; }
  .sum-card .val { font-size: 13px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #1a2535; color: #fff; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  .tfoot td { font-weight: bold; background: #f0f0f0; border-top: 2px solid #bbb; }
  .amber { color: #c07800; } .green { color: #166534; } .red { color: #991b1b; }
  .right { text-align: right; }
  @media print { body { padding: 10px; } }
`;

export function generateReceipt(row: any, title: string) {
  const receiptNo = `RCP-${row.id.split('-')[0].toUpperCase()}`;
  const price     = fmtN(row.price * row.qty); // Total price
  const qty       = fmtN(row.qty);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${receiptNo}</title>
  <style>
    ${PDF_BASE_STYLES}
    body { max-width: 400px; margin: 0 auto; padding: 24px; }
    .receipt-box { border: 2px solid #111; border-radius: 4px; padding: 20px; }
    .divider { border: none; border-top: 1px dashed #aaa; margin: 12px 0; }
    .row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px; }
    .row .label { color: #555; }
    .row .value { font-weight: 600; text-align: right; }
    .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-top: 4px; }
    .footer { text-align: center; font-size: 10px; color: #888; margin-top: 16px; }
    .stamp { text-align: center; margin: 14px 0 8px; }
    .stamp span { display: inline-block; border: 2px solid #166534; color: #166534; font-weight: bold; font-size: 13px; padding: 4px 16px; border-radius: 4px; letter-spacing: 1px; transform: rotate(-3deg); }
  </style></head><body>
  <div class="receipt-box">
    <div class="biz-header">
      <h1>${BUSINESS_NAME}</h1>
      <div class="biz-sub">${title} Services</div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:10px;color:#555;margin-bottom:12px;">
      <span><b>Receipt No:</b> ${receiptNo}</span>
      <span><b>Date:</b> ${fmtDate(row.entry_date || row.created_at)}</span>
    </div>
    <div class="row"><span class="label">Client</span><span class="value">${row.client_name || "—"}</span></div>
    <div class="row"><span class="label">Description</span><span class="value">${row.description || "—"}</span></div>
    <div class="row"><span class="label">Quantity</span><span class="value">${row.qty || "—"}</span></div>
    ${qty && price ? `<div class="row"><span class="label">Unit Price</span><span class="value">₦${fmt(row.price)}</span></div>` : ""}
    <hr class="divider"/>
    <div class="total-row"><span>TOTAL</span><span>₦${fmt(price)}</span></div>
    ${row.balance > 0 ? `<div class="row" style="margin-top:6px; color:#c07800;"><span class="label">Balance Due</span><span class="value">₦${fmt(row.balance)}</span></div>` : ""}
    <hr class="divider"/>
    <div class="row"><span class="label">Payment Mode</span><span class="value" style="text-transform: capitalize;">${row.payment_method}</span></div>
    <div class="row"><span class="label">Delivery</span><span class="value" style="text-transform: capitalize;">${row.delivery_method}</span></div>
    ${row.note ? `<div class="row"><span class="label">Note</span><span class="value">${row.note}</span></div>` : ""}
    ${price ? `<div class="stamp"><span>RECEIVED</span></div>` : ""}
    <div class="footer">Thank you for your business!<br/>${BUSINESS_NAME} · ${fmtDate(new Date().toISOString())}</div>
  </div>
  <script>window.onload=()=>window.print()</script>
  </body></html>`;

  openPrintWindow(html);
}

export function exportLedgerPDF({ filteredRows, totalRevenue, totalCop, copRows, filterDate, title }: any) {
  const gross    = totalRevenue - totalCop;
  const rowsHtml = filteredRows.map((r: any) => `<tr>
    <td>${fmtDate(r.entry_date || r.created_at)}</td><td>${r.client_name || "—"}</td><td>${r.description || "—"}</td>
    <td class="right">${r.qty || "—"}</td>
    <td class="right">${r.price ? fmt(r.price) : "—"}</td>
    <td class="right" style="font-weight:bold;">${fmt(r.price * r.qty)}</td>
    <td class="right">${r.balance ? fmt(r.balance) : "—"}</td>
    <td style="text-transform: capitalize;">${r.payment_method}</td><td style="text-transform: capitalize;">${r.delivery_method}</td>
    <td>${r.note || "—"}</td>
  </tr>`).join("");

  const copHtml = copRows.map((r: any) => `<tr>
    <td>${fmtDate(r.entry_date || r.created_at)}</td>
    <td>${r.item || "—"}</td><td>${r.note || "—"}</td>
    <td class="right amber">₦${r.amount ? fmt(r.amount) : "—"}</td>
  </tr>`).join("");

  const today = new Date().toISOString().slice(0, 10);
  
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${BUSINESS_NAME} — ${title} Ledger</title>
  <style>${PDF_BASE_STYLES}</style></head><body>
    <div class="biz-header"><h1>${BUSINESS_NAME}</h1><div class="biz-sub">${title} Services — Sales Ledger</div></div>
    <div class="meta">Exported: ${new Date().toLocaleString("en-GB")} &nbsp;|&nbsp; Entries: ${filteredRows.length}${filterDate ? ` &nbsp;|&nbsp; Date: ${fmtDate(filterDate)}` : ""}</div>
    <div class="summary-grid">
      <div class="sum-card"><div class="lbl">Revenue</div><div class="val">₦${fmt(totalRevenue)}</div></div>
      <div class="sum-card"><div class="lbl">Total COP</div><div class="val amber">₦${fmt(totalCop)}</div></div>
      <div class="sum-card"><div class="lbl">Net Profit</div><div class="val ${gross >= 0 ? "green" : "red"}">₦${fmt(gross)}</div></div>
    </div>
    
    <h2 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;color:#333;">Sales Record</h2>
    <table style="width:100%; border-collapse: collapse; margin-bottom: 24px;"><thead><tr>
      <th>Date</th><th>Client</th><th>Description</th><th class="right">Qty</th>
      <th class="right">Unit Price</th><th class="right">Total</th><th class="right">Balance</th><th>Payment</th><th>Delivery</th><th>Note</th>
    </tr></thead><tbody>${rowsHtml}</tbody>
    <tfoot><tr class="tfoot">
      <td colspan="5">Total Revenue</td>
      <td class="right">₦${fmt(totalRevenue)}</td>
      <td colspan="4"></td>
    </tr></tfoot></table>
    
    <div style="margin-top:20px;">
      <h2 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;color:#333;">Production Cost (COP)</h2>
      <table><thead><tr><th>Date</th><th>Cost Item</th><th>Note</th><th class="right">Amount</th></tr></thead>
      <tbody>${copHtml}</tbody>
      <tfoot><tr class="tfoot"><td colspan="3">Total COP</td><td class="right amber">₦${fmt(totalCop)}</td></tr></tfoot>
      </table>
    </div>
    <script>window.onload=()=>window.print()</script>
  </body></html>`;

  openPrintWindow(html);
}

export function exportPublishingPDF({ filteredRows, catalogue, totalRevenue, totalCop, totalExpenses, filterDate, title }: any) {
  const netProfit = totalRevenue - totalCop - totalExpenses;
  const rowsHtml = filteredRows.map((r: any) => {
    const unitCop = (catalogue[r.description] || { cop: 0 }).cop;
    const tcp = unitCop * (Number(r.qty) || 0);
    return `<tr>
      <td>${fmtDate(r.entry_date || r.created_at)}</td><td>${r.client_name || "—"}</td><td>${r.description || "—"}</td>
      <td class="right">${r.qty || "—"}</td>
      <td class="right font-monospace amber">₦${fmt(tcp)}</td>
      <td class="right">₦${r.price ? fmt(r.price) : "—"}</td>
      <td class="right amber">₦${r.expenses ? fmt(r.expenses) : "0.00"}</td>
      <td class="right">${r.balance ? fmt(r.balance) : "—"}</td>
      <td style="text-transform: capitalize;">${r.payment_method}</td><td style="text-transform: capitalize;">${r.delivery_method}</td>
      <td>${r.note || "—"}</td>
    </tr>`;
  }).join("");

  const today = new Date().toISOString().slice(0, 10);
  
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${BUSINESS_NAME} — ${title} Ledger</title>
  <style>${PDF_BASE_STYLES}</style></head><body>
    <div class="biz-header"><h1>${BUSINESS_NAME}</h1><div class="biz-sub">${title} Services — Sales Ledger</div></div>
    <div class="meta">Exported: ${new Date().toLocaleString("en-GB")} &nbsp;|&nbsp; Entries: ${filteredRows.length}${filterDate ? ` &nbsp;|&nbsp; Date: ${fmtDate(filterDate)}` : ""}</div>
    <div class="summary-grid">
      <div class="sum-card"><div class="lbl">Revenue</div><div class="val">₦${fmt(totalRevenue)}</div></div>
      <div class="sum-card"><div class="lbl">Total COP</div><div class="val amber">₦${fmt(totalCop)}</div></div>
      <div class="sum-card"><div class="lbl">Expenses</div><div class="val amber">₦${fmt(totalExpenses)}</div></div>
      <div class="sum-card"><div class="lbl">Net Profit</div><div class="val ${netProfit >= 0 ? "green" : "red"}">₦${fmt(netProfit)}</div></div>
    </div>
    
    <h2 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;color:#333;">Publishing Records</h2>
    <table style="width:100%; border-collapse: collapse; margin-bottom: 24px;"><thead><tr>
      <th>Date</th><th>Client</th><th>Service</th><th class="right">Qty</th>
      <th class="right amber">Total COP</th><th class="right">Price</th><th class="right amber">Expenses</th><th class="right">Balance</th><th>Payment</th><th>Delivery</th><th>Note</th>
    </tr></thead><tbody>${rowsHtml}</tbody>
    </table>
    
    <script>window.onload=()=>window.print()</script>
  </body></html>`;

  openPrintWindow(html);
}

export function exportSummaryPDF({ byDate, inRange, totalRevenue, totalCop, netProfit, copRows, from, to, title }: any) {
  const dayBlocks = byDate.map(([date, dRows]: any) => {
    const rev = dRows.reduce((s: any, r: any) => s + (fmtN(r.price) * fmtN(r.qty)), 0);
    const rowsHtml = dRows.map((r: any) => `<tr>
      <td>${r.client_name || "—"}</td><td>${r.description || "—"}</td>
      <td class="right">${r.qty || "—"}</td>
      <td class="right">${r.price ? fmt(r.price) : "—"}</td>
      <td class="right" style="font-weight:bold;">${fmt(r.price * r.qty)}</td>
      <td class="right">${r.balance ? fmt(r.balance) : "—"}</td>
      <td style="text-transform: capitalize;">${r.payment_method}</td><td style="text-transform: capitalize;">${r.delivery_method}</td>
      <td>${r.note || "—"}</td>
    </tr>`).join("");
    return `<div style="margin-bottom:18px;page-break-inside:avoid;">
      <div style="background:#1a2535;color:#fff;padding:7px 10px;border-radius:4px 4px 0 0;display:flex;justify-content:space-between;">
        <b>${fmtDate(date)}</b>
        <span style="font-size:10px;">Revenue: ₦${fmt(rev)} · ${dRows.length} entries</span>
      </div>
      <table style="width:100%; border-collapse: collapse; margin-bottom: 24px;">
      <thead>
        <tr>
          <th>Date</th><th>Client Name</th><th>Description</th><th class="right">Qty</th><th class="right">Price (₦)</th><th class="right">Total (₦)</th><th class="right">Balance (₦)</th><th>Payment Mode</th><th>Delivery</th><th>Note</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}</tbody></table>
    </div>`;
  }).join("");

  const copHtml = copRows.map((r: any) => `<tr>
    <td>${fmtDate(r.entry_date || r.created_at)}</td>
    <td>${r.item || "—"}</td><td>${r.note || "—"}</td>
    <td class="right amber">₦${r.amount ? fmt(r.amount) : "—"}</td>
  </tr>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${BUSINESS_NAME} — Summary</title>
  <style>${PDF_BASE_STYLES}</style></head><body>
    <div class="biz-header"><h1>${BUSINESS_NAME}</h1><div class="biz-sub">${title} Services — Summary Report</div></div>
    <div class="meta">Period: ${fmtDate(from)} — ${fmtDate(to)} · ${inRange.length} entries · Generated: ${new Date().toLocaleString("en-GB")}</div>
    <div class="summary-grid">
      <div class="sum-card"><div class="lbl">Revenue</div><div class="val">₦${fmt(totalRevenue)}</div></div>
      <div class="sum-card"><div class="lbl">Total COP</div><div class="val amber">₦${fmt(totalCop)}</div></div>
      <div class="sum-card"><div class="lbl">Net Profit</div><div class="val ${netProfit >= 0 ? "green" : "red"}">₦${fmt(netProfit)}</div></div>
    </div>
    ${dayBlocks}
    <div style="margin-top:20px;">
      <h2 style="font-size:12px;text-transform:uppercase;margin:0 0 6px;">Production Cost (COP)</h2>
      <table><thead><tr><th>Date</th><th>Cost Item</th><th>Note</th><th class="right">Amount</th></tr></thead>
      <tbody>${copHtml}</tbody>
      <tfoot><tr class="tfoot"><td colspan="3">Total COP</td><td class="right amber">₦${fmt(totalCop)}</td></tr></tfoot>
      </table>
    </div>
    <script>window.onload=()=>window.print()</script>
  </body></html>`;
  
  openPrintWindow(html);
}
