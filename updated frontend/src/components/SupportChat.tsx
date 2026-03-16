import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  X, 
  ChevronRight, 
  User as UserIcon,
  Clock,
  CheckCircle2,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Ticket, TicketMessage } from '../types';

interface SupportChatProps {
  user: User;
}

export default function SupportChat({ user }: SupportChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'closed' | 'unread'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTickets();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
      const interval = setInterval(() => fetchMessages(selectedTicket.id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedTicket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTickets = async () => {
    const endpoint = user.role === 'admin' ? '/api/admin/tickets' : '/api/artist/tickets';
    const res = await fetch(endpoint, {
      headers: { 'x-user-id': user.id.toString() }
    });
    const data = await res.json();
    setTickets(data);
  };

  const fetchMessages = async (ticketId: number) => {
    const res = await fetch(`/api/tickets/${ticketId}/messages`, {
      headers: { 'x-user-id': user.id.toString() }
    });
    const data = await res.json();
    setMessages(data);
    
    // Update local ticket unread status
    setTickets(prev => prev.map(t => 
      t.id === ticketId 
        ? { ...t, is_admin_read: user.role === 'admin' ? 1 : t.is_admin_read, is_user_read: user.role === 'artist' ? 1 : t.is_user_read } 
        : t
    ));
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject || !newMessage) return;
    setLoading(true);

    try {
      const res = await fetch('/api/artist/tickets', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({ subject: newTicketSubject, message: newMessage })
      });
      const data = await res.json();
      setShowNewTicketForm(false);
      setNewTicketSubject('');
      setNewMessage('');
      fetchTickets();
      const nowIso = new Date().toISOString();
      setSelectedTicket({ id: data.id, user_id: user.id, subject: newTicketSubject, status: 'open', created_at: nowIso, updated_at: nowIso });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || (!newMessage && !file)) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('sender_id', user.id.toString());
    formData.append('message', newMessage);
    if (file) formData.append('file', file);

    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        setNewMessage('');
        setFile(null);
        fetchMessages(selectedTicket.id);
        fetchTickets(); // Refresh ticket list for updated_at
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (ticketId: number, status: 'open' | 'closed') => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status });
        }
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filter === 'open') return t.status === 'open';
    if (filter === 'closed') return t.status === 'closed';
    if (filter === 'unread') {
      return user.role === 'admin' ? t.is_admin_read === 0 : t.is_user_read === 0;
    }
    return true;
  });

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 md:bottom-10 right-6 md:right-10 w-16 h-16 vibrant-gradient rounded-full flex items-center justify-center text-white shadow-2xl shadow-brand-primary/40 hover:scale-110 active:scale-95 transition-all z-40 group"
      >
        <MessageSquare className="w-7 h-7 group-hover:rotate-12 transition-transform" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#030014] animate-pulse" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:justify-end md:p-10 pointer-events-none">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={() => setIsOpen(false)} />
            
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              className="w-full md:w-[450px] h-[80vh] md:h-[700px] bg-[#0a0a0a] border border-white/10 md:rounded-[40px] shadow-2xl flex flex-col overflow-hidden pointer-events-auto relative z-10"
            >
              {/* Header */}
              <div className="p-6 md:p-8 vibrant-gradient flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/20 flex items-center justify-center text-white">
                    <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-black text-white tracking-tight">Support Center</h3>
                    <p className="text-white/60 text-[9px] md:text-[10px] font-black uppercase tracking-widest">We're here to help</p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden flex flex-col bg-[#030014]">
                {!selectedTicket && !showNewTicketForm ? (
                  <div className="flex-1 flex flex-col">
                    <div className="p-6 md:p-8 pb-0">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Support Tickets</h4>
                        {user.role === 'artist' && (
                          <button 
                            onClick={() => setShowNewTicketForm(true)}
                            className="text-brand-primary font-black text-[10px] uppercase tracking-widest hover:underline"
                          >
                            New Ticket
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                        {(['all', 'open', 'closed', 'unread'] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                              filter === f ? "bg-brand-primary text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
                            )}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-6 md:p-8 pt-0 flex-1 overflow-y-auto space-y-4">
                      {filteredTickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/10 mb-4">
                            <MessageSquare className="w-8 h-8" />
                          </div>
                          <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">No tickets found</p>
                        </div>
                      ) : (
                        filteredTickets.map(ticket => (
                          <button 
                            key={ticket.id}
                            onClick={() => setSelectedTicket(ticket)}
                            className="w-full p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all text-left group relative"
                          >
                            {((user.role === 'admin' && ticket.is_admin_read === 0) || (user.role === 'artist' && ticket.is_user_read === 0)) && (
                              <div className="absolute top-6 right-6 w-2 h-2 bg-brand-primary rounded-full shadow-lg shadow-brand-primary/50" />
                            )}
                            <div className="flex items-center justify-between mb-2">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                                ticket.status === 'open' ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/40"
                              )}>
                                {ticket.status}
                              </span>
                              <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                                {new Date(ticket.updated_at || ticket.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <h5 className="text-white font-black tracking-tight mb-1 group-hover:text-brand-primary transition-colors">{ticket.subject}</h5>
                            {user.role === 'admin' && (
                              <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-2">{ticket.artist_name} • {ticket.artist_email}</p>
                            )}
                            <p className="text-white/40 text-[10px] truncate font-medium">{ticket.last_message || 'No messages yet'}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : showNewTicketForm ? (
                  <div className="flex-1 p-8 overflow-y-auto">
                    <button onClick={() => setShowNewTicketForm(false)} className="text-white/40 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 mb-8 hover:text-white transition-all">
                      Back to list
                    </button>
                    <h4 className="text-2xl font-black text-white tracking-tight mb-8">Create New Ticket</h4>
                    <form onSubmit={handleCreateTicket} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Subject</label>
                        <input 
                          type="text" 
                          value={newTicketSubject}
                          onChange={e => setNewTicketSubject(e.target.value)}
                          placeholder="What do you need help with?"
                          className="w-full px-6 py-5 rounded-2xl outline-none font-black text-sm bg-white/5 border border-white/5 focus:border-brand-primary transition-all text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Message</label>
                        <textarea 
                          value={newMessage}
                          onChange={e => setNewMessage(e.target.value)}
                          placeholder="Describe your issue in detail..."
                          rows={5}
                          className="w-full px-6 py-5 rounded-2xl outline-none font-black text-sm bg-white/5 border border-white/5 focus:border-brand-primary transition-all text-white resize-none"
                        />
                      </div>
                      <button 
                        type="submit"
                        disabled={loading || !newTicketSubject || !newMessage}
                        className="w-full vibrant-gradient text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                      >
                        {loading ? 'Creating...' : 'Submit Ticket'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                      <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all text-white/40">
                          <ChevronRight className="w-5 h-5 rotate-180" />
                        </button>
                        <div>
                          <h4 className="text-sm font-black text-white tracking-tight">{selectedTicket?.subject}</h4>
                          <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Ticket #{selectedTicket?.id}</p>
                        </div>
                      </div>
                      
                      {user.role === 'admin' && selectedTicket?.status === 'open' && (
                        <button 
                          onClick={() => handleUpdateStatus(selectedTicket.id, 'closed')}
                          className="px-4 py-2 bg-rose-500/10 text-rose-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all"
                        >
                          Close Ticket
                        </button>
                      )}
                      {user.role === 'admin' && selectedTicket?.status === 'closed' && (
                        <button 
                          onClick={() => handleUpdateStatus(selectedTicket.id, 'open')}
                          className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {messages.map((msg, i) => (
                        <div key={i} className={cn(
                          "flex flex-col max-w-[85%]",
                          msg.sender_id === user.id ? "ml-auto items-end" : "mr-auto items-start"
                        )}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                              {msg.sender_name} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className={cn(
                            "p-4 rounded-3xl text-sm leading-relaxed",
                            msg.sender_id === user.id 
                              ? "bg-brand-primary text-white rounded-tr-none" 
                              : "bg-white/5 text-white/80 border border-white/5 rounded-tl-none"
                          )}>
                            {msg.message}
                            {msg.file_url && (
                              <div className="mt-3 pt-3 border-t border-white/10">
                                {msg.file_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                  <img src={msg.file_url} className="max-w-full rounded-xl shadow-lg" alt="Attachment" />
                                ) : (
                                  <a href={msg.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:underline">
                                    <FileText className="w-4 h-4" /> View Attachment
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className="p-6 border-t border-white/5 bg-white/5">
                      <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                        <div className="flex-1 relative">
                          <textarea 
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            rows={1}
                            className="w-full pl-6 pr-14 py-4 rounded-2xl outline-none font-medium text-sm bg-[#030014] border border-white/10 focus:border-brand-primary transition-all text-white resize-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e as any);
                              }
                            }}
                          />
                          <label className="absolute right-4 bottom-3 p-2 text-white/20 hover:text-brand-primary transition-colors cursor-pointer">
                            <Paperclip className="w-5 h-5" />
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={e => setFile(e.target.files?.[0] || null)}
                            />
                          </label>
                        </div>
                        <button 
                          type="submit"
                          disabled={loading || (!newMessage && !file)}
                          className="p-4 vibrant-gradient text-white rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </form>
                      {file && (
                        <div className="mt-3 flex items-center justify-between p-3 bg-brand-primary/10 rounded-xl border border-brand-primary/20">
                          <div className="flex items-center gap-2">
                            <Paperclip className="w-4 h-4 text-brand-primary" />
                            <span className="text-[10px] font-black text-white/60 uppercase truncate max-w-[200px]">{file.name}</span>
                          </div>
                          <button onClick={() => setFile(null)} className="text-white/40 hover:text-white">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
