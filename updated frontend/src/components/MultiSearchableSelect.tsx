import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Option {
  value: string;
  label: string;
}

interface MultiSearchableSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
}

export default function MultiSearchableSelect({ options, value, onChange, placeholder = "Select...", label }: MultiSearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter(v => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">{label}</label>}
      <div className="relative">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-wrap gap-2 items-center min-h-[46px] cursor-pointer hover:border-brand-primary/50 transition-all"
        >
          {value.length === 0 ? (
            <span className="text-xs font-bold text-white/30">{placeholder}</span>
          ) : (
            value.map(val => {
              const opt = options.find(o => o.value === val);
              return (
                <span key={val} className="bg-brand-primary/10 text-brand-primary text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex items-center gap-1.5 border border-brand-primary/20">
                  {opt?.label || val}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-white" 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(val);
                    }}
                  />
                </span>
              );
            })
          )}
          <ChevronDown className={`w-4 h-4 text-white/20 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute z-50 w-full mt-2 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-3 border-b border-white/5 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                  <input
                    type="text"
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/5 rounded-xl text-xs outline-none focus:border-brand-primary/50"
                  />
                </div>
                <button 
                  onClick={() => onChange(options.map(o => o.value))}
                  className="text-[10px] font-black text-brand-primary uppercase tracking-widest hover:text-white transition-colors"
                >
                  All
                </button>
                <button 
                  onClick={() => onChange([])}
                  className="text-[10px] font-black text-rose-400 uppercase tracking-widest hover:text-white transition-colors"
                >
                  None
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {filteredOptions.length === 0 ? (
                  <div className="p-4 text-center text-[10px] font-black text-white/20 uppercase tracking-widest">No results</div>
                ) : (
                  filteredOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleOption(opt.value)}
                      className={`w-full px-4 py-3 text-left text-xs font-bold flex items-center justify-between hover:bg-brand-primary/10 transition-colors ${value.includes(opt.value) ? 'text-brand-primary bg-brand-primary/5' : 'text-white/60'}`}
                    >
                      {opt.label}
                      {value.includes(opt.value) && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
