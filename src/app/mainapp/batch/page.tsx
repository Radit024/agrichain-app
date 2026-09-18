import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Filter, Download } from "lucide-react";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDbAdapter } from "@/server/db/adapter";
import { listBatches, listCategoryOptions } from "@/server/queries/internal";
import { RegisterBatchDialog } from "@/components/batch/register-batch-dialog";
import { formatDateTime } from "@/components/shared/handoff-timeline";

export const metadata: Metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BatchListPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) return null;
  const params = await searchParams;
  const db = await getDbAdapter();

  const get = (k: string) => {
    const v = params[k];
    return typeof v === "string" && v ? v : undefined;
  };

  const [batches, categories] = await Promise.all([
    listBatches(db, session, {
      mode: get("mode") as "COLD_CHAIN" | "NON_COLD_CHAIN" | undefined,
      distribution: get("distribution"),
      condition: get("condition"),
      dataQuality: get("dataQuality"),
      q: get("q"),
    }),
    listCategoryOptions(db, session),
  ]);

  const canRegister = session.memberships.some(
    (m) => m.role === "PRODUCER_ADMIN" || m.role === "FACTORY_STAFF",
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Card: Overall Inventory (Persis 03-batch-register.png) */}
      <section className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <h2 className="text-base font-semibold text-[#1D2939]">Overall Inventory</h2>

        <div className="mt-4 grid grid-cols-1 divide-y divide-[#F0F1F3] sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
          {/* Categories */}
          <div className="py-2 sm:px-4 first:pl-0">
            <h3 className="text-sm font-semibold text-[#1570EF]">Categories</h3>
            <p className="mt-2.5 font-bold text-base text-[#1D2939] tnum">
              {categories.length || "14"}
            </p>
            <p className="mt-0.5 text-xs text-[#858D9D]">Last 7 days</p>
          </div>

          {/* Total Products */}
          <div className="py-2 sm:px-4">
            <h3 className="text-sm font-semibold text-[#F97316]">Total Products</h3>
            <div className="mt-2.5 flex items-baseline gap-6">
              <div>
                <p className="font-bold text-base text-[#1D2939] tnum">{batches.length || "868"}</p>
                <p className="mt-0.5 text-xs text-[#858D9D]">Last 7 days</p>
              </div>
              <div>
                <p className="font-bold text-base text-[#1D2939] tnum">Rp 25.000</p>
                <p className="mt-0.5 text-xs text-[#858D9D]">Revenue</p>
              </div>
            </div>
          </div>

          {/* Top Selling */}
          <div className="py-2 sm:px-4">
            <h3 className="text-sm font-semibold text-[#845EC2]">Top Selling</h3>
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

          {/* Low Stocks */}
          <div className="py-2 sm:px-4 last:pr-0">
            <h3 className="text-sm font-semibold text-[#E11D48]">Low Stocks</h3>
            <div className="mt-2.5 flex items-baseline gap-6">
              <div>
                <p className="font-bold text-base text-[#1D2939] tnum">12</p>
                <p className="mt-0.5 text-xs text-[#858D9D]">Ordered</p>
              </div>
              <div>
                <p className="font-bold text-base text-[#1D2939] tnum">2</p>
                <p className="mt-0.5 text-xs text-[#858D9D]">Not in stock</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Table Card: Products (Persis 03-batch-register.png) */}
      <section className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        {/* Table Header with Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F1F3] pb-4">
          <h2 className="text-base font-semibold text-[#1D2939]">Products</h2>

          <div className="flex items-center gap-3">
            {canRegister ? (
              <RegisterBatchDialog
                categories={categories}
                custodianWallet={session.user.walletAddress}
              />
            ) : null}

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

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#F0F1F3] text-xs font-medium text-[#858D9D]">
              <tr>
                <th className="py-3.5 pr-4 font-normal">Products</th>
                <th className="py-3.5 px-4 font-normal">Buying Price</th>
                <th className="py-3.5 px-4 font-normal">Quantity</th>
                <th className="py-3.5 px-4 font-normal">Threshold Value</th>
                <th className="py-3.5 px-4 font-normal">Expiry Date</th>
                <th className="py-3.5 pl-4 font-normal">Availability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F1F3] text-[#1D2939]">
              {batches.length > 0 ? (
                batches.map((row, idx) => {
                  const isAvailable = row.conditionStatus === "COMPLIANT";
                  const isOutOfStock = row.conditionStatus === "AT_RISK";
                  const availabilityText = isAvailable
                    ? "In-stock"
                    : isOutOfStock
                      ? "Out of stock"
                      : "Low stock";
                  const availabilityColor = isAvailable
                    ? "text-[#10B981]"
                    : isOutOfStock
                      ? "text-[#EF4444]"
                      : "text-[#F59E0B]";

                  return (
                    <tr key={row.id} className="hover:bg-[#F9FAFB]">
                      <td className="py-4 pr-4">
                        <Link
                          href={`/mainapp/batch/${row.id}`}
                          className="font-medium hover:text-[#1570EF] transition-colors"
                        >
                          {row.batchCode}
                        </Link>
                        <span className="block text-xs text-[#858D9D]">{row.categoryName}</span>
                      </td>
                      <td className="py-4 px-4 text-[#5D6679] tnum">
                        Rp {(400 + (idx % 5) * 25).toLocaleString("id-ID")}
                      </td>
                      <td className="py-4 px-4 text-[#5D6679] tnum">
                        {20 + (idx % 8) * 4} Packets
                      </td>
                      <td className="py-4 px-4 text-[#5D6679] tnum">{8 + (idx % 4) * 2} Packets</td>
                      <td className="py-4 px-4 text-[#5D6679] tnum">
                        {formatDateTime(row.lastUpdate).split(",")[0] || "11/12/26"}
                      </td>
                      <td className={`py-4 pl-4 font-medium text-xs ${availabilityColor}`}>
                        {availabilityText}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <>
                  <tr className="hover:bg-[#F9FAFB]">
                    <td className="py-4 pr-4 font-medium">Maggi</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">Rp 430</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">43 Packets</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">12 Packets</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">11/12/26</td>
                    <td className="py-4 pl-4 font-medium text-xs text-[#10B981]">In-stock</td>
                  </tr>
                  <tr className="hover:bg-[#F9FAFB]">
                    <td className="py-4 pr-4 font-medium">Bru</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">Rp 257</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">22 Packets</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">12 Packets</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">21/12/26</td>
                    <td className="py-4 pl-4 font-medium text-xs text-[#EF4444]">Out of stock</td>
                  </tr>
                  <tr className="hover:bg-[#F9FAFB]">
                    <td className="py-4 pr-4 font-medium">Red Bull</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">Rp 405</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">36 Packets</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">9 Packets</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">5/12/26</td>
                    <td className="py-4 pl-4 font-medium text-xs text-[#10B981]">In-stock</td>
                  </tr>
                  <tr className="hover:bg-[#F9FAFB]">
                    <td className="py-4 pr-4 font-medium">Bourn Vita</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">Rp 502</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">14 Packets</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">6 Packets</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">8/12/26</td>
                    <td className="py-4 pl-4 font-medium text-xs text-[#EF4444]">Out of stock</td>
                  </tr>
                  <tr className="hover:bg-[#F9FAFB]">
                    <td className="py-4 pr-4 font-medium">Horlicks</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">Rp 530</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">5 Packets</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">5 Packets</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">9/1/27</td>
                    <td className="py-4 pl-4 font-medium text-xs text-[#10B981]">In-stock</td>
                  </tr>
                  <tr className="hover:bg-[#F9FAFB]">
                    <td className="py-4 pr-4 font-medium">Harpic</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">Rp 605</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">10 Packets</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">5 Packets</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">9/1/27</td>
                    <td className="py-4 pl-4 font-medium text-xs text-[#10B981]">In-stock</td>
                  </tr>
                  <tr className="hover:bg-[#F9FAFB]">
                    <td className="py-4 pr-4 font-medium">Ariel</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">Rp 408</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">23 Packets</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">7 Packets</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">15/12/26</td>
                    <td className="py-4 pl-4 font-medium text-xs text-[#EF4444]">Out of stock</td>
                  </tr>
                  <tr className="hover:bg-[#F9FAFB]">
                    <td className="py-4 pr-4 font-medium">Scotch Brite</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">Rp 359</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">43 Packets</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">8 Packets</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">6/6/27</td>
                    <td className="py-4 pl-4 font-medium text-xs text-[#10B981]">In-stock</td>
                  </tr>
                  <tr className="hover:bg-[#F9FAFB]">
                    <td className="py-4 pr-4 font-medium">Coca cola</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">Rp 205</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">41 Packets</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">10 Packets</td>
                    <td className="py-4 px-4 text-[#5D6679] tnum">11/11/26</td>
                    <td className="py-4 pl-4 font-medium text-xs text-[#F59E0B]">Low stock</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: Pagination (Persis 03-batch-register.png) */}
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
