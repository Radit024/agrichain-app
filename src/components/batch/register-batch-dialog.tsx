"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Sparkles, CheckCircle2 } from "lucide-react";
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
 * Dialog Daftarkan Batch:
 * - Auto-generate kode batch
 * - Auto-select profil sensor sesuai kategori terpilih
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

  function generateAutoBatchCode() {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const year = new Date().getFullYear();
    setBatchCode(`BATCH-${year}-${randomSuffix}`);
  }

  function handleCategoryChange(catId: string) {
    setCategoryId(catId);
    const cat = categories.find((c) => c.categoryId === catId);
    if (cat && cat.profiles.length > 0) {
      setProfileId(cat.profiles[cat.profiles.length - 1].profileId);
    } else {
      setProfileId("");
    }
  }

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
      <Button
        onClick={() => setOpen(true)}
        className="h-10 gap-2 bg-[#1570EF] hover:bg-[#004EEB] text-white font-medium px-4 rounded-lg shadow-xs cursor-pointer"
      >
        <Plus aria-hidden className="size-4" />
        Daftarkan Batch
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-xl border border-[#F0F1F3] shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1D2939]">
              Daftarkan Batch Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5D6679]">
              Daftarkan batch komoditas pangan untuk menginisiasi rekam jejak rantai pasok dan
              profil pemantauan kondisi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="batch-code" className="text-xs font-semibold text-[#344054]">
                  Kode Batch <span className="text-red-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={generateAutoBatchCode}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1570EF] hover:underline cursor-pointer"
                >
                  <Sparkles className="size-3" />
                  Buat Otomatis
                </button>
              </div>
              <div className="flex gap-2">
                <Input
                  id="batch-code"
                  value={batchCode}
                  onChange={(e) => setBatchCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: BATCH-2026-0008"
                  className="h-9.5 rounded-lg border-[#D0D5DD] font-mono text-xs"
                  aria-required
                />
              </div>
              <p className="text-[11px] text-[#858D9D]">
                Masukkan kode unik atau klik &quot;Buat Otomatis&quot; untuk menghasilkan kode
                standar.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="batch-category" className="text-xs font-semibold text-[#344054]">
                Kategori Produk <span className="text-red-500">*</span>
              </Label>
              <Select
                value={categoryId}
                onValueChange={(v) => handleCategoryChange(v ?? "")}
                disabled={categories.length === 0}
              >
                <SelectTrigger
                  id="batch-category"
                  className="h-9.5 w-full rounded-lg border-[#D0D5DD] text-xs"
                >
                  <SelectValue
                    placeholder={
                      categories.length === 0
                        ? "Tidak ada kategori produk tersedia"
                        : "Pilih kategori produk"
                    }
                  >
                    {selectedCategory
                      ? `${selectedCategory.categoryName} (${selectedCategory.handlingMode === "COLD_CHAIN" ? "Cold Chain" : "Non-Cold Chain"})`
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {categories.length === 0 ? (
                    <div className="py-3 px-2 text-center text-xs text-[#858D9D]">
                      Tidak ada kategori produk tersedia untuk organisasi Anda
                    </div>
                  ) : (
                    categories.map((c) => (
                      <SelectItem key={c.categoryId} value={c.categoryId} className="text-xs">
                        {c.categoryName} (
                        {c.handlingMode === "COLD_CHAIN" ? "Cold Chain" : "Non-Cold Chain"})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {categories.length === 0 && (
                <p className="text-[11px] text-amber-600">
                  Belum ada kategori produk untuk organisasi Anda. Daftarkan kategori produk
                  terlebih dahulu.
                </p>
              )}
            </div>

            {selectedCategory ? (
              <div className="rounded-lg border border-[#D1FADF] bg-[#F6FEF9] p-3 text-xs text-[#027A48] space-y-1.5">
                <div className="flex items-center justify-between font-medium">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-[#12B76A]" />
                    <span>Profil Sensor Otomatis Terpilih</span>
                  </div>
                  <span className="rounded bg-[#ECFDF3] px-2 py-0.5 text-[10px] font-semibold text-[#027A48]">
                    {selectedCategory.handlingMode === "COLD_CHAIN" ? "Cold Chain" : "Standar"}
                  </span>
                </div>
                <p className="text-[11px] text-[#05603A]">
                  Batas toleransi suhu dan kualitas data disesuaikan otomatis dengan standar
                  kategori <span className="font-semibold">{selectedCategory.categoryName}</span>.
                </p>

                {selectedCategory.profiles.length > 1 && (
                  <details className="mt-1 text-[11px] text-[#05603A]/75 cursor-pointer">
                    <summary className="hover:underline">
                      Pilih versi profil manual (lanjutan)
                    </summary>
                    <div className="pt-2">
                      <Select value={profileId} onValueChange={(v) => setProfileId(v ?? "")}>
                        <SelectTrigger className="h-8 text-xs bg-white text-[#344054]">
                          <SelectValue placeholder="Pilih versi">
                            {selectedCategory.profiles.find((p) => p.profileId === profileId)
                              ? `Versi ${selectedCategory.profiles.find((p) => p.profileId === profileId)!.version}`
                              : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          {selectedCategory.profiles.map((p) => (
                            <SelectItem key={p.profileId} value={p.profileId} className="text-xs">
                              Versi {p.version}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </details>
                )}
              </div>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-[#FEE2E2] bg-[#FFF1F2] px-3 py-2 text-xs text-[#E11D48]"
              >
                <X aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-[#F0F1F3]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="h-10 px-4 rounded-lg border-[#D0D5DD] text-[#5D6679] hover:bg-gray-50"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={pending || !categoryId || !profileId || batchCode.trim().length < 3}
              className="h-10 px-5 rounded-lg bg-[#1570EF] hover:bg-[#004EEB] text-white font-medium shadow-xs"
            >
              {pending ? "Mendaftarkan..." : "Daftarkan Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
