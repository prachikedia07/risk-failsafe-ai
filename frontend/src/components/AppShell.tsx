"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const links = [
  { href: "/", label: "Overview", icon: "◫" },
  { href: "/transactions", label: "Transactions", icon: "↔" },
  { href: "/alerts", label: "Risk alerts", icon: "⚑" },
  { href: "/test-payments", label: "Test payments", icon: "+" },
];

export default function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 md:flex">
      <aside className="border-b border-white/10 bg-[#0d1017] p-5 md:fixed md:inset-y-0 md:w-64 md:border-b-0 md:border-r">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300 font-black text-slate-950">
            R
          </span>

          <span>
            <span className="block font-semibold">
              RiskFailsafe
            </span>
            <span className="text-xs text-slate-500">
              PAYMENT INTELLIGENCE
            </span>
          </span>
        </Link>

        <p className="mt-8 text-xs uppercase tracking-widest text-slate-600">
          Workspace
        </p>

        <nav className="mt-3 flex gap-2 overflow-x-auto md:flex-col">
          {links.map((link) => {
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm ${
                  active
                    ? "bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-300/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="w-5 text-center">
                  {link.icon}
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 rounded-xl border border-white/10 p-4 text-xs text-slate-500">
          Local workspace
          <p className="mt-2">
            Razorpay Test Mode · Payment risk monitoring
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 md:ml-64">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-9">
          <div>
            <p className="text-xs text-slate-500">
              RISK OPERATIONS / DEMO ENVIRONMENT
            </p>
            <p className="mt-1 text-sm text-slate-300">
              Payment activity & risk signals
            </p>
          </div>

          <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs text-amber-200">
            TEST MODE
          </span>
        </header>

        <div className="p-5 md:p-9">{children}</div>
      </main>
    </div>
  );
}