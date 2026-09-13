"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
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

/** Dialog Catat Serah-terima (pengirim menginisiasi). */
export function InitiateHandoffDialog({ batches }: { batches: HandoffableBatch[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [batchId, setBatchId] = useState("");
  const [recipientWallet, setRecipientWallet] = useState("");
  const [recipientOrgId, setRecipientOrgId] = useState("");

  // Org tujuan diberikan parent (server) — di sini cukup pilih dari opsi
  const [orgOptions, setOrgOptions] = useState<Array<{ id: string; name: string }>>([]);
  const selectedBatch = useMemo(() => batches.find((b) => b.id === batchId), [batches, batchId]);

  async function pickBatch(id: string) {
    setBatchId(id);
    setRecipientOrgId("");
    setOrgOptions([]);
    const res = await fetch(`/api/handoff/recipient-orgs?fromStage=${selectedStage(id)}`);
    if (res.ok) {
      const data = (await res.json()) as { orgs: Array<{ id: string; name: string }> };
      setOrgOptions(data.orgs);
    }
  }

  function selectedStage(id: string): number {
    return batches.find((b) => b.id === id)?.custodyStage ?? 0;
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
      router.refresh();
    });
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        disabled={batches.length === 0}
        title={batches.length === 0 ? "Tidak ada batch yang dapat diajukan" : undefined}
      >
        Catat serah-terima
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Catat Serah-terima</DialogTitle>
            <DialogDescription>
              Inisiasi pengirim. Stage berpindah hanya setelah penerima mengonfirmasi. Riwayat audit
              on-chain akan dibuat saat konfirmasi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="handoff-batch">Batch</Label>
              <Select value={batchId} onValueChange={(v) => void pickBatch(v ?? "")}>
                <SelectTrigger id="handoff-batch" aria-required>
                  <SelectValue placeholder="Pilih batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.batchCode} — {b.custodyStage === 0 ? "Pabrik" : "Distributor"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="handoff-org">Organisasi penerima</Label>
              <Select
                value={recipientOrgId}
                onValueChange={(v) => setRecipientOrgId(v ?? "")}
                disabled={!batchId}
              >
                <SelectTrigger id="handoff-org" aria-required>
                  <SelectValue placeholder="Pilih organisasi" />
                </SelectTrigger>
                <SelectContent>
                  {orgOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="handoff-wallet">Wallet penerima</Label>
              <Input
                id="handoff-wallet"
                value={recipientWallet}
                onChange={(e) => setRecipientWallet(e.target.value)}
                placeholder="0x…"
                className="font-mono"
                aria-required
              />
              <p className="text-xs text-ink-muted">
                Wallet embedded penerima — hanya penerima ini dapat mengonfirmasi.
              </p>
            </div>

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
              disabled={pending || !batchId || !recipientOrgId || !recipientWallet.trim()}
            >
              {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
              Ajukan serah-terima
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Tombol konfirmasi penerima (dengan dialog konsekuensi). */
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
      <Button size="sm" onClick={() => setOpen(true)}>
        Konfirmasi penerimaan
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Konfirmasi penerimaan</DialogTitle>
            <DialogDescription>
              Anda akan dikonfirmasi sebagai kustodian batch{" "}
              <span className="font-mono font-semibold">{batchCode}</span> dan riwayat audit
              on-chain akan dibuat. Tindakan ini tercatat permanen.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={confirm} disabled={pending}>
              {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
              Konfirmasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Tombol batalkan intent PENDING (pengirim). */
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
    <Button variant="outline" size="sm" onClick={cancel} disabled={pending}>
      {pending ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : null}
      Batalkan
    </Button>
  );
}
