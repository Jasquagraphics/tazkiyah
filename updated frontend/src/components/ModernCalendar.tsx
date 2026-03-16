import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ModernCalendarProps {
  value: string;
  onChange: (date: string) => void;
}

export default function ModernCalendar({ value, onChange }: ModernCalendarProps) {
  const [currentDate, setCurrentDate] = useState(value ? new Date(value) : new Date());
  const [showPicker, setShowPicker] = useState(false);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = [];
  const totalDays = daysInMonth(year, month);
  const offset = firstDayOfMonth(year, month);

  for (let i = 0; i < offset; i++) {
    days.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleDateClick = (day: number) => {
    const selectedDate = new Date(year, month, day);
    const formattedDate = selectedDate.toISOString().split('T')[0];
    onChange(formattedDate);
    setShowPicker(false);
  };

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

  const isSelected = (day: number) => {
    if (!value) return false;
    const d = new Date(value);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  };

  return (
    <div className="relative w-full max-w-xs">
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="w-full px-4 md:px-6 py-4 md:py-5 rounded-2xl bg-white/5 border border-white/5 hover:border-brand-primary/50 transition-all flex items-center justify-between group"
      >
        <span className="font-black text-sm text-white/80">
          {value ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Select Release Date'}
        </span>
        <CalendarIcon className="w-5 h-5 text-white/20 group-hover:text-brand-primary transition-colors" />
      </button>

      <AnimatePresence>
        {showPicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full left-0 mt-4 w-80 bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-6 shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <button type="button" onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h4 className="font-black text-white text-sm uppercase tracking-widest">
                  {monthNames[month]} {year}
                </h4>
                <button type="button" onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} className="text-center text-[8px] font-black text-white/20 uppercase tracking-widest py-2">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => (
                  <div key={i} className="aspect-square">
                    {day && (
                      <button
                        type="button"
                        onClick={() => handleDateClick(day)}
                        className={`w-full h-full rounded-xl text-[10px] font-black transition-all flex items-center justify-center
                          ${isSelected(day) 
                            ? 'vibrant-gradient text-white shadow-lg shadow-brand-primary/20' 
                            : isToday(day)
                              ? 'bg-brand-primary/10 text-brand-primary'
                              : 'text-white/40 hover:bg-white/5 hover:text-white'
                          }`}
                      >
                        {day}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
