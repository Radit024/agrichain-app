"use client";

import { useState } from "react";
import { Plus, Filter, Download, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Modal New Supplier persis foto referensi 06-add-distribution-point.png
 */
export function AddSupplierDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"taking" | "not_taking">("not_taking");

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="h-10 gap-2 bg-[#1570EF] hover:bg-[#004EEB] text-white font-medium px-4 rounded-lg shadow-xs"
      >
        <Plus className="size-4" />
        Add Supplier
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-xl border border-[#F0F1F3] shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1D2939]">New Supplier</DialogTitle>
          </DialogHeader>

          {/* Dotted Avatar Upload Circle persis 06-add-distribution-point.png */}
          <div className="my-2 flex flex-col items-center justify-center text-center">
            <div className="flex size-18 items-center justify-center rounded-full border-2 border-dashed border-[#D0D5DD] bg-[#F9FAFB]/60 text-[#858D9D] mb-1.5">
              <User className="size-8 stroke-[1.5]" />
            </div>
            <p className="text-xs text-[#5D6679]">
              Drag image here or{" "}
              <span className="cursor-pointer font-medium text-[#1570EF] hover:underline">
                Browse image
              </span>
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#344054]">Supplier Name</Label>
              <Input
                placeholder="Enter supplier name"
                className="h-9.5 rounded-lg border-[#D0D5DD]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#344054]">Product</Label>
              <Input placeholder="Enter product" className="h-9.5 rounded-lg border-[#D0D5DD]" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#344054]">Category</Label>
              <Input
                placeholder="Select product category"
                className="h-9.5 rounded-lg border-[#D0D5DD]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#344054]">Buying Price</Label>
              <Input
                placeholder="Enter buying price"
                className="h-9.5 rounded-lg border-[#D0D5DD]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#344054]">Contact Number</Label>
              <Input
                placeholder="Enter supplier contact number"
                className="h-9.5 rounded-lg border-[#D0D5DD]"
              />
            </div>

            <div className="space-y-1 pt-1">
              <Label className="text-xs font-semibold text-[#344054]">Type</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType("not_taking")}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                    type === "not_taking"
                      ? "border-[#1570EF] bg-[#EFF8FF] text-[#1570EF]"
                      : "border-[#D0D5DD] bg-white text-[#5D6679] hover:bg-gray-50"
                  }`}
                >
                  Not taking return
                </button>
                <button
                  type="button"
                  onClick={() => setType("taking")}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                    type === "taking"
                      ? "border-[#1570EF] bg-[#EFF8FF] text-[#1570EF]"
                      : "border-[#D0D5DD] bg-white text-[#5D6679] hover:bg-gray-50"
                  }`}
                >
                  Taking return
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-[#F0F1F3]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-10 px-4 rounded-lg border-[#D0D5DD] text-[#5D6679] hover:bg-gray-50"
            >
              Discard
            </Button>
            <Button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 px-5 rounded-lg bg-[#1570EF] hover:bg-[#004EEB] text-white font-medium shadow-xs"
            >
              Add Supplier
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
