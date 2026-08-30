import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  expectedPerDay,
  scheduleLabel,
} from "@/lib/writers/commitment-utils";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(d: string | null): string {
  if (!d) return "";
  const dt = new Date(d);
  const day = dt.getDate();
  const mon = MONTH_SHORT[dt.getMonth()];
  const yr = String(dt.getFullYear()).slice(2);
  return `${day}-${mon}-${yr}`;
}

function fmtNum(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const [
      { data: commitments },
      { data: waadas },
      { data: episodes },
      { data: callReports },
      { data: manualRows },
    ] = await Promise.all([
      admin.from("writer_commitments")
        .select("id, call_report_id, writer_id, commitment_schedule, project_initiation_date, commitment_date, revised_commitment_date, is_delivered"),
      admin.from("writer_waadas")
        .select("id, writer_commitment_id, waada_number, start_date, end_date, commitment_per_week")
        .order("waada_number"),
      admin.from("episodes")
        .select("id, call_report_id, created_at")
        .eq("is_current", true),
      admin.from("call_reports")
        .select("id, working_title, writer_name, total_episodes, team_id, target_slot, team:teams!call_reports_team_id_fkey(name, team_head:users!teams_team_head_id_fkey(name))")
        .is("archived_at", null)
        .eq("meeting_type", "call_report"),
      admin.from("delivery_rate_manual")
        .select("*"),
    ]);

    // Maps
    const manualMap = new Map<string, any>();
    for (const m of manualRows || []) manualMap.set(m.writer_commitment_id, m);

    const epMap = new Map<string, { count: number; dates: Date[]; firstDate: Date | null }>();
    for (const ep of episodes || []) {
      if (!ep.call_report_id) continue;
      const e = epMap.get(ep.call_report_id) || { count: 0, dates: [], firstDate: null };
      e.count++;
      const d = new Date(ep.created_at);
      e.dates.push(d);
      if (!e.firstDate || d < e.firstDate) e.firstDate = d;
      epMap.set(ep.call_report_id, e);
    }

    const waadaMap = new Map<string, any[]>();
    for (const w of waadas || []) {
      const arr = waadaMap.get(w.writer_commitment_id) || [];
      arr.push(w);
      waadaMap.set(w.writer_commitment_id, arr);
    }

    const crMap = new Map((callReports || []).map((cr) => [cr.id, cr]));
    const now = new Date();

    // Month columns
    const monthStart = new Date(2026, 0, 1);
    const latestMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthColumns: string[] = [];
    for (let d = new Date(monthStart); d <= latestMonth; d.setMonth(d.getMonth() + 1)) {
      monthColumns.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    // Build project rows grouped by team
    type ProjectData = {
      title: string; writer: string; slot: string; totalEps: number | null;
      inHand: number; contractDate: string | null; deadline: string | null;
      std: { cpw: number; cpmo: number; totalCmtd: number; firstEp: string | null; weeks: number; months: number; inHand: number; rateMo: number; ratePct: number };
      waadas: { num: number; start: string; end: string | null; weeks: number; cpw: number; cpmo: number; cmtd: number; cumCmtd: number | null; rcvd: number; cumRcvd: number | null; months: number; rateMo: number; ratePct: number }[];
      summaryRates: { standard: number; w1: number | null; w2: number | null; w3: number | null; w4: number | null };
      monthlyEps: Record<string, number>;
    };

    const teamGroups = new Map<string, { teamName: string; projects: ProjectData[] }>();

    for (const wc of commitments || []) {
      const cr = crMap.get(wc.call_report_id);
      if (!cr) continue;

      const manual = manualMap.get(wc.id);
      const ep = epMap.get(cr.id);

      const schedule = wc.commitment_schedule;
      const scheduleRate = expectedPerDay(schedule);
      const stdCpw = manual?.standard_cpw != null ? Number(manual.standard_cpw) : scheduleRate * 7;
      const stdCpmo = stdCpw * (30 / 7);
      const actualEps = manual?.in_hand_eps != null ? Number(manual.in_hand_eps) : (ep?.count || 0);
      const firstDate = ep?.firstDate || null;

      const startRef = new Date(wc.project_initiation_date);
      const msElapsed = now.getTime() - startRef.getTime();
      const weeks = Math.max(msElapsed / (1000 * 60 * 60 * 24 * 7), 0.1);
      const months = Math.max(msElapsed / (1000 * 60 * 60 * 24 * 30), 0.1);

      let totalCommitted: number;
      if (manual?.standard_total_committed != null) {
        totalCommitted = Number(manual.standard_total_committed);
      } else {
        totalCommitted = stdCpw * weeks;
        if (cr.total_episodes) totalCommitted = Math.min(totalCommitted, cr.total_episodes);
      }

      const deliveryRatePerMonth = months > 0 ? actualEps / months : 0;
      const standardRate = totalCommitted > 0 ? Math.round((actualEps / totalCommitted) * 100) : 0;

      const team: any = Array.isArray(cr.team) ? cr.team[0] : cr.team;
      const head: any = team?.team_head ? (Array.isArray(team.team_head) ? team.team_head[0] : team.team_head) : null;
      const teamDisplay = head?.name ? `Team ${head.name.split(" ")[0]}` : team?.name || "Unknown";
      const teamKey = cr.team_id || "unknown";

      // Waada details
      const wcWaadas = waadaMap.get(wc.id) || [];
      const waadaDetails: ProjectData["waadas"] = wcWaadas.map((w: any) => {
        const wStart = new Date(w.start_date);
        const wEndRaw = w.end_date ? new Date(w.end_date) : null;
        const wEnd = wEndRaw && wEndRaw <= now ? wEndRaw : now;
        const wMs = wEnd.getTime() - wStart.getTime();
        const wpw = Number(w.commitment_per_week);
        const wPerMonth = wpw * 4;

        const wKey = `w${w.waada_number}` as "w1" | "w2" | "w3" | "w4";
        const manualWeeks = manual?.[`${wKey}_no_of_weeks`];
        const wWeeks = manualWeeks != null ? Number(manualWeeks) : Math.max(wMs / (1000 * 60 * 60 * 24 * 7), 0.1);
        const wMonths = Math.max(wMs / (1000 * 60 * 60 * 24 * 30), 0.1);
        const wCommitted = wpw * wWeeks;

        const manualEps = manual?.[`${wKey}_eps_received`];
        let epsInRange: number;
        if (manualEps != null) {
          epsInRange = Number(manualEps);
        } else {
          const epEnd = wEndRaw || now;
          epsInRange = (ep?.dates || []).filter((d: Date) => d >= wStart && d <= epEnd).length;
        }

        const wRate = wCommitted > 0 ? Math.round((epsInRange / wCommitted) * 100) : 0;
        const wRatePerMonth = wMonths > 0 ? epsInRange / wMonths : 0;

        return {
          num: w.waada_number,
          start: w.start_date,
          end: w.end_date,
          weeks: Math.round(wWeeks * 10) / 10,
          cpw: wpw,
          cpmo: Math.round(wPerMonth * 10) / 10,
          cmtd: Math.round(wCommitted * 10) / 10,
          cumCmtd: null as number | null,
          rcvd: epsInRange,
          cumRcvd: null as number | null,
          months: Math.round(wMonths * 10) / 10,
          rateMo: Math.round(wRatePerMonth * 10) / 10,
          ratePct: wRate,
        };
      });

      waadaDetails.sort((a, b) => a.num - b.num);
      let cumCommitted = 0, cumReceived = 0;
      for (const wd of waadaDetails) {
        cumCommitted += wd.cmtd;
        cumReceived += wd.rcvd;
        if (wd.num >= 2) {
          wd.cumCmtd = Math.round(cumCommitted * 10) / 10;
          wd.cumRcvd = cumReceived;
        }
      }

      // Monthly episodes
      const monthly: Record<string, number> = {};
      for (const col of monthColumns) monthly[col] = 0;
      if (ep?.dates) {
        for (const d of ep.dates) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (monthly[key] !== undefined) monthly[key]++;
        }
      }

      const proj: ProjectData = {
        title: cr.working_title || "Untitled",
        writer: cr.writer_name || "Unknown",
        slot: cr.target_slot || "",
        totalEps: cr.total_episodes || null,
        inHand: actualEps,
        contractDate: wc.commitment_date || null,
        deadline: wc.revised_commitment_date || wc.commitment_date || null,
        std: {
          cpw: Math.round(stdCpw * 10) / 10,
          cpmo: Math.round(stdCpmo * 10) / 10,
          totalCmtd: Math.round(totalCommitted * 10) / 10,
          firstEp: firstDate ? firstDate.toISOString().slice(0, 10) : null,
          weeks: Math.round(weeks * 10) / 10,
          months: Math.round(months * 10) / 10,
          inHand: actualEps,
          rateMo: Math.round(deliveryRatePerMonth * 10) / 10,
          ratePct: stdCpw > 0 ? standardRate : -1,
        },
        waadas: waadaDetails,
        summaryRates: {
          standard: stdCpw > 0 ? standardRate : -1,
          w1: waadaDetails.find((w) => w.num === 1)?.ratePct ?? null,
          w2: waadaDetails.find((w) => w.num === 2)?.ratePct ?? null,
          w3: waadaDetails.find((w) => w.num === 3)?.ratePct ?? null,
          w4: waadaDetails.find((w) => w.num === 4)?.ratePct ?? null,
        },
        monthlyEps: monthly,
      };

      const g = teamGroups.get(teamKey) || { teamName: teamDisplay, projects: [] as ProjectData[] };
      g.projects.push(proj);
      teamGroups.set(teamKey, g);
    }

    // Sort projects within each team by standard rate ascending
    for (const g of teamGroups.values()) {
      g.projects.sort((a, b) => {
        const ra = a.std.ratePct === -1 ? 999 : a.std.ratePct;
        const rb = b.std.ratePct === -1 ? 999 : b.std.ratePct;
        return ra - rb;
      });
    }

    // Build Excel workbook
    const wb = new ExcelJS.Workbook();

    for (const [, group] of teamGroups) {
      // Max waadas in this team
      const maxWaada = group.projects.reduce((mx, p) => Math.max(mx, p.waadas.length), 0);
      const waadaNums = Array.from({ length: maxWaada }, (_, i) => i + 1);

      const ws = wb.addWorksheet(group.teamName.slice(0, 31)); // Excel 31-char limit

      // --- Row 1: Group headers (merged) ---
      const headerRow1: string[] = [];
      // Summary: 7 cols
      headerRow1.push("Summary", "", "", "", "", "", "");
      // Standard: 10 cols
      headerRow1.push("Standard", "", "", "", "", "", "", "", "", "");
      // Each waada: W1=10, W2+=12
      for (const n of waadaNums) {
        const count = n === 1 ? 10 : 12;
        headerRow1.push(`Waada ${String(n).padStart(2, "0")}`);
        for (let i = 1; i < count; i++) headerRow1.push("");
      }
      // Waada Summary %
      if (maxWaada > 0) {
        headerRow1.push("Waada Summary %");
        for (let i = 0; i < maxWaada; i++) headerRow1.push("");
      }
      // Monthly Episodes
      if (monthColumns.length > 0) {
        headerRow1.push("Monthly Episodes Received");
        for (let i = 1; i < monthColumns.length; i++) headerRow1.push("");
      }

      const r1 = ws.addRow(headerRow1);

      // Merge group header cells
      let col = 1;
      // Summary: cols 1-7
      ws.mergeCells(1, 1, 1, 7);
      col = 8;
      // Standard: cols 8-17
      ws.mergeCells(1, 8, 1, 17);
      col = 18;
      // Waadas
      for (const n of waadaNums) {
        const count = n === 1 ? 10 : 12;
        ws.mergeCells(1, col, 1, col + count - 1);
        col += count;
      }
      // Waada Summary %
      if (maxWaada > 0) {
        ws.mergeCells(1, col, 1, col + maxWaada);
        col += maxWaada + 1;
      }
      // Monthly Episodes
      if (monthColumns.length > 0) {
        ws.mergeCells(1, col, 1, col + monthColumns.length - 1);
      }

      // Style group headers
      r1.eachCell((cell) => {
        cell.font = { bold: true, size: 9 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EDFB" } };
        cell.border = { bottom: { style: "thin" } };
      });

      // --- Row 2: Column headers ---
      const headerRow2: string[] = [
        // Summary
        "Title", "Writer", "Slot", "Total Eps", "In Hand", "Contract Date", "Deadline",
        // Standard
        "Commit/wk", "Commit/mo", "Total Committed", "1st Ep Date", "Weeks", "As of", "Months", "In Hand", "Rate/mo", "Rate %",
      ];
      // Waada column headers
      for (const n of waadaNums) {
        headerRow2.push("Start", "End", "Wks", "Cmit/wk", "Cmit/mo", "Total Cmtd");
        if (n >= 2) headerRow2.push(`Cmtd Till W${n}`);
        headerRow2.push("Rcvd");
        if (n >= 2) headerRow2.push(`In Hand Till W${n}`);
        headerRow2.push("Months", "Rate/mo", "Rate %");
      }
      // Waada Summary %
      if (maxWaada > 0) {
        headerRow2.push("Std %");
        for (const n of waadaNums) headerRow2.push(`W${n} %`);
      }
      // Monthly columns
      for (const mc of monthColumns) {
        const [y, m] = mc.split("-");
        headerRow2.push(`${MONTH_SHORT[parseInt(m) - 1]} ${y.slice(2)}`);
      }

      const r2 = ws.addRow(headerRow2);
      r2.eachCell((cell) => {
        cell.font = { bold: true, size: 8 };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
        cell.border = { bottom: { style: "medium" } };
      });

      // --- Data rows ---
      for (const p of group.projects) {
        const row: (string | number)[] = [
          p.title,
          p.writer,
          p.slot,
          p.totalEps ?? "",
          p.inHand,
          fmtDate(p.contractDate),
          fmtDate(p.deadline),
          // Standard
          p.std.cpw > 0 ? p.std.cpw : "",
          p.std.cpmo > 0 ? p.std.cpmo : "",
          p.std.totalCmtd > 0 ? p.std.totalCmtd : "",
          fmtDate(p.std.firstEp),
          p.std.weeks > 0 ? p.std.weeks : "",
          fmtDate(new Date().toISOString().slice(0, 10)),
          p.std.months > 0 ? p.std.months : "",
          p.std.inHand,
          p.std.rateMo > 0 ? p.std.rateMo : "",
          p.std.ratePct < 0 ? "N/A" : `${p.std.ratePct}%`,
        ];

        // Waada data
        for (const n of waadaNums) {
          const wd = p.waadas.find((w) => w.num === n);
          if (wd) {
            row.push(
              fmtDate(wd.start),
              fmtDate(wd.end),
              wd.weeks,
              wd.cpw,
              wd.cpmo,
              wd.cmtd,
            );
            if (n >= 2) row.push(wd.cumCmtd !== null ? wd.cumCmtd : "");
            row.push(wd.rcvd);
            if (n >= 2) row.push(wd.cumRcvd !== null ? wd.cumRcvd : "");
            row.push(wd.months, wd.rateMo, `${wd.ratePct}%`);
          } else {
            // Empty waada
            const colCount = n === 1 ? 10 : 12;
            for (let i = 0; i < colCount; i++) row.push("");
          }
        }

        // Waada Summary %
        if (maxWaada > 0) {
          row.push(p.summaryRates.standard < 0 ? "N/A" : `${p.summaryRates.standard}%`);
          for (const n of waadaNums) {
            const key = `w${n}` as keyof typeof p.summaryRates;
            const r = p.summaryRates[key];
            row.push(r !== null ? `${r}%` : "");
          }
        }

        // Monthly episodes
        for (const mc of monthColumns) {
          row.push(p.monthlyEps[mc] || "");
        }

        const dataRow = ws.addRow(row);
        dataRow.eachCell((cell) => {
          cell.font = { size: 9 };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = { bottom: { style: "thin", color: { argb: "FFE0E0E0" } } };
        });
        // Left-align title and writer
        dataRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
        dataRow.getCell(2).alignment = { horizontal: "left", vertical: "middle" };

        // Color-code rate % cells
        const rateColIndices: number[] = [];
        // Standard Rate % is column 17
        rateColIndices.push(17);
        // Waada Rate % columns
        let wCol = 18;
        for (const n of waadaNums) {
          const count = n === 1 ? 10 : 12;
          rateColIndices.push(wCol + count - 1); // last col in waada group is Rate %
          wCol += count;
        }
        // Summary % columns
        if (maxWaada > 0) {
          rateColIndices.push(wCol); // Std %
          for (let i = 0; i < waadaNums.length; i++) {
            rateColIndices.push(wCol + 1 + i);
          }
        }

        for (const ci of rateColIndices) {
          const cell = dataRow.getCell(ci);
          const val = String(cell.value || "");
          const num = parseInt(val);
          if (!isNaN(num)) {
            let argb = "";
            if (num >= 85) argb = "FFD5F5E3";
            else if (num >= 80) argb = "FFE5E7EB";
            else if (num >= 60) argb = "FFFEF3C7";
            else argb = "FFFECACA";
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
            cell.font = { bold: true, size: 9 };
          }
        }
      }

      // Auto-size columns (approximate)
      ws.columns.forEach((col) => {
        let maxLen = 10;
        col.eachCell?.({ includeEmpty: false }, (cell) => {
          const len = String(cell.value || "").length;
          if (len > maxLen) maxLen = len;
        });
        col.width = Math.min(maxLen + 2, 22);
      });
      // Title and Writer wider
      ws.getColumn(1).width = 25;
      ws.getColumn(2).width = 18;

      // Freeze first 2 rows and first 2 columns
      ws.views = [{ state: "frozen", xSplit: 2, ySplit: 2 }];
    }

    // Generate buffer
    const buffer = await wb.xlsx.writeBuffer();

    const today = new Date().toISOString().slice(0, 10);
    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Delivery Rate - All Teams (${today}).xlsx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
