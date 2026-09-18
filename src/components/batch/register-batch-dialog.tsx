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
              <Label htmlFor="batch-code" className="text-xs font-semibold text-[#344054]">
                Kode Batch <span className="text-red-500">*</span>
              </Label>
              <Input
                id="batch-code"
                value={batchCode}
                onChange={(e) => setBatchCode(e.target.value.toUpperCase())}
                placeholder="Contoh: BATCH-2026-0008"
                className="h-9.5 rounded-lg border-[#D0D5DD] font-mono"
                aria-required
              />
              <p className="text-[11px] text-[#858D9D]">
                Gunakan kombinasi huruf besar, angka, dan tanda strip.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="batch-category" className="text-xs font-semibold text-[#344054]">
                Kategori Produk <span className="text-red-500">*</span>
              </Label>
              <Select
                value={categoryId}
                onValueChange={(v) => {
                  setCategoryId(v ?? "");
                  setProfileId("");
                }}
              >
                <SelectTrigger
                  id="batch-category"
                  className="h-9.5 w-full rounded-lg border-[#D0D5DD]"
                >
                  <SelectValue placeholder="Pilih kategori produk" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.categoryId} value={c.categoryId}>
                      {c.categoryName} (
                      {c.handlingMode === "COLD_CHAIN" ? "Cold Chain" : "Non-Cold Chain"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="batch-profile" className="text-xs font-semibold text-[#344054]">
                Profil Pemantauan Kondisi <span className="text-red-500">*</span>
              </Label>
              <Select
                value={profileId}
                onValueChange={(v) => setProfileId(v ?? "")}
                disabled={!selectedCategory}
              >
                <SelectTrigger
                  id="batch-profile"
                  className="h-9.5 w-full rounded-lg border-[#D0D5DD]"
                >
                  <SelectValue
                    placeholder={
                      selectedCategory
                        ? "Pilih versi profil"
                        : "Pilih kategori produk terlebih dahulu"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {selectedCategory?.profiles.map((p) => (
                    <SelectItem key={p.profileId} value={p.profileId}>
                      Versi {p.version} (
                      {selectedCategory.handlingMode === "COLD_CHAIN"
                        ? "Kontrol Suhu & Pendingin"
                        : "Monitoring Umum"}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCategory ? (
                <p className="text-[11px] text-[#858D9D]">
                  Mode penanganan:{" "}
                  <span className="font-semibold text-[#1570EF]">
                    {selectedCategory.handlingMode}
                  </span>
                </p>
              ) : null}
            </div>

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
