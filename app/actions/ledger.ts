"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

// ── SALES LEDGER ACTIONS ──────────────────────────────────────────────────────
export async function addLedgerEntry(tableName: string, data: any) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const role = session.user.role;
  const allowedTable = `${role}_ledger`;
  
  if (role !== "super_admin" && tableName !== allowedTable) {
    throw new Error("Forbidden");
  }

  const mappedData = {
    entry_date: data.entryDate || data.entry_date,
    client_name: data.clientName || data.client_name,
    description: data.description,
    qty: data.qty,
    price: data.price,
    balance: data.balance,
    payment_method: data.paymentMethod || data.payment_method,
    delivery_method: data.deliveryMethod || data.delivery_method,
    created_by: session.user.id,
    ...(data.expenses !== undefined && { expenses: data.expenses }),
    ...(data.note !== undefined && { note: data.note }),
  };

  const { error } = await supabase
    .from(tableName)
    .insert([mappedData]);

  if (error) {
    console.error("Supabase insert error:", error);
    throw new Error("Failed to add entry");
  }

  revalidatePath(`/${tableName.replace('_ledger', '').replace('_', '-')}`);
}

export async function updateLedgerEntry(tableName: string, id: string, data: any) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const role = session.user.role;
  const allowedTable = `${role}_ledger`;
  
  if (role !== "super_admin" && tableName !== allowedTable) {
    throw new Error("Forbidden");
  }

  const mappedData = {
    ...(data.entryDate && { entry_date: data.entryDate }),
    ...(data.clientName && { client_name: data.clientName }),
    ...(data.description && { description: data.description }),
    ...(data.qty !== undefined && { qty: data.qty }),
    ...(data.price !== undefined && { price: data.price }),
    ...(data.balance !== undefined && { balance: data.balance }),
    ...(data.expenses !== undefined && { expenses: data.expenses }),
    ...(data.paymentMethod && { payment_method: data.paymentMethod }),
    ...(data.deliveryMethod && { delivery_method: data.deliveryMethod }),
    ...(data.note !== undefined && { note: data.note }),
  };

  const { error } = await supabase
    .from(tableName)
    .update(mappedData)
    .eq('id', id);

  if (error) {
    console.error("Supabase update error:", error);
    throw new Error("Failed to update entry");
  }

  revalidatePath(`/${tableName.replace('_ledger', '').replace('_', '-')}`);
}

export async function deleteLedgerEntry(tableName: string, id: string) {
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
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Supabase delete error:", error);
    throw new Error("Failed to delete entry");
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

export async function deleteCopEntry(tableName: string, id: string) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const role = session.user.role;
  const copTableName = tableName.replace('_ledger', '_cop');
  const allowedTable = `${role}_cop`;
  
  if (role !== "super_admin" && copTableName !== allowedTable) {
    throw new Error("Forbidden");
  }

  const { error } = await supabase
    .from(copTableName)
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Supabase delete COP error:", error);
    throw new Error("Failed to delete COP entry");
  }

  revalidatePath(`/${tableName.replace('_ledger', '').replace('_', '-')}`);
}
