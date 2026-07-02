"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

// ── SALES LEDGER ACTIONS ──────────────────────────────────────────────────────
export async function addLedgerEntry(tableName: string, data: {
  entryDate: string;
  clientName: string;
  description: string;
  qty: number;
  price: number;
  paymentMethod: string;
  balance: number;
  deliveryMethod: string;
  note: string;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const role = session.user.role;
  const allowedTable = `${role}_ledger`;
  
  if (role !== "super_admin" && tableName !== allowedTable) {
    throw new Error("Forbidden");
  }

  const { error } = await supabase
    .from(tableName)
    .insert([
      {
        entry_date: data.entryDate,
        client_name: data.clientName,
        description: data.description,
        qty: data.qty,
        price: data.price,
        payment_method: data.paymentMethod,
        balance: data.balance,
        delivery_method: data.deliveryMethod,
        note: data.note,
        created_by: session.user.id
      }
    ]);

  if (error) {
    console.error("Supabase insert error:", error);
    throw new Error("Failed to add entry");
  }

  revalidatePath(`/${tableName.replace('_ledger', '').replace('_', '-')}`);
}

// ── COP ACTIONS ───────────────────────────────────────────────────────────────
export async function addCopEntry(tableName: string, data: {
  entryDate: string;
  item: string;
  note: string;
  amount: number;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const role = session.user.role;
  const expectedCopTable = `${tableName}_cop`; // e.g. if tableName is publishing_ledger -> publishing_ledger_cop? No. 
  // Let's pass the base name to this function, or infer the cop table name.
  // Actually, we pass tableName as "publishing_ledger" so we need to replace "_ledger" with "_cop"
  
  const copTableName = tableName.replace('_ledger', '_cop');
  const allowedTable = `${role}_cop`;

  if (role !== "super_admin" && copTableName !== allowedTable) {
    throw new Error("Forbidden");
  }

  const { error } = await supabase
    .from(copTableName)
    .insert([
      {
        entry_date: data.entryDate,
        item: data.item,
        note: data.note,
        amount: data.amount,
        created_by: session.user.id
      }
    ]);

  if (error) {
    console.error("Supabase insert COP error:", error);
    throw new Error("Failed to add COP entry");
  }

  revalidatePath(`/${tableName.replace('_ledger', '').replace('_', '-')}`);
}
