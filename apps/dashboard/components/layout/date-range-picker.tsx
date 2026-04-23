"use client";

import { useCallback, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { subDays, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const presets = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const today = new Date();
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const [from, setFrom] = useState<Date>(
    fromParam ? new Date(fromParam) : subDays(today, 30)
  );
  const [to, setTo] = useState<Date>(toParam ? new Date(toParam) : today);

  const updateUrl = useCallback(
    (newFrom: Date, newTo: Date) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("from", format(newFrom, "yyyy-MM-dd"));
      params.set("to", format(newTo, "yyyy-MM-dd"));
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const handlePreset = useCallback(
    (value: string | null) => {
      if (!value) return;
      const days = Number(value);
      const newFrom = subDays(today, days);
      const newTo = today;
      setFrom(newFrom);
      setTo(newTo);
      updateUrl(newFrom, newTo);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateUrl]
  );

  const handleCalendarSelect = useCallback(
    (range: { from?: Date; to?: Date } | undefined) => {
      if (range?.from) {
        setFrom(range.from);
        const newTo = range.to ?? range.from;
        setTo(newTo);
        if (range.to) {
          updateUrl(range.from, newTo);
        }
      }
    },
    [updateUrl]
  );

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger
          className={cn(
            buttonVariants({ variant: "outline" }),
            "justify-start text-left font-normal",
            !fromParam && !toParam && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {format(from, "MM/dd")} - {format(to, "MM/dd")}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={{ from, to }}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
            defaultMonth={subDays(today, 30)}
          />
        </PopoverContent>
      </Popover>

      <Select onValueChange={handlePreset}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Preset" />
        </SelectTrigger>
        <SelectContent>
          {presets.map((p) => (
            <SelectItem key={p.days} value={String(p.days)}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
