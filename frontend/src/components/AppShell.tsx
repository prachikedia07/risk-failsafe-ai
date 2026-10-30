"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const links = [
  { href: "/", label: "Overview" },
  { href: "/transactions", label: "Transactions" },
  { href: "/alerts", label: "Risk alerts" },
  { href: "/evaluation", label: "Evaluation" },
  { href: "/test-payments", label: "Test payments" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#050505] text-[#e8e6df] md:flex">
      <aside className="border-b border-[#252525] bg-[#050505] p-4 md:fixed md:inset-y-0 md:w-[210px] md:border-b-0 md:border-r md:p-5">
        <Link href="/" className="block">
          <span className="block text-sm font-semibold tracking-tight">
            RiskFailsafe AI
          </span>
          <span className="mt-1 block text-[9px] tracking-[0.16em] text-[#666666]">
            PAYMENT RISK MONITORING
          </span>
        </Link>

        <nav className="mt-8 flex gap-1 overflow-x-auto md:flex-col">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 border-l-2 px-3 py-2 text-xs transition ${
                  active
                    ? "border-[#a99a62] text-[#e8e6df]"
                    : "border-transparent text-[#929292] hover:text-[#e8e6df]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 border-t border-[#252525] pt-4 text-[10px] text-[#666666]">
          Razorpay test mode
        </div>
      </aside>

      <main className="min-w-0 flex-1 md:ml-[210px]">
        <header className="flex min-h-[52px] items-center justify-between border-b border-[#252525] px-5 md:px-8">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#666666]">
            Risk operations
          </p>
          <span className="border border-[#252525] px-2 py-1 text-[9px] tracking-[0.12em] text-[#a99a62]">
            TEST MODE
          </span>
        </header>

        <div className="mx-auto w-full max-w-[1500px] p-5 md:p-8">{children}</div>
      </main>
    </div>
  );
}