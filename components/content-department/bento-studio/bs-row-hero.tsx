"use client";

import Link from "next/link";
import { PlusIcon, FileText } from "lucide-react";
import { BsTile } from "./bs-tile";
import { SlotDistributionChart } from "@/components/evaluator/score-distribution-chart";
import type { ChartProject } from "@/components/evaluator/score-distribution-chart";

interface BsRowHeroProps {
  callReportsCount: number;
  episodesCount: number;
  chartProjects: ChartProject[];
}

function getISOWeek(): number {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function BsRowHero({ callReportsCount, episodesCount, chartProjects }: BsRowHeroProps) {
  const week = getISOWeek();

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Hero Tile */}
      <BsTile variant="gradient" className="flex-1 flex flex-col justify-between min-h-[280px] md:min-h-[300px]">
        {/* Badge */}
        <div className="flex items-center gap-[7px] bg-white/[0.18] rounded-full px-[13px] py-[7px] w-fit">
          <span className="w-[6px] h-[6px] rounded-full bg-[#B6FFDF]" />
          <span className="text-[10.5px] font-bold text-white tracking-wide">
            CYCLE W{week} · LIVE
          </span>
        </div>

        <div className="flex-1" />

        {/* Main Stat */}
        <div>
          <h2 className="text-[40px] md:text-[46px] font-extrabold text-white leading-[1.05] tracking-[-1.6px]">
            {episodesCount} episodes received
          </h2>
          <p className="text-[15px] text-white/[0.82] mt-2 leading-[1.5] max-w-[560px]">
            Across {callReportsCount} logged projects. Track evaluations, schedules, and deliveries.
          </p>
        </div>

        <div className="h-[22px]" />

        {/* CTA Buttons */}
        <div className="flex items-center gap-[10px]">
          <Link
            href="/content-department/log-call-report"
            className="flex items-center gap-2 bg-white text-[#15151A] rounded-[16px] px-5 py-3 text-[13.5px] font-bold hover:bg-white/90 transition-colors"
          >
            <PlusIcon className="w-[15px] h-[15px]" />
            Log a one-liner
          </Link>
          <Link
            href="/content-department/call-reports"
            className="flex items-center gap-2 border border-white/40 rounded-[16px] px-5 py-3 text-[13.5px] font-semibold text-white hover:bg-white/10 transition-colors"
          >
            <FileText className="w-[15px] h-[15px]" />
            View reports
          </Link>
        </div>
      </BsTile>

      {/* Coverage Tile */}
      <BsTile variant="white" className="w-full md:w-[400px] flex-shrink-0">
        <SlotDistributionChart projects={chartProjects} bare />
      </BsTile>
    </div>
  );
}
