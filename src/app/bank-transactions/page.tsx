'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Settings,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building2,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Trash2,
  Edit2,
  Save,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  Layers,
  FileText,
  BadgePercent,
  Check,
  Undo2,
  Info
} from 'lucide-react';

type CardDetailItem = {
  date: string;
  storeName: string;
  amount: number;
  user: string;
  category: string;
  memo: string;
};

type CardStatement = {
  id: number;
  cardName: string;
  cardHolder: string | null;
  billingMonth: string;
  paymentDate: string;
  totalAmount: number;
  status: string;
  memo: string | null;
  details: CardDetailItem[] | null;
};

type ProjectCandidate = {
  projectId: number;
  projectCode: string;
  projectName: string;
  partnerId: number;
  partnerName: string;
  currentStatus: string;
  expectedPayDate: string | null;
  invoiceId: number | null;
  invoiceNo: string | null;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  depositAmount: number;
  isRecommended: boolean;
  matchReason: string;
};

type BankTransaction = {
  id: number;
  date: string;
  bankName: string;
  branchName: string | null;
  accountType: string | null;
  accountNumber: string | null;
  description: string;
  amount: number;
  withdrawalAmount: number;
  depositAmount: number;
  balance: number;
  transactionType: 'WITHDRAWAL' | 'DEPOSIT';
  accountCode: string | null;
  accountName: string | null;
  subAccountCode: string | null;
  subAccountName: string | null;
  taxType: string | null;
  cardStatementId: number | null;
  cardStatement?: CardStatement | null;
  reconciledProjectId: number | null;
  reconciledProject?: {
    id: number;
    projectCode: string;
    name: string;
    status: string;
    partner: { name: string };
  } | null;
  reconciledInvoiceId: number | null;
  discountAmount: number | null;
  claimAmount: number | null;
  memo: string | null;
  isReconciled: boolean;
};

type Rule = {
  id: number;
  keyword: string;
  accountCode: string | null;
  accountName: string;
  subAccountCode: string | null;
  subAccountName: string | null;
  taxType: string | null;
  priority: number;
  isActive: boolean;
};

type Summary = {
  totalDeposits: number;
  totalWithdrawals: number;
  uncategorizedCount: number;
  latestBalance: number;
  ufjBalance?: number;
  smbcBalance?: number;
  combinedBalance?: number;
  totalCount: number;
};

import BankGate from '@/components/BankGate';
import { useBankAuth } from '@/context/BankAuthContext';

export default function BankTransactionsPage() {
  const { isAuthenticated } = useBankAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalDeposits: 0,
    totalWithdrawals: 0,
    uncategorizedCount: 0,
    latestBalance: 0,
    ufjBalance: 0,
    smbcBalance: 0,
    combinedBalance: 0,
    totalCount: 0,
  });

  // View mode switcher: 'EXCEL_COMPARISON' (踏襲ビュー) or 'DETAILED_TRANSACTIONS' (詳細ビュー)
  const [viewMode, setViewMode] = useState<'EXCEL_COMPARISON' | 'DETAILED_TRANSACTIONS'>('EXCEL_COMPARISON');
  const [excelSortOrder, setExcelSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL'); // 'ALL' | 'CARD_ONLY' | 'UNCATEGORIZED' | 'WITHDRAWAL' | 'DEPOSIT' | 'RECONCILED'

  // SMBC Manual Entry Modal & Inline Editing states
  const [showAddSmbcModal, setShowAddSmbcModal] = useState(false);
  const [editingSmbcId, setEditingSmbcId] = useState<number | null>(null);
  const [smbcFormData, setSmbcFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '利息',
    withdrawalAmount: 0,
    depositAmount: 0,
    balance: 0,
    memo: '上前津支店 借入返済/利息',
  });
  const [inlineSmbcData, setInlineSmbcData] = useState<{
    [id: number]: {
      date: string;
      description: string;
      withdrawalAmount: number;
      depositAmount: number;
      balance: number;
    };
  }>({});

  // Expanded card statement state (row id)
  const [expandedCardTxId, setExpandedCardTxId] = useState<number | null>(null);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [ruleFormData, setRuleFormData] = useState({
    keyword: '',
    accountCode: '',
    accountName: '',
    subAccountCode: '',
    subAccountName: '',
    taxType: '課対仕入10%',
    priority: 50,
  });

  // Reconciliation Modal state (確認付きワンクリック消込)
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [reconcileTx, setReconcileTx] = useState<BankTransaction | null>(null);
  const [candidates, setCandidates] = useState<ProjectCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<ProjectCandidate | null>(null);
  const [reconcileClaimAmount, setReconcileClaimAmount] = useState<number>(0);
  const [reconcileDiscount, setReconcileDiscount] = useState<number>(0);
  const [reconcileDiscountReason, setReconcileDiscountReason] = useState<string>('');
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [reconcileSubmitting, setReconcileSubmitting] = useState(false);

  // Inline editing state for transaction subject
  const [editingTxId, setEditingTxId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    accountCode: '',
    accountName: '',
    subAccountName: '',
    taxType: '課対仕入10%',
    memo: '',
  });

  // CSV Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available subjects for fast pick
  const commonSubjects = [
    { name: '売掛金', code: '1130', tax: '対象外' },
    { name: '仕入高', code: '5111', tax: '課対仕入10%' },
    { name: '未払金', code: '2115', tax: '課対仕入10%' },
    { name: '給料手当', code: '6102', tax: '対象外' },
    { name: '法定福利費', code: '6105', tax: '対象外' },
    { name: '支払リース料', code: '6125', tax: '課対仕入10%' },
    { name: '通信費', code: '6117', tax: '課対仕入10%' },
    { name: '車両費', code: '6126', tax: '課対仕入10%' },
    { name: '支払利息', code: '7111', tax: '非課税' },
    { name: '保険料', code: '6130', tax: '非課税' },
    { name: '支払手数料', code: '6121', tax: '課対仕入10%' },
    { name: '水道光熱費', code: '6116', tax: '課対仕入10%' },
  ];

  // Load transactions
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let url = `/api/bank-transactions?yearMonth=${selectedMonth}`;
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      if (filterType === 'WITHDRAWAL') url += '&type=WITHDRAWAL';
      if (filterType === 'DEPOSIT') url += '&type=DEPOSIT';

      const res = await fetch(url);
      const data = await res.json();
      if (data.transactions) {
        let filtered = data.transactions;
        if (filterType === 'CARD_ONLY') {
          filtered = filtered.filter((t: BankTransaction) =>
            t.cardStatementId !== null || t.description.includes('ラクテン') || t.description.includes('カード') || t.description.includes('カ−ド')
          );
        } else if (filterType === 'UNCATEGORIZED') {
          filtered = filtered.filter((t: BankTransaction) => !t.accountName || t.accountName.trim() === '');
        } else if (filterType === 'RECONCILED') {
          filtered = filtered.filter((t: BankTransaction) => t.isReconciled);
        }
        setTransactions(filtered);
        setSummary({
          totalDeposits: data.summary?.totalDeposits || 0,
          totalWithdrawals: data.summary?.totalWithdrawals || 0,
          uncategorizedCount: data.summary?.uncategorizedCount || 0,
          latestBalance: data.summary?.latestBalance || 0,
          ufjBalance: data.summary?.ufjBalance || 0,
          smbcBalance: data.summary?.smbcBalance || 0,
          combinedBalance: data.summary?.combinedBalance || 0,
          totalCount: filtered.length,
        });
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Rules
  const fetchRules = async () => {
    try {
      const res = await fetch('/api/account-code-rules');
      const data = await res.json();
      if (Array.isArray(data)) {
        setRules(data);
      }
    } catch (err) {
      console.error('Failed to fetch rules:', err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchTransactions();
  }, [selectedMonth, filterType, isAuthenticated]);

  // Open Reconcile Modal
  const openReconcileModal = async (tx: BankTransaction) => {
    setReconcileTx(tx);
    setShowReconcileModal(true);
    setReconcileLoading(true);
    try {
      const res = await fetch(`/api/bank-transactions/reconcile?transactionId=${tx.id}`);
      const data = await res.json();
      if (data.candidates && Array.isArray(data.candidates)) {
        setCandidates(data.candidates);
        // Preselect recommended or first candidate
        const topMatch = data.candidates.find((c: ProjectCandidate) => c.isRecommended) || data.candidates[0] || null;
        setSelectedCandidate(topMatch);
        if (topMatch) {
          setReconcileClaimAmount(topMatch.grossAmount || tx.depositAmount);
          setReconcileDiscount(topMatch.discountAmount || 0);
          setReconcileDiscountReason(
            topMatch.partnerName.includes('カラリング')
              ? '当月度仕入割引額相殺（0.942%）'
              : ''
          );
        } else {
          setReconcileClaimAmount(tx.depositAmount);
          setReconcileDiscount(0);
          setReconcileDiscountReason('');
        }
      }
    } catch (err) {
      console.error('Failed to load candidates:', err);
    } finally {
      setReconcileLoading(false);
    }
  };

  // On candidate change
  const handleSelectCandidate = (cand: ProjectCandidate) => {
    setSelectedCandidate(cand);
    setReconcileClaimAmount(cand.grossAmount || (reconcileTx?.depositAmount || 0));
    setReconcileDiscount(cand.discountAmount || 0);
    setReconcileDiscountReason(
      cand.partnerName.includes('カラリング')
        ? '当月度仕入割引額相殺（0.942%）'
        : ''
    );
  };

  // Submit Reconciliation (ワンクリック消込確定)
  const submitReconciliation = async () => {
    if (!reconcileTx || !selectedCandidate) return;

    setReconcileSubmitting(true);
    try {
      const res = await fetch('/api/bank-transactions/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankTransactionId: reconcileTx.id,
          projectId: selectedCandidate.projectId,
          invoiceId: selectedCandidate.invoiceId,
          discountAmount: Number(reconcileDiscount) || 0,
          claimAmount: Number(reconcileClaimAmount) || (reconcileTx.depositAmount + Number(reconcileDiscount)),
          discountReason: reconcileDiscountReason,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setShowReconcileModal(false);
        setReconcileTx(null);
        await fetchTransactions();
      } else {
        alert(result.error || '消込処理に失敗しました');
      }
    } catch (err) {
      console.error('Reconciliation error:', err);
      alert('消込処理中にエラーが発生しました');
    } finally {
      setReconcileSubmitting(false);
    }
  };

  // Cancel Reconciliation
  const handleCancelReconcile = async (tx: BankTransaction) => {
    if (!confirm(`「${tx.description}」の入金消込を解除し、案件ステータスを入金予定に戻しますか？`)) {
      return;
    }
    try {
      const res = await fetch(`/api/bank-transactions/reconcile?bankTransactionId=${tx.id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        await fetchTransactions();
      } else {
        alert(result.error || '消込解除に失敗しました');
      }
    } catch (err) {
      console.error(err);
      alert('消込解除中にエラーが発生しました');
    }
  };

  // Seed sample data
  const handleSeedData = async () => {
    if (!confirm('資料フォルダ内の「三菱UFJ銀行明細CSV（48件）」および「楽天ビジネスカード明細（2025/06〜08）」を取り込み・再初期化しますか？')) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/bank-transactions/seed', { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        alert(result.message || 'データ投入が完了しました');
        setSelectedMonth('all');
        await fetchTransactions();
      } else {
        alert(result.error || '初期化に失敗しました');
      }
    } catch (err) {
      console.error(err);
      alert('初期化中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // File Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const res = await fetch('/api/bank-transactions/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();

      if (result.success) {
        setUploadMessage(`取り込み完了: ${result.importedCount}件登録、${result.skippedCount}件スキップ（重複）`);
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadFile(null);
          setUploadMessage(null);
          fetchTransactions();
        }, 1200);
      } else {
        setUploadMessage(`エラー: ${result.error}`);
      }
    } catch (err: any) {
      console.error(err);
      setUploadMessage(`アップロード失敗: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Toggle Reconciled check
  const handleToggleReconciled = async (tx: BankTransaction) => {
    try {
      const newStatus = !tx.isReconciled;
      setTransactions(prev =>
        prev.map(t => (t.id === tx.id ? { ...t, isReconciled: newStatus } : t))
      );
      await fetch('/api/bank-transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tx.id, isReconciled: newStatus }),
      });
    } catch (err) {
      console.error('Failed to update reconciled status:', err);
    }
  };

  // Start inline editing
  const startEditTx = (tx: BankTransaction) => {
    setEditingTxId(tx.id);
    setEditFormData({
      accountCode: tx.accountCode || '',
      accountName: tx.accountName || '',
      subAccountName: tx.subAccountName || '',
      taxType: tx.taxType || '課対仕入10%',
      memo: tx.memo || '',
    });
  };

  // Save inline editing
  const saveEditTx = async (id: number) => {
    try {
      const res = await fetch('/api/bank-transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          accountCode: editFormData.accountCode,
          accountName: editFormData.accountName,
          subAccountName: editFormData.subAccountName,
          taxType: editFormData.taxType,
          memo: editFormData.memo,
          isReconciled: Boolean(editFormData.accountName),
        }),
      });
      const updated = await res.json();
      setTransactions(prev => prev.map(t => (t.id === id ? { ...t, ...updated } : t)));
      setEditingTxId(null);
    } catch (err) {
      console.error('Failed to save inline edit:', err);
    }
  };

  // Save or update SMBC manual record
  const handleSaveSmbc = async (data: any, id?: number) => {
    try {
      const res = await fetch('/api/bank-transactions/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          bankName: 'SMBC',
          branchName: '上前津支店',
          date: data.date,
          description: data.description,
          withdrawalAmount: Number(data.withdrawalAmount || 0),
          depositAmount: Number(data.depositAmount || 0),
          balance: Number(data.balance || 0),
          subAccountName: 'SMBC上前津',
          memo: data.memo,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        await fetchTransactions();
        setShowAddSmbcModal(false);
        setEditingSmbcId(null);
      } else {
        alert(`保存エラー: ${result.error || '失敗しました'}`);
      }
    } catch (err: any) {
      alert(`通信エラー: ${err.message}`);
    }
  };

  // Delete SMBC manual record
  const handleDeleteSmbc = async (id: number) => {
    if (!confirm('このSMBC明細を削除しますか？')) return;
    try {
      const res = await fetch(`/api/bank-transactions/manual?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchTransactions();
      } else {
        const err = await res.json();
        alert(`削除エラー: ${err.error}`);
      }
    } catch (err: any) {
      alert(`通信エラー: ${err.message}`);
    }
  };

  // Start inline editing SMBC row
  const startInlineEditSmbc = (tx: BankTransaction) => {
    setEditingSmbcId(tx.id);
    const dateStr = new Date(tx.date).toISOString().split('T')[0];
    setInlineSmbcData(prev => ({
      ...prev,
      [tx.id]: {
        date: dateStr,
        description: tx.description,
        withdrawalAmount: tx.withdrawalAmount,
        depositAmount: tx.depositAmount,
        balance: tx.balance,
      },
    }));
  };

  // Unified chronological rows for Excel comparison view
  const unifiedExcelRows = (() => {
    const sorted = [...transactions].sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (diff !== 0) return diff;
      return a.id - b.id;
    });

    let runningUfj = 0;
    let runningSmbc = 0;

    const rowsWithRunningBalances = sorted.map(tx => {
      const isSmbc = tx.bankName?.includes('SMBC');
      if (isSmbc) {
        runningSmbc = tx.balance;
      } else {
        runningUfj = tx.balance;
      }

      return {
        ...tx,
        isSmbc,
        currentUfjBal: runningUfj,
        currentSmbcBal: runningSmbc,
        combinedTotalBal: runningUfj + runningSmbc,
      };
    });

    if (excelSortOrder === 'desc') {
      return [...rowsWithRunningBalances].reverse();
    }
    return rowsWithRunningBalances;
  })();

  // Rule creation
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleFormData.keyword.trim() || !ruleFormData.accountName.trim()) {
      alert('キーワードと勘定科目名は必須です');
      return;
    }
    try {
      const res = await fetch('/api/account-code-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleFormData),
      });
      if (res.ok) {
        setRuleFormData({
          keyword: '',
          accountCode: '',
          accountName: '',
          subAccountCode: '',
          subAccountName: '',
          taxType: '課対仕入10%',
          priority: 50,
        });
        fetchRules();
      }
    } catch (err) {
      console.error('Failed to save rule:', err);
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm('この仕訳ルールを削除しますか？')) return;
    try {
      await fetch(`/api/account-code-rules?id=${id}`, { method: 'DELETE' });
      fetchRules();
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  // Export to Yayoi Accounting CSV (with compound journal support for discounts)
  const handleExportYayoiCsv = () => {
    if (transactions.length === 0) {
      alert('エクスポート対象の明細がありません');
      return;
    }

    const headers = [
      '識別フラグ',
      '伝票日付',
      '借方勘定科目',
      '借方補助科目',
      '借方税区分',
      '借方金額',
      '貸方勘定科目',
      '貸方補助科目',
      '貸方税区分',
      '貸方金額',
      '摘要',
    ];

    const rows: string[] = [];

    transactions.forEach(tx => {
      const dateStr = new Date(tx.date).toISOString().split('T')[0].replace(/-/g, '/');
      const isDeposit = tx.transactionType === 'DEPOSIT';

      // Compound journal entry when a discount/rebate was offset
      if (isDeposit && tx.discountAmount && tx.discountAmount > 0) {
        const subName = tx.subAccountName || tx.reconciledProject?.partner?.name || '日本カラリング';
        const claimTot = tx.claimAmount || (tx.depositAmount + tx.discountAmount);

        // Row 1: Actual Wire Deposit (借方: 普通預金 / 貸方: 売掛金)
        rows.push([
          '2111',
          dateStr,
          '普通預金',
          tx.branchName || '三菱UFJ',
          '対象外',
          tx.depositAmount,
          '売掛金',
          subName,
          '対象外',
          tx.depositAmount,
          `"${(tx.description || '').replace(/"/g, '""')} 振込入金 (請求¥${claimTot.toLocaleString()} - 値引相殺¥${tx.discountAmount.toLocaleString()})"`,
        ].join(','));

        // Row 2: Discount Offset (借方: 売上値引 / 貸方: 売掛金)
        rows.push([
          '2111',
          dateStr,
          '売上値引',
          '',
          '返還売上10%',
          tx.discountAmount,
          '売掛金',
          subName,
          '対象外',
          tx.discountAmount,
          `"${subName} 当月度仕入割引相殺 (SH2025000000476-SRWB等)"`,
        ].join(','));
        return;
      }

      // Standard single journal entry
      const debitAccount = isDeposit ? '普通預金' : (tx.accountName || '未確定科目');
      const debitSub = isDeposit ? (tx.branchName || '三菱UFJ') : (tx.subAccountName || '');
      const debitTax = isDeposit ? '対象外' : (tx.taxType || '課対仕入10%');
      const debitAmount = isDeposit ? tx.depositAmount : tx.withdrawalAmount;

      const creditAccount = isDeposit ? (tx.accountName || '売掛金') : '普通預金';
      const creditSub = isDeposit ? (tx.subAccountName || '') : (tx.branchName || '三菱UFJ');
      const creditTax = isDeposit ? (tx.taxType || '課税売上10%') : '対象外';
      const creditAmount = debitAmount;

      const desc = `"${(tx.description || '').replace(/"/g, '""')}"`;

      rows.push([
        '2111',
        dateStr,
        debitAccount,
        debitSub,
        debitTax,
        debitAmount,
        creditAccount,
        creditSub,
        creditTax,
        creditAmount,
        desc,
      ].join(','));
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `弥生会計仕訳_${selectedMonth === 'all' ? '全明細' : selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <BankGate>
      <div className="flex-1 bg-slate-950 text-slate-100 p-6 overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800">
              三菱UFJ銀行 連携
            </span>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-950/80 text-blue-400 border border-blue-800">
              弥生会計インポート対応
            </span>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> 物件ワンクリック消込対応
            </span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Building2 className="w-7 h-7 text-emerald-400" />
            銀行残高・口座明細管理
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            三菱UFJ銀行明細CSV取込・差引残高管理・日本カラリング等売掛金の確認付きワンクリック消込（値引き相殺仕訳対応）・楽天カード内訳突合
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium shadow-sm shadow-emerald-950 transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            UFJ明細CSV取込
          </button>

          <button
            onClick={() => {
              setSmbcFormData({
                date: new Date().toISOString().split('T')[0],
                description: '利息',
                withdrawalAmount: 0,
                depositAmount: 0,
                balance: summary.smbcBalance || 15459,
                memo: '上前津支店 借入返済/利息',
              });
              setShowAddSmbcModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium shadow-sm shadow-blue-950 transition-colors"
          >
            <Plus className="w-4 h-4" />
            SMBC手入力追加
          </button>

          <button
            onClick={() => {
              setShowRulesModal(true);
              fetchRules();
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium border border-slate-700 transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            自動仕訳ルール設定
          </button>

          <button
            onClick={handleExportYayoiCsv}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium shadow-sm shadow-indigo-950 transition-colors"
            title="弥生会計インポート形式でCSVをダウンロードします"
          >
            <Download className="w-4 h-4" />
            弥生仕訳CSV出力
          </button>

          <button
            onClick={handleSeedData}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-lg text-xs font-medium border border-amber-500/30 transition-colors"
            title="資料フォルダ内の実物CSV・SMBC明細・楽天カードPDFから初期データを再読み込み"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            資料サンプル復元
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {/* Combined Bank Balance (UFJ + SMBC) */}
        <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900/90 border-2 border-indigo-500/40 rounded-xl p-4 shadow-md relative overflow-hidden">
          <div className="absolute right-3 top-3 opacity-15">
            <Building2 className="w-16 h-16 text-indigo-400" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping"></span>
              合算 銀行残高計
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 font-mono border border-indigo-800">
              資料踏襲
            </span>
          </div>
          <div className="text-2xl font-black text-white mt-2 tracking-tight">
            ¥{((summary.combinedBalance ?? ((summary.ufjBalance || summary.latestBalance) + (summary.smbcBalance || 0))) || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>UFJ: ¥{(summary.ufjBalance || summary.latestBalance).toLocaleString()}</span>
            <span>+</span>
            <span className="text-blue-300">SMBC: ¥{(summary.smbcBalance || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* UFJ Balance */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="absolute right-3 top-3 opacity-10">
            <Building2 className="w-16 h-16 text-emerald-400" />
          </div>
          <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            三菱UFJ銀行 (大津町支店)
          </span>
          <div className="text-2xl font-black text-emerald-400 mt-2 tracking-tight">
            ¥{(summary.ufjBalance || summary.latestBalance).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            CSV自動取込・普通預金残高
          </span>
        </div>

        {/* SMBC Balance */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="absolute right-3 top-3 opacity-10">
            <Building2 className="w-16 h-16 text-blue-400" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              SMBC (上前津支店)
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 font-semibold border border-blue-800">
              直接セル編集可
            </span>
          </div>
          <div className="text-2xl font-black text-blue-400 mt-2 tracking-tight">
            ¥{(summary.smbcBalance || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            借入金返済専用口座 (利息・元金)
          </span>
        </div>

        {/* Categorization & Reconciled Status */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="absolute right-3 top-3 opacity-10">
            <CheckCircle2 className="w-16 h-16 text-teal-400" />
          </div>
          <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            仕訳・消込ステータス
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <div className="text-2xl font-black text-white">
              {summary.totalCount - summary.uncategorizedCount}
              <span className="text-sm font-normal text-slate-400 ml-1">/ {summary.totalCount} 件</span>
            </div>
            {summary.uncategorizedCount > 0 && (
              <span className="text-xs bg-amber-950/80 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full font-medium">
                未仕訳 {summary.uncategorizedCount}件
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            {summary.uncategorizedCount === 0 ? '全件仕訳タグ付与完了' : '未確定の科目を編集してください'}
          </span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Month Selector & Filter Pills */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">対象年月:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">全期間 (2025年6月〜8月)</option>
              <option value="2025-06">2025年06月 (楽天カード明細等)</option>
              <option value="2025-07">2025年07月 (28件)</option>
              <option value="2025-08">2025年08月 (20件)</option>
            </select>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterType === 'ALL'
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              すべて ({summary.totalCount})
            </button>
            <button
              onClick={() => setFilterType('DEPOSIT')}
              className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                filterType === 'DEPOSIT'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownRight className="w-3 h-3" />
              入金のみ
            </button>
            <button
              onClick={() => setFilterType('CARD_ONLY')}
              className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                filterType === 'CARD_ONLY'
                  ? 'bg-rose-700 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-3 h-3" />
              カード引落
            </button>
            <button
              onClick={() => setFilterType('UNCATEGORIZED')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterType === 'UNCATEGORIZED'
                  ? 'bg-amber-600 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              未仕訳 ({summary.uncategorizedCount})
            </button>
            <button
              onClick={() => setFilterType('WITHDRAWAL')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterType === 'WITHDRAWAL'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              出金のみ
            </button>
          </div>
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="摘要・科目・メモで検索..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchTransactions()}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* View Mode Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 mb-1">
        <div className="flex items-center gap-2 p-1 bg-slate-900/90 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('EXCEL_COMPARISON')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              viewMode === 'EXCEL_COMPARISON'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/60 ring-1 ring-emerald-400/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            <span>📊 銀行残高2025 踏襲ビュー (UFJ & SMBC 合算表)</span>
            <span className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-950 text-emerald-300 rounded border border-emerald-700/60">
              資料踏襲
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('DETAILED_TRANSACTIONS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              viewMode === 'DETAILED_TRANSACTIONS'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-950/60 ring-1 ring-blue-400/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4 text-blue-300" />
            <span>📋 取引明細・消込詳細ビュー (弥生仕訳・物件消込)</span>
          </button>
        </div>

        {viewMode === 'EXCEL_COMPARISON' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExcelSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium border border-slate-800 transition-colors"
              title="日付昇順（Excel準拠の時系列）/ 降順の切替"
            >
              {excelSortOrder === 'asc' ? '📅 日付昇順 (古い順・Excel準拠)' : '📅 日付降順 (新しい順)'}
            </button>

            <button
              type="button"
              onClick={() => {
                setSmbcFormData({
                  date: new Date().toISOString().split('T')[0],
                  description: '利息',
                  withdrawalAmount: 0,
                  depositAmount: 0,
                  balance: summary.smbcBalance || 15459,
                  memo: '上前津支店 借入返済/利息',
                });
                setShowAddSmbcModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-sm shadow-blue-950 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              SMBC手入力行を追加
            </button>
          </div>
        )}
      </div>

      {viewMode === 'EXCEL_COMPARISON' ? (
        /* Excel 銀行残高2025 踏襲レイアウト (UFJ & SMBC上前津 横並び・合算表) */
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl mt-3 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300 border-collapse">
              <thead className="bg-slate-950 text-xs font-semibold uppercase tracking-wider border-b border-slate-800 sticky top-0 z-10">
                <tr className="border-b border-slate-800/80">
                  <th rowSpan={2} className="py-3 px-3 text-center w-24 border-r border-slate-800 bg-slate-950">
                    日付
                  </th>
                  <th colSpan={4} className="py-2.5 px-4 text-center font-bold bg-emerald-950/60 text-emerald-300 border-r border-slate-800">
                    <div className="flex items-center justify-center gap-1.5">
                      <Building2 className="w-4 h-4 text-emerald-400" />
                      <span>三菱UFJ銀行 (大津町支店・CSV連携)</span>
                    </div>
                  </th>
                  <th colSpan={4} className="py-2.5 px-4 text-center font-bold bg-blue-950/60 text-blue-300 border-r border-slate-800">
                    <div className="flex items-center justify-center gap-1.5">
                      <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>SMBC上前津 (借入専用・画面直接セル編集)</span>
                    </div>
                  </th>
                  <th rowSpan={2} className="py-3 px-4 text-right w-36 bg-indigo-950/50 text-indigo-300 border-r border-slate-800">
                    <div className="font-bold text-sm">銀行残高計</div>
                    <div className="text-[10px] font-normal text-slate-400 font-mono">(UFJ + SMBC)</div>
                  </th>
                  <th rowSpan={2} className="py-3 px-3 text-center w-24 bg-slate-950">
                    操作
                  </th>
                </tr>
                <tr className="border-b border-slate-800 text-[11px]">
                  {/* UFJ Subheaders */}
                  <th className="py-2 px-3 bg-emerald-950/40 text-emerald-300/90 font-medium">摘要</th>
                  <th className="py-2 px-3 text-right w-28 bg-emerald-950/40 text-blue-400 font-medium">入金</th>
                  <th className="py-2 px-3 text-right w-28 bg-emerald-950/40 text-rose-400 font-medium">出金</th>
                  <th className="py-2 px-3 text-right w-32 bg-emerald-950/40 text-slate-200 font-bold border-r border-slate-800">残高</th>
                  {/* SMBC Subheaders */}
                  <th className="py-2 px-3 bg-blue-950/40 text-blue-300/90 font-medium">摘要 (利息・返済)</th>
                  <th className="py-2 px-3 text-right w-24 bg-blue-950/40 text-blue-400 font-medium">入金</th>
                  <th className="py-2 px-3 text-right w-24 bg-blue-950/40 text-rose-400 font-medium">出金</th>
                  <th className="py-2 px-3 text-right w-28 bg-blue-950/40 text-cyan-300 font-bold border-r border-slate-800">残高</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="text-center py-16 text-slate-500 font-sans">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                      合算残高データを読み込み中...
                    </td>
                  </tr>
                ) : unifiedExcelRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-16 text-slate-500 font-sans">
                      対象の明細データがありません
                    </td>
                  </tr>
                ) : (
                  unifiedExcelRows.map(row => {
                    const dateStr = new Date(row.date).toISOString().split('T')[0];
                    const isSmbc = row.isSmbc;
                    const isSmbcEditing = isSmbc && editingSmbcId === row.id;
                    const smbcEdit = inlineSmbcData[row.id] || {
                      date: dateStr,
                      description: row.description,
                      withdrawalAmount: row.withdrawalAmount,
                      depositAmount: row.depositAmount,
                      balance: row.balance,
                    };

                    const isCardTx =
                      row.cardStatementId !== null ||
                      row.description.includes('ラクテン') ||
                      row.description.includes('楽天');
                    const isNihonColoring =
                      row.description.includes('ニホンカラリング') ||
                      row.description.includes('日本カラリング');

                    return (
                      <tr
                        key={`${row.id}_${isSmbc ? 'smbc' : 'ufj'}`}
                        className={`hover:bg-slate-800/50 transition-colors ${
                          isSmbc
                            ? 'bg-blue-950/25 border-l-4 border-l-blue-500'
                            : isCardTx
                            ? 'bg-rose-950/10'
                            : ''
                        }`}
                      >
                        {/* 1. Date */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap text-slate-300 border-r border-slate-800 font-sans text-xs">
                          {isSmbcEditing ? (
                            <input
                              type="date"
                              value={smbcEdit.date}
                              onChange={e =>
                                setInlineSmbcData(prev => ({
                                  ...prev,
                                  [row.id]: { ...smbcEdit, date: e.target.value },
                                }))
                              }
                              className="w-full bg-slate-900 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white"
                            />
                          ) : (
                            <span className={isSmbc ? 'text-blue-300 font-bold' : ''}>{dateStr}</span>
                          )}
                        </td>

                        {/* 2. UFJ 摘要 */}
                        <td className="py-2.5 px-3 font-sans text-xs text-slate-200">
                          {isSmbc ? (
                            <span className="text-slate-600">-</span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-white">{row.description}</span>
                              {isCardTx && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                                  カード
                                </span>
                              )}
                              {isNihonColoring && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                  売掛金
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 3. UFJ 入金 */}
                        <td className="py-2.5 px-3 text-right">
                          {isSmbc || row.depositAmount === 0 ? (
                            <span className="text-slate-600">-</span>
                          ) : (
                            <span className="text-blue-400 font-semibold">
                              ¥{row.depositAmount.toLocaleString()}
                            </span>
                          )}
                        </td>

                        {/* 4. UFJ 出金 */}
                        <td className="py-2.5 px-3 text-right">
                          {isSmbc || row.withdrawalAmount === 0 ? (
                            <span className="text-slate-600">-</span>
                          ) : (
                            <span className="text-rose-400 font-semibold">
                              ¥{row.withdrawalAmount.toLocaleString()}
                            </span>
                          )}
                        </td>

                        {/* 5. UFJ 残高 */}
                        <td className="py-2.5 px-3 text-right border-r border-slate-800 font-bold">
                          {isSmbc ? (
                            <span className="text-slate-500 font-normal">
                              ¥{row.currentUfjBal.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-emerald-400">
                              ¥{row.balance.toLocaleString()}
                            </span>
                          )}
                        </td>

                        {/* 6. SMBC 摘要 (直接編集対応) */}
                        <td className="py-2.5 px-3 font-sans text-xs">
                          {isSmbc ? (
                            isSmbcEditing ? (
                              <input
                                type="text"
                                value={smbcEdit.description}
                                onChange={e =>
                                  setInlineSmbcData(prev => ({
                                    ...prev,
                                    [row.id]: { ...smbcEdit, description: e.target.value },
                                  }))
                                }
                                placeholder="摘要 (例: 利息, 返済)"
                                className="w-full bg-slate-900 border border-blue-500 rounded px-2 py-1 text-xs text-white focus:outline-none"
                              />
                            ) : (
                              <div
                                onDoubleClick={() => startInlineEditSmbc(row)}
                                className="flex items-center gap-1.5 cursor-pointer group"
                                title="ダブルクリックで直接編集"
                              >
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-900 text-blue-200 border border-blue-700">
                                  SMBC借入
                                </span>
                                <span className="font-medium text-white group-hover:text-blue-300">
                                  {row.description}
                                </span>
                                <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                              </div>
                            )
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        {/* 7. SMBC 入金 */}
                        <td className="py-2.5 px-3 text-right">
                          {isSmbc ? (
                            isSmbcEditing ? (
                              <input
                                type="number"
                                value={smbcEdit.depositAmount}
                                onChange={e => {
                                  const val = Number(e.target.value) || 0;
                                  setInlineSmbcData(prev => ({
                                    ...prev,
                                    [row.id]: { ...smbcEdit, depositAmount: val },
                                  }));
                                }}
                                className="w-full text-right bg-slate-900 border border-blue-500 rounded px-1.5 py-1 text-xs text-blue-300 focus:outline-none"
                              />
                            ) : row.depositAmount > 0 ? (
                              <span className="text-blue-400 font-semibold">
                                ¥{row.depositAmount.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        {/* 8. SMBC 出金 */}
                        <td className="py-2.5 px-3 text-right">
                          {isSmbc ? (
                            isSmbcEditing ? (
                              <input
                                type="number"
                                value={smbcEdit.withdrawalAmount}
                                onChange={e => {
                                  const val = Number(e.target.value) || 0;
                                  setInlineSmbcData(prev => ({
                                    ...prev,
                                    [row.id]: { ...smbcEdit, withdrawalAmount: val },
                                  }));
                                }}
                                className="w-full text-right bg-slate-900 border border-blue-500 rounded px-1.5 py-1 text-xs text-rose-300 focus:outline-none"
                              />
                            ) : row.withdrawalAmount > 0 ? (
                              <span className="text-rose-400 font-semibold">
                                ¥{row.withdrawalAmount.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        {/* 9. SMBC 残高 */}
                        <td className="py-2.5 px-3 text-right border-r border-slate-800 font-bold">
                          {isSmbc ? (
                            isSmbcEditing ? (
                              <input
                                type="number"
                                value={smbcEdit.balance}
                                onChange={e => {
                                  const val = Number(e.target.value) || 0;
                                  setInlineSmbcData(prev => ({
                                    ...prev,
                                    [row.id]: { ...smbcEdit, balance: val },
                                  }));
                                }}
                                className="w-full text-right bg-slate-900 border border-blue-500 rounded px-1.5 py-1 text-xs text-cyan-300 font-bold focus:outline-none"
                              />
                            ) : (
                              <span className="text-cyan-300">
                                ¥{row.balance.toLocaleString()}
                              </span>
                            )
                          ) : (
                            <span className="text-slate-500 font-normal">
                              ¥{row.currentSmbcBal.toLocaleString()}
                            </span>
                          )}
                        </td>

                        {/* 10. 銀行残高計 (UFJ + SMBC) */}
                        <td className="py-2.5 px-4 text-right border-r border-slate-800 font-black text-indigo-300 bg-indigo-950/20 text-sm">
                          ¥{row.combinedTotalBal.toLocaleString()}
                        </td>

                        {/* 11. Actions */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap font-sans text-xs">
                          {isSmbc ? (
                            isSmbcEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveSmbc(smbcEdit, row.id)}
                                  className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs transition-colors"
                                  title="セル内容を保存"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSmbcId(null)}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
                                  title="編集を取消"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => startInlineEditSmbc(row)}
                                  className="p-1 text-slate-400 hover:text-blue-300 transition-colors"
                                  title="直接セル編集"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSmbc(row.id)}
                                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                                  title="この行を削除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              {isCardTx && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewMode('DETAILED_TRANSACTIONS');
                                    setExpandedCardTxId(row.id);
                                  }}
                                  className="px-2 py-0.5 bg-rose-950/80 text-rose-300 hover:bg-rose-900 border border-rose-800 rounded text-[10px] font-semibold"
                                  title="カード内訳明細を確認"
                                >
                                  内訳
                                </button>
                              )}
                              {isNihonColoring && (
                                <button
                                  type="button"
                                  onClick={() => openReconcileModal(row)}
                                  className="px-2 py-0.5 bg-blue-950/80 text-blue-300 hover:bg-blue-900 border border-blue-800 rounded text-[10px] font-semibold"
                                  title="物件ワンクリック消込"
                                >
                                  消込
                                </button>
                              )}
                              {!isCardTx && !isNihonColoring && (
                                <span className="text-slate-600">-</span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Bar for Excel View */}
          <div className="bg-slate-950 p-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                三菱UFJ: CSV自動連携
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-blue-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                SMBC上前津: 画面直接編集 (借入専用)
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-indigo-400 font-bold">
                銀行残高計 = UFJ残高 + SMBC残高
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSmbcFormData({
                  date: new Date().toISOString().split('T')[0],
                  description: '利息',
                  withdrawalAmount: 0,
                  depositAmount: 0,
                  balance: summary.smbcBalance || 15459,
                  memo: '上前津支店 借入返済/利息',
                });
                setShowAddSmbcModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              SMBC手入力行を追加
            </button>
          </div>
        </div>
      ) : (
        /* Detailed Transactions Table (Existing Table) */
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl mt-4 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">消込</th>
                <th className="py-3.5 px-4 w-28">取引日</th>
                <th className="py-3.5 px-4 w-20">種別</th>
                <th className="py-3.5 px-4">摘要・相手先 (UFJ明細)</th>
                <th className="py-3.5 px-4 text-right w-32">支払金額 (出金)</th>
                <th className="py-3.5 px-4 text-right w-32">預り金額 (入金)</th>
                <th className="py-3.5 px-4 text-right w-32">差引残高</th>
                <th className="py-3.5 px-4 w-44">勘定科目 (弥生)</th>
                <th className="py-3.5 px-4 w-24">税区分</th>
                <th className="py-3.5 px-4 w-52">内訳・物件消込連携</th>
                <th className="py-3.5 px-4 w-20 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-16 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                    明細データを読み込み中...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-16 text-slate-500">
                    対象の明細がありません。「資料サンプル復元」または「UFJ明細CSV取込」を行ってください。
                  </td>
                </tr>
              ) : (
                transactions.map(tx => {
                  const dateStr = new Date(tx.date).toISOString().split('T')[0];
                  const isCardTx =
                    tx.cardStatementId !== null ||
                    tx.description.includes('ラクテン') ||
                    tx.description.includes('楽天');
                  const isExpanded = expandedCardTxId === tx.id;
                  const isEditing = editingTxId === tx.id;
                  const isDeposit = tx.transactionType === 'DEPOSIT';

                  return (
                    <Fragment key={tx.id}>
                      <tr
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isExpanded ? 'bg-slate-800/50' : ''
                        } ${!tx.accountName ? 'bg-amber-950/10' : ''}`}
                      >
                        {/* Reconciled Checkbox */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleReconciled(tx)}
                            title={tx.isReconciled ? '消込済 (クリックで未消込に変更)' : '未消込 (クリックで消込完了に変更)'}
                            className={`p-1 rounded transition-colors ${
                              tx.isReconciled
                                ? 'text-emerald-400 hover:text-emerald-300'
                                : 'text-slate-600 hover:text-slate-400'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-xs text-slate-200">
                          {dateStr}
                        </td>

                        {/* Type */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isDeposit ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-950 text-blue-400 border border-blue-800">
                              入金
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                              出金
                            </span>
                          )}
                        </td>

                        {/* Description */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-100 flex items-center gap-2">
                            <span>{tx.description}</span>
                            {tx.memo && (
                              <span className="text-[11px] px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                                {tx.memo}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Withdrawal */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                          {tx.withdrawalAmount > 0
                            ? `-¥${tx.withdrawalAmount.toLocaleString()}`
                            : '-'}
                        </td>

                        {/* Deposit */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-400">
                          {tx.depositAmount > 0
                            ? `+¥${tx.depositAmount.toLocaleString()}`
                            : '-'}
                        </td>

                        {/* Balance */}
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          ¥{tx.balance.toLocaleString()}
                        </td>

                        {/* Account Subject (弥生) */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <div className="flex flex-col gap-1">
                              <select
                                value={editFormData.accountName}
                                onChange={e => {
                                  const sel = commonSubjects.find(s => s.name === e.target.value);
                                  setEditFormData(prev => ({
                                    ...prev,
                                    accountName: e.target.value,
                                    accountCode: sel?.code || '',
                                    taxType: sel?.tax || prev.taxType,
                                  }));
                                }}
                                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                              >
                                <option value="">(科目を選択)</option>
                                {commonSubjects.map(s => (
                                  <option key={s.name} value={s.name}>
                                    {s.code ? `[${s.code}] ` : ''}
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="補助科目・相手先"
                                value={editFormData.subAccountName}
                                onChange={e => setEditFormData({ ...editFormData, subAccountName: e.target.value })}
                                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                              />
                            </div>
                          ) : tx.accountName ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-emerald-400 flex items-center gap-1">
                                {tx.accountCode && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    [{tx.accountCode}]
                                  </span>
                                )}
                                {tx.accountName}
                              </span>
                              {tx.subAccountName && (
                                <span className="text-[11px] text-slate-400">
                                  {tx.subAccountName}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-950/70 text-amber-300 border border-amber-800">
                              未仕訳
                            </span>
                          )}
                        </td>

                        {/* Tax Type */}
                        <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">
                          {isEditing ? (
                            <select
                              value={editFormData.taxType}
                              onChange={e => setEditFormData({ ...editFormData, taxType: e.target.value })}
                              className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs text-slate-200"
                            >
                              <option value="課対仕入10%">課対仕入10%</option>
                              <option value="課税売上10%">課税売上10%</option>
                              <option value="返還売上10%">返還売上10%</option>
                              <option value="非課税">非課税</option>
                              <option value="対象外">対象外</option>
                            </select>
                          ) : (
                            tx.taxType || '課対仕入10%'
                          )}
                        </td>

                        {/* Related Card Statement or Project Reconciliation */}
                        <td className="py-3 px-4">
                          {isCardTx ? (
                            <button
                              onClick={() => setExpandedCardTxId(isExpanded ? null : tx.id)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                                isExpanded
                                  ? 'bg-rose-600 text-white ring-2 ring-rose-400/50'
                                  : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 shadow-sm'
                              }`}
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>楽天カード内訳</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                              )}
                            </button>
                          ) : isDeposit ? (
                            tx.reconciledProjectId ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  物件消込済
                                  {tx.discountAmount && tx.discountAmount > 0 && (
                                    <span className="text-[10px] text-amber-300 bg-amber-950/80 px-1 rounded ml-0.5">
                                      値引 -¥{tx.discountAmount.toLocaleString()}
                                    </span>
                                  )}
                                </span>
                                <button
                                  onClick={() => handleCancelReconcile(tx)}
                                  className="text-slate-500 hover:text-slate-300 p-1"
                                  title="消込を解除"
                                >
                                  <Undo2 className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => openReconcileModal(tx)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-blue-950/90 hover:bg-blue-900 text-blue-300 border border-blue-700 shadow-sm transition-all hover:ring-1 hover:ring-blue-400"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                                <span>物件消込 (確認)</span>
                              </button>
                            )
                          ) : (
                            <span className="text-xs text-slate-600">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => saveEditTx(tx.id)}
                                className="p-1 text-emerald-400 hover:text-emerald-300"
                                title="保存"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingTxId(null)}
                                className="p-1 text-slate-400 hover:text-slate-200"
                                title="キャンセル"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditTx(tx)}
                              className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
                              title="科目・税区分を編集"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Card Statement Breakdown Drawer / Row */}
                      {isExpanded && (
                        <tr className="bg-slate-950/90 border-y-2 border-rose-900/60">
                          <td colSpan={11} className="p-5">
                            <div className="bg-slate-900 border border-rose-900/40 rounded-xl p-4 shadow-xl">
                              {/* Card Drawer Header */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 rounded-lg bg-rose-950 text-rose-400 border border-rose-800">
                                    <CreditCard className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                      {tx.cardStatement?.cardName || '楽天ビジネスカード (JCB)'}
                                      <span className="text-xs font-normal text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/60">
                                        振替引落日: {dateStr}
                                      </span>
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      {tx.cardStatement?.memo || 'クレジットカード利用明細・内訳詳細'}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <span className="text-[11px] text-slate-400 block">カード明細請求合計</span>
                                    <span className="text-base font-black text-rose-400 font-mono">
                                      ¥{(tx.cardStatement?.totalAmount || tx.withdrawalAmount).toLocaleString()}
                                    </span>
                                  </div>
                                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    口座引落額と一致
                                  </span>
                                </div>
                              </div>

                              {/* Card Breakdown Items Table */}
                              <div className="mt-3 overflow-x-auto">
                                <table className="w-full text-xs text-slate-300">
                                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                                    <tr>
                                      <th className="py-2 px-3 w-28">利用日</th>
                                      <th className="py-2 px-3">利用店舗・サービス名</th>
                                      <th className="py-2 px-3 w-24">利用者</th>
                                      <th className="py-2 px-3 w-28">勘定科目</th>
                                      <th className="py-2 px-3 text-right w-28">利用金額</th>
                                      <th className="py-2 px-3">備考・業務目的</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/50">
                                    {tx.cardStatement?.details && tx.cardStatement.details.length > 0 ? (
                                      tx.cardStatement.details.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-800/40">
                                          <td className="py-2 px-3 font-mono text-slate-400">{item.date}</td>
                                          <td className="py-2 px-3 font-medium text-slate-200">{item.storeName}</td>
                                          <td className="py-2 px-3 text-slate-400">{item.user || '-'}</td>
                                          <td className="py-2 px-3">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-teal-300 border border-slate-700">
                                              {item.category || '通信費'}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">
                                            ¥{item.amount.toLocaleString()}
                                          </td>
                                          <td className="py-2 px-3 text-slate-400">{item.memo || '-'}</td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan={6} className="text-center py-4 text-slate-500">
                                          明細内訳データがまだ登録されていません
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                                <span>
                                  ※ 資料「statement_202506.pdf」等の明細書に基づき、開発ツール（Devin AI）、VPSサーバー（さくら）、ETC等の勘定科目別集計を行っています。
                                </span>
                                <button
                                  onClick={() => setExpandedCardTxId(null)}
                                  className="text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
                                >
                                  内訳を閉じる ▲
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Confirmation 1-Click Reconciliation Modal (確認付きワンクリック消込モーダル) */}
      {showReconcileModal && reconcileTx && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
            <button
              onClick={() => setShowReconcileModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
              <div className="p-3 bg-blue-950 text-blue-400 rounded-xl border border-blue-800">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">売掛金入金消込・物件ステータス更新</h2>
                <p className="text-xs text-slate-400">
                  銀行入金実績と案件（請求書）を突合し、確認後にワンクリックで「入金済」へ変更します
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* 1. Bank Transaction Info */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  1. 対象の三菱UFJ銀行 入金明細
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">振込着金日</span>
                    <span className="font-mono text-slate-200 font-bold">
                      {new Date(reconcileTx.date).toISOString().split('T')[0]}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">摘要・振込人名</span>
                    <span className="text-white font-medium">{reconcileTx.description}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">預り入金額（着金実額）</span>
                    <span className="font-mono text-blue-400 font-black text-sm">
                      +¥{reconcileTx.depositAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Candidate Projects List */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    2. 消込対象の物件・請求書の選択
                  </span>
                  {reconcileLoading && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> 候補を検索中...
                    </span>
                  )}
                </div>

                {candidates.length === 0 && !reconcileLoading ? (
                  <div className="p-4 text-center text-xs text-slate-500 bg-slate-900 rounded-lg">
                    該当する取引先の案件が見つかりませんでした。
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {candidates.map(cand => {
                      const isSelected = selectedCandidate?.projectId === cand.projectId;
                      return (
                        <div
                          key={cand.projectId}
                          onClick={() => handleSelectCandidate(cand)}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-950/60 border-blue-500 ring-1 ring-blue-500'
                              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                checked={isSelected}
                                onChange={() => handleSelectCandidate(cand)}
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              <span className="font-mono text-slate-400">[{cand.projectCode}]</span>
                              <span className="font-semibold text-white">{cand.projectName}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
                              {cand.currentStatus}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between pl-5 text-[11px] text-slate-400">
                            <span>顧客: {cand.partnerName}</span>
                            <div className="flex items-center gap-2">
                              <span>請求総額: ¥{cand.grossAmount.toLocaleString()}</span>
                              {cand.isRecommended && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                  推奨一致
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Amounts & Discount offset calculation */}
              {selectedCandidate && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <BadgePercent className="w-3.5 h-3.5 text-amber-400" />
                      3. 消込金額および仕入割引（値引き相殺）の計算
                    </span>
                    {selectedCandidate.partnerName.includes('カラリング') && (
                      <span className="text-[11px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                        ※ 日本カラリング 仕入割引率 0.942%
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        売掛請求金額 (総額)
                      </label>
                      <input
                        type="number"
                        value={reconcileClaimAmount}
                        onChange={e => setReconcileClaimAmount(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        値引・仕入割引相殺額
                      </label>
                      <input
                        type="number"
                        value={reconcileDiscount}
                        onChange={e => setReconcileDiscount(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-amber-600/60 rounded px-2.5 py-1.5 text-xs text-amber-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        差引実振込額 (算出)
                      </label>
                      <div className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-blue-400 flex items-center justify-between">
                        <span>¥{(reconcileClaimAmount - reconcileDiscount).toLocaleString()}</span>
                        {reconcileClaimAmount - reconcileDiscount === reconcileTx.depositAmount && (
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> 一致
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">値引相殺の理由・書類番号</label>
                    <input
                      type="text"
                      placeholder="例: SH2025000000476-SRWB 仕入割引額相殺"
                      value={reconcileDiscountReason}
                      onChange={e => setReconcileDiscountReason(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>
              )}

              {/* 4. Yayoi Accounting Journal Preview */}
              {selectedCandidate && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    4. 弥生会計 確定仕訳プレビュー
                  </span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-300">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-1.5 px-2">借方勘定科目</th>
                          <th className="py-1.5 px-2 text-right">借方金額</th>
                          <th className="py-1.5 px-2">借方税区分</th>
                          <th className="py-1.5 px-2">貸方勘定科目</th>
                          <th className="py-1.5 px-2 text-right">貸方金額</th>
                          <th className="py-1.5 px-2">貸方税区分</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {/* Deposit Row */}
                        <tr>
                          <td className="py-1.5 px-2 font-medium text-emerald-400">普通預金 (三菱UFJ)</td>
                          <td className="py-1.5 px-2 text-right font-bold">
                            ¥{reconcileTx.depositAmount.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-2 text-slate-400">対象外</td>
                          <td className="py-1.5 px-2 text-white">売掛金 ({selectedCandidate.partnerName})</td>
                          <td className="py-1.5 px-2 text-right">
                            ¥{reconcileTx.depositAmount.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-2 text-slate-400">対象外</td>
                        </tr>

                        {/* Discount Row (if any) */}
                        {reconcileDiscount > 0 && (
                          <tr className="bg-amber-950/20">
                            <td className="py-1.5 px-2 font-medium text-amber-300">売上値引 (仕入割引相殺)</td>
                            <td className="py-1.5 px-2 text-right font-bold text-amber-300">
                              ¥{reconcileDiscount.toLocaleString()}
                            </td>
                            <td className="py-1.5 px-2 text-amber-400">返還売上10%</td>
                            <td className="py-1.5 px-2 text-white">売掛金 ({selectedCandidate.partnerName})</td>
                            <td className="py-1.5 px-2 text-right font-bold text-amber-300">
                              ¥{reconcileDiscount.toLocaleString()}
                            </td>
                            <td className="py-1.5 px-2 text-slate-400">対象外</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                    <span>
                      ※ 請求総額 ¥{reconcileClaimAmount.toLocaleString()} の売掛金が過不足なく完全に消し込まれます。
                    </span>
                    <span className="text-emerald-400 font-bold">
                      貸借合計: ¥{reconcileClaimAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-4">
              <span className="text-xs text-slate-400">
                消込確定により、該当物件のステータスは即座に「入金済」へ変更されます。
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowReconcileModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  disabled={!selectedCandidate || reconcileSubmitting}
                  onClick={submitReconciliation}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow-md transition-colors flex items-center gap-1.5"
                >
                  {reconcileSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  消込を確定する（入金済に変更）
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-800">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">三菱UFJ銀行 明細CSV取込</h2>
                <p className="text-xs text-slate-400">Shift-JIS / UTF-8 エンコード自動判定・重複スキップ</p>
              </div>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500/80 bg-slate-950/60 rounded-xl p-6 text-center cursor-pointer transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                />
                <FileSpreadsheet className="w-10 h-10 text-emerald-400/80 mx-auto mb-2" />
                {uploadFile ? (
                  <div>
                    <span className="font-semibold text-emerald-400 text-sm block">
                      {uploadFile.name}
                    </span>
                    <span className="text-xs text-slate-500 mt-1 block">
                      {(uploadFile.size / 1024).toFixed(1)} KB (クリックで別ファイル選択)
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-medium text-slate-300 block">
                      CSVファイルをここにドラッグ＆ドロップ
                    </span>
                    <span className="text-xs text-slate-500 mt-1 block">
                      または クリックしてファイルを選択 (例: MEISAI20250829151403.csv)
                    </span>
                  </div>
                )}
              </div>

              {uploadMessage && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium ${
                    uploadMessage.includes('完了')
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                  }`}
                >
                  {uploadMessage}
                </div>
              )}

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-xs text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <Info className="w-3.5 h-3.5 text-emerald-400" />
                  自動処理される機能
                </div>
                <p>・同一日付・摘要・金額・残高の二重取り込み防止（ハッシュ一意判定）</p>
                <p>・「自動仕訳ルール」に基づく勘定科目・補助科目・税区分の自動割当</p>
                <p>・「ラクテンカ−ド」等のクレジットカード明細への自動紐付け</p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium"
                >
                  閉じる
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || uploading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {uploading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  アップロード・取込実行
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowRulesModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-950 text-blue-400 rounded-xl border border-blue-800">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">自動仕訳ルール設定 (弥生会計連動)</h2>
                <p className="text-xs text-slate-400">
                  明細の摘要に含まれるキーワードから、勘定科目・補助科目・税区分を自動判定します
                </p>
              </div>
            </div>

            {/* Rule Creation Form */}
            <form onSubmit={handleSaveRule} className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4">
              <div className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                新規仕訳ルールの追加
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">マッチングキーワード *</label>
                  <input
                    type="text"
                    required
                    placeholder="例: ラクテンカ−ド, コニカミノルタ"
                    value={ruleFormData.keyword}
                    onChange={e => setRuleFormData({ ...ruleFormData, keyword: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">勘定科目名 *</label>
                  <input
                    type="text"
                    required
                    placeholder="例: 未払金, 支払リース料"
                    value={ruleFormData.accountName}
                    onChange={e => setRuleFormData({ ...ruleFormData, accountName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">科目コード (任意)</label>
                  <input
                    type="text"
                    placeholder="例: 2115, 6125"
                    value={ruleFormData.accountCode}
                    onChange={e => setRuleFormData({ ...ruleFormData, accountCode: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">補助科目名</label>
                  <input
                    type="text"
                    placeholder="例: 楽天カード, コニカ"
                    value={ruleFormData.subAccountName}
                    onChange={e => setRuleFormData({ ...ruleFormData, subAccountName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">税区分</label>
                  <select
                    value={ruleFormData.taxType}
                    onChange={e => setRuleFormData({ ...ruleFormData, taxType: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="課対仕入10%">課対仕入10%</option>
                    <option value="課税売上10%">課税売上10%</option>
                    <option value="返還売上10%">返還売上10%</option>
                    <option value="非課税">非課税</option>
                    <option value="対象外">対象外</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    ルールを登録
                  </button>
                </div>
              </div>
            </form>

            {/* Rules List */}
            <div className="flex-1 overflow-y-auto pr-1">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">キーワード</th>
                    <th className="py-2 px-3">勘定科目</th>
                    <th className="py-2 px-3">コード</th>
                    <th className="py-2 px-3">補助科目</th>
                    <th className="py-2 px-3">税区分</th>
                    <th className="py-2 px-3 text-center w-14">削除</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rules.map(r => (
                    <tr key={r.id} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-semibold text-emerald-400">{r.keyword}</td>
                      <td className="py-2 px-3 font-medium text-white">{r.accountName}</td>
                      <td className="py-2 px-3 font-mono text-slate-400">{r.accountCode || '-'}</td>
                      <td className="py-2 px-3 text-slate-300">{r.subAccountName || '-'}</td>
                      <td className="py-2 px-3 text-slate-400">{r.taxType}</td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleDeleteRule(r.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800 mt-2">
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium"
              >
                完了・閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add SMBC Manual Transaction Modal */}
      {showAddSmbcModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddSmbcModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
              <div className="p-3 bg-blue-950 text-blue-400 rounded-xl border border-blue-800">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">SMBC上前津 手入力明細の追加</h2>
                <p className="text-xs text-slate-400">
                  借入金返済・支払利息等の専用口座（画面直接セル編集も可能）
                </p>
              </div>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                handleSaveSmbc(smbcFormData);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">取引日 *</label>
                <input
                  type="date"
                  required
                  value={smbcFormData.date}
                  onChange={e => setSmbcFormData({ ...smbcFormData, date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">摘要 *</label>
                <div className="flex gap-2 mb-2">
                  {['利息', '元金返済', '借入実行', '手数料'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSmbcFormData({ ...smbcFormData, description: preset })}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                        smbcFormData.description === preset
                          ? 'bg-blue-600 text-white border-blue-500 font-semibold'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  placeholder="例: 利息, ご融資返済"
                  value={smbcFormData.description}
                  onChange={e => setSmbcFormData({ ...smbcFormData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">支払金額 (出金)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={smbcFormData.withdrawalAmount || ''}
                    onChange={e => {
                      const val = Number(e.target.value) || 0;
                      setSmbcFormData(prev => ({
                        ...prev,
                        withdrawalAmount: val,
                        balance: prev.balance > 0 && val > 0 ? prev.balance - val : prev.balance,
                      }));
                    }}
                    className="w-full text-right bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-rose-400 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">利息・返済など</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">預り金額 (入金)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={smbcFormData.depositAmount || ''}
                    onChange={e => {
                      const val = Number(e.target.value) || 0;
                      setSmbcFormData(prev => ({
                        ...prev,
                        depositAmount: val,
                        balance: prev.balance > 0 && val > 0 ? prev.balance + val : prev.balance,
                      }));
                    }}
                    className="w-full text-right bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-blue-400 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">資金移動など</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300 block">差引口座残高 (取引後) *</label>
                  <span className="text-[11px] text-slate-400">直前残高: ¥{(summary.smbcBalance || 15459).toLocaleString()}</span>
                </div>
                <input
                  type="number"
                  required
                  value={smbcFormData.balance}
                  onChange={e => setSmbcFormData({ ...smbcFormData, balance: Number(e.target.value) || 0 })}
                  className="w-full text-right bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-base text-cyan-300 font-mono font-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  ※ 登録すると「銀行残高計（UFJ+SMBC）」に即座に反映されます。
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">メモ</label>
                <input
                  type="text"
                  placeholder="例: 上前津支店 借入返済/利息"
                  value={smbcFormData.memo}
                  onChange={e => setSmbcFormData({ ...smbcFormData, memo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddSmbcModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-md transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  残高表に登録・反映
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </BankGate>
  );
}
