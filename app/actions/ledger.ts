"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function addLedgerEntry(tableName: string, data: {
  entryDate: string;
  clientName: string;
  description: string;
  qty: number;
  price: number;
  paymentMethod: string;
  deliveryMethod: string;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  // Basic validation that user can only write to their own ledger unless super_admin
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
        delivery_method: data.deliveryMethod,
        created_by: session.user.id
      }
    ]);

  if (error) {
    console.error("Supabase insert error:", error);
    throw new Error("Failed to add entry");
  }

  revalidatePath(`/${tableName.replace('_ledger', '').replace('_', '-')}`);
}
