"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MoodFace } from "@/components/ui/MoodFace";
import { averageMood, buildMoodSeries } from "@/lib/personal/mood";
import type { Mood, MoodEntry } from "@/lib/personal/types";

interface Datum {
  date: string;
  label: string;
  mood: Mood | null;
}

function ChartTooltip({
  active,
  payload,
  names,
}: {
  active?: boolean;
  payload?: { payload: Datum }[];
  names: Record<number, string>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point || point.mood === null) return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2 text-fg shadow-soft">
      <span className="text-primary-strong">
        <MoodFace mood={point.mood} size={28} />
      </span>
      <div>
        <p className="text-xs text-muted">{point.label}</p>
        <p className="font-semibold">{names[point.mood]}</p>
      </div>
    </div>
  );
}

/**
 * Mood over the last 30 days. One series, so no legend; the line is 2px with 8px markers, the grid is
 * recessive, and a table view gives screen-reader and keyboard users the same numbers.
 */
export function MoodChart({ entries }: { entries: MoodEntry[] }) {
  const t = useTranslations("me");
  const tm = useTranslations("moods");
  const format = useFormatter();

  const names: Record<number, string> = { 1: tm("1"), 2: tm("2"), 3: tm("3"), 4: tm("4"), 5: tm("5") };
  const series = useMemo(() => buildMoodSeries(entries, 30), [entries]);
  const average = averageMood(series);
  const data: Datum[] = series.map((p) => ({
    ...p,
    label: format.dateTime(new Date(`${p.date}T12:00:00`), { day: "numeric", month: "long" }),
  }));
  const shortDate = (date: string) =>
    format.dateTime(new Date(`${date}T12:00:00`), { day: "numeric", month: "short" });
  const recorded = data.filter((d) => d.mood !== null);

  if (recorded.length === 0) {
    return <p className="rounded-2xl bg-surface-2 p-5 text-muted">{t("moodEmpty")}</p>;
  }

  return (
    <div>
      {average !== null && <p className="mb-2 font-semibold">{t("moodAverage", { value: average })}</p>}
      <div role="img" aria-label={t("moodChart")} className="h-64 w-full text-primary-strong">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              interval={6}
              tickLine={false}
              axisLine={{ stroke: "var(--border-strong)" }}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              tickMargin={8}
            />
            <YAxis
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              width={44}
            />
            <Tooltip
              content={<ChartTooltip names={names} />}
              cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="mood"
              stroke="currentColor"
              strokeWidth={2}
              connectNulls={false}
              dot={{ r: 4, fill: "currentColor", stroke: "var(--surface)", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "currentColor", stroke: "var(--surface)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <details className="mt-3">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-primary-strong">
          {t("moodTable")}
        </summary>
        <table className="mt-2 w-full max-w-sm text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 pr-4 font-semibold">{t("moodDate")}</th>
              <th className="py-1 font-semibold">{t("moodValue")}</th>
            </tr>
          </thead>
          <tbody>
            {recorded.map((d) => (
              <tr key={d.date} className="border-t border-border">
                <td className="py-1.5 pr-4">{d.label}</td>
                <td className="py-1.5">
                  {d.mood} — {names[d.mood as number]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
