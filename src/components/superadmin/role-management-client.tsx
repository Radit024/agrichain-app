"use client";

import { useState, useTransition } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Search,
  Plus,
  Copy,
  Check,
  Building2,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  UserRoleItem,
  UserRoleMetrics,
  OrganizationOption,
} from "@/server/queries/user-roles";
import {
  assignUserRole,
  removeUserMembership,
  updateUserStatus,
  directCreateOrGrantUser,
} from "@/server/actions/superadmin-roles";

interface Props {
  initialUsers: UserRoleItem[];
  metrics: UserRoleMetrics;
  organizations: OrganizationOption[];
}

const ROLE_LABELS: Record<string, { label: string; badge: string }> = {
  PRODUCER_ADMIN: {
    label: "Admin Produsen",
    badge: "bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]",
  },
  FACTORY_STAFF: {
    label: "Petugas Pabrik",
    badge: "bg-[#F0F9FF] text-[#026AA2] border-[#B9E6FE]",
  },
  DISTRIBUTOR_ADMIN: {
    label: "Admin Distributor",
    badge: "bg-[#F9F5FF] text-[#6941C6] border-[#E9D7FE]",
  },
  RETAILER_ADMIN: {
    label: "Admin Retailer",
    badge: "bg-[#ECFDF3] text-[#027A48] border-[#A6F4C5]",
  },
  CONTRACT_ADMIN: {
    label: "Admin Kontrak/Sistem",
    badge: "bg-[#FFF1F3] text-[#C01048] border-[#FCCEEE]",
  },
};

export function RoleManagementClient({ initialUsers, metrics, organizations }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrgFilter, setSelectedOrgFilter] = useState("ALL");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRoleItem | null>(null);
  const [isPending, startTransition] = useTransition();

  // Add User Form State
  const [newDid, setNewDid] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newWallet, setNewWallet] = useState("");
  const [newOrgId, setNewOrgId] = useState(organizations[0]?.id ?? "");
  const [newRole, setNewRole] = useState<keyof typeof ROLE_LABELS>("PRODUCER_ADMIN");

  // Edit Role Form State
  const [editOrgId, setEditOrgId] = useState("");
  const [editRole, setEditRole] = useState<keyof typeof ROLE_LABELS>("PRODUCER_ADMIN");

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Disalin ke clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Filtered Users
  const filteredUsers = initialUsers.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      u.displayName.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.privyDid.toLowerCase().includes(q) ||
      (u.walletAddress && u.walletAddress.toLowerCase().includes(q));

    const matchOrg =
      selectedOrgFilter === "ALL" || u.memberships.some((m) => m.orgId === selectedOrgFilter);

    const matchRole =
      selectedRoleFilter === "ALL" || u.memberships.some((m) => m.role === selectedRoleFilter);

    const matchStatus = selectedStatusFilter === "ALL" || u.status === selectedStatusFilter;

    return matchSearch && matchOrg && matchRole && matchStatus;
  });

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newDid.trim() || !newName.trim() || !newOrgId) {
      toast.error("Mohon lengkapi DID, Nama, dan Organisasi.");
      return;
    }

    startTransition(async () => {
      const res = await directCreateOrGrantUser({
        privyDid: newDid.trim(),
        displayName: newName.trim(),
        email: newEmail.trim() || undefined,
        walletAddress: newWallet.trim() || undefined,
        orgId: newOrgId,
        role: newRole,
      });

      if (res.ok) {
        toast.success("Pengguna dan peran berhasil didaftarkan!");
        setIsAddModalOpen(false);
        setNewDid("");
        setNewName("");
        setNewEmail("");
        setNewWallet("");
      } else {
        toast.error(res.error || "Gagal mendaftarkan pengguna.");
      }
    });
  }

  function openEditModal(user: UserRoleItem) {
    setEditingUser(user);
    const existingMembership = user.memberships[0];
    if (existingMembership) {
      setEditOrgId(existingMembership.orgId);
      setEditRole(existingMembership.role);
    } else {
      setEditOrgId(organizations[0]?.id ?? "");
      setEditRole("PRODUCER_ADMIN");
    }
  }

  async function handleSaveRole(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser || !editOrgId) return;

    startTransition(async () => {
      const res = await assignUserRole({
        userId: editingUser.id,
        orgId: editOrgId,
        role: editRole,
      });

      if (res.ok) {
        toast.success("Peran berhasil diperbarui!");
        setEditingUser(null);
      } else {
        toast.error(res.error || "Gagal memperbarui peran.");
      }
    });
  }

  async function handleRemoveMembership(membershipId: string, userId: string) {
    if (!confirm("Hapus penugasan organisasi ini dari pengguna?")) return;

    startTransition(async () => {
      const res = await removeUserMembership({ membershipId, userId });
      if (res.ok) {
        toast.success("Penugasan peran dihapus.");
        setEditingUser(null);
      } else {
        toast.error(res.error || "Gagal menghapus penugasan.");
      }
    });
  }

  async function handleToggleStatus(user: UserRoleItem, targetStatus: "ACTIVE" | "REVOKED") {
    startTransition(async () => {
      const res = await updateUserStatus({
        userId: user.id,
        status: targetStatus,
      });

      if (res.ok) {
        toast.success(
          targetStatus === "ACTIVE"
            ? `Akun ${user.displayName} diaktifkan.`
            : `Akses akun ${user.displayName} dicabut.`,
        );
      } else {
        toast.error(res.error || "Gagal mengubah status.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#102A33]">
              Manajemen Peran & Akses
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF8FF] px-2.5 py-0.5 text-xs font-semibold text-[#175CD3] border border-[#B2DDFF]">
              <ShieldCheck className="size-3.5" />
              Superadmin
            </span>
          </div>
          <p className="text-xs text-[#587078] mt-1">
            Kelola identitas pengguna terdaftar, penugasan organisasi, serta tingkat otorisasi
            sistem.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1570EF] hover:bg-[#004EEB] active:scale-95 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-all duration-150 cursor-pointer"
        >
          <Plus className="size-4" />
          <span>Tambah / Beri Akses Pengguna</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-[#D6E2DF] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#587078]">Total Pengguna</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#F0FDF9] text-[#0F5965]">
              <Users className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-[#102A33]">
            {metrics.totalUsers}
          </div>
        </div>

        <div className="rounded-xl border border-[#D6E2DF] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#587078]">Pengguna Aktif</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#ECFDF3] text-[#027A48]">
              <UserCheck className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-[#027A48]">
            {metrics.activeUsers}
          </div>
        </div>

        <div className="rounded-xl border border-[#D6E2DF] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#587078]">Menunggu Aktivasi</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#FFF0D4] text-[#B86B00]">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-[#B86B00]">
            {metrics.pendingUsers}
          </div>
        </div>

        <div className="rounded-xl border border-[#D6E2DF] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#587078]">Akses Dicabut</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#FDE7E5] text-[#B42318]">
              <UserX className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-[#B42318]">
            {metrics.revokedUsers}
          </div>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-[#D6E2DF] bg-white p-3 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#858D9D]" />
          <input
            type="text"
            placeholder="Cari nama, email, DID, atau wallet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[#D6E2DF] bg-[#F5F8F7] pl-9 pr-4 py-1.5 text-xs text-[#102A33] placeholder:text-[#858D9D] focus:border-[#1570EF] focus:bg-white focus:outline-none transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Org Filter */}
          <select
            value={selectedOrgFilter}
            onChange={(e) => setSelectedOrgFilter(e.target.value)}
            className="rounded-lg border border-[#D6E2DF] bg-white px-3 py-1.5 text-xs font-medium text-[#102A33] focus:border-[#1570EF] focus:outline-none"
          >
            <option value="ALL">Semua Organisasi</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="rounded-lg border border-[#D6E2DF] bg-white px-3 py-1.5 text-xs font-medium text-[#102A33] focus:border-[#1570EF] focus:outline-none"
          >
            <option value="ALL">Semua Peran</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="rounded-lg border border-[#D6E2DF] bg-white px-3 py-1.5 text-xs font-medium text-[#102A33] focus:border-[#1570EF] focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif (ACTIVE)</option>
            <option value="PENDING_INVITE">Menunggu (PENDING)</option>
            <option value="REVOKED">Dicabut (REVOKED)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-[#D6E2DF] bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#D6E2DF] bg-[#F5F8F7] text-[#587078]">
                <th className="py-3 px-4 font-semibold">Pengguna</th>
                <th className="py-3 px-4 font-semibold">Kredensial DID / Wallet</th>
                <th className="py-3 px-4 font-semibold">Organisasi & Peran</th>
                <th className="py-3 px-4 font-semibold">Status Akun</th>
                <th className="py-3 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D6E2DF]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#587078]">
                    Tidak ada pengguna yang cocok dengan kriteria pencarian/filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[#F9FAFB]/80 transition-colors">
                    {/* Nama & Email */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#DCEFF0] text-[#0F5965] font-bold text-xs">
                          {user.displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-[#102A33]">{user.displayName}</div>
                          <div className="text-[11px] text-[#587078]">
                            {user.email || "Tanpa email"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* DID & Wallet */}
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[#102A33] truncate max-w-[140px]"
                          title={user.privyDid}
                        >
                          {user.privyDid}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(user.privyDid, `did-${user.id}`)}
                          className="text-[#858D9D] hover:text-[#102A33] cursor-pointer"
                          title="Salin DID"
                        >
                          {copiedId === `did-${user.id}` ? (
                            <Check className="size-3 text-[#16794A]" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>

                      {user.walletAddress && (
                        <div className="flex items-center gap-1.5 text-[#587078] mt-0.5">
                          <span className="truncate max-w-[140px]" title={user.walletAddress}>
                            {user.walletAddress}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(user.walletAddress!, `w-${user.id}`)}
                            className="text-[#858D9D] hover:text-[#102A33] cursor-pointer"
                            title="Salin Wallet"
                          >
                            {copiedId === `w-${user.id}` ? (
                              <Check className="size-3 text-[#16794A]" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Memberships & Roles */}
                    <td className="py-3.5 px-4">
                      {user.memberships.length === 0 ? (
                        <span className="inline-block text-[11px] italic text-[#858D9D]">
                          Belum ditugaskan ke organisasi
                        </span>
                      ) : (
                        <div className="space-y-1.5">
                          {user.memberships.map((m) => {
                            const conf = ROLE_LABELS[m.role] ?? {
                              label: m.role,
                              badge: "bg-gray-100 text-gray-700 border-gray-300",
                            };
                            return (
                              <div key={m.id} className="flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#102A33]">
                                  <Building2 className="size-3 text-[#587078]" />
                                  {m.orgName}
                                </span>
                                <span
                                  className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                    conf.badge,
                                  )}
                                >
                                  {conf.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {user.status === "ACTIVE" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#DDF3E6] text-[#16794A] px-2.5 py-0.5 text-[11px] font-semibold border border-[#A6F4C5]">
                          <CheckCircle2 className="size-3" />
                          Aktif
                        </span>
                      )}
                      {user.status === "PENDING_INVITE" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF0D4] text-[#B86B00] px-2.5 py-0.5 text-[11px] font-semibold border border-[#FEDF89]">
                          <Clock className="size-3" />
                          Menunggu Aktivasi
                        </span>
                      )}
                      {user.status === "REVOKED" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FDE7E5] text-[#B42318] px-2.5 py-0.5 text-[11px] font-semibold border border-[#FECDCA]">
                          <AlertTriangle className="size-3" />
                          Dicabut
                        </span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#D6E2DF] bg-white px-2.5 py-1 text-xs font-medium text-[#102A33] hover:bg-[#F5F8F7] active:scale-95 transition-all cursor-pointer"
                        >
                          <Edit3 className="size-3 text-[#1570EF]" />
                          <span>Atur Peran</span>
                        </button>

                        {user.status !== "ACTIVE" ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleToggleStatus(user, "ACTIVE")}
                            className="inline-flex items-center rounded-lg border border-[#A6F4C5] bg-[#ECFDF3] px-2.5 py-1 text-xs font-semibold text-[#027A48] hover:bg-[#D1FADF] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                          >
                            Aktifkan
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleToggleStatus(user, "REVOKED")}
                            className="inline-flex items-center rounded-lg border border-[#FECDCA] bg-[#FEF3F2] px-2.5 py-1 text-xs font-semibold text-[#B42318] hover:bg-[#FEE4E2] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                          >
                            Cabut Akses
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah / Beri Akses Pengguna */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#D6E2DF] bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#D6E2DF] pb-4">
              <h3 className="text-base font-bold text-[#102A33]">Tambah / Beri Akses Pengguna</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#858D9D] hover:text-[#102A33] cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-[#102A33] mb-1">
                  Privy DID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="did:privy:cl..."
                  value={newDid}
                  onChange={(e) => setNewDid(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[#D6E2DF] px-3 py-2 text-xs font-mono text-[#102A33] focus:border-[#1570EF] focus:outline-none"
                />
                <p className="text-[10px] text-[#587078] mt-1">
                  Dapat disalin dari dashboard Privy pengguna atau hasil autentikasi.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#102A33] mb-1">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Raditya Pratama"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[#D6E2DF] px-3 py-2 text-xs text-[#102A33] focus:border-[#1570EF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#102A33] mb-1">Email</label>
                <input
                  type="email"
                  placeholder="user@perusahaan.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-lg border border-[#D6E2DF] px-3 py-2 text-xs text-[#102A33] focus:border-[#1570EF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#102A33] mb-1">
                  Wallet Address (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={newWallet}
                  onChange={(e) => setNewWallet(e.target.value)}
                  className="w-full rounded-lg border border-[#D6E2DF] px-3 py-2 text-xs font-mono text-[#102A33] focus:border-[#1570EF] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#102A33] mb-1">
                    Organisasi <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newOrgId}
                    onChange={(e) => setNewOrgId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-[#D6E2DF] bg-white px-3 py-2 text-xs text-[#102A33] focus:border-[#1570EF] focus:outline-none"
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#102A33] mb-1">
                    Peran <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as keyof typeof ROLE_LABELS)}
                    required
                    className="w-full rounded-lg border border-[#D6E2DF] bg-white px-3 py-2 text-xs text-[#102A33] focus:border-[#1570EF] focus:outline-none"
                  >
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#D6E2DF]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-[#D6E2DF] px-4 py-2 text-xs font-semibold text-[#587078] hover:bg-[#F5F8F7] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-[#1570EF] hover:bg-[#004EEB] px-4 py-2 text-xs font-semibold text-white shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? "Menyimpan…" : "Simpan & Aktifkan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ubah / Atur Peran */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#D6E2DF] bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#D6E2DF] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#102A33]">Atur Penugasan Peran</h3>
                <p className="text-xs text-[#587078]">{editingUser.displayName}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-[#858D9D] hover:text-[#102A33] cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-[#102A33] mb-1">
                  Pilih Organisasi
                </label>
                <select
                  value={editOrgId}
                  onChange={(e) => setEditOrgId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[#D6E2DF] bg-white px-3 py-2 text-xs text-[#102A33] focus:border-[#1570EF] focus:outline-none"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.kind})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#102A33] mb-1">
                  Peran pada Organisasi Tersebut
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as keyof typeof ROLE_LABELS)}
                  required
                  className="w-full rounded-lg border border-[#D6E2DF] bg-white px-3 py-2 text-xs text-[#102A33] focus:border-[#1570EF] focus:outline-none"
                >
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Daftar Penugasan Saat Ini */}
              {editingUser.memberships.length > 0 && (
                <div className="rounded-lg bg-[#F5F8F7] p-3 border border-[#D6E2DF]">
                  <span className="block text-[11px] font-semibold text-[#587078] mb-2">
                    Penugasan Saat Ini:
                  </span>
                  <div className="space-y-2">
                    {editingUser.memberships.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between text-xs bg-white p-2 rounded-md border border-[#D6E2DF]"
                      >
                        <div>
                          <div className="font-medium text-[#102A33]">{m.orgName}</div>
                          <div className="text-[10px] text-[#587078]">
                            {ROLE_LABELS[m.role]?.label ?? m.role}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMembership(m.id, editingUser.id)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                          title="Hapus penugasan ini"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-[#D6E2DF]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-lg border border-[#D6E2DF] px-4 py-2 text-xs font-semibold text-[#587078] hover:bg-[#F5F8F7] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-[#1570EF] hover:bg-[#004EEB] px-4 py-2 text-xs font-semibold text-white shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? "Menyimpan…" : "Simpan Penugasan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
