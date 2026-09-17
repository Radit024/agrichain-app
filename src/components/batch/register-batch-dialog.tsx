"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uiRegisterBatch } from "@/server/actions/ui-actions";

export interface CategoryOption {
  categoryId: string;
  categoryName: string;
  handlingMode: "COLD_CHAIN" | "NON_COLD_CHAIN";
  profiles: Array<{ profileId: string; version: number }>;
}

/**
 * Dialog Daftarkan Batch (DESIGN.md: modal 500px — identitas batch,
 * produk/kategori+profil, jumlah). Snapshot profil diambil otomatis
 * dari profil yang dipilih.
 */
export function RegisterBatchDialog({
  categories,
  custodianWallet,
}: {
  categories: CategoryOption[];
  custodianWallet: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string>("");
  const [profileId, setProfileId] = useState<string>("");
  const [batchCode, setBatchCode] = useState("");

  const selectedCategory = useMemo(
    () => categories.find((c) => c.categoryId === categoryId),
    [categories, categoryId],
  );

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await uiRegisterBatch({
        categoryId,
        profileId,
        batchCode: batchCode.trim().toUpperCase(),
        custodianWallet: custodianWallet ?? "",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setCategoryId("");
      setProfileId("");
      setBatchCode("");
      router.push(`/mainapp/batch/${result.data.batchId}`);
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="shrink-0">
        <Plus aria-hidden className="size-4" />
        Daftarkan batch
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Daftarkan Batch</DialogTitle>
            <DialogDescription>
              Identitas batch akan dipasangkan dengan catatan digital dan riwayat audit akan dibuat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="batch-code">Kode batch</Label>
              <Input
                id="batch-code"
                value={batchCode}
                onChange={(e) => setBatchCode(e.target.value)}
                placeholder="BATCH-2026-0001"
                className="font-mono uppercase"
                aria-required
              />
              <p className="text-xs text-ink-muted">
                Huruf besar, angka, dan strip. Wajib, 3–40 karakter.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="batch-category">Kategori produk</Label>
              <Select
                value={categoryId}
                onValueChange={(v) => {
                  setCategoryId(v ?? "");
                  setProfileId("");
                }}
              >
                <SelectTrigger id="batch-category" aria-required>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.categoryId} value={c.categoryId}>
                      {c.categoryName} (
                      {c.handlingMode === "COLD_CHAIN" ? "cold chain" : "non-cold"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="batch-profile">Profil monitoring</Label>
              <Select
                value={profileId}
                onValueChange={(v) => setProfileId(v ?? "")}
                disabled={!selectedCategory}
              >
                <SelectTrigger id="batch-profile" aria-required>
                  <SelectValue
                    placeholder={selectedCategory ? "Pilih versi profil" : "Pilih kategori dulu"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {selectedCategory?.profiles.map((p) => (
                    <SelectItem key={p.profileId} value={p.profileId}>
                      Versi {p.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-ink-muted">
                Snapshot profil disimpan permanen untuk batch ini.
              </p>
            </div>

            <p className="rounded-lg bg-surface-muted px-3 py-2.5 text-xs leading-4 text-ink-muted">
              Wallet kustodian yang akan dicatat:{" "}
              <span className="font-mono text-ink">
                {custodianWallet
                  ? `${custodianWallet.slice(0, 10)}…${custodianWallet.slice(-8)}`
                  : "belum tersedia — lengkapi profil Anda di /pengaturan"}
              </span>
            </p>

            {error ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs leading-4 text-danger"
              >
                <X aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button
              onClick={submit}
              disabled={pending || !categoryId || !profileId || batchCode.trim().length < 3}
            >
              {pending ? "Mendaftarkan…" : "Daftarkan batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
