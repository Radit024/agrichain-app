"use client";

import { useState } from "react";
import { Plus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { uiCreateDistributionPoint } from "@/server/actions/ui-actions";

export function AddDistributionPointDialog() {
  const [open, setOpen] = useState(false);
  const [publicName, setPublicName] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!publicName.trim()) {
      setError("Nama titik distribusi wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const res = await uiCreateDistributionPoint({
        publicName: publicName.trim(),
        internalNotes: internalNotes.trim() || undefined,
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      setOpen(false);
      setPublicName("");
      setInternalNotes("");
    } catch {
      setError("Gagal menambahkan titik distribusi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="h-9.5 gap-2 bg-[#1570EF] hover:bg-[#004EEB] text-white font-medium px-4 rounded-lg shadow-xs"
      >
        <Plus className="size-4" />
        Tambah Titik
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-xl border border-[#F0F1F3] shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1D2939]">
              Tambah Titik Distribusi
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="flex items-center gap-3 rounded-lg bg-[#EFF8FF] p-3 text-xs text-[#1570EF]">
              <MapPin className="size-5 shrink-0" />
              <span>
                Titik distribusi merepresentasikan lokasi fisik penyimpanan atau checkpoint inspeksi
                selama perjalanan batch.
              </span>
            </div>

            {error ? (
              <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 font-medium">
                {error}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#344054]">
                Nama Titik Distribusi <span className="text-red-500">*</span>
              </Label>
              <Input
                value={publicName}
                onChange={(e) => setPublicName(e.target.value)}
                placeholder="Contoh: Gudang Distribusi Cikarang"
                className="h-9.5 rounded-lg border-[#D0D5DD]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#344054]">Catatan Internal</Label>
              <Input
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Contoh: Hub transit cold-chain area Jawa Barat"
                className="h-9.5 rounded-lg border-[#D0D5DD]"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-[#F0F1F3]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="h-9.5 px-4 rounded-lg border-[#D0D5DD] text-[#5D6679] hover:bg-gray-50"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="h-9.5 px-5 rounded-lg bg-[#1570EF] hover:bg-[#004EEB] text-white font-medium shadow-xs"
              >
                {loading ? "Menyimpan..." : "Simpan Titik"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const AddSupplierDialog = AddDistributionPointDialog;
