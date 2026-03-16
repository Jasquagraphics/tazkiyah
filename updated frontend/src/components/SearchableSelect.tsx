import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export default function SearchableSelect({ options, value, onChange, placeholder = "Search...", label }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

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
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-left flex items-center justify-between hover:border-brand-primary/50 transition-all"
        >
          <span className={`text-xs font-bold ${selectedOption ? 'text-white' : 'text-white/30'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={`w-4 h-4 text-white/20 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute z-50 w-full mt-2 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-3 border-b border-white/5">
                <div className="relative">
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
              </div>
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {filteredOptions.length === 0 ? (
                  <div className="p-4 text-center text-[10px] font-black text-white/20 uppercase tracking-widest">No results</div>
                ) : (
                  filteredOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={`w-full px-4 py-3 text-left text-xs font-bold flex items-center justify-between hover:bg-brand-primary/10 transition-colors ${opt.value === value ? 'text-brand-primary bg-brand-primary/5' : 'text-white/60'}`}
                    >
                      {opt.label}
                      {opt.value === value && <Check className="w-3.5 h-3.5" />}
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
