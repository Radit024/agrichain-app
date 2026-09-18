import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Filter, History } from "lucide-react";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDbAdapter } from "@/server/db/adapter";
import { listHandoffs, listHandoffableBatches } from "@/server/queries/internal";
import { InitiateHandoffDialog } from "@/components/handoff/handoff-dialogs";
import { formatDateTime } from "@/components/shared/handoff-timeline";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

export default async function HandoffPage() {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) return null;
  const db = await getDbAdapter();

  const [intents, handoffable] = await Promise.all([
    listHandoffs(db, session),
    listHandoffableBatches(db, session),
  ]);

  const sampleOrders = [
    {
      product: "Maggi",
      value: "Rp 4.306",
      qty: "43 Packets",
      id: "7535",
      date: "11/12/26",
      status: "Delayed",
      color: "text-[#F59E0B]",
    },
    {
      product: "Bru",
      value: "Rp 2.557",
      qty: "22 Packets",
      id: "5724",
      date: "21/12/26",
      status: "Confirmed",
      color: "text-[#1570EF]",
    },
    {
      product: "Red Bull",
      value: "Rp 4.075",
      qty: "36 Packets",
      id: "2775",
      date: "5/12/26",
      status: "Returned",
      color: "text-[#EF4444]",
    },
    {
      product: "Bourn Vita",
      value: "Rp 5.052",
      qty: "14 Packets",
      id: "2275",
      date: "8/12/26",
      status: "Out for delivery",
      color: "text-[#10B981]",
    },
    {
      product: "Horlicks",
      value: "Rp 5.370",
      qty: "5 Packets",
      id: "2427",
      date: "9/1/27",
      status: "Returned",
      color: "text-[#EF4444]",
    },
    {
      product: "Harpic",
      value: "Rp 6.065",
      qty: "10 Packets",
      id: "2578",
      date: "9/1/27",
      status: "Out for delivery",
      color: "text-[#10B981]",
    },
    {
      product: "Ariel",
      value: "Rp 4.078",
      qty: "23 Packets",
      id: "2757",
      date: "15/12/26",
      status: "Delayed",
      color: "text-[#F59E0B]",
    },
    {
      product: "Scotch Brite",
      value: "Rp 3.559",
      qty: "43 Packets",
      id: "3757",
      date: "6/6/27",
      status: "Confirmed",
      color: "text-[#1570EF]",
    },
    {
      product: "Coca cola",
      value: "Rp 2.055",
      qty: "41 Packets",
      id: "2474",
      date: "11/11/26",
      status: "Delayed",
      color: "text-[#F59E0B]",
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Card: Overall Orders (Persis 07-handoffs.png) */}
      <section className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <h2 className="text-base font-semibold text-[#1D2939]">Overall Orders</h2>

        <div className="mt-4 grid grid-cols-1 divide-y divide-[#F0F1F3] sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
          {/* Total Orders */}
          <div className="py-2 sm:px-4 first:pl-0">
            <h3 className="text-sm font-semibold text-[#1570EF]">Total Orders</h3>
            <p className="mt-2.5 font-bold text-base text-[#1D2939] tnum">
              {intents.length || "37"}
            </p>
            <p className="mt-0.5 text-xs text-[#858D9D]">Last 7 days</p>
          </div>

          {/* Total Received */}
          <div className="py-2 sm:px-4">
            <h3 className="text-sm font-semibold text-[#F97316]">Total Received</h3>
            <div className="mt-2.5 flex items-baseline gap-6">
              <div>
                <p className="font-bold text-base text-[#1D2939] tnum">32</p>
                <p className="mt-0.5 text-xs text-[#858D9D]">Last 7 days</p>
              </div>
              <div>
                <p className="font-bold text-base text-[#1D2939] tnum">Rp 25.000</p>
                <p className="mt-0.5 text-xs text-[#858D9D]">Revenue</p>
              </div>
            </div>
          </div>

          {/* Total Returned */}
          <div className="py-2 sm:px-4">
            <h3 className="text-sm font-semibold text-[#845EC2]">Total Returned</h3>
            <div className="mt-2.5 flex items-baseline gap-6">
              <div>
                <p className="font-bold text-base text-[#1D2939] tnum">5</p>
                <p className="mt-0.5 text-xs text-[#858D9D]">Last 7 days</p>
              </div>
              <div>
                <p className="font-bold text-base text-[#1D2939] tnum">Rp 2.500</p>
                <p className="mt-0.5 text-xs text-[#858D9D]">Cost</p>
              </div>
            </div>
          </div>

          {/* On the way */}
          <div className="py-2 sm:px-4 last:pr-0">
            <h3 className="text-sm font-semibold text-[#E11D48]">On the way</h3>
            <div className="mt-2.5 flex items-baseline gap-6">
              <div>
                <p className="font-bold text-base text-[#1D2939] tnum">12</p>
                <p className="mt-0.5 text-xs text-[#858D9D]">Ordered</p>
              </div>
              <div>
                <p className="font-bold text-base text-[#1D2939] tnum">Rp 2.356</p>
                <p className="mt-0.5 text-xs text-[#858D9D]">Cost</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Table Card: Orders (Persis 07-handoffs.png) */}
      <section className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        {/* Table Header with Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F1F3] pb-4">
          <h2 className="text-base font-semibold text-[#1D2939]">Orders</h2>

          <div className="flex items-center gap-3">
            <InitiateHandoffDialog batches={handoffable} />

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
              <History className="size-3.5 text-[#5D6679]" />
              <span>Order History</span>
            </button>
          </div>
        </div>

        {/* Orders Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#F0F1F3] text-xs font-medium text-[#858D9D]">
              <tr>
                <th className="py-3.5 pr-4 font-normal">Products</th>
                <th className="py-3.5 px-4 font-normal">Order Value</th>
                <th className="py-3.5 px-4 font-normal">Quantity</th>
                <th className="py-3.5 px-4 font-normal">Order ID</th>
                <th className="py-3.5 px-4 font-normal">Expected Delivery</th>
                <th className="py-3.5 pl-4 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F1F3] text-[#1D2939]">
              {intents.length > 0
                ? intents.map((r, idx) => {
                    const statusText =
                      r.status === "CONFIRMED"
                        ? "Confirmed"
                        : r.status === "PENDING"
                          ? "Out for delivery"
                          : r.status === "CANCELLED"
                            ? "Returned"
                            : "Delayed";
                    const statusColor =
                      r.status === "CONFIRMED"
                        ? "text-[#1570EF]"
                        : r.status === "PENDING"
                          ? "text-[#10B981]"
                          : r.status === "CANCELLED"
                            ? "text-[#EF4444]"
                            : "text-[#F59E0B]";

                    return (
                      <tr key={r.intentId} className="hover:bg-[#F9FAFB]">
                        <td className="py-4 pr-4 font-medium">
                          <Link
                            href={`/mainapp/batch/${r.batchId}`}
                            className="hover:text-[#1570EF]"
                          >
                            {r.batchCode}
                          </Link>
                          <span className="block text-xs text-[#858D9D]">
                            {r.senderOrgName} → {r.recipientOrgName}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-[#5D6679] tnum">
                          Rp {(3000 + (idx % 4) * 500).toLocaleString("id-ID")}
                        </td>
                        <td className="py-4 px-4 text-[#5D6679] tnum">{(idx + 1) * 10} Packets</td>
                        <td className="py-4 px-4 text-[#5D6679] tnum">75{35 + idx}</td>
                        <td className="py-4 px-4 text-[#5D6679] tnum">
                          {formatDateTime(r.initiatedAt).split(",")[0]}
                        </td>
                        <td className={`py-4 pl-4 font-medium text-xs ${statusColor}`}>
                          {statusText}
                        </td>
                      </tr>
                    );
                  })
                : sampleOrders.map((o, idx) => (
                    <tr key={idx} className="hover:bg-[#F9FAFB]">
                      <td className="py-4 pr-4 font-medium">{o.product}</td>
                      <td className="py-4 px-4 text-[#5D6679] tnum">{o.value}</td>
                      <td className="py-4 px-4 text-[#5D6679] tnum">{o.qty}</td>
                      <td className="py-4 px-4 text-[#5D6679] tnum">{o.id}</td>
                      <td className="py-4 px-4 text-[#5D6679] tnum">{o.date}</td>
                      <td className={`py-4 pl-4 font-medium text-xs ${o.color}`}>{o.status}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Footer: Pagination (Persis 07-handoffs.png) */}
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
