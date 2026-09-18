"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Shield, ChevronDown, Check, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type RoleOption = "PRODUCER_ADMIN" | "DISTRIBUTOR_ADMIN" | "RETAILER_ADMIN" | "FACTORY_STAFF";

interface RoleMeta {
  role: RoleOption;
  title: string;
  name: string;
  org: string;
  badge: string;
  desc: string;
}

const ROLES: RoleMeta[] = [
  {
    role: "PRODUCER_ADMIN",
    title: "Admin Produsen (Rekomendasi Showcase)",
    name: "Budi Pratama",
    org: "PT Agrichain Prima Agro",
    badge: "Full Access",
    desc: "Akses pendaftaran batch, ringkasan metrik dasbor, telemetri IoT, audit trail blockchain, dan laporan kepatuhan.",
  },
  {
    role: "DISTRIBUTOR_ADMIN",
    title: "Admin Distributor",
    name: "Siti Rahma",
    org: "PT Sentral Logistik Rantai Dingin",
    badge: "Logistik",
    desc: "Akses penerimaan batch, pengelolaan DC Jakarta/Surabaya/Bandung, dan inisiasi handoff ke retailer.",
  },
  {
    role: "RETAILER_ADMIN",
    title: "Store Manager Retailer",
    name: "Hendra Wijaya",
    org: "Segar Mart Retail Indonesia",
    badge: "Retail",
    desc: "Akses konfirmasi penerimaan batch di gerai toko Segar Mart Flagship & Kelapa Gading.",
  },
  {
    role: "FACTORY_STAFF",
    title: "Petugas Pabrik / QC",
    name: "Ahmad Fauzi",
    org: "PT Agrichain Prima Agro",
    badge: "Operasional",
    desc: "Akses pendaftaran batch fisik di line produksi pabrik dan pencatatan parameter.",
  },
];

export function DemoLoginCard() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<RoleOption>("PRODUCER_ADMIN");
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(false);

  const activeMeta = ROLES.find((r) => r.role === selectedRole) || ROLES[0];

  const handleDemoLogin = async (roleToUse: RoleOption = selectedRole) => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: roleToUse }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal masuk akun demo");
      }

      toast.success("Berhasil masuk akun demo!", {
        description: `Masuk sebagai ${data.user?.name ?? "Akun Demo"} (${data.user?.org ?? ""})`,
      });

      // Gunakan window.location.href agar browser melakukan full request dengan cookie sesi yang baru
      window.location.href = data.redirect || "/mainapp/dashboard";
    } catch (err) {
      console.error(err);
      toast.error("Gagal masuk ke akun demo", {
        description: "Pastikan server berjalan normal.",
      });
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-b from-blue-50/70 to-indigo-50/40 p-4 shadow-sm">
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-blue-100">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-600/10 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
          <Sparkles className="size-3.5 text-blue-600 animate-pulse" />
          <span>Akun Demo Showcase</span>
        </div>
        <span className="text-[11px] font-medium text-blue-700/80">Full Data Skripsi</span>
      </div>

      {/* Selected Account Info */}
      <div className="mt-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{activeMeta.name}</h3>
            <p className="text-xs font-medium text-blue-700">{activeMeta.org}</p>
          </div>
          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
            {activeMeta.badge}
          </span>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-gray-600">{activeMeta.desc}</p>
      </div>

      {/* Primary Action Button */}
      <Button
        type="button"
        disabled={loading}
        onClick={() => void handleDemoLogin(selectedRole)}
        className="mt-3.5 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm transition-all duration-150 active:scale-[0.99] cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            <span>Menyiapkan Sesi Demo…</span>
          </>
        ) : (
          <>
            <span>Masuk Sekarang (1-Klik)</span>
            <ArrowRight className="size-3.5" />
          </>
        )}
      </Button>

      {/* Switch Role Trigger */}
      <div className="mt-2.5 pt-2 border-t border-blue-100/80">
        <button
          type="button"
          onClick={() => setShowOptions(!showOptions)}
          className="flex w-full items-center justify-between text-[11px] font-medium text-gray-600 hover:text-blue-700 py-1 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Shield className="size-3 text-blue-600" />
            <span>Ganti peran demo ({ROLES.length} pilihan tersedia)</span>
          </span>
          <ChevronDown
            className={`size-3.5 transition-transform duration-200 ${showOptions ? "rotate-180" : ""}`}
          />
        </button>

        {showOptions && (
          <div className="mt-2 space-y-1.5 pt-1">
            {ROLES.map((r) => {
              const isCurrent = r.role === selectedRole;
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => {
                    setSelectedRole(r.role);
                    setShowOptions(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg p-2 text-left text-xs transition-all ${
                    isCurrent
                      ? "bg-white border border-blue-300 font-semibold text-blue-900 shadow-2xs"
                      : "bg-white/60 hover:bg-white border border-transparent text-gray-700 hover:border-gray-200"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-gray-900 truncate">{r.name}</span>
                      <span className="text-[10px] text-gray-500">• {r.badge}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 truncate">{r.org}</p>
                  </div>
                  {isCurrent && <Check className="size-3.5 text-blue-600 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
