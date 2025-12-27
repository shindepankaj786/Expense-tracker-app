import React, { useState, useEffect } from 'react';
import { db, Transaction, PlannedPayment, BudgetLimit, Group, GroupMember, User as UserType } from './db/storage';
import {
    LayoutDashboard,
    PlusCircle,
    History,
    ShieldCheck,
    ShieldAlert,
    Wallet,
    QrCode,
    ArrowUpRight,
    Users,
    Banknote,
    ChevronRight,
    TrendingDown,
    CalendarClock,
    PiggyBank,
    Share2,
    Info,
    CheckCircle2,
    Trash2,
    Mail,
    LogOut,
    Pencil,
    Utensils,
    Users2,
    PawPrint,
    BusFront,
    Palette,
    Home,
    Shirt,
    Sparkles,
    Activity,
    GraduationCap,
    Gift,
    Box,
    RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { autoCategorize, detectAnomaly } from './utils/intelligence';
import LoginPage from './components/LoginPage';
import { supabase } from './db/supabase';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const App = () => {
    const [activeTab, setActiveTab] = useState<'home' | 'history' | 'alerts'>('home');
    const [showAddForm, setShowAddForm] = useState(false);
    const [showPlannedModal, setShowPlannedModal] = useState(false);
    const [showBudgetsModal, setShowBudgetsModal] = useState(false);
    const [showSharingModal, setShowSharingModal] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserType | null>(null);
    const [showBalanceModal, setShowBalanceModal] = useState(false);
    const [balanceInput, setBalanceInput] = useState('');

    // Core Data States
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [plannedPayments, setPlannedPayments] = useState<PlannedPayment[]>([]);
    const [budgetLimits, setBudgetLimits] = useState<BudgetLimit[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);

    // Form States
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Other');
    const [isManualCategory, setIsManualCategory] = useState(false);
    const [plannedDate, setPlannedDate] = useState('');
    const [showDeduction, setShowDeduction] = useState<{ amount: string, visible: boolean }>({ amount: '', visible: false });
    const [budgetCategory, setBudgetCategory] = useState('');
    const [budgetLimitStr, setBudgetLimitStr] = useState('');
    const [groupName, setGroupName] = useState('');
    const [memberEmail, setMemberEmail] = useState('');
    const [groupMembers, setGroupMembers] = useState<string[]>([]);

    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
    const [billDescription, setBillDescription] = useState('');
    const [billAmount, setBillAmount] = useState('');
    const [billPaidBy, setBillPaidBy] = useState('');


    const CATEGORIES = [
        { name: 'Food', icon: Utensils },
        { name: 'Social Life', icon: Users2 },
        { name: 'Pets', icon: PawPrint },
        { name: 'Transport', icon: BusFront },
        { name: 'Culture', icon: Palette },
        { name: 'Household', icon: Home },
        { name: 'Apparel', icon: Shirt },
        { name: 'Beauty', icon: Sparkles },
        { name: 'Health', icon: Activity },
        { name: 'Education', icon: GraduationCap },
        { name: 'Gift', icon: Gift },
        { name: 'Other', icon: Box }
    ];

    const budget = currentUser?.initialBalance || 30000;

    useEffect(() => {
        if (currentUser) {
            loadAllData();
        } else {
            // Clear state on logout
            setTransactions([]);
            setPlannedPayments([]);
            setBudgetLimits([]);
            setGroups([]);
            setSelectedGroupId(null);
        }
    }, [currentUser]);

    const loadAllData = async () => {
        if (!currentUser?.id) return;

        const [
            { data: tx },
            { data: pp },
            { data: bl },
            { data: allGroups }
        ] = await Promise.all([
            supabase.from('transactions').select('*').eq('user_id', currentUser.id),
            supabase.from('planned_payments').select('*').eq('user_id', currentUser.id),
            supabase.from('budgets').select('*').eq('user_id', currentUser.id),
            supabase.from('groups').select('*, group_members(*), group_activity(*)')
        ]);

        // Map snake_case to camelCase for UI compatibility
        const mappedTx = (tx || []).map((t: any) => ({
            id: t.id,
            userId: t.user_id,
            amount: t.amount,
            description: t.description,
            category: t.category,
            date: t.date,
            isSuspicious: t.is_suspicious,
            suspicionReason: t.suspicion_reason,
            riskScore: t.risk_score,
            riskLevel: t.risk_level,
            fraudReasons: t.fraud_reasons
        }));

        const mappedGroups = (allGroups || []).filter((g: any) =>
            g.owner_id === currentUser.id ||
            g.group_members.some((m: any) => m.user_email === currentUser.email || m.user_email === 'You')
        ).map((g: any) => ({
            id: g.id,
            userId: g.owner_id,
            name: g.name,
            members: g.group_members.map((m: any) => ({ email: m.user_email, balance: m.balance })),
            activity: g.group_activity.map((a: any) => ({
                description: a.description,
                amount: a.amount,
                paidBy: a.paid_by_email,
                date: a.date
            }))
        }));

        setTransactions(mappedTx.sort((a, b) => b.date - a.date));
        setPlannedPayments((pp || []).map((p: any) => ({
            id: p.id,
            userId: p.user_id,
            description: p.description,
            amount: p.amount,
            date: p.date,
            isCompleted: p.is_completed
        })).sort((a, b) => a.date - b.date));
        setBudgetLimits((bl || []).map((b: any) => ({
            id: b.id,
            userId: b.user_id,
            category: b.category,
            limit: b.amount_limit
        })));
        setGroups(mappedGroups);
    };

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !amount) return;


        const numAmount = parseFloat(amount);
        const finalDescription = description.trim() || selectedCategory;
        const anomaly = detectAnomaly(numAmount, finalDescription, transactions);

        const { error } = await supabase.from('transactions').insert({
            user_id: currentUser.id!,
            description: finalDescription,
            amount: numAmount,
            date: Date.now(),
            category: selectedCategory,
            is_suspicious: anomaly.isSuspicious,
            suspicion_reason: anomaly.fraudReasons.join(', '),
            risk_score: anomaly.riskScore,
            risk_level: anomaly.riskLevel,
            fraud_reasons: anomaly.fraudReasons
        });

        if (error) {
            alert('Failed to add transaction: ' + error.message);
            return;
        }

        setShowAddForm(false);
        setShowDeduction({ amount, visible: true });
        setTimeout(() => setShowDeduction({ amount: '', visible: false }), 2000);

        setDescription('');
        setAmount('');
        setSelectedCategory('Other');
        setIsManualCategory(false);
        loadAllData();
    };


    const handleDeleteTransaction = async (id: number) => {
        if (!confirm('Are you sure you want to roll back this transaction?')) return;

        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) {
            alert('Failed to delete: ' + error.message);
            return;
        }
        loadAllData();
    };

    const handleClearAllTransactions = async () => {
        if (!currentUser) return;
        if (!confirm('This will permanently delete ALL your transactions. Proceed?')) return;

        const { error } = await supabase.from('transactions').delete().eq('user_id', currentUser.id);
        if (error) {
            alert('Failed to clear: ' + error.message);
            return;
        }
        loadAllData();
    };

    const handleAddPlanned = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !description || !amount || !plannedDate) return;

        const { error } = await supabase.from('planned_payments').insert({
            user_id: currentUser.id!,
            description,
            amount: parseFloat(amount),
            date: new Date(plannedDate).getTime(),
            is_completed: false
        });

        if (error) alert(error.message);

        setDescription('');
        setAmount('');
        setPlannedDate('');
        loadAllData();
    };

    const handleAddBudget = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !budgetCategory || !budgetLimitStr) return;

        const existing = budgetLimits.find(b => b.category === budgetCategory);
        if (existing) {
            await supabase.from('budgets')
                .update({ amount_limit: parseFloat(budgetLimitStr) })
                .eq('id', existing.id);
        } else {
            await supabase.from('budgets').insert({
                user_id: currentUser.id!,
                category: budgetCategory,
                amount_limit: parseFloat(budgetLimitStr)
            });
        }
        setBudgetCategory('');
        setBudgetLimitStr('');
        loadAllData();
    };

    const handleUpdateBalance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !balanceInput) return;

        const newBal = parseFloat(balanceInput);
        if (isNaN(newBal)) return;

        const { error } = await supabase.from('profiles')
            .update({ initial_balance: newBal })
            .eq('id', currentUser.id);

        if (error) {
            alert(error.message);
            return;
        }

        setCurrentUser({ ...currentUser, initialBalance: newBal } as any);
        setShowBalanceModal(false);
        setBalanceInput('');
        loadAllData();
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !groupName || groupMembers.length === 0) return;

        // Use currentUser.email instead of 'You' for the creator
        const allUsers = [...new Set([currentUser.email, ...groupMembers])];

        try {
            const { data: group, error: groupError } = await supabase.from('groups').insert({
                owner_id: currentUser.id!,
                name: groupName
            }).select().single();

            if (groupError || !group) {
                alert(groupError?.message || 'Failed to create group');
                return;
            }

            const { error: memberError } = await supabase.from('group_members').insert(
                allUsers.map(email => ({
                    group_id: group.id,
                    user_email: email,
                    balance: 0
                }))
            );

            if (memberError) {
                alert('Member error: ' + memberError.message);
            }

            setGroupName('');
            setGroupMembers([]);
            loadAllData();
        } catch (err: any) {
            alert('Error creating group: ' + err.message);
        }
    };

    const handleAddGroupBill = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !selectedGroupId || !billDescription || !billAmount || !billPaidBy) return;

        const group = groups.find(g => g.id === selectedGroupId);
        if (!group) return;

        const amountNum = parseFloat(billAmount);
        const splitAmount = amountNum / group.members.length;

        try {
            const promises: any[] = [];

            // Update balances in Supabase
            group.members.forEach(m => {
                let newBalance = m.balance;
                if (m.email === billPaidBy) {
                    newBalance += (amountNum - splitAmount);
                } else {
                    newBalance -= splitAmount;
                }
                promises.push(
                    supabase
                        .from('group_members')
                        .update({ balance: newBalance })
                        .eq('group_id', selectedGroupId)
                        .eq('user_email', m.email)
                );
            });

            // Add activity in Supabase
            promises.push(
                supabase.from('group_activity').insert({
                    group_id: selectedGroupId,
                    description: billDescription,
                    amount: amountNum,
                    paid_by_email: billPaidBy,
                    date: Date.now()
                })
            );

            // If the current user paid, add it as a transaction to deduct from their wallet
            if (billPaidBy === currentUser.email) {
                promises.push(
                    supabase.from('transactions').insert({
                        user_id: currentUser.id!,
                        description: `Group Bill: ${billDescription}`,
                        amount: amountNum,
                        date: Date.now(),
                        category: 'Other',
                        is_suspicious: false
                    })
                );
            }

            const results = await Promise.all(promises);
            const errors = results.filter(r => r.error).map(r => r.error!.message);

            if (errors.length > 0) {
                alert('Errors occurred: ' + errors.join(', '));
            }

            setBillDescription('');
            setBillAmount('');
            loadAllData();
        } catch (err: any) {
            alert('Error adding group bill: ' + err.message);
        }
    };

    const togglePlannedComplete = async (payment: PlannedPayment) => {
        await supabase.from('planned_payments')
            .update({ is_completed: !payment.isCompleted })
            .eq('id', payment.id);
        loadAllData();
    };

    const deletePlanned = async (id: number) => {
        await supabase.from('planned_payments').delete().eq('id', id);
        loadAllData();
    };

    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const suspiciousCount = transactions.filter(t => t.isSuspicious).length;

    const categoryTotals = transactions.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
    }, {} as Record<string, number>);

    const chartData = {
        labels: Object.keys(categoryTotals),
        datasets: [{
            data: Object.values(categoryTotals),
            backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'],
            borderWidth: 0,
            hoverOffset: 10
        }]
    };

    if (!currentUser) {
        return <LoginPage onLogin={setCurrentUser} />;
    }

    return (
        <div className="app-container" style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', paddingBottom: '90px' }}>

            {/* Dynamic Header */}
            <header style={{
                padding: '24px 20px 10px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                background: 'rgba(10, 10, 10, 0.8)',
                backdropFilter: 'blur(10px)',
                zIndex: 100
            }}>
                <div>
                    <h2 style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Welcome back,</h2>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: '700' }}>{currentUser.fullName}</h1>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                        <ShieldCheck size={20} color="var(--primary)" />
                    </div>
                    <button
                        onClick={() => setCurrentUser(null)}
                        style={{
                            padding: '10px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '14px',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            cursor: 'pointer'
                        }}
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <AnimatePresence>
                {showDeduction.visible && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 20 }}
                        animate={{ opacity: 1, scale: 1.2, y: -100 }}
                        exit={{ opacity: 0, scale: 0.8, y: -200 }}
                        style={{
                            position: 'fixed',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: 'var(--danger)',
                            fontSize: '3rem',
                            fontWeight: 'bold',
                            zIndex: 2000,
                            pointerEvents: 'none',
                            textShadow: '0 0 20px rgba(255, 77, 77, 0.4)'
                        }}
                    >
                        -₹{parseFloat(showDeduction.amount).toLocaleString('en-IN')}
                    </motion.div>
                )}
            </AnimatePresence>

            <main style={{ padding: '16px' }}>

                <AnimatePresence mode="wait">
                    {activeTab === 'home' && (
                        <motion.div
                            key="home"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {/* Balance Card Section */}
                            <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, #1e1b4b 0%, #000 100%)', position: 'relative', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Balance</p>
                                    <button
                                        onClick={() => {
                                            setBalanceInput(budget.toString());
                                            setShowBalanceModal(true);
                                        }}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                                    >
                                        <Pencil size={14} />
                                    </button>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                    <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>₹{(budget - totalSpent).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h1>
                                </div>
                                <div style={{ marginTop: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <div style={{ padding: '4px 8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <TrendingDown size={14} color="var(--accent)" />
                                        <span style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: '600' }}>₹{totalSpent.toLocaleString('en-IN')} spent</span>
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>out of ₹{budget.toLocaleString('en-IN')}</div>
                                </div>
                            </div>

                            {/* Main Action Tiles */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
                                <button className="upi-tile" onClick={() => setShowAddForm(true)}>
                                    <div style={{ padding: '12px', background: 'rgba(79, 70, 229, 0.15)', borderRadius: '12px', color: '#818cf8' }}>
                                        <PlusCircle size={22} />
                                    </div>
                                    <span style={{ fontSize: '0.75rem' }}>Add</span>
                                </button>
                                <button className="upi-tile" onClick={() => setShowPlannedModal(true)}>
                                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                                        <CalendarClock size={22} color="var(--text-muted)" />
                                    </div>
                                    <span style={{ fontSize: '0.75rem' }}>Planned</span>
                                </button>
                                <button className="upi-tile" onClick={() => setShowBudgetsModal(true)}>
                                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                                        <PiggyBank size={22} color="var(--text-muted)" />
                                    </div>
                                    <span style={{ fontSize: '0.75rem' }}>Budgets</span>
                                </button>
                                <button className="upi-tile" onClick={() => setShowSharingModal(true)}>
                                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                                        <Share2 size={22} color="var(--text-muted)" />
                                    </div>
                                    <span style={{ fontSize: '0.75rem' }}>Sharing</span>
                                </button>
                            </div>

                            {/* Insights */}
                            <section style={{ marginBottom: '32px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ fontSize: '1.1rem' }}>Spending Insights</h3>
                                    <button style={{ color: 'var(--primary)', fontSize: '0.85rem', background: 'none', border: 'none', fontWeight: '600' }}>View More</button>
                                </div>
                                <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
                                    <div style={{ height: '200px', width: '100%', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                                        {transactions.length > 0 ? (
                                            <Pie data={chartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                <Wallet size={40} color="rgba(255,255,255,0.1)" />
                                                <p style={{ marginTop: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Record expenses to see patterns</p>
                                            </div>
                                        )}
                                    </div>
                                    {transactions.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
                                            {Object.entries(categoryTotals).slice(0, 3).map(([cat, total], idx) => (
                                                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: chartData.datasets[0].backgroundColor[idx] }} />
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cat}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Transactions Preview */}
                            <section>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ fontSize: '1.1rem' }}>Transactions</h3>
                                    <button onClick={() => setActiveTab('history')} style={{ color: 'var(--primary)', fontSize: '0.85rem', background: 'none', border: 'none', fontWeight: '600' }}>See all</button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {transactions.slice(0, 4).map((t, i) => (
                                        <motion.div
                                            key={t.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="card"
                                            style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <div style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <span style={{ fontSize: '1.2rem' }}>{t.description[0].toUpperCase()}</span>
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: '600', fontSize: '0.95rem' }}>{t.description}</p>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.category}</p>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ fontWeight: '700', fontSize: '1rem', color: t.isSuspicious ? 'var(--danger)' : 'var(--text-main)' }}>-₹{t.amount.toFixed(2)}</p>
                                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(t.date).toLocaleDateString([], { day: 'numeric', month: 'short' })}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                    {transactions.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No transactions yet</p>}
                                </div>
                            </section>
                        </motion.div>
                    )}

                    {activeTab === 'history' && (
                        <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                <button onClick={() => setActiveTab('home')} style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '10px', border: 'none', color: 'white' }}>
                                    <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
                                </button>
                                <h2 style={{ fontSize: '1.4rem', flex: 1 }}>All Transactions</h2>
                                {transactions.length > 0 && (
                                    <button
                                        onClick={handleClearAllTransactions}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            color: '#ef4444',
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600'
                                        }}
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {transactions.map((t, i) => (
                                    <motion.div
                                        key={t.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="card"
                                        style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ fontSize: '1.2rem' }}>{t.category[0]}</span>
                                            </div>
                                            <div>
                                                <p style={{ fontWeight: '600' }}>{t.description}</p>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(t.date).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div>
                                                <p style={{ fontWeight: '700' }}>-₹{t.amount.toFixed(2)}</p>
                                                <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', color: 'var(--text-muted)' }}>{t.category}</span>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteTransaction(t.id!)}
                                                style={{ background: 'none', border: 'none', color: 'var(--danger)', opacity: 0.5, padding: '4px' }}
                                                title="Roll back transaction"
                                            >
                                                <RotateCcw size={16} />
                                            </button>
                                        </div>

                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'alerts' && (
                        <motion.div key="alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <h2 style={{ fontSize: '1.4rem', marginBottom: '24px' }}>Security & Alerts</h2>

                            {/* Trust Score Header */}
                            <div className="card glass" style={{ padding: '24px', marginBottom: '24px', border: '1px solid rgba(79, 70, 229, 0.3)', background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.4) 0%, rgba(0, 0, 0, 0.4) 100%)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <div>
                                        <h4 style={{ fontWeight: '600', marginBottom: '4px', fontSize: '1.1rem' }}>Account Trust Score</h4>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AI-powered behavioral analysis</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                            {Math.max(0, 100 - (transactions.reduce((acc, t) => acc + (t.riskScore || 0), 0) / (transactions.length || 1))).toFixed(0)}%
                                        </h3>
                                    </div>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(0, 100 - (transactions.reduce((acc, t) => acc + (t.riskScore || 0), 0) / (transactions.length || 1)))}%` }}
                                        style={{ height: '100%', background: 'var(--primary)' }}
                                    />
                                </div>
                            </div>

                            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                Suspicious Activity
                                <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)', padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                    {transactions.filter(t => t.isSuspicious).length} Flagged
                                </span>
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {transactions.filter(t => t.isSuspicious).map(t => {
                                    const riskColor = t.riskLevel === 'High' ? 'var(--danger)' : t.riskLevel === 'Medium' ? '#f59e0b' : '#10b981';
                                    return (
                                        <div key={t.id} className="card glass" style={{ borderLeft: `4px solid ${riskColor}`, padding: '16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                        <span style={{
                                                            fontSize: '0.65rem',
                                                            fontWeight: 'bold',
                                                            textTransform: 'uppercase',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            background: `${riskColor}22`,
                                                            color: riskColor,
                                                            border: `1px solid ${riskColor}44`
                                                        }}>
                                                            {t.riskLevel} Risk ({t.riskScore} pts)
                                                        </span>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                    <p style={{ fontWeight: '700', fontSize: '1rem' }}>{t.description}</p>
                                                </div>
                                                <p style={{ color: 'var(--danger)', fontWeight: 'bold' }}>-₹{t.amount.toLocaleString('en-IN')}</p>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {t.fraudReasons?.map((reason, i) => (
                                                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <ShieldAlert size={12} color={riskColor} />
                                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{reason}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                                {transactions.filter(t => t.isSuspicious).length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                        <ShieldCheck size={48} color="rgba(16, 185, 129, 0.2)" strokeWidth={1} style={{ marginBottom: '16px' }} />
                                        <p style={{ color: 'var(--text-muted)' }}>Your account looks safe. No suspicious activities detected.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Set Balance Modal */}
            <AnimatePresence>
                {showBalanceModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowBalanceModal(false)}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="card"
                            style={{ width: '100%', maxWidth: '480px', borderRadius: '32px 32px 0 0', padding: '32px 24px', zIndex: 1001, border: 'none' }}
                        >
                            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', margin: '0 auto 24px' }} />
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Set Starting Balance</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
                                Enter your current total balance to start tracking from.
                            </p>
                            <form onSubmit={handleUpdateBalance} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ position: 'relative' }}>
                                    <Banknote size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="number"
                                        placeholder="Starting Balance"
                                        value={balanceInput}
                                        onChange={e => setBalanceInput(e.target.value)}
                                        style={{ paddingLeft: '48px' }}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button type="button" onClick={() => setShowBalanceModal(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: '600' }}>
                                        Cancel
                                    </button>
                                    <button type="submit" style={{ flex: 1, padding: '12px', background: 'var(--primary)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: '600' }}>
                                        Update
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Planned Payment Modal */}
            <AnimatePresence>
                {showPlannedModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowPlannedModal(false)}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="card"
                            style={{ width: '100%', maxWidth: '480px', borderRadius: '32px 32px 0 0', padding: '32px 24px', zIndex: 1001, border: 'none' }}
                        >
                            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', margin: '0 auto 24px' }} />
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Planned Payments</h3>

                            <form onSubmit={handleAddPlanned} style={{ marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                    <input placeholder="Service/Bill" value={description} onChange={e => setDescription(e.target.value)} />
                                    <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <input type="date" value={plannedDate} onChange={e => setPlannedDate(e.target.value)} />
                                    <button type="submit" style={{ padding: '0 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600' }}>Add</button>
                                </div>
                            </form>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }} className="hide-scrollbar">
                                {plannedPayments.map(p => (
                                    <div key={p.id} className="card glass" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: p.isCompleted ? 0.6 : 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <button onClick={() => togglePlannedComplete(p)} style={{ background: 'none', border: 'none', color: p.isCompleted ? 'var(--accent)' : 'var(--text-muted)' }}>
                                                <CheckCircle2 size={24} />
                                            </button>
                                            <div>
                                                <p style={{ fontWeight: '600', textDecoration: p.isCompleted ? 'line-through' : 'none' }}>{p.description}</p>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(p.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <p style={{ fontWeight: '700' }}>₹{p.amount.toLocaleString()}</p>
                                            <button onClick={() => deletePlanned(p.id!)} style={{ background: 'none', border: 'none', color: 'var(--danger)', opacity: 0.5 }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {plannedPayments.length === 0 && (
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No upcoming payments</p>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Budgets Modal */}
            <AnimatePresence>
                {showBudgetsModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowBudgetsModal(false)}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="card"
                            style={{ width: '100%', maxWidth: '480px', borderRadius: '32px 32px 0 0', padding: '32px 24px', zIndex: 1001, border: 'none' }}
                        >
                            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', margin: '0 auto 24px' }} />
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Monthly Budgets</h3>

                            <form onSubmit={handleAddBudget} style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px' }}>
                                <select value={budgetCategory} onChange={e => setBudgetCategory(e.target.value)} style={{ padding: '8px' }}>
                                    <option value="">Category</option>
                                    <option value="Food">Food</option>
                                    <option value="Shopping">Shopping</option>
                                    <option value="Transport">Transport</option>
                                    <option value="Entertainment">Entertainment</option>
                                    <option value="Utilities">Utilities</option>
                                    <option value="Other">Other</option>
                                </select>
                                <input type="number" placeholder="Limit" value={budgetLimitStr} onChange={e => setBudgetLimitStr(e.target.value)} />
                                <button type="submit" style={{ padding: '0 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600' }}>Set</button>
                            </form>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '300px', overflowY: 'auto' }} className="hide-scrollbar">
                                {['Food', 'Shopping', 'Transport', 'Entertainment', 'Utilities', 'Other'].map(cat => {
                                    const limit = budgetLimits.find(b => b.category === cat)?.limit || 0;
                                    const spent = categoryTotals[cat] || 0;
                                    const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;

                                    return (
                                        <div key={cat}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{cat}</span>
                                                <span style={{ fontSize: '0.9rem', color: spent > limit && limit > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                                    ₹{spent.toLocaleString()} / {limit > 0 ? `₹${limit.toLocaleString()}` : 'No limit'}
                                                </span>
                                            </div>
                                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${percent}%` }}
                                                    style={{ height: '100%', background: spent > limit && limit > 0 ? 'var(--danger)' : 'var(--primary)' }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Sharing Modal */}
            <AnimatePresence>
                {showSharingModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowSharingModal(false)}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="card"
                            style={{ width: '100%', maxWidth: '480px', borderRadius: '32px 32px 0 0', padding: '32px 24px', zIndex: 1001, border: 'none' }}
                        >
                            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', margin: '0 auto 24px' }} />
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
                                {selectedGroupId ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <button onClick={() => setSelectedGroupId(null)} style={{ background: 'none', border: 'none', color: 'white', display: 'flex' }}>
                                            <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
                                        </button>
                                        {groups.find(g => g.id === selectedGroupId)?.name}
                                    </div>
                                ) : 'Group Sharing'}
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
                                {selectedGroupId ? 'Manage group bills and balances' : 'Connect with friends using their emails'}
                            </p>

                            {!selectedGroupId ? (
                                <>
                                    <form onSubmit={handleCreateGroup} style={{ marginBottom: '24px' }}>
                                        <div style={{ marginBottom: '16px' }}>
                                            <input placeholder="Group Name (e.g. Roommates)" value={groupName} onChange={e => setGroupName(e.target.value)} style={{ marginBottom: '12px' }} />
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <input
                                                    placeholder="Member Email"
                                                    value={memberEmail}
                                                    onChange={e => setMemberEmail(e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (memberEmail && !groupMembers.includes(memberEmail)) {
                                                            setGroupMembers([...groupMembers, memberEmail]);
                                                            setMemberEmail('');
                                                        }
                                                    }}
                                                    style={{ padding: '0 12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)', borderRadius: '12px' }}
                                                >
                                                    <Mail size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        {groupMembers.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                                                {groupMembers.map(email => (
                                                    <span key={email} style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'var(--primary-glow)', borderRadius: '20px', border: '1px solid var(--primary)' }}>
                                                        {email}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <button type="submit" disabled={!groupName || groupMembers.length === 0} style={{ width: '100%', padding: '14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', opacity: (!groupName || groupMembers.length === 0) ? 0.5 : 1 }}>
                                            Create Group
                                        </button>
                                    </form>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto' }} className="hide-scrollbar">
                                        {groups.map(g => (
                                            <button key={g.id} onClick={() => setSelectedGroupId(g.id!)} className="card glass" style={{ padding: '16px', textAlign: 'left', width: '100%', border: '1px solid var(--border)', cursor: 'pointer' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <h4 style={{ fontWeight: '600' }}>{g.name}</h4>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{g.members.length} members</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    {g.members.slice(0, 3).map(m => (
                                                        <div key={m.email} style={{ width: '24px', height: '24px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', border: '2px solid var(--bg-card)' }}>
                                                            {m.email[0].toUpperCase()}
                                                        </div>
                                                    ))}
                                                    {g.members.length > 3 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>+{g.members.length - 3} more</div>}
                                                </div>
                                            </button>
                                        ))}
                                        {groups.length === 0 && (
                                            <div className="card glass" style={{ padding: '20px', textAlign: 'center', border: '1px dashed var(--border)' }}>
                                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No active groups</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div style={{ maxHeight: '500px', overflowY: 'auto' }} className="hide-scrollbar">
                                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '20px', padding: '16px', marginBottom: '24px' }}>
                                        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Balances</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {groups.find(g => g.id === selectedGroupId)?.members.map(m => (
                                                <div key={m.email} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                    <span>{m.email}</span>
                                                    <span style={{ color: m.balance >= 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 'bold' }}>
                                                        {m.balance >= 0 ? '+' : ''}₹{m.balance.toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Split a Bill</h4>
                                    <form onSubmit={handleAddGroupBill} style={{ marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                            <input placeholder="What for?" value={billDescription} onChange={e => setBillDescription(e.target.value)} />
                                            <input type="number" placeholder="Amount" value={billAmount} onChange={e => setBillAmount(e.target.value)} />
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <select value={billPaidBy} onChange={e => setBillPaidBy(e.target.value)} style={{ flex: 1, padding: '8px' }}>
                                                <option value="">Paid by...</option>
                                                {groups.find(g => g.id === selectedGroupId)?.members.map(m => (
                                                    <option key={m.email} value={m.email}>{m.email}</option>
                                                ))}
                                            </select>
                                            <button type="submit" style={{ padding: '0 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600' }}>Add</button>
                                        </div>
                                    </form>

                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Activity</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {groups.find(g => g.id === selectedGroupId)?.activity.map((act, i) => (
                                            <div key={i} className="card glass" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{act.description}</p>
                                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Paid by {act.paidBy}</p>
                                                </div>
                                                <p style={{ fontWeight: '700' }}>₹{act.amount.toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add Transaction Modal */}
            <AnimatePresence>
                {showAddForm && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAddForm(false)}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="card"
                            style={{ width: '100%', maxWidth: '480px', borderRadius: '32px 32px 0 0', padding: '32px 24px', zIndex: 1001, border: 'none' }}
                        >
                            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', margin: '0 auto 24px' }} />
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Track New Expense</h3>
                            <form onSubmit={handleAddTransaction}>
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '12px', color: 'var(--text-muted)' }}>Select Category</label>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: '10px',
                                        maxHeight: '240px',
                                        overflowY: 'auto',
                                        padding: '4px'
                                    }} className="hide-scrollbar">
                                        {CATEGORIES.map(cat => (
                                            <button
                                                key={cat.name}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCategory(cat.name);
                                                    setIsManualCategory(true);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '16px 8px',
                                                    background: selectedCategory === cat.name ? 'rgba(79, 70, 229, 0.15)' : 'rgba(255,255,255,0.02)',
                                                    border: selectedCategory === cat.name ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
                                                    borderRadius: '16px',
                                                    color: selectedCategory === cat.name ? 'var(--primary)' : 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <cat.icon size={24} strokeWidth={selectedCategory === cat.name ? 2.5 : 2} />
                                                <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>{cat.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)' }}>Merchant or Service (Optional)</label>
                                    <input
                                        placeholder="e.g. Starbucks, Zomato, Canteen"
                                        value={description}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setDescription(val);
                                            if (!isManualCategory) {
                                                const suggested = autoCategorize(val);
                                                setSelectedCategory(suggested);
                                            }
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: '32px' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)' }}>Amount (₹)</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!amount}
                                    style={{ width: '100%', padding: '16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '1.1rem', fontWeight: '700', opacity: (!amount) ? 0.5 : 1 }}
                                >
                                    Confirm Expense
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Navigation Bar */}
            <nav className="nav-blur" style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', height: '80px', display: 'flex', justifyContent: 'space-around', padding: '10px 0', zIndex: 900 }}>
                <button onClick={() => setActiveTab('home')} style={{ background: 'none', border: 'none', color: activeTab === 'home' ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: '0.3s' }}>
                    <LayoutDashboard size={24} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
                    <span style={{ fontSize: '0.7rem', marginTop: '6px', fontWeight: '600' }}>Home</span>
                </button>
                <button onClick={() => setActiveTab('history')} style={{ background: 'none', border: 'none', color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <History size={24} strokeWidth={activeTab === 'history' ? 2.5 : 2} />
                    <span style={{ fontSize: '0.7rem', marginTop: '6px', fontWeight: '600' }}>Passbook</span>
                </button>
                <button onClick={() => setActiveTab('alerts')} style={{ background: 'none', border: 'none', color: activeTab === 'alerts' ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <ShieldCheck size={24} strokeWidth={activeTab === 'alerts' ? 2.5 : 2} />
                    <span style={{ fontSize: '0.7rem', marginTop: '6px', fontWeight: '600' }}>Security</span>
                </button>
            </nav>
        </div>
    );
};

export default App;
