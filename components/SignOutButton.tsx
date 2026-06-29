"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="px-6 py-2.5 bg-gray-100 text-primary font-medium rounded-xl hover:bg-gray-200 transition-colors shadow-sm"
    >
      Sign Out
    </button>
  );
}
