"use client";

import { useState } from "react";
import { Calendar, KeyRound, Settings, Trash2, Plus, Info, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uiAddSchedule, uiDeleteSchedule, uiCreateAccessCode } from "@/server/actions/ui-actions";
import type { DistributionPointItem } from "@/server/queries/internal";

const weekdayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function weekdayLabel(weekday: number): string {
  return weekdayNames[weekday] ?? String(weekday);
}

interface BatchOption {
  id: string;
  batchCode: string;
}

interface ManagePointDialogProps {
  point: DistributionPointItem;
  batches: BatchOption[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ManagePointDialog({
  point,
  batches,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ManagePointDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;
  const [activeTab, setActiveTab] = useState("jadwal");

  // Schedule state
  const [weekday, setWeekday] = useState("1"); // 1 = Sen
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Access Code state
  const [selectedBatchId, setSelectedBatchId] = useState(batches[0]?.id || "");
  const [rawCode, setRawCode] = useState("");
  const [validFrom, setValidFrom] = useState(() => new Date().toISOString().slice(0, 16));
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 24);
    return d.toISOString().slice(0, 16);
  });
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSuccess, setCodeSuccess] = useState<string | null>(null);

  async function handleAddSchedule(e: React.FormEvent) {
    e.preventDefault();
    setScheduleError(null);
    setScheduleLoading(true);
    try {
      const res = await uiAddSchedule({
        pointId: point.id,
        weekday: parseInt(weekday, 10),
        startTime,
        endTime,
      });
      if (!res.ok) {
        setScheduleError(res.error);
        return;
      }
    } catch {
      setScheduleError("Gagal menambahkan jadwal operasional.");
    } finally {
      setScheduleLoading(false);
    }
  }

  async function handleDeleteSchedule(scheduleId: string) {
    setScheduleError(null);
    setScheduleLoading(true);
    try {
      const res = await uiDeleteSchedule(scheduleId);
      if (!res.ok) {
        setScheduleError(res.error);
      }
    } catch {
      setScheduleError("Gagal menghapus jadwal.");
    } finally {
      setScheduleLoading(false);
    }
  }

  async function handleCreateCode(e: React.FormEvent) {
    e.preventDefault();
    setCodeError(null);
    setCodeSuccess(null);
    if (!selectedBatchId) {
      setCodeError("Pilih batch terlebih dahulu.");
      return;
    }
    if (!rawCode || rawCode.length < 6) {
      setCodeError("Kode otorisasi minimal 6 karakter.");
      return;
    }

    setCodeLoading(true);
    try {
      const res = await uiCreateAccessCode({
        batchId: selectedBatchId,
        pointId: point.id,
        rawCode,
        validFrom: new Date(validFrom).toISOString(),
        validUntil: new Date(validUntil).toISOString(),
      });
      if (!res.ok) {
        setCodeError(res.error);
        return;
      }
      setCodeSuccess(`Kode otorisasi untuk ${point.publicName} berhasil dibuat & di-hash!`);
      setRawCode("");
    } catch {
      setCodeError("Gagal membuat kode otorisasi.");
    } finally {
      setCodeLoading(false);
    }
  }

  return (
    <>
      {!isControlled ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-8 gap-1.5 rounded-lg border-[#D0D5DD] px-2.5 text-xs font-medium text-[#344054] hover:bg-gray-50 shadow-2xs"
        >
          <Settings className="size-3.5 text-[#5D6679]" />
          Kelola
        </Button>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl bg-white p-6 rounded-xl border border-[#F0F1F3] shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1D2939]">
              Kelola: {point.publicName}
            </DialogTitle>
            <p className="text-xs text-[#858D9D]">
              Organisasi: {point.orgName} · {point.assignedUserNames.length} Petugas Ditugaskan
            </p>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="grid w-full grid-cols-2 bg-[#F9FAFB] p-1 border border-[#F0F1F3]">
              <TabsTrigger
                value="jadwal"
                className="gap-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-xs"
              >
                <Calendar className="size-3.5" />
                Jadwal Operasional
              </TabsTrigger>
              <TabsTrigger
                value="kode"
                className="gap-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-xs"
              >
                <KeyRound className="size-3.5" />
                Kode Otorisasi
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: JADWAL */}
            <TabsContent value="jadwal" className="space-y-4 pt-3">
              <div className="rounded-lg bg-[#EFF8FF] p-3 text-xs text-[#1570EF] flex items-start gap-2">
                <Info className="size-4 shrink-0 mt-0.5" />
                <span>
                  Jadwal membatasi waktu verifikasi akses (Story 8). Verifikasi di luar jadwal akan
                  diklasifikasikan sebagai <strong>ANOMALI</strong>.
                </span>
              </div>

              {scheduleError ? (
                <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 font-medium">
                  {scheduleError}
                </div>
              ) : null}

              {/* Daftar Jadwal */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[#344054]">Jadwal Aktif</h4>
                {point.schedules.length > 0 ? (
                  <div className="divide-y divide-[#F0F1F3] rounded-lg border border-[#F0F1F3] bg-white">
                    {point.schedules.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-2.5 text-xs">
                        <span className="font-semibold text-[#1D2939] w-16">
                          {weekdayLabel(s.weekday)}
                        </span>
                        <span className="font-mono text-[#5D6679]">
                          {s.start} - {s.end} WIB
                        </span>
                        <button
                          type="button"
                          disabled={scheduleLoading}
                          onClick={() => handleDeleteSchedule(s.id)}
                          className="rounded p-1 text-[#858D9D] hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Hapus jadwal"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#858D9D] italic">
                    Belum ada jadwal operasional terdaftar untuk titik ini.
                  </p>
                )}
              </div>

              {/* Form Tambah Jadwal */}
              <form
                onSubmit={handleAddSchedule}
                className="rounded-lg border border-[#EAECF0] bg-[#F9FAFB] p-3 space-y-3"
              >
                <h4 className="text-xs font-semibold text-[#344054]">Tambah Slot Jadwal</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[11px] text-[#5D6679]">Hari</Label>
                    <select
                      value={weekday}
                      onChange={(e) => setWeekday(e.target.value)}
                      className="mt-1 h-8 w-full rounded-md border border-[#D0D5DD] bg-white px-2 text-xs"
                    >
                      <option value="1">Senin</option>
                      <option value="2">Selasa</option>
                      <option value="3">Rabu</option>
                      <option value="4">Kamis</option>
                      <option value="5">Jumat</option>
                      <option value="6">Sabtu</option>
                      <option value="0">Minggu</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-[#5D6679]">Jam Mulai</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="mt-1 h-8 rounded-md border-[#D0D5DD] text-xs"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-[#5D6679]">Jam Selesai</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="mt-1 h-8 rounded-md border-[#D0D5DD] text-xs"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={scheduleLoading}
                    className="h-8 gap-1 rounded-md bg-[#1570EF] hover:bg-[#004EEB] text-xs font-medium text-white"
                  >
                    <Plus className="size-3.5" />
                    Tambah
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* TAB 2: KODE OTORISASI */}
            <TabsContent value="kode" className="space-y-4 pt-3">
              <div className="rounded-lg bg-[#EFF8FF] p-3 text-xs text-[#1570EF] flex items-start gap-2">
                <KeyRound className="size-4 shrink-0 mt-0.5" />
                <span>
                  Kode otorisasi (Story 9) di-hash menggunakan Argon2id di server. Nilai mentah
                  diberikan ke petugas fisik dan tidak pernah disimpan atau dicatat di blockchain.
                </span>
              </div>

              {codeError ? (
                <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 font-medium">
                  {codeError}
                </div>
              ) : null}

              {codeSuccess ? (
                <div className="rounded-lg bg-green-50 p-2.5 text-xs text-green-700 font-medium flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0" />
                  {codeSuccess}
                </div>
              ) : null}

              <form onSubmit={handleCreateCode} className="space-y-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#344054]">
                    Batch Tujuan <span className="text-red-500">*</span>
                  </Label>
                  {batches.length > 0 ? (
                    <select
                      value={selectedBatchId}
                      onChange={(e) => setSelectedBatchId(e.target.value)}
                      className="h-9 w-full rounded-lg border border-[#D0D5DD] bg-white px-3 text-xs font-mono"
                      required
                    >
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.batchCode}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-[#858D9D] italic">
                      Belum ada batch aktif yang terdaftar di organisasi ini.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#344054]">
                    Kode Otorisasi Mentah <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={rawCode}
                    onChange={(e) => setRawCode(e.target.value)}
                    placeholder="Contoh: PIN-94821 atau PASSOK-2026"
                    className="h-9 font-mono text-xs rounded-lg border-[#D0D5DD]"
                    required
                    minLength={6}
                  />
                  <p className="text-[11px] text-[#858D9D]">
                    Minimal 6 karakter. Berikan kode ini kepada petugas di titik ini.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-[#344054]">Berlaku Dari</Label>
                    <Input
                      type="datetime-local"
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                      className="h-9 text-xs rounded-lg border-[#D0D5DD]"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-[#344054]">Berlaku Hingga</Label>
                    <Input
                      type="datetime-local"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="h-9 text-xs rounded-lg border-[#D0D5DD]"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={codeLoading || batches.length === 0}
                    className="h-9 gap-1.5 rounded-lg bg-[#1570EF] hover:bg-[#004EEB] text-xs font-medium text-white shadow-xs"
                  >
                    <KeyRound className="size-3.5" />
                    {codeLoading ? "Memproses Hash..." : "Buat Kode Otorisasi"}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
