import { Suspense } from "react";
import { DateRangePicker } from "./date-range-picker";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <Suspense>
        <DateRangePicker />
      </Suspense>
    </header>
  );
}
