"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "./utils";
import { Button } from "../common/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

interface MonthYearPickerProps {
  date?: string; // Format: "Month Year"
  onSelect: (date: string) => void;
  placeholder?: string;
  className?: string;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 11 }, (_, i) => (currentYear + i).toString());

export function MonthYearPicker({ date, onSelect, placeholder = "Pick a date", className }: MonthYearPickerProps) {
  const initialMonth = date ? date.split(" ")[0] : months[new Date().getMonth()];
  const initialYear = date ? date.split(" ")[1] : currentYear.toString();

  const [selectedMonth, setSelectedMonth] = React.useState(initialMonth);
  const [selectedYear, setSelectedYear] = React.useState(initialYear);

  const handleSelect = (month: string, year: string) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    onSelect(`${month} ${year}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal bg-card border-border hover:border-white/20 transition-all h-10",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-cyan-500" />
          {date ? date : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 bg-card border-border backdrop-blur-xl" align="start">
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Month</label>
            <Select value={selectedMonth} onValueChange={(m) => handleSelect(m, selectedYear)}>
              <SelectTrigger className="w-full bg-background/50">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Year</label>
            <Select value={selectedYear} onValueChange={(y) => handleSelect(selectedMonth, y)}>
              <SelectTrigger className="w-full bg-background/50">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
