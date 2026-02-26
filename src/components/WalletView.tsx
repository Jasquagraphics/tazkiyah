import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  CheckCircle2, 
  XCircle,
  DollarSign,
  TrendingUp,
  Download,
  CreditCard,
  Globe,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Upload
} from 'lucide-react';
import { User, Revenue, Withdrawal } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface WalletViewProps {
  user: User;
  onUpdate: (user: User) => void;
}

export default function WalletView({ user, onUpdate }: WalletViewProps) {
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<Revenue[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showStatements, setShowStatements] = useState(false);
  const [showPayoutEdit, setShowPayoutEdit] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [newBankInfo, setNewBankInfo] = useState(user.bank_info || '');

  useEffect(() => {
    setNewBankInfo(user.bank_info || '');
  }, [user.bank_info]);

  const [activeTab, setActiveTab] = useState<'all' | 'payouts'>('all');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<any>(null);
  const [statementFilter, setStatementFilter] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [balanceRes, withdrawalsRes] = await Promise.all([
        fetch('/api/artist/balance', { headers: { 'x-user-id': user.id.toString() } }),
        user.role === 'admin' 
          ? fetch('/api/admin/withdrawals', { headers: { 'x-user-id': user.id.toString() } }) 
          : fetch('/api/artist/withdrawals', { headers: { 'x-user-id': user.id.toString() } })
      ]);

      const balanceData = await balanceRes.json();
      setBalance(balanceData.balance);
      setHistory(balanceData.history || []);
      
      const withdrawalsData = await withdrawalsRes.json();
      setWithdrawals(withdrawalsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const amount = parseFloat(withdrawAmount);
    
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }

    if (amount > balance) {
      setErrorMessage('Insufficient balance');
      return;
    }

    try {
      const res = await fetch('/api/artist/withdraw', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({ amount })
      });

      if (res.ok) {
        setShowWithdraw(false);
        setWithdrawAmount('');
        setSuccessMessage('Withdrawal request submitted successfully!');
        setTimeout(() => setSuccessMessage(''), 5000);
        // Refresh all data
        fetchData();
      } else {
        const data = await res.json();
        setErrorMessage(data.error);
      }
    } catch (err) {
      setErrorMessage('Failed to submit request');
    }
  };

  const handlePayoutUpdate = async () => {
    setErrorMessage('');
    try {
      const res = await fetch('/api/artist/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({ 
          ...user,
          bank_info: newBankInfo 
        })
      });

      if (res.ok) {
        onUpdate({ ...user, bank_info: newBankInfo });
        setShowPayoutEdit(false);
        setSuccessMessage('Payout method updated successfully!');
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to update payout method');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('An error occurred. Please try again.');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleAdminAction = async (id: number, status: string, screenshotUrl?: string) => {
    try {
      const res = await fetch(`/api/admin/withdrawal/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({ status, payout_screenshot: screenshotUrl })
      });
      if (res.ok) {
        setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: status as any, payout_screenshot: screenshotUrl || w.payout_screenshot } : w));
        if (selectedWithdrawal?.id === id) {
          setSelectedWithdrawal(prev => prev ? { ...prev, status: status as any, payout_screenshot: screenshotUrl || prev.payout_screenshot } : null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleScreenshotUpload = async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        handleAdminAction(id, 'completed', data.url);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="h-64 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-10">
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-emerald-500/40 flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5" />
            {successMessage}
          </motion.div>
        )}
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-rose-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-rose-500/40 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5" />
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {user.role === 'artist' && (
        <>
          {/* Balance Card */}
          <div className="vibrant-gradient p-10 md:p-12 rounded-[3rem] text-white shadow-2xl shadow-brand-primary/30 relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Available Balance</p>
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-10">${balance.toFixed(2)}</h2>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => setShowWithdraw(true)}
                  className="bg-white text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                >
                  Withdraw Funds
                </button>
                <button 
                  onClick={() => setShowStatements(true)}
                  className="bg-white/20 backdrop-blur-md text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/30 transition-all"
                >
                  View Statements
                </button>
              </div>
            </div>
            <Wallet className="absolute -bottom-10 -right-10 w-64 h-64 text-white/10 rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
          </div>

          {/* Payout Information */}
          <div className="glass-card p-8 md:p-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-lg">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Payout Method</h3>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Where your money goes</p>
              </div>
            </div>
            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-white/40" />
                </div>
                <div>
                  <p className="font-black text-white text-sm tracking-tight">Bank Transfer (SWIFT/SEPA)</p>
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-0.5">{user.bank_info || 'Primary Method'}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPayoutEdit(true)}
                className="text-[10px] font-black text-brand-primary uppercase tracking-widest hover:text-brand-secondary transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        </>
      )}

      {/* Transactions Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-10 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">
              {user.role === 'admin' ? 'Withdrawal Requests' : 'Transaction History'}
            </h3>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">All financial movements</p>
          </div>
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl">
            <button 
              onClick={() => setActiveTab('all')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === 'all' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
              )}
            >
              All
            </button>
            <button 
              onClick={() => setActiveTab('payouts')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === 'payouts' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
              )}
            >
              Payouts
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-white/30 text-[10px] font-black uppercase tracking-widest">
                <th className="px-10 py-6">Transaction</th>
                <th className="px-10 py-6">Date</th>
                <th className="px-10 py-6">Status</th>
                <th className="px-10 py-6 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {user.role === 'admin' ? (
                withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-10 py-20 text-center text-white/20 italic font-medium">No withdrawal requests</td>
                  </tr>
                ) : (
                  withdrawals
                    .filter(w => activeTab === 'all' || activeTab === 'payouts')
                    .map(w => (
                    <tr key={w.id} className="hover:bg-white/5 transition-all group cursor-pointer" onClick={() => setSelectedWithdrawal(w)}>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                            <Wallet className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-black text-white tracking-tight">{w.artist_name}</p>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Bank: {w.bank_info || 'Not provided'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-xs font-black text-white/40 uppercase tracking-widest">
                        {new Date(w.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-10 py-6">
                        {w.status === 'pending' ? (
                          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={() => handleAdminAction(w.id, 'approved')}
                              className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleAdminAction(w.id, 'rejected')}
                              className="px-4 py-2 bg-rose-500/10 text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        ) : w.status === 'approved' ? (
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <label className="px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary/20 transition-all cursor-pointer flex items-center gap-2">
                              <Upload className="w-3 h-3" /> Mark Transferred
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleScreenshotUpload(w.id, file);
                                }}
                              />
                            </label>
                          </div>
                        ) : (
                          <StatusBadge status={w.status} />
                        )}
                      </td>
                      <td className="px-10 py-6 text-right font-black tracking-tight text-white">
                        ${w.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )
              ) : (
                (activeTab === 'all' 
                  ? [...history.map(h => ({...h, type: 'revenue'})), ...withdrawals.map(w => ({...w, type: 'withdrawal'}))] 
                  : withdrawals.map(w => ({...w, type: 'withdrawal'})))
                  .sort((a: any, b: any) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime())
                  .map((tx: any) => (
                    <tr key={tx.id + tx.type} className="hover:bg-white/5 transition-all group cursor-pointer" onClick={() => tx.type === 'withdrawal' && setSelectedWithdrawal(tx)}>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            tx.type === 'revenue' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                          )}>
                            {tx.type === 'revenue' ? <TrendingUp className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-black text-white tracking-tight">{tx.description || (tx.type === 'revenue' ? 'Streaming Revenue' : 'Withdrawal Request')}</p>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">ID: #{tx.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-xs font-black text-white/40 uppercase tracking-widest">
                        {new Date(tx.created_at || tx.date).toLocaleDateString()}
                      </td>
                      <td className="px-10 py-6">
                        <StatusBadge status={tx.status || 'completed'} />
                      </td>
                      <td className={cn(
                        "px-10 py-6 text-right font-black tracking-tight",
                        tx.type === 'revenue' ? "text-emerald-400" : "text-white"
                      )}>
                        {tx.type === 'revenue' ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {showWithdraw && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWithdraw(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-lg p-10 relative z-10"
            >
              <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Request Withdrawal</h3>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-8">Funds will be sent to your primary method</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 ml-1">Amount to Withdraw</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 font-black text-xl">$</span>
                    <input 
                      type="number"
                      value={withdrawAmount}
                      onChange={e => setWithdrawAmount(e.target.value)}
                      className="w-full pl-10 pr-5 py-5 rounded-2xl outline-none text-2xl font-black"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-[10px] text-white/20 mt-3 font-bold uppercase tracking-widest">Available: ${balance.toFixed(2)}</p>
                </div>

                <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="w-4 h-4 text-brand-primary" />
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Processing Time</p>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed font-medium">Withdrawals are processed within 3-5 business days. Minimum withdrawal amount is $50.00.</p>
                </div>

                {errorMessage && <p className="text-rose-400 text-xs font-bold uppercase tracking-widest">{errorMessage}</p>}

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowWithdraw(false)}
                    className="flex-1 py-5 rounded-2xl bg-white/5 text-white/40 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleWithdraw}
                    disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > balance}
                    className="flex-1 vibrant-gradient text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Withdrawal Timeline Modal */}
      <AnimatePresence>
        {selectedWithdrawal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedWithdrawal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-lg p-10 relative z-10"
            >
              <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Withdrawal Timeline</h3>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-10">Tracking ID: #{selectedWithdrawal.id}</p>
              
              <div className="space-y-10">
                <TimelineItem 
                  title="Request Submitted" 
                  date={new Date(selectedWithdrawal.created_at).toLocaleString()} 
                  status="completed" 
                  description="Your withdrawal request has been received."
                />
                <TimelineItem 
                  title="Admin Approval" 
                  date={selectedWithdrawal.status === 'approved' || selectedWithdrawal.status === 'completed' ? 'Approved' : 'Pending'} 
                  status={selectedWithdrawal.status === 'approved' || selectedWithdrawal.status === 'completed' ? 'completed' : 'pending'} 
                  description="Reviewing bank details and balance."
                />
                <TimelineItem 
                  title="Funds Transferred" 
                  date={selectedWithdrawal.status === 'completed' ? 'Completed' : 'Pending'} 
                  status={selectedWithdrawal.status === 'completed' ? 'completed' : 'pending'} 
                  description="Money sent to your bank account."
                  isLast
                />
              </div>

              {selectedWithdrawal.payout_screenshot && (
                <div className="mt-8 p-6 bg-white/5 rounded-3xl border border-white/5">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-4">Payout Screenshot</p>
                  <a href={selectedWithdrawal.payout_screenshot} target="_blank" rel="noopener noreferrer">
                    <img src={selectedWithdrawal.payout_screenshot} className="w-full rounded-2xl border border-white/10 hover:scale-[1.02] transition-transform" alt="Payout Screenshot" />
                  </a>
                </div>
              )}

              <button 
                onClick={() => setSelectedWithdrawal(null)}
                className="w-full mt-10 py-5 rounded-2xl bg-white/5 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Statements Modal */}
      <AnimatePresence>
        {showStatements && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStatements(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-4xl p-10 relative z-10 max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-10 shrink-0">
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tight">Financial Statements</h3>
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Directly view your earnings reports</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
                    {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(f => (
                      <button 
                        key={f}
                        onClick={() => setStatementFilter(f)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                          statementFilter === f ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { setShowStatements(false); setSelectedStatement(null); }} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                    <XCircle className="w-6 h-6 text-white/40" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {selectedStatement ? (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-8"
                  >
                    <button 
                      onClick={() => setSelectedStatement(null)}
                      className="flex items-center gap-2 text-brand-primary font-black text-[10px] uppercase tracking-widest hover:gap-3 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back to list
                    </button>
                    
                    <div className="p-10 bg-white/5 rounded-[2.5rem] border border-white/5 space-y-10">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-4xl font-black text-white tracking-tighter mb-2">{selectedStatement.title}</h4>
                          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Period: {selectedStatement.period}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Total Earnings</p>
                          <p className="text-4xl font-black text-brand-primary tracking-tighter">${selectedStatement.amount.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest border-b border-white/5 pb-4">Breakdown by Platform</p>
                        {selectedStatement.breakdown.map((b: any, i: number) => (
                          <div key={i} className="flex justify-between items-center py-2">
                            <span className="text-white font-bold">{b.platform}</span>
                            <span className="text-white/60 font-black tracking-tight">${b.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-10 border-t border-white/5 flex justify-between items-center">
                        <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                          Statement ID: {selectedStatement.id}
                        </div>
                        <button className="vibrant-gradient text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20">
                          Download PDF
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => {
                      const date = new Date();
                      if (statementFilter === 'monthly') date.setMonth(date.getMonth() - i);
                      if (statementFilter === 'yearly') date.setFullYear(date.getFullYear() - i);
                      if (statementFilter === 'weekly') date.setDate(date.getDate() - (i * 7));
                      if (statementFilter === 'daily') date.setDate(date.getDate() - i);

                      const title = `Statement ${date.toLocaleDateString('default', { month: 'short', year: 'numeric' })}`;
                      const period = statementFilter === 'monthly' ? date.toLocaleString('default', { month: 'long', year: 'numeric' }) : date.toLocaleDateString();

                      return (
                        <div 
                          key={i} 
                          onClick={() => setSelectedStatement({
                            id: `ST-${1000 + i}`,
                            title,
                            period,
                            amount: 1250.50 + (i * 100),
                            breakdown: [
                              { platform: 'Spotify', amount: 800.00 },
                              { platform: 'Apple Music', amount: 300.50 },
                              { platform: 'YouTube Music', amount: 150.00 }
                            ]
                          })}
                          className="p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                              <Download className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-black text-white tracking-tight">{title}</p>
                              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">{period}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-white transition-all" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payout Edit Modal */}
      <AnimatePresence>
        {showPayoutEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPayoutEdit(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-lg p-10 relative z-10"
            >
              <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Edit Payout Method</h3>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-8">Update your bank transfer details</p>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Bank Information</label>
                  <textarea 
                    placeholder="Enter SWIFT/BIC, IBAN, and Bank Name"
                    value={newBankInfo}
                    onChange={(e) => setNewBankInfo(e.target.value)}
                    rows={4}
                    className="w-full px-6 py-5 rounded-2xl outline-none font-black text-sm resize-none bg-white/5 border border-white/5 focus:border-brand-primary transition-all"
                  />
                </div>
                <button 
                  onClick={handlePayoutUpdate}
                  disabled={loading}
                  className="w-full vibrant-gradient text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TimelineItem({ title, date, status, description, isLast }: { title: string, date: string, status: 'completed' | 'pending', description: string, isLast?: boolean }) {
  return (
    <div className="flex gap-6 relative">
      {!isLast && (
        <div className={cn(
          "absolute left-6 top-12 bottom-0 w-0.5 -translate-x-1/2",
          status === 'completed' ? "bg-brand-primary" : "bg-white/5"
        )} />
      )}
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center relative z-10 shadow-lg",
        status === 'completed' ? "bg-brand-primary text-white" : "bg-white/5 text-white/20"
      )}>
        {status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
      </div>
      <div className="flex-1 pt-1">
        <div className="flex items-center justify-between mb-1">
          <h4 className={cn("font-black text-sm tracking-tight", status === 'completed' ? "text-white" : "text-white/40")}>{title}</h4>
          <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{date}</span>
        </div>
        <p className="text-xs text-white/40 font-medium leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: { color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', icon: Clock },
    approved: { color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: CheckCircle2 },
    completed: { color: 'text-brand-primary bg-brand-primary/10 border-brand-primary/20', icon: CheckCircle2 },
    rejected: { color: 'text-rose-400 bg-rose-400/10 border-rose-400/20', icon: XCircle },
    streamed: { color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20', icon: Globe }
  };

  const { color, icon: Icon } = config[status as keyof typeof config] || config.pending;

  return (
    <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest backdrop-blur-md", color)}>
      <Icon className="w-3 h-3" />
      {status}
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
