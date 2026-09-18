import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Calendar, ChevronDown } from "lucide-react";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDbAdapter } from "@/server/db/adapter";
import { getReportMetrics } from "@/server/queries/internal";
import { formatDateTime } from "@/components/shared/handoff-timeline";
import { OrderSummaryCurveChart } from "@/components/shared/trend-charts";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) return null;
  const db = await getDbAdapter();
  const m = await getReportMetrics(db, session);

  return (
    <div className="space-y-6 pb-12">
      {/* Row 1: Overview (Kiri) + Best selling category (Kanan) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Overview Card */}
        <section className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] lg:col-span-8">
          <h2 className="text-base font-semibold text-[#1D2939]">Overview</h2>

          {/* Top 3 Metrics */}
          <div className="mt-5 grid grid-cols-3 gap-4 border-b border-[#F0F1F3] pb-5">
            <div>
              <p className="font-bold text-base text-[#1D2939] tnum">Rp 21.190</p>
              <p className="mt-0.5 text-xs text-[#858D9D]">Total Profit</p>
            </div>
            <div>
              <p className="font-bold text-base text-[#F97316] tnum">Rp 18.300</p>
              <p className="mt-0.5 text-xs text-[#858D9D]">Revenue</p>
            </div>
            <div>
              <p className="font-bold text-base text-[#845EC2] tnum">Rp 17.432</p>
              <p className="mt-0.5 text-xs text-[#858D9D]">Sales</p>
            </div>
          </div>

          {/* Bottom 4 Metrics */}
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="font-bold text-sm text-[#1D2939] tnum">Rp 117.432</p>
              <p className="mt-0.5 text-[11px] text-[#858D9D]">Net purchase value</p>
            </div>
            <div>
              <p className="font-bold text-sm text-[#1D2939] tnum">Rp 80.432</p>
              <p className="mt-0.5 text-[11px] text-[#858D9D]">Net sales value</p>
            </div>
            <div>
              <p className="font-bold text-sm text-[#1D2939] tnum">Rp 30.432</p>
              <p className="mt-0.5 text-[11px] text-[#858D9D]">MoM Profit</p>
            </div>
            <div>
              <p className="font-bold text-sm text-[#1D2939] tnum">Rp 110.432</p>
              <p className="mt-0.5 text-[11px] text-[#858D9D]">YoY Profit</p>
            </div>
          </div>
        </section>

        {/* Best selling category Card */}
        <section className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#F0F1F3] pb-3">
              <h2 className="text-base font-semibold text-[#1D2939]">Best selling category</h2>
              <Link
                href="/mainapp/batch"
                className="text-xs font-semibold text-[#1570EF] hover:underline"
              >
                See All
              </Link>
            </div>

            <table className="w-full text-left text-xs mt-2">
              <thead className="text-[#858D9D] font-normal border-b border-[#F0F1F3]">
                <tr>
                  <th className="py-2.5 font-normal">Category</th>
                  <th className="py-2.5 px-3 font-normal">Turn Over</th>
                  <th className="py-2.5 text-right font-normal">Increase By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F1F3] text-[#1D2939]">
                <tr>
                  <td className="py-3 font-medium">Vegetable</td>
                  <td className="py-3 px-3 text-[#5D6679]">Rp 26.000</td>
                  <td className="py-3 text-right font-semibold text-[#10B981]">3.2%</td>
                </tr>
                <tr>
                  <td className="py-3 font-medium">Instant Food</td>
                  <td className="py-3 px-3 text-[#5D6679]">Rp 22.000</td>
                  <td className="py-3 text-right font-semibold text-[#10B981]">2%</td>
                </tr>
                <tr>
                  <td className="py-3 font-medium">Households</td>
                  <td className="py-3 px-3 text-[#5D6679]">Rp 22.000</td>
                  <td className="py-3 text-right font-semibold text-[#10B981]">1.5%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Row 2: Profit & Revenue (Full width chart persis 04-reports.png) */}
      <section className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1D2939]">Profit & Revenue</h2>
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
          <OrderSummaryCurveChart height={280} />
          <div className="mt-3 flex items-center justify-center gap-6 text-xs text-[#5D6679]">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[#1570EF]" /> Revenue
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[#F59E0B]" /> Profit
            </span>
          </div>
        </div>
      </section>

      {/* Row 3: Best selling product (Persis 04-reports.png) */}
      <section className="rounded-xl border border-[#F0F1F3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between border-b border-[#F0F1F3] pb-4">
          <h2 className="text-base font-semibold text-[#1D2939]">Best selling product</h2>
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
                <th className="py-3.5 pr-4 font-normal">Product</th>
                <th className="py-3.5 px-4 font-normal">Product ID</th>
                <th className="py-3.5 px-4 font-normal">Category</th>
                <th className="py-3.5 px-4 font-normal">Remaining Quantity</th>
                <th className="py-3.5 px-4 font-normal">Turn Over</th>
                <th className="py-3.5 pl-4 text-right font-normal">Increase By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F1F3] text-[#1D2939]">
              <tr className="hover:bg-[#F9FAFB]">
                <td className="py-3.5 pr-4 font-medium">Tomato</td>
                <td className="py-3.5 px-4 text-[#5D6679] tnum">23567</td>
                <td className="py-3.5 px-4 text-[#5D6679]">Vegetable</td>
                <td className="py-3.5 px-4 text-[#5D6679] tnum">225 kg</td>
                <td className="py-3.5 px-4 text-[#5D6679] tnum">Rp 17.000</td>
                <td className="py-3.5 pl-4 text-right font-semibold text-[#10B981]">2.3%</td>
              </tr>
              <tr className="hover:bg-[#F9FAFB]">
                <td className="py-3.5 pr-4 font-medium">Onion</td>
                <td className="py-3.5 px-4 text-[#5D6679] tnum">25831</td>
                <td className="py-3.5 px-4 text-[#5D6679]">Vegetable</td>
                <td className="py-3.5 px-4 text-[#5D6679] tnum">200 kg</td>
                <td className="py-3.5 px-4 text-[#5D6679] tnum">Rp 12.000</td>
                <td className="py-3.5 pl-4 text-right font-semibold text-[#10B981]">1.3%</td>
              </tr>
              <tr className="hover:bg-[#F9FAFB]">
                <td className="py-3.5 pr-4 font-medium">Maggi</td>
                <td className="py-3.5 px-4 text-[#5D6679] tnum">56841</td>
                <td className="py-3.5 px-4 text-[#5D6679]">Instant Food</td>
                <td className="py-3.5 px-4 text-[#5D6679] tnum">200 Packet</td>
                <td className="py-3.5 px-4 text-[#5D6679] tnum">Rp 10.000</td>
                <td className="py-3.5 pl-4 text-right font-semibold text-[#10B981]">1.3%</td>
              </tr>
              <tr className="hover:bg-[#F9FAFB]">
                <td className="py-3.5 pr-4 font-medium">Surf Excel</td>
                <td className="py-3.5 px-4 text-[#5D6679] tnum">23567</td>
                <td className="py-3.5 px-4 text-[#5D6679]">Household</td>
                <td className="py-3.5 px-4 text-[#5D6679] tnum">125 Packet</td>
                <td className="py-3.5 px-4 text-[#5D6679] tnum">Rp 9.000</td>
                <td className="py-3.5 pl-4 text-right font-semibold text-[#10B981]">1%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
