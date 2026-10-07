"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

import { cn } from "./utils";
import { Button } from "../common/Button";
import { Calendar } from "./calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";

interface DateTimePickerProps {
  date?: Date;
  setDate: (date?: Date) => void;
  placeholder?: string;
  className?: string;
}

export function DateTimePicker({ date, setDate, placeholder = "Pick date & time", className }: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date);
  
  React.useEffect(() => {
    if (date && date.getTime() !== selectedDate?.getTime()) {
      setSelectedDate(date);
    }
  }, [date, selectedDate]);

  const handleDateSelect = (d: Date | undefined) => {
    if (!d) return;
    const newDate = new Date(d);
    if (selectedDate) {
      newDate.setHours(selectedDate.getHours());
      newDate.setMinutes(selectedDate.getMinutes());
    }
    setSelectedDate(newDate);
    setDate(newDate);
  };

  const handleTimeChange = (type: 'hours' | 'minutes', value: string) => {
    if (!selectedDate) return;
    const newDate = new Date(selectedDate);
    if (type === 'hours') newDate.setHours(parseInt(value));
    else newDate.setMinutes(parseInt(value));
    setSelectedDate(newDate);
    setDate(newDate);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal bg-card border-border hover:border-white/20 transition-all",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-cyan-500" />
          {date ? format(date, "PPP p") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-card border-border backdrop-blur-xl" align="start">
        <div className="p-3">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            className="bg-transparent"
          />
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock size={14} />
              <span className="text-xs font-medium uppercase tracking-wider">Time</span>
            </div>
            <div className="flex items-center gap-1">
              <select 
                value={selectedDate?.getHours() || 0}
                onChange={(e) => handleTimeChange('hours', e.target.value)}
                className="bg-muted border border-border rounded px-1 py-1 text-xs outline-none focus:border-cyan-500/50"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                ))}
              </select>
              <span className="text-muted-foreground">:</span>
              <select 
                value={selectedDate?.getMinutes() || 0}
                onChange={(e) => handleTimeChange('minutes', e.target.value)}
                className="bg-muted border border-border rounded px-1 py-1 text-xs outline-none focus:border-cyan-500/50"
              >
                {Array.from({ length: 60 }).map((_, i) => (
                  <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
