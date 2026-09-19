"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, CheckCircle2, ShieldCheck, UserCheck } from "lucide-react";
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
import { uiInitiateHandoff, uiConfirmHandoff, uiCancelHandoff } from "@/server/actions/ui-actions";

export interface HandoffableBatch {
  id: string;
  batchCode: string;
  custodyStage: number;
}

export interface RecipientContactItem {
  userId: string;
  name: string;
  email: string;
  role: string;
  walletAddress: string;
}

export interface RecipientOrgItem {
  id: string;
  name: string;
  defaultWallet: string;
  contacts: RecipientContactItem[];
}

/** Dialog Catat Serah-terima (pengirim menginisiasi kiriman ke mitra). */
export function InitiateHandoffDialog({ batches }: { batches: HandoffableBatch[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [batchId, setBatchId] = useState("");
  const [recipientWallet, setRecipientWallet] = useState("");
  const [recipientOrgId, setRecipientOrgId] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");

  const [orgOptions, setOrgOptions] = useState<RecipientOrgItem[]>([]);
  const selectedBatch = useMemo(() => batches.find((b) => b.id === batchId), [batches, batchId]);
  const selectedOrg = useMemo(
    () => orgOptions.find((o) => o.id === recipientOrgId),
    [orgOptions, recipientOrgId],
  );

  async function pickBatch(id: string) {
    setBatchId(id);
    setRecipientOrgId("");
    setSelectedContactId("");
    setRecipientWallet("");
    setOrgOptions([]);
    const res = await fetch(`/api/handoff/recipient-orgs?fromStage=${selectedStage(id)}`);
    if (res.ok) {
      const data = (await res.json()) as { orgs: RecipientOrgItem[] };
      setOrgOptions(data.orgs || []);
    }
  }

  function selectedStage(id: string): number {
    return batches.find((b) => b.id === id)?.custodyStage ?? 0;
  }

  function handleSelectOrg(orgId: string) {
    setRecipientOrgId(orgId);
    const org = orgOptions.find((o) => o.id === orgId);
    if (org && org.contacts && org.contacts.length > 0) {
      const firstContact = org.contacts[0];
      setSelectedContactId(firstContact.userId);
      setRecipientWallet(firstContact.walletAddress);
    } else if (org && org.defaultWallet) {
      setSelectedContactId("");
      setRecipientWallet(org.defaultWallet);
    } else {
      setSelectedContactId("");
      setRecipientWallet("");
    }
  }

  function handleSelectContact(userId: string) {
    setSelectedContactId(userId);
    const contact = selectedOrg?.contacts.find((c) => c.userId === userId);
    if (contact) {
      setRecipientWallet(contact.walletAddress);
    }
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await uiInitiateHandoff({
        batchId,
        recipientWallet: recipientWallet.trim(),
        recipientOrgId,
        expiresInHours: 48,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setBatchId("");
      setRecipientWallet("");
      setRecipientOrgId("");
      setSelectedContactId("");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        disabled={batches.length === 0}
        title={batches.length === 0 ? "Tidak ada batch yang dapat diajukan" : undefined}
        className="bg-[#1570EF] hover:bg-[#004EEB] text-white font-medium text-xs h-8 px-3 rounded-lg shadow-xs"
      >
        Catat Serah-terima
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Kirim Muatan / Catat Serah-terima</DialogTitle>
            <DialogDescription>
              Inisiasi pengiriman muatan ke mitra distribusi berikutnya. Tanggung jawab kustodian
              akan berpindah saat mitra mengonfirmasi penerimaan fisik barang.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="handoff-batch" className="text-xs font-semibold text-[#344054]">
                Pilih Batch Komoditas
              </Label>
              <Select value={batchId} onValueChange={(v) => void pickBatch(v ?? "")}>
                <SelectTrigger id="handoff-batch" aria-required className="h-9.5 text-xs">
                  <SelectValue placeholder="Pilih batch yang siap dikirim" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">
                      {b.batchCode} — Tahap saat ini:{" "}
                      {b.custodyStage === 0 ? "Pabrik / Produsen" : "Distributor"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="handoff-org" className="text-xs font-semibold text-[#344054]">
                Organisasi Mitra Penerima
              </Label>
              <Select
                value={recipientOrgId}
                onValueChange={(v) => handleSelectOrg(v ?? "")}
                disabled={!batchId}
              >
                <SelectTrigger id="handoff-org" aria-required className="h-9.5 text-xs">
                  <SelectValue
                    placeholder={
                      batchId ? "Pilih organisasi penerima" : "Pilih batch terlebih dahulu"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {orgOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id} className="text-xs">
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedOrg && selectedOrg.contacts.length > 1 ? (
              <div className="space-y-1.5">
                <Label htmlFor="handoff-contact" className="text-xs font-semibold text-[#344054]">
                  Petugas Penerima Ditunjuk
                </Label>
                <Select
                  value={selectedContactId}
                  onValueChange={(v) => handleSelectContact(v ?? "")}
                >
                  <SelectTrigger id="handoff-contact" className="h-9.5 text-xs">
                    <SelectValue placeholder="Pilih kontak perwakilan" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedOrg.contacts.map((c) => (
                      <SelectItem key={c.userId} value={c.userId} className="text-xs">
                        {c.name} ({c.role || "Staf"} · {c.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {selectedOrg ? (
              <div className="rounded-lg border border-[#D1FADF] bg-[#F6FEF9] p-3 text-xs text-[#027A48]">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="size-4 shrink-0 text-[#12B76A]" />
                  <span>Koneksi Rantai Pasok Terverifikasi</span>
                </div>
                <p className="mt-1 text-[11px] text-[#05603A]">
                  Tujuan pengiriman: <span className="font-semibold">{selectedOrg.name}</span>.
                  {selectedOrg.contacts.length === 1 && (
                    <>
                      {" "}
                      Penerima dituju:{" "}
                      <span className="font-semibold">
                        {selectedOrg.contacts[0].name} ({selectedOrg.contacts[0].email})
                      </span>
                      .
                    </>
                  )}{" "}
                  Seluruh staf berwenang di organisasi penerima akan menerima notifikasi penerimaan.
                </p>

                <details className="mt-2 text-[11px] text-[#05603A]/70 cursor-pointer">
                  <summary className="hover:underline">Informasi teknis identitas digital</summary>
                  <div className="mt-1.5 rounded bg-white/80 p-2 font-mono text-[10px] text-[#344054] break-all border border-[#A6F4C5]">
                    Alamat Dompet Penerima:{" "}
                    {recipientWallet || "Otomatis di-assign saat konfirmasi"}
                  </div>
                </details>
              </div>
            ) : null}

            {/* Fallback jika org penerima belum memiliki user terdaftar */}
            {selectedOrg && !recipientWallet && (
              <div className="space-y-1.5">
                <Label htmlFor="handoff-wallet" className="text-xs font-semibold text-[#344054]">
                  Alamat Dompet Alternatif Penerima
                </Label>
                <Input
                  id="handoff-wallet"
                  value={recipientWallet}
                  onChange={(e) => setRecipientWallet(e.target.value)}
                  placeholder="0x…"
                  className="font-mono text-xs h-9.5"
                  aria-required
                />
              </div>
            )}

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
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="text-xs h-9"
            >
              Batal
            </Button>
            <Button
              onClick={submit}
              disabled={pending || !batchId || !recipientOrgId || !recipientWallet.trim()}
              className="bg-[#1570EF] hover:bg-[#004EEB] text-white text-xs h-9"
            >
              {pending ? <Loader2 aria-hidden className="size-4 animate-spin mr-1.5" /> : null}
              Kirim & Catat Serah-terima
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Tombol konfirmasi penerima dengan dialog ramah operasional. */
export function ConfirmHandoffButton({
  batchId,
  batchCode,
}: {
  batchId: string;
  batchCode: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await uiConfirmHandoff(batchId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="bg-[#12B76A] hover:bg-[#039855] text-white font-medium text-xs h-8 px-3 rounded-lg shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
      >
        <ShieldCheck className="size-3.5" />
        Terima Muatan
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Konfirmasi Penerimaan Muatan</DialogTitle>
            <DialogDescription>
              Apakah Anda mengonfirmasi bahwa fisik komoditas batch{" "}
              <span className="font-mono font-semibold text-[#1D2939]">{batchCode}</span> telah tiba
              dan diperiksa dengan kondisi sesuai?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-[#EAECF0] bg-[#F9FAFB] p-3 text-xs text-[#475467] space-y-1">
            <p className="font-medium text-[#344054]">Dampak Penerimaan:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
              <li>Tanggung jawab kustodian fisik barang berpindah resmi ke organisasi Anda.</li>
              <li>
                Bukti serah-terima digital akan diterbitkan dan tercatat permanen di buku besar
                audit.
              </li>
            </ul>
          </div>
          {error ? (
            <p role="alert" className="text-xs text-danger font-medium">
              {error}
            </p>
          ) : null}
          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="text-xs h-9"
            >
              Batal
            </Button>
            <Button
              onClick={confirm}
              disabled={pending}
              className="bg-[#12B76A] hover:bg-[#039855] text-white text-xs h-9 font-medium"
            >
              {pending ? <Loader2 aria-hidden className="size-4 animate-spin mr-1.5" /> : null}
              Ya, Terima Muatan Ini
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Tombol batalkan kiriman pending (pengirim). */
export function CancelHandoffButton({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function cancel() {
    startTransition(async () => {
      await uiCancelHandoff(batchId);
      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={cancel}
      disabled={pending}
      className="text-xs text-[#B42318] hover:text-[#B42318] hover:bg-[#FEF3F2] border-[#FDA29B] h-8 px-2.5 rounded-lg cursor-pointer"
    >
      {pending ? <Loader2 aria-hidden className="size-3.5 animate-spin mr-1" /> : null}
      Batalkan
    </Button>
  );
}
