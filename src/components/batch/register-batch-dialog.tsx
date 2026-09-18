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
        className="h-10 gap-2 bg-[#1570EF] hover:bg-[#004EEB] text-white font-medium px-4 rounded-lg shadow-xs"
      >
        <Plus aria-hidden className="size-4" />
        Add Product
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-white p-6 rounded-xl border border-[#F0F1F3] shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1D2939]">New Product</DialogTitle>
          </DialogHeader>

          {/* Dotted Upload Box seperti 03-batch-register.png */}
          <div className="my-2 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D0D5DD] p-4 text-center bg-[#F9FAFB]/50">
            <div className="flex size-12 items-center justify-center rounded-lg border border-[#D0D5DD] bg-white text-[#858D9D] mb-1.5">
              <Plus className="size-5" />
            </div>
            <p className="text-xs text-[#5D6679]">
              Drag image here or{" "}
              <span className="cursor-pointer font-medium text-[#1570EF] hover:underline">
                Browse image
              </span>
            </p>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1">
              <Label htmlFor="batch-name" className="text-xs font-semibold text-[#344054]">
                Product Name
              </Label>
              <Input
                id="batch-name"
                value={batchCode}
                onChange={(e) => setBatchCode(e.target.value)}
                placeholder="Enter product name (e.g. BATCH-2026-001)"
                className="h-9.5 rounded-lg border-[#D0D5DD]"
                aria-required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="batch-category" className="text-xs font-semibold text-[#344054]">
                  Category
                </Label>
                <Select
                  value={categoryId}
                  onValueChange={(v) => {
                    setCategoryId(v ?? "");
                    setProfileId("");
                  }}
                >
                  <SelectTrigger id="batch-category" className="h-9.5 rounded-lg border-[#D0D5DD]">
                    <SelectValue placeholder="Select product category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.categoryId} value={c.categoryId}>
                        {c.categoryName} (
                        {c.handlingMode === "COLD_CHAIN" ? "Cold chain" : "Non-cold"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="batch-profile" className="text-xs font-semibold text-[#344054]">
                  Monitoring Profile
                </Label>
                <Select
                  value={profileId}
                  onValueChange={(v) => setProfileId(v ?? "")}
                  disabled={!selectedCategory}
                >
                  <SelectTrigger id="batch-profile" className="h-9.5 rounded-lg border-[#D0D5DD]">
                    <SelectValue
                      placeholder={
                        selectedCategory ? "Select profile version" : "Select category first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCategory?.profiles.map((p) => (
                      <SelectItem key={p.profileId} value={p.profileId}>
                        Version {p.version}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#344054]">Buying Price</Label>
                <Input
                  defaultValue="Rp 430.000"
                  placeholder="Enter buying price (Rp)"
                  className="h-9.5 rounded-lg border-[#D0D5DD]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#344054]">Quantity</Label>
                <Input
                  defaultValue="43 Packets"
                  placeholder="Enter product quantity"
                  className="h-9.5 rounded-lg border-[#D0D5DD]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#344054]">Expiry Date</Label>
                <Input
                  defaultValue="11/12/26"
                  placeholder="Enter expiry date"
                  className="h-9.5 rounded-lg border-[#D0D5DD]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#344054]">Threshold Value</Label>
                <Input
                  defaultValue="12 Packets"
                  placeholder="Enter threshold value"
                  className="h-9.5 rounded-lg border-[#D0D5DD]"
                />
              </div>
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
              Discard
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={pending || !categoryId || !profileId || batchCode.trim().length < 3}
              className="h-10 px-5 rounded-lg bg-[#1570EF] hover:bg-[#004EEB] text-white font-medium shadow-xs"
            >
              {pending ? "Adding..." : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
