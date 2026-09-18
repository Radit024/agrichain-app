import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  Calendar,
  ChevronDown,
  TrendingUp,
  BarChart2,
  Package,
  MapPin,
  ShoppingBag,
  Home,
  XCircle,
  RotateCcw,
  Users,
  FileText,
  Boxes,
} from "lucide-react";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDashboardMetrics, listDistributionPoints } from "@/server/queries/internal";
import { getDbAdapter } from "@/server/db/adapter";
import { SalesPurchaseBarChart, OrderSummaryCurveChart } from "@/components/shared/trend-charts";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) return null;
  const db = await getDbAdapter();

  const [m, points] = await Promise.all([
    getDashboardMetrics(db, session),
    listDistributionPoints(db, session),
  ]);

  const activePointsCount = points.filter((p) => p.isActive).length;
  const totalAccess = m.sahAttempts + m.tidakSahAttempts + m.anomaliAttempts;

  return (
    <div className="space-y-6 pb-12">
      {/* Row 1: Sales Overview (Kiri) + Inventory Summary (Kanan) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sales Overview */}
        <section className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] lg:col-span-8">
          <h2 className="text-base font-semibold text-[#1D2939]">Sales Overview</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Sales */}
            <div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#E0F2FE] text-[#1570EF]">
                <ShoppingBag className="size-4.5" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-bold text-base text-[#1D2939] tnum">
                  Rp {m.activeBatches ? (m.activeBatches * 104).toLocaleString("id-ID") : "832"}
                </span>
                <span className="text-xs text-[#858D9D]">Sales</span>
              </div>
            </div>

            {/* Revenue */}
            <div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#F3E8FF] text-[#845EC2]">
                <BarChart2 className="size-4.5" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-bold text-base text-[#1D2939] tnum">Rp 18.300</span>
                <span className="text-xs text-[#858D9D]">Revenue</span>
              </div>
            </div>

            {/* Profit */}
            <div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#FFEDD5] text-[#F97316]">
                <TrendingUp className="size-4.5" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-bold text-base text-[#1D2939] tnum">Rp 868</span>
                <span className="text-xs text-[#858D9D]">Profit</span>
              </div>
            </div>

            {/* Cost */}
            <div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#10B981]">
                <Home className="size-4.5" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-bold text-base text-[#1D2939] tnum">Rp 17.432</span>
                <span className="text-xs text-[#858D9D]">Cost</span>
              </div>
            </div>
          </div>
        </section>

        {/* Inventory Summary */}
        <section className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] lg:col-span-4">
          <h2 className="text-base font-semibold text-[#1D2939]">Inventory Summary</h2>
          <div className="mt-5 grid grid-cols-2 gap-4">
            {/* Quantity in Hand */}
            <div className="flex flex-col items-center text-center">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#FFEDD5] text-[#F97316]">
                <Package className="size-4.5" />
              </div>
              <span className="mt-2.5 font-bold text-base text-[#1D2939] tnum">
                {m.inDistribution ? m.inDistribution * 100 + 68 : "868"}
              </span>
              <span className="mt-0.5 text-xs text-[#858D9D]">Quantity in Hand</span>
            </div>

            {/* To be received */}
            <div className="flex flex-col items-center text-center">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#F3E8FF] text-[#845EC2]">
                <MapPin className="size-4.5" />
              </div>
              <span className="mt-2.5 font-bold text-base text-[#1D2939] tnum">
                {m.awaitingReception ? m.awaitingReception * 50 : "200"}
              </span>
              <span className="mt-0.5 text-xs text-[#858D9D]">To be received</span>
            </div>
          </div>
        </section>
      </div>

      {/* Row 2: Purchase Overview (Kiri) + Product Summary (Kanan) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Purchase Overview */}
        <section className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] lg:col-span-8">
          <h2 className="text-base font-semibold text-[#1D2939]">Purchase Overview</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Purchase */}
            <div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#E0F2FE] text-[#1570EF]">
                <ShoppingBag className="size-4.5" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-bold text-base text-[#1D2939] tnum">
                  {totalAccess || "82"}
                </span>
                <span className="text-xs text-[#858D9D]">Purchase</span>
              </div>
            </div>

            {/* Cost */}
            <div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#10B981]">
                <Home className="size-4.5" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-bold text-base text-[#1D2939] tnum">Rp 13.573</span>
                <span className="text-xs text-[#858D9D]">Cost</span>
              </div>
            </div>

            {/* Cancel */}
            <div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#F3E8FF] text-[#845EC2]">
                <XCircle className="size-4.5" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-bold text-base text-[#1D2939] tnum">
                  {m.tidakSahAttempts || "5"}
                </span>
                <span className="text-xs text-[#858D9D]">Cancel</span>
              </div>
            </div>

            {/* Return */}
            <div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#FFEDD5] text-[#F97316]">
                <RotateCcw className="size-4.5" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-bold text-base text-[#1D2939] tnum">Rp 17.432</span>
                <span className="text-xs text-[#858D9D]">Return</span>
              </div>
            </div>
          </div>
        </section>

        {/* Product Summary */}
        <section className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] lg:col-span-4">
          <h2 className="text-base font-semibold text-[#1D2939]">Product Summary</h2>
          <div className="mt-5 grid grid-cols-2 gap-4">
            {/* Number of Suppliers */}
            <div className="flex flex-col items-center text-center">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#E0F2FE] text-[#1570EF]">
                <Users className="size-4.5" />
              </div>
              <span className="mt-2.5 font-bold text-base text-[#1D2939] tnum">
                {activePointsCount || "31"}
              </span>
              <span className="mt-0.5 text-xs text-[#858D9D]">Number of Suppliers</span>
            </div>

            {/* Number of Categories */}
            <div className="flex flex-col items-center text-center">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#F3E8FF] text-[#845EC2]">
                <FileText className="size-4.5" />
              </div>
              <span className="mt-2.5 font-bold text-base text-[#1D2939] tnum">21</span>
              <span className="mt-0.5 text-xs text-[#858D9D]">Number of Categories</span>
            </div>
          </div>
        </section>
      </div>

      {/* Row 3: Sales & Purchase (Kiri) + Order Summary (Kanan, border biru) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sales & Purchase Bar Chart */}
        <section className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] lg:col-span-8">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1D2939]">Sales & Purchase</h2>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] bg-white px-3 py-1.5 text-xs font-medium text-[#5D6679] hover:bg-gray-50 shadow-2xs"
            >
              <Calendar className="size-3.5 text-[#858D9D]" />
              <span>Weekly</span>
              <ChevronDown className="size-3.5 text-[#858D9D]" />
            </button>
          </div>
          <div className="mt-4">
            <SalesPurchaseBarChart height={280} />
            <div className="mt-3 flex items-center justify-center gap-6 text-xs text-[#5D6679]">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#5DD4EE]" /> Purchase
              </span>
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#10B981]" /> Sales
              </span>
            </div>
          </div>
        </section>

        {/* Order Summary (dengan Border Biru #1570EF) */}
        <section className="rounded-xl border-2 border-[#1570EF] bg-white p-5 shadow-[0_2px_8px_rgba(21,112,239,0.08)] lg:col-span-4 flex flex-col justify-between">
          <h2 className="text-base font-semibold text-[#1D2939]">Order Summary</h2>
          <div className="mt-4">
            <OrderSummaryCurveChart height={260} />
            <div className="mt-3 flex items-center justify-center gap-6 text-xs text-[#5D6679]">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#F59E0B]" /> Ordered
              </span>
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#60A5FA]" /> Delivered
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Row 4: Top Selling Stock (Kiri) + Low Quantity Stock (Kanan) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Top Selling Stock */}
        <section className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] lg:col-span-8">
          <div className="flex items-center justify-between border-b border-[#F0F1F3] pb-4">
            <h2 className="text-base font-semibold text-[#1D2939]">Top Selling Stock</h2>
            <Link
              href="/mainapp/batch"
              className="text-xs font-semibold text-[#1570EF] hover:underline"
            >
              See All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#F0F1F3] text-xs font-medium text-[#858D9D]">
                <tr>
                  <th className="py-3 pr-4">Name</th>
                  <th className="py-3 px-4">Sold Quantity</th>
                  <th className="py-3 px-4">Remaining Quantity</th>
                  <th className="py-3 pl-4 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F1F3] text-[#1D2939]">
                {m.attentionBatches.length > 0 ? (
                  m.attentionBatches.slice(0, 4).map((b) => (
                    <tr key={b.id} className="hover:bg-[#F9FAFB]">
                      <td className="py-3.5 pr-4 font-medium">
                        <Link href={`/mainapp/batch/${b.id}`} className="hover:text-[#1570EF]">
                          {b.productName || b.batchCode}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-[#5D6679] tnum">28</td>
                      <td className="py-3.5 px-4 text-[#5D6679] tnum">14</td>
                      <td className="py-3.5 pl-4 text-right font-medium tnum">Rp 140</td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr className="hover:bg-[#F9FAFB]">
                      <td className="py-3.5 pr-4 font-medium">Surf Excel</td>
                      <td className="py-3.5 px-4 text-[#5D6679] tnum">30</td>
                      <td className="py-3.5 px-4 text-[#5D6679] tnum">12</td>
                      <td className="py-3.5 pl-4 text-right font-medium tnum">Rp 100</td>
                    </tr>
                    <tr className="hover:bg-[#F9FAFB]">
                      <td className="py-3.5 pr-4 font-medium">Rin</td>
                      <td className="py-3.5 px-4 text-[#5D6679] tnum">21</td>
                      <td className="py-3.5 px-4 text-[#5D6679] tnum">15</td>
                      <td className="py-3.5 pl-4 text-right font-medium tnum">Rp 207</td>
                    </tr>
                    <tr className="hover:bg-[#F9FAFB]">
                      <td className="py-3.5 pr-4 font-medium">Parle G</td>
                      <td className="py-3.5 px-4 text-[#5D6679] tnum">19</td>
                      <td className="py-3.5 px-4 text-[#5D6679] tnum">17</td>
                      <td className="py-3.5 pl-4 text-right font-medium tnum">Rp 105</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Low Quantity Stock */}
        <section className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#F0F1F3] pb-4">
              <h2 className="text-base font-semibold text-[#1D2939]">Low Quantity Stock</h2>
              <Link
                href="/mainapp/batch"
                className="text-xs font-semibold text-[#1570EF] hover:underline"
              >
                See All
              </Link>
            </div>

            <ul className="divide-y divide-[#F0F1F3] mt-1">
              <li className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#FFF1F2] border border-[#FECDD3] text-[#E11D48] font-bold text-xs">
                    SALT
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[#1D2939]">Tata Salt</p>
                    <p className="text-xs text-[#858D9D]">Remaining Quantity : 10 Packet</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#FEE2E2] px-2.5 py-0.5 text-xs font-semibold text-[#DC2626]">
                  Low
                </span>
              </li>

              <li className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] font-bold text-xs">
                    LAYS
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[#1D2939]">Lays</p>
                    <p className="text-xs text-[#858D9D]">Remaining Quantity : 15 Packet</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#FEE2E2] px-2.5 py-0.5 text-xs font-semibold text-[#DC2626]">
                  Low
                </span>
              </li>

              <li className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] font-bold text-xs">
                    LAYS
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[#1D2939]">Lays</p>
                    <p className="text-xs text-[#858D9D]">Remaining Quantity : 15 Packet</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#FEE2E2] px-2.5 py-0.5 text-xs font-semibold text-[#DC2626]">
                  Low
                </span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
