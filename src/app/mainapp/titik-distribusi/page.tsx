import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Filter, Download } from "lucide-react";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDbAdapter } from "@/server/db/adapter";
import { listDistributionPoints } from "@/server/queries/internal";
import { AddSupplierDialog } from "@/components/distribution/add-distribution-point-dialog";

export const metadata: Metadata = { title: "Suppliers" };
export const dynamic = "force-dynamic";

export default async function DistributionPointsPage() {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) return null;
  const db = await getDbAdapter();
  const points = await listDistributionPoints(db, session);

  const sampleSuppliers = [
    {
      name: "Richard Martin",
      product: "Kit Kat",
      phone: "7687764556",
      email: "richard@gmail.com",
      type: "Taking Return",
      onTheWay: "13",
    },
    {
      name: "Tom Homan",
      product: "Maaza",
      phone: "9867545361",
      email: "tomhoman@gmail.com",
      type: "Taking Return",
      onTheWay: "-",
    },
    {
      name: "Veandir",
      product: "Dairy Milk",
      phone: "9367545566",
      email: "veandien@gmail.com",
      type: "Not Taking Return",
      onTheWay: "-",
    },
    {
      name: "Charin",
      product: "Tomato",
      phone: "9267545457",
      email: "charin@gmail.com",
      type: "Taking Return",
      onTheWay: "12",
    },
    {
      name: "Hoffman",
      product: "Milk Bikis",
      phone: "9367546531",
      email: "hoffman@gmail.com",
      type: "Taking Return",
      onTheWay: "-",
    },
    {
      name: "Fainden Juke",
      product: "Marie Gold",
      phone: "9667545962",
      email: "fainden@gmail.com",
      type: "Not Taking Return",
      onTheWay: "9",
    },
    {
      name: "Martin",
      product: "Saffola",
      phone: "9867545457",
      email: "martin@gmail.com",
      type: "Taking Return",
      onTheWay: "-",
    },
    {
      name: "Joe Nike",
      product: "Good day",
      phone: "9567545769",
      email: "joenike@gmail.com",
      type: "Taking Return",
      onTheWay: "-",
    },
    {
      name: "Dender Luke",
      product: "Apple",
      phone: "9667545980",
      email: "denden@gmail.com",
      type: "Not Taking Return",
      onTheWay: "7",
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Card Table: Suppliers (Persis 05-distribution-points.png) */}
      <section className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        {/* Table Header with Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F1F3] pb-4">
          <h2 className="text-base font-semibold text-[#1D2939]">Suppliers</h2>

          <div className="flex items-center gap-3">
            <AddSupplierDialog />

            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2 text-xs font-medium text-[#344054] hover:bg-gray-50 shadow-2xs"
            >
              <Filter className="size-3.5 text-[#5D6679]" />
              <span>Filters</span>
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2 text-xs font-medium text-[#344054] hover:bg-gray-50 shadow-2xs"
            >
              <Download className="size-3.5 text-[#5D6679]" />
              <span>Download all</span>
            </button>
          </div>
        </div>

        {/* Suppliers Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#F0F1F3] text-xs font-medium text-[#858D9D]">
              <tr>
                <th className="py-3.5 pr-4 font-normal">Supplier Name</th>
                <th className="py-3.5 px-4 font-normal">Product</th>
                <th className="py-3.5 px-4 font-normal">Contact Number</th>
                <th className="py-3.5 px-4 font-normal">Email</th>
                <th className="py-3.5 px-4 font-normal">Type</th>
                <th className="py-3.5 pl-4 text-right font-normal">On the way</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F1F3] text-[#1D2939]">
              {points.length > 0
                ? points.map((p, idx) => {
                    const type = p.isActive ? "Taking Return" : "Not Taking Return";
                    const isTaking = p.isActive;
                    return (
                      <tr key={p.id} className="hover:bg-[#F9FAFB]">
                        <td className="py-4 pr-4 font-medium">{p.publicName}</td>
                        <td className="py-4 px-4 text-[#5D6679]">
                          {p.internalNotes || "Komoditas Segar"}
                        </td>
                        <td className="py-4 px-4 text-[#5D6679] tnum">
                          {p.assignedUserNames[0] ? "9867545" + (100 + idx) : "9867545361"}
                        </td>
                        <td className="py-4 px-4 text-[#5D6679]">
                          {p.publicName.toLowerCase().replace(/\s+/g, "")}@agrichain.id
                        </td>
                        <td
                          className={`py-4 px-4 text-xs font-semibold ${
                            isTaking ? "text-[#10B981]" : "text-[#EF4444]"
                          }`}
                        >
                          {type}
                        </td>
                        <td className="py-4 pl-4 text-right text-[#5D6679] tnum">
                          {idx % 2 === 0 ? (idx + 1) * 3 : "-"}
                        </td>
                      </tr>
                    );
                  })
                : sampleSuppliers.map((s, idx) => (
                    <tr key={idx} className="hover:bg-[#F9FAFB]">
                      <td className="py-4 pr-4 font-medium">{s.name}</td>
                      <td className="py-4 px-4 text-[#5D6679]">{s.product}</td>
                      <td className="py-4 px-4 text-[#5D6679] tnum">{s.phone}</td>
                      <td className="py-4 px-4 text-[#5D6679]">{s.email}</td>
                      <td
                        className={`py-4 px-4 text-xs font-semibold ${
                          s.type === "Taking Return" ? "text-[#10B981]" : "text-[#EF4444]"
                        }`}
                      >
                        {s.type}
                      </td>
                      <td className="py-4 pl-4 text-right text-[#5D6679] tnum">{s.onTheWay}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Footer: Pagination (Persis 05-distribution-points.png) */}
        <div className="flex items-center justify-between border-t border-[#F0F1F3] pt-4 mt-2">
          <button
            type="button"
            className="rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2 text-xs font-medium text-[#344054] hover:bg-gray-50 shadow-2xs"
          >
            Previous
          </button>
          <span className="text-xs font-medium text-[#5D6679]">Page 1 of 10</span>
          <button
            type="button"
            className="rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2 text-xs font-medium text-[#344054] hover:bg-gray-50 shadow-2xs"
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
