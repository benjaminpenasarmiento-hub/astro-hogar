import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  Trash2, 
  ClipboardList, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Wallet, 
  Calendar, 
  ArrowRight,
  Plus,
  MinusCircle,
  FileSpreadsheet,
  X,
  CreditCard,
  PiggyBank,
  Check,
  RefreshCw,
  Info,
  Edit,
  Filter
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { 
  fetchBudgetStore, 
  createBudgetItem, 
  updateBudgetItem,
  deleteBudgetItem, 
  createBudgetTemplate, 
  updateBudgetTemplate,
  deleteBudgetTemplate, 
  applyBudgetTemplate,
  createBudgetAccount,
  deleteBudgetAccount,
  closeFortnight,
  openFortnight,
  clearBudgetStoreApi
} from "../api";
import { BudgetItem, BudgetEstimate, BudgetTemplate, BudgetAccount } from "../types";

export default function PresupuestoModule() {
  // Store lists state
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [estimates, setEstimates] = useState<BudgetEstimate[]>([]);
  const [templates, setTemplates] = useState<BudgetTemplate[]>([]);
  const [accounts, setAccounts] = useState<BudgetAccount[]>([]);
  const [closedFortnights, setClosedFortnights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Toast & Custom Confirm Dialogue states to bypass sandboxed iFrame blocking of alert/confirm
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    // Auto clear
    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  };

  const askConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      visible: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      }
    });
  };

  // Active period selection
  const currentYear = new Date().getFullYear();
  const currentMonthNum = String(new Date().getMonth() + 1).padStart(2, '0');
  const currentDay = new Date().getDate();
  const defaultFortnight = currentDay <= 15 ? "Q1" : "Q2";
  
  const [selectedMonth, setSelectedMonth] = useState(`${currentYear}-${currentMonthNum}`); // YYYY-MM
  const [selectedFortnight, setSelectedFortnight] = useState<"Q1" | "Q2">(defaultFortnight); // Q1 (1-15) or Q2 (16-31)

  // Computed active period identifier (e.g., "2026-06-Q1")
  const activeFortnightId = `${selectedMonth}-${selectedFortnight}`;

  // Form states - Transaction Registration
  const [showRegModal, setShowRegModal] = useState(false);
  const [regType, setRegType] = useState<"income" | "expense">("expense");
  const [regAmount, setRegAmount] = useState("");
  const [regCategory, setRegCategory] = useState("");
  const [regCustomCategory, setRegCustomCategory] = useState("");
  const [regAccount, setRegAccount] = useState("");
  const [regDestinationAccount, setRegDestinationAccount] = useState("");
  const [regDate, setRegDate] = useState(new Date().toISOString().split("T")[0]);
  const [regDescription, setRegDescription] = useState("");
  const [selectedEstimateId, setSelectedEstimateId] = useState("");

  // Form states - Mini Calculator
  const [calcInput, setCalcInput] = useState<string>("0");
  const [calcMemory, setCalcMemory] = useState<number | null>(null);
  const [calcOp, setCalcOp] = useState<string | null>(null);
  const [calcResetOnNext, setCalcResetOnNext] = useState<boolean>(false);

  const calculateVals = (a: number, b: number, op: string): number => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const handleCalcClick = (val: string) => {
    if (val === "C") {
      setCalcInput("0");
      setCalcMemory(null);
      setCalcOp(null);
      setCalcResetOnNext(false);
      return;
    }

    if (val === "+" || val === "-" || val === "*" || val === "/") {
      const currentVal = parseFloat(calcInput);
      if (calcMemory !== null && calcOp) {
        const result = calculateVals(calcMemory, currentVal, calcOp);
        setCalcMemory(result);
        setCalcInput(String(result));
      } else {
        setCalcMemory(currentVal);
      }
      setCalcOp(val);
      setCalcResetOnNext(true);
      return;
    }

    if (val === "=") {
      if (calcMemory !== null && calcOp) {
        const currentVal = parseFloat(calcInput);
        const result = calculateVals(calcMemory, currentVal, calcOp);
        setCalcInput(String(result));
        setCalcMemory(null);
        setCalcOp(null);
        setCalcResetOnNext(true);
      }
      return;
    }

    if (val === ".") {
      if (calcResetOnNext) {
        setCalcInput("0.");
        setCalcResetOnNext(false);
      } else if (!calcInput.includes(".")) {
        setCalcInput(calcInput + ".");
      }
      return;
    }

    // Number input
    if (calcResetOnNext || calcInput === "0") {
      setCalcInput(val);
      setCalcResetOnNext(false);
    } else {
      setCalcInput(calcInput + val);
    }
  };

  // Form states - Transaction Editing
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItemId, setEditItemId] = useState("");
  const [editType, setEditType] = useState<"income" | "expense">("expense");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editCustomCategory, setEditCustomCategory] = useState("");
  const [editAccount, setEditAccount] = useState("");
  const [editDestinationAccount, setEditDestinationAccount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSelectedEstimateId, setEditSelectedEstimateId] = useState("");

  // Account filter state for registered movements
  const [accountFilter, setAccountFilter] = useState<string>("all");

  // Form states - Create Account
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accName, setAccName] = useState("");
  const [accBalance, setAccBalance] = useState("");

  // Form states - Template Creation Wizard
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Prevent background scrolling when any modal is active
  useEffect(() => {
    const isAnyModalOpen = showRegModal || showEditModal || showAccountModal || showTemplateModal || !!confirmDialog?.visible;
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showRegModal, showEditModal, showAccountModal, showTemplateModal, confirmDialog]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [tplName, setTplName] = useState("");
  const [tplFortnight, setTplFortnight] = useState<"Q1" | "Q2" | "both">("Q1");
  const [tplRows, setTplRows] = useState<{ category: string; customName: string; type: "income" | "expense"; amount: number; account?: string }[]>([
    { category: "Arriendo", customName: "Pago del arriendo quincenal", type: "expense", amount: 600000 },
    { category: "Mercado", customName: "Mercado quincenal Éxito", type: "expense", amount: 250000 },
    { category: "Servicios", customName: "Factura de Luz", type: "expense", amount: 800000 },
  ]);

  // Strict requested categories segregated by flow type
  const BUDGET_EXPENSE_CATEGORIES = [
    "Arriendo",
    "Transporte",
    "Mercado",
    "Mascotas",
    "Creditos",
    "Servicios",
    "Universidad",
    "Hogar",
    "Comida por fuera",
    "Suscripciones",
    "Transferencia",
    "Otros"
  ];

  const BUDGET_INCOME_CATEGORIES = [
    "Salario",
    "Transferencia",
    "Deuda pendiente",
    "Otros"
  ];

  const BUDGET_CATEGORIES = Array.from(new Set([...BUDGET_EXPENSE_CATEGORIES, ...BUDGET_INCOME_CATEGORIES]));

  // Colors for category badges
  const categoryColors: Record<string, string> = {
    "Arriendo": "bg-amber-100 text-amber-800 border-amber-200",
    "Transporte": "bg-blue-100 text-blue-800 border-blue-200",
    "Mercado": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "Mascotas": "bg-purple-100 text-purple-800 border-purple-200",
    "Creditos": "bg-rose-100 text-rose-800 border-rose-200",
    "Servicios": "bg-cyan-100 text-cyan-800 border-cyan-200",
    "Universidad": "bg-indigo-100 text-indigo-800 border-indigo-200",
    "Hogar": "bg-orange-100 text-orange-850 border-orange-200",
    "Comida por fuera": "bg-yellow-100 text-yellow-850 border-yellow-200",
    "Suscripciones": "bg-pink-100 text-pink-850 border-pink-200",
    "Otros": "bg-gray-100 text-gray-800 border-gray-200",
    "Salario": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "Transferencia": "bg-indigo-100 text-indigo-800 border-indigo-200",
    "Deuda pendiente": "bg-amber-100 text-amber-800 border-amber-200"
  };

  const categoryHexColors: Record<string, string> = {
    "Arriendo": "#D97706",
    "Transporte": "#2563EB",
    "Mercado": "#10B981",
    "Mascotas": "#8B5CF6",
    "Creditos": "#F43F5E",
    "Servicios": "#06B6D4",
    "Universidad": "#6366F1",
    "Hogar": "#F97316",
    "Comida por fuera": "#EAB308",
    "Suscripciones": "#EC4899",
    "Otros": "#6B7280",
    "Salario": "#059669",
    "Transferencia": "#4F46E5",
    "Deuda pendiente": "#B45309"
  };

  // State for Recharts - Monthly Comparison Category Filters
  const [selectedChartCategories, setSelectedChartCategories] = useState<string[]>([]);

  useEffect(() => {
    setSelectedChartCategories(BUDGET_EXPENSE_CATEGORIES);
  }, []);

  // Fetch store data from the server
  const loadStoreData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBudgetStore();
      setItems(data.items || []);
      setEstimates(data.estimates || []);
      setTemplates(data.templates || []);
      setAccounts(data.accounts || []);
      
      const closedList = data.closedFortnights || [];
      setClosedFortnights(closedList);

      // We determine what the active calendar fortnight is right now based on current date
      const yr = new Date().getFullYear();
      const mo = String(new Date().getMonth() + 1).padStart(2, '0');
      const dy = new Date().getDate();
      const calMonth = `${yr}-${mo}`;
      const calFortnight: "Q1" | "Q2" = dy <= 15 ? "Q1" : "Q2";

      let targetMonth = calMonth;
      let targetFortnight: "Q1" | "Q2" = calFortnight;
      let foundOpen = false;

      // 1. If today's calendar fortnight is open, select it
      if (!closedList.includes(`${targetMonth}-${targetFortnight}`)) {
        foundOpen = true;
      } else {
        // 2. If closed, check if the other fortnight of the current month is open
        const otherFortnight: "Q1" | "Q2" = targetFortnight === "Q1" ? "Q2" : "Q1";
        if (!closedList.includes(`${targetMonth}-${otherFortnight}`)) {
          targetFortnight = otherFortnight;
          foundOpen = true;
        } else {
          // 3. If both of current month are closed, find the next month's open fortnight
          let nextYr = yr;
          let nextMo = parseInt(mo, 10) + 1;
          if (nextMo > 12) {
            nextMo = 1;
            nextYr += 1;
          }
          const nextMonthStr = `${nextYr}-${String(nextMo).padStart(2, '0')}`;
          if (!closedList.includes(`${nextMonthStr}-Q1`)) {
            targetMonth = nextMonthStr;
            targetFortnight = "Q1";
            foundOpen = true;
          } else if (!closedList.includes(`${nextMonthStr}-Q2`)) {
            targetMonth = nextMonthStr;
            targetFortnight = "Q2";
            foundOpen = true;
          } else {
            // 4. Default fallback: stay on current month/fortnight and let user navigate
            targetMonth = calMonth;
            targetFortnight = calFortnight;
          }
        }
      }

      setSelectedMonth(targetMonth);
      setSelectedFortnight(targetFortnight);

      // We do not auto-set the account here, forcing the user to select one!
    } catch (err) {
      console.error("Error loading budget store:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStoreData();
  }, []);

  // Filter items for currently selected fortnight period
  const activePeriodItems = items.filter(item => item.fortnightId === activeFortnightId);

  // Filtered movements based on selected account filter
  const displayedMovements = activePeriodItems.filter(item => {
    if (accountFilter === "all") return true;
    return item.account === accountFilter || item.destinationAccount === accountFilter;
  });

  // Helper to dynamically collect both template-planned and custom-created subcategories
  const getSubcategoryConcepts = (category: string, type: "income" | "expense") => {
    if (!category) return [];

    // 1. Planned concepts from estimates in this fortnight
    const planned = activePeriodEstimates
      .filter(est => est.category === category && est.type === type)
      .map(est => ({
        id: est.id,
        name: est.customName ? est.customName.trim() : "",
        amount: est.amount,
        isPlanned: true,
        account: est.account
      }))
      .filter(p => p.name !== "");

    // 2. Custom concepts from registered movements in this fortnight
    const custom = activePeriodItems
      .filter(item => item.category === category && item.type === type && item.description)
      .map(item => ({
        id: "registered-" + item.description!.trim().toLowerCase(),
        name: item.description!.trim(),
        amount: item.amount,
        isPlanned: false,
        account: item.account
      }));

    // Deduplicate custom names and those already in planned
    const result: { id: string; name: string; amount?: number; isPlanned: boolean; account?: string }[] = [];

    planned.forEach(p => {
      if (!result.some(r => r.name.toLowerCase() === p.name.toLowerCase())) {
        result.push(p);
      }
    });

    custom.forEach(c => {
      if (!result.some(r => r.name.toLowerCase() === c.name.toLowerCase())) {
        result.push({
          id: c.id,
          name: c.name,
          isPlanned: false,
          account: c.account
        });
      }
    });

    return result;
  };

  // Check if current fortnight is closed
  const isActivePeriodClosed = closedFortnights.includes(activeFortnightId);

  // Compute key totals (genuine cycle incomes only, so cycle effectiveness always starts at zero)
  const genuineIncomesItems = activePeriodItems.filter(item => item.type === "income" && !item.isLeftoverTransfer && item.category !== "Transferencia");
  const totalGenuineIncomes = genuineIncomesItems.reduce((sum, item) => sum + item.amount, 0);

  const rolloverItems = activePeriodItems.filter(item => item.type === "income" && !!item.isLeftoverTransfer && item.category !== "Transferencia");
  const totalRolloverIncomes = rolloverItems.reduce((sum, item) => sum + item.amount, 0);

  const totalIncomes = totalGenuineIncomes;

  const totalExpenses = activePeriodItems
    .filter(item => item.type === "expense" && item.category !== "Transferencia")
    .reduce((sum, item) => sum + item.amount, 0);

  const currentBalance = totalGenuineIncomes - totalExpenses;

  // Filter estimates for currently selected fortnight period
  const activePeriodEstimates = estimates.filter(est => est.fortnightId === activeFortnightId);

  // Sum of total expenses of the used budget template (sum of estimated expenses)
  const templateTotalExpensesSummary = activePeriodEstimates
    .filter(est => est.type === "expense")
    .reduce((sum, est) => sum + est.amount, 0);

  // Remaining money between REAL income - template expenses
  const templateRemainingSummary = totalGenuineIncomes - templateTotalExpensesSummary;

  // Gather categories to perform comparisons (Estimados vs Real) grouped by parent category
  interface SubCategoryComparison {
    customName: string;
    estimated: number;
    actual: number;
    account?: string;
  }

  interface CategoryGroupComparison {
    category: string;
    type: "income" | "expense";
    estimated: number;
    actual: number;
    subcategories: SubCategoryComparison[];
  }

  const comparisonList: CategoryGroupComparison[] = [];

  // 1. Initialize category groups from template estimates
  activePeriodEstimates.forEach(est => {
    let group = comparisonList.find(c => c.category === est.category && c.type === est.type);
    if (!group) {
      group = {
        category: est.category,
        type: est.type,
        estimated: 0,
        actual: 0,
        subcategories: []
      };
      comparisonList.push(group);
    }
    
    group.estimated += est.amount;

    const subName = est.customName ? est.customName.trim() : "General";
    let sub = group.subcategories.find(s => s.customName.toLowerCase() === subName.toLowerCase());
    if (sub) {
      sub.estimated += est.amount;
    } else {
      group.subcategories.push({
        customName: subName,
        estimated: est.amount,
        actual: 0,
        account: est.account
      });
    }
  });

  // 2. Blend actual transaction registrations matching Category and Subcategory (excluding Transferencia)
  activePeriodItems.forEach(item => {
    if (item.category === "Transferencia") return; // Skip transferences in the comparative reports
    let group = comparisonList.find(c => c.category === item.category && c.type === item.type);
    if (!group) {
      group = {
        category: item.category,
        type: item.type,
        estimated: 0,
        actual: 0,
        subcategories: []
      };
      comparisonList.push(group);
    }

    group.actual += item.amount;

    const itemConceptKey = item.description ? item.description.trim().toLowerCase() : "";

    // Let's try to find a subcategory to match this transaction
    let matchSub = group.subcategories.find(s => s.customName.trim().toLowerCase() === itemConceptKey);

    if (!matchSub && itemConceptKey && group.subcategories.length > 0) {
      matchSub = group.subcategories.find(s => {
        const subName = s.customName.trim().toLowerCase();
        return itemConceptKey.includes(subName) || subName.includes(itemConceptKey);
      });
    }

    if (matchSub) {
      matchSub.actual += item.amount;
    } else {
      // Create a subcategory or add to "Movimiento extra"
      const conceptName = item.description ? item.description.trim() : "Movimiento extra";
      let sub = group.subcategories.find(s => s.customName.toLowerCase() === conceptName.toLowerCase());
      if (sub) {
        sub.actual += item.amount;
      } else {
        group.subcategories.push({
          customName: conceptName,
          estimated: 0,
          actual: item.amount,
          account: item.account
        });
      }
    }
  });

  // Sort comparisonList dynamically:
  // 1. Incomes (type === "income") always stay at the very top, sorted descending by total amount.
  // 2. Expenses (type === "expense") are placed below incomes:
  //    a) "Pendientes" (actual === 0) sorted descending by their estimated amount ("de mayor a menor").
  //    b) "Ya pagados" (actual > 0) sorted descending by their actual paid amount ("de mayor a menor").
  comparisonList.sort((a, b) => {
    // Rule 1: Incomes always at the top
    if (a.type !== b.type) {
      return a.type === "income" ? -1 : 1;
    }

    if (a.type === "income") {
      // Sort incomes descending by their maximum of estimated or actual
      const aVal = Math.max(a.estimated, a.actual);
      const bVal = Math.max(b.estimated, b.actual);
      return bVal - aVal;
    }

    // Both are expenses
    const aPaid = a.actual > 0;
    const bPaid = b.actual > 0;

    if (aPaid !== bPaid) {
      // Unpaid (pending) expenses go ABOVE paid expenses
      return aPaid ? 1 : -1;
    }

    if (aPaid) {
      // Both are paid expenses: sort descending by actual amount paid (most expensive first)
      if (b.actual !== a.actual) {
        return b.actual - a.actual;
      }
      return b.estimated - a.estimated;
    } else {
      // Both are unpaid (pending) expenses: sort descending by estimated amount (most expensive first)
      return b.estimated - a.estimated;
    }
  });

  // Also sort the subcategories inside each category card for perfection!
  comparisonList.forEach(cat => {
    cat.subcategories.sort((a, b) => {
      const aPaid = a.actual > 0;
      const bPaid = b.actual > 0;

      if (aPaid !== bPaid) {
        // Pending subcategories go ABOVE paid subcategories
        return aPaid ? 1 : -1;
      }

      if (aPaid) {
        if (b.actual !== a.actual) {
          return b.actual - a.actual;
        }
        return b.estimated - a.estimated;
      } else {
        return b.estimated - a.estimated;
      }
    });
  });

  // Helper to compute next fortnight ID
  const getNextFortnightId = (fortnightId: string): string => {
    const parts = fortnightId.split("-");
    if (parts.length < 3) return "";
    const yearStr = parts[0];
    const monthStr = parts[1];
    const qStr = parts[2]; // "Q1" or "Q2"

    if (qStr === "Q1") {
      return `${yearStr}-${monthStr}-Q2`;
    } else {
      let year = parseInt(yearStr, 10);
      let month = parseInt(monthStr, 10);
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
      const nextMonthStr = String(month).padStart(2, '0');
      return `${year}-${nextMonthStr}-Q1`;
    }
  };

  const handleCloseFortnightClick = () => {
    const nextFId = getNextFortnightId(activeFortnightId);
    const unusedBalance = currentBalance; // current balance is totalIncomes - totalExpenses of this fortnight

    if (unusedBalance <= 0) {
      // Just closing without carrying over negative balance
      askConfirmation(
        "¿Cerrar Quincena?",
        `¿Deseas cerrar la quincena ${activeFortnightId}? No se podrán modificar los movimientos. El saldo restante es ${formatCurrency(unusedBalance)}, así que no se transferirá ningún monto de ahorro.`,
        async () => {
          try {
            const res = await closeFortnight({
              fortnightId: activeFortnightId,
              nextFortnightId: nextFId,
              leftoverAmount: 0,
              targetAccount: accounts[0]?.name || "Cuenta Principal"
            });
            if (res.success) {
              setClosedFortnights(res.closedFortnights);
              await loadStoreData();
              triggerToast("¡Quincena cerrada correctamente miau! 🔒", "info");
            }
          } catch (err: any) {
            triggerToast(err.message || "Error al cerrar quincena", "error");
          }
        }
      );
    } else {
      // Has positive balance, carry forward!
      const defaultAcc = accounts[0]?.name || "Cuenta Principal";
      askConfirmation(
        "🐾 Cerrar y Transferir Saldo",
        `¿Deseas cerrar la quincena ${activeFortnightId}? Se bloquearán futuros cambios. El saldo restante de ${formatCurrency(unusedBalance)} se trasladará a la siguiente quincena (${nextFId}) como saldo libre acumulado.`,
        async () => {
          try {
            const res = await closeFortnight({
              fortnightId: activeFortnightId,
              nextFortnightId: nextFId,
              leftoverAmount: unusedBalance,
              targetAccount: defaultAcc
            });
            if (res.success) {
              setClosedFortnights(res.closedFortnights);
              await loadStoreData();
              triggerToast("¡Quincena cerrada y saldo transferido con éxito! ✨🔒", "success");
            }
          } catch (err: any) {
            triggerToast(err.message || "Error al cerrar quincena", "error");
          }
        }
      );
    }
  };

  const handleOpenFortnightClick = () => {
    askConfirmation(
      "🔓 Reabrir Quincena",
      `¿Deseas reabrir la quincena ${activeFortnightId}? Podrás hacer modificaciones. El saldo transferido con ID "rollover-${activeFortnightId}" se limpiará de la siguiente quincena.`,
      async () => {
        try {
          const res = await openFortnight({ fortnightId: activeFortnightId });
          if (res.success) {
            setClosedFortnights(res.closedFortnights);
            await loadStoreData();
            triggerToast("¡Quincena reabierta correctamente! 🔓🐾", "success");
          }
        } catch (err: any) {
          triggerToast(err.message || "Error al reabrir quincena", "error");
        }
      }
    );
  };

  // Create new Account
  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim() || !accBalance) {
      triggerToast("Miau, completa el nombre de la cuenta y el monto inicial.", "error");
      return;
    }

    const initialAmount = parseFloat(accBalance);
    if (isNaN(initialAmount)) {
      triggerToast("Por favor ingresa un balance número válido.", "error");
      return;
    }

    try {
      const newAcc = await createBudgetAccount({
        name: accName.trim(),
        balance: initialAmount
      });
      setAccounts(prev => [...prev, newAcc]);
      
      // select it as default
      if (!regAccount) {
        setRegAccount(newAcc.name);
      }

      setAccName("");
      setAccBalance("");
      setShowAccountModal(false);
      triggerToast("¡Cuenta creada miau con éxito! 🐾", "success");
    } catch (err) {
      triggerToast("Error creando la cuenta en el servidor miau.", "error");
    }
  };

  // Delete Account
  const handleDeleteAccount = async (id: string, name: string) => {
    askConfirmation(
      "¿Borrar cuenta miau?",
      `¿Estás seguro que deseas borrar la cuenta "${name}"? El dinero se desvincula de las estadísticas miau🐾`,
      async () => {
        try {
          const res = await deleteBudgetAccount(id);
          if (res.success) {
            setAccounts(prev => prev.filter(acc => acc.id !== id));
            triggerToast("¡Cuenta eliminada con éxito!", "success");
          } else {
            triggerToast("No se pudo borrar del servidor.", "error");
          }
        } catch (err) {
          triggerToast("Error eliminando la cuenta.", "error");
        }
      }
    );
  };

  // Submit transaction registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isActivePeriodClosed) {
      triggerToast("Miau, esta quincena está CERRADA. Desbloquéala (reabrir) si necesitas modificar registros.", "error");
      return;
    }
    if (!regAmount || !regCategory || !regAccount || regCategory === "" || regAccount === "") {
      triggerToast("Por favor selecciona una Cuenta y una Categoría válidas.", "error");
      return;
    }

    if (regCategory === "custom" && !regCustomCategory.trim()) {
      triggerToast("Por favor escribe el nombre de la categoría personalizada.", "error");
      return;
    }

    if (regCategory === "Transferencia") {
      if (!regDestinationAccount) {
        triggerToast("Por favor selecciona una Cuenta de Destino para la transferencia.", "error");
        return;
      }
      if (regAccount === regDestinationAccount) {
        triggerToast("Las cuentas de origen y destino deben ser diferentes.", "error");
        return;
      }
    }

    const value = parseFloat(regAmount);
    if (isNaN(value) || value <= 0) {
      triggerToast("Ingresa un monto válido mayor a cero en COP.", "error");
      return;
    }

    if (regType === "expense" || regCategory === "Transferencia") {
      const sourceAcc = accounts.find(a => a.name === regAccount || a.id === regAccount);
      const availableBalance = sourceAcc ? Math.max(0, sourceAcc.balance) : 0;
      if (value > availableBalance) {
        triggerToast(`No se permiten valores mayores al saldo en cuenta (${formatCurrency(availableBalance)}).`, "error");
        return;
      }
    }

    try {
      const finalCat = regCategory === "custom" ? (regCustomCategory.trim() || "Otros") : regCategory;
      const defaultDesc = finalCat === "Transferencia" 
        ? `Transferencia de ${regAccount} a ${regDestinationAccount}`
        : `${finalCat} - Movimiento`;

      const newItem = await createBudgetItem({
        type: regType,
        amount: value,
        category: finalCat,
        account: regAccount,
        destinationAccount: finalCat === "Transferencia" ? regDestinationAccount : undefined,
        date: regDate,
        description: regDescription.trim() || defaultDesc,
        fortnightId: activeFortnightId
      });

      // Update state locally with transactions & reload accounts securely to reflex updated balances
      setItems(prev => [...prev, newItem]);
      
      // Reload budget data to fetch the exact new balance computed on the server
      const storeUpdate = await fetchBudgetStore();
      setAccounts(storeUpdate.accounts || []);
      
      setShowRegModal(false);
      setRegAmount("");
      setRegDescription("");
      setRegCategory("");
      setRegCustomCategory("");
      setRegAccount("");
      setRegDestinationAccount("");
      setSelectedEstimateId("");
      triggerToast(`¡Movimiento registrado con éxito! Se actualizó tu saldo miau ✔`, "success");
    } catch (err: any) {
      triggerToast(err?.message || "Hubo un problema registrando el dinero miau.", "error");
    }
  };

  // Delete transaction
  const handleDeleteItem = async (id: string) => {
    if (isActivePeriodClosed) {
      triggerToast("Miau, esta quincena está CERRADA y bloqueada. No se pueden eliminar movimientos.", "error");
      return;
    }
    askConfirmation(
      "¿Eliminar movimiento?",
      "¿Deseas eliminar este movimiento monetario? El balance de su cuenta se reestablecerá miau🐾",
      async () => {
        try {
          const res = await deleteBudgetItem(id);
          if (res.success) {
            setItems(prev => prev.filter(it => it.id !== id));
            // reload accounts to update cash level
            const storeUpdate = await fetchBudgetStore();
            setAccounts(storeUpdate.accounts || []);
            triggerToast("¡Movimiento eliminado con éxito miau!", "success");
          }
        } catch (err) {
          console.error(err);
          triggerToast("No se pudo eliminar el movimiento.", "error");
        }
      }
    );
  };

  // Start editing transaction
  const handleStartEditItem = (item: BudgetItem) => {
    if (isActivePeriodClosed) {
      triggerToast("Miau, esta quincena está CERRADA y bloqueada. No se pueden editar movimientos.", "error");
      return;
    }
    setEditItemId(item.id);
    setEditType(item.type);
    setEditAmount(String(item.amount));
    
    const allKnownCategories = [...BUDGET_INCOME_CATEGORIES, ...BUDGET_EXPENSE_CATEGORIES, "Transferencia"];
    if (item.category && !allKnownCategories.includes(item.category as any)) {
      setEditCategory("custom");
      setEditCustomCategory(item.category);
    } else {
      setEditCategory(item.category);
      setEditCustomCategory("");
    }

    setEditAccount(item.account);
    setEditDestinationAccount(item.destinationAccount || "");
    setEditDate(item.date);
    setEditDescription(item.description);

    const concepts = getSubcategoryConcepts(item.category, item.type);
    const matchConcept = concepts.find(c => c.name.toLowerCase() === (item.description || "").trim().toLowerCase());
    setEditSelectedEstimateId(matchConcept ? matchConcept.id : "");

    setShowEditModal(true);
  };

  // Submit transaction edits
  const handleSaveEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isActivePeriodClosed) {
      triggerToast("Miau, esta quincena está CERRADA y bloqueada.", "error");
      return;
    }

    const value = parseFloat(editAmount);
    if (isNaN(value) || value <= 0) {
      triggerToast("Ingresa un monto válido mayor a cero en COP.", "error");
      return;
    }
    if (!editCategory) {
      triggerToast("Por favor selecciona una categoría.", "error");
      return;
    }
    if (editCategory === "custom" && !editCustomCategory.trim()) {
      triggerToast("Escribe un nombre para la categoría personalizada.", "error");
      return;
    }
    if (!editAccount) {
      triggerToast("Por favor selecciona una cuenta.", "error");
      return;
    }
    if (editCategory === "Transferencia" && !editDestinationAccount) {
      triggerToast("Por favor selecciona la cuenta de destino.", "error");
      return;
    }
    if (editCategory === "Transferencia" && editAccount === editDestinationAccount) {
      triggerToast("La cuenta de origen y destino no pueden ser iguales.", "error");
      return;
    }

    try {
      const finalCategory = editCategory === "custom" ? (editCustomCategory.trim() || "Otros") : editCategory;
      const defaultDesc = finalCategory === "Transferencia" 
        ? `Transferencia de ${editAccount} a ${editDestinationAccount}`
        : `${finalCategory} - Movimiento`;

      const updatedItem = await updateBudgetItem(editItemId, {
        type: editType,
        amount: value,
        category: finalCategory,
        account: editAccount,
        destinationAccount: finalCategory === "Transferencia" ? editDestinationAccount : undefined,
        date: editDate,
        description: editDescription.trim() || defaultDesc,
      });

      // Update local items state
      setItems(prev => prev.map(it => it.id === editItemId ? updatedItem : it));

      // Reload budget data to fetch the exact new balance computed on the server
      const storeUpdate = await fetchBudgetStore();
      setAccounts(storeUpdate.accounts || []);

      setShowEditModal(false);
      setEditSelectedEstimateId("");
      triggerToast("¡Movimiento editado con éxito! Se reajustó tu saldo miau ✔", "success");
    } catch (err: any) {
      triggerToast(err.message || "Hubo un problema editando el movimiento miau.", "error");
    }
  };

  // Template design wizard operations
  const handleAddTplRow = () => {
    setTplRows(prev => [...prev, { category: "Otros", customName: "", type: "expense", amount: 0 }]);
  };

  // Remove rows from tplRows
  const handleRemoveTplRow = (index: number) => {
    setTplRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateTplRow = (index: number, key: string, val: any) => {
    setTplRows(prev => prev.map((row, idx) => {
      if (idx !== index) return row;
      const updatedRow = { ...row, [key]: val };
      if (key === "type") {
        if (val === "income" && !BUDGET_INCOME_CATEGORIES.includes(updatedRow.category)) {
          updatedRow.category = "Salario";
        } else if (val === "expense" && !BUDGET_EXPENSE_CATEGORIES.includes(updatedRow.category)) {
          updatedRow.category = "Arriendo";
        }
      }
      return updatedRow;
    }));
  };

  // Save template
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim()) {
      triggerToast("Escribe un nombre bonito para la plantilla.", "error");
      return;
    }

    const validRows = tplRows.filter(r => r.amount > 0 && r.category);
    if (validRows.length === 0) {
      triggerToast("Tu plantilla debe tener al menos un rubro con valor mayor a $0 COP.", "error");
      return;
    }

    try {
      if (editingTemplateId) {
        const updatedTpl = await updateBudgetTemplate(editingTemplateId, {
          name: tplName.trim(),
          assignedFortnight: tplFortnight,
          items: validRows
        });
        setTemplates(prev => prev.map(t => t.id === editingTemplateId ? updatedTpl : t));
        setShowTemplateModal(false);
        setEditingTemplateId(null);
        setTplName("");
        triggerToast("¡Plantilla de presupuesto modificada con éxito miau! ✨", "success");
      } else {
        const newTpl = await createBudgetTemplate({
          name: tplName.trim(),
          assignedFortnight: tplFortnight,
          items: validRows
        });

        setTemplates(prev => [...prev, newTpl]);
        setShowTemplateModal(false);
        setTplName("");
        triggerToast("¡Plantilla de presupuesto creada con éxito miau! ✨", "success");
      }

      // Reset defaults
      setTplRows([
        { category: "Arriendo", customName: "Pago del arriendo quincenal", type: "expense", amount: 600000, account: accounts[0]?.name || "Bancolombia" },
        { category: "Mercado", customName: "Mercado quincenal", type: "expense", amount: 250000, account: accounts[1]?.name || "Cuenta Ahorros" }
      ]);
    } catch (err) {
      triggerToast("Error al intentar guardar plantilla.", "error");
    }
  };

  // Delete a template
  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    askConfirmation(
      "¿Borrar plantilla de presupuesto?",
      "¿Deseas desvincular de forma permanente esta plantilla de presupuesto?",
      async () => {
        try {
          const res = await deleteBudgetTemplate(id);
          if (res.success) {
            setTemplates(prev => prev.filter(t => t.id !== id));
            triggerToast("¡Plantilla eliminada con éxito!", "success");
          }
        } catch (err) {
          console.error(err);
          triggerToast("Error intentando borrar la plantilla miau.", "error");
        }
      }
    );
  };

  // Apply template
  const handleApplyTemplate = async (templateId: string) => {
    if (isActivePeriodClosed) {
      triggerToast("Miau, esta quincena está CERRADA y bloqueada. No se pueden aplicar plantillas de estimados.", "error");
      return;
    }
    askConfirmation(
      "¿Aplicar estimados de plantilla?",
      `¿Deseas aplicar los estimados de esta plantilla en el período: ${activeFortnightId}? Se configurarán las metas y puedes comparar con lo gastado.`,
      async () => {
        try {
          const res = await applyBudgetTemplate(templateId, activeFortnightId);
          if (res.success) {
            // Sync estimates list
            const storeUpdate = await fetchBudgetStore();
            setEstimates(storeUpdate.estimates || []);
            triggerToast("¡Estimados de plantilla cargados con éxito! Ahora comparen los gastos reales frente a los planteados miau🐾.", "success");
          }
        } catch (err) {
          triggerToast("No se pudo aplicar la plantilla.", "error");
        }
      }
    );
  };

  // Clear all budget data completely
  const handleClearAllBudget = () => {
    askConfirmation(
      "¿Vaciar y reiniciar todo el presupuesto? 🗑️",
      "Esta acción eliminará todos los movimientos, estimaciones, cuentas y plantillas de presupuesto ingresados, dejando el módulo de finanzas completamente vacío y limpio.",
      async () => {
        try {
          await clearBudgetStoreApi();
          setItems([]);
          setEstimates([]);
          setTemplates([]);
          setAccounts([]);
          setClosedFortnights([]);
          triggerToast("¡Presupuesto vaciado y reiniciado exitosamente! ✨", "success");
        } catch (err: any) {
          triggerToast(err?.message || "No se pudo vaciar el presupuesto.", "error");
        }
      }
    );
  };

  // Currency utility formatter
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const getMonthNameHuman = (monthStr: string) => {
    const parts = monthStr.split("-");
    if (parts.length < 2) return monthStr;
    const mIdx = parseInt(parts[1], 10) - 1;
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return `${months[mIdx]} ${parts[0]}`;
  };

  // Helper to compute expenses pie chart data for the currently selectedMonth
  const getPieChartData = () => {
    const categoryTotals: Record<string, number> = {};
    
    // Initialize selected expense categories with 0
    BUDGET_EXPENSE_CATEGORIES.forEach(cat => {
      categoryTotals[cat] = 0;
    });

    items.forEach(item => {
      if (item.type !== "expense") return;

      // Find the month key: e.g. YYYY-MM
      let monthKey = "";
      if (item.date) {
        monthKey = item.date.substring(0, 7);
      } else if (item.fortnightId) {
        monthKey = item.fortnightId.substring(0, 7);
      } else {
        monthKey = new Date().toISOString().substring(0, 7);
      }

      if (monthKey !== selectedMonth) return;

      // Check if item's category is checked for the chart
      if (!selectedChartCategories.includes(item.category)) {
        return;
      }

      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.amount;
    });

    // Transform into array for PieChart, filtering out zero-value categories
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({
        name,
        value,
        color: categoryHexColors[name] || "#6366F1"
      }))
      .filter(item => item.value > 0);
  };

  const toggleChartCategory = (category: string) => {
    setSelectedChartCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  const selectAllChartCategories = () => {
    setSelectedChartCategories(BUDGET_EXPENSE_CATEGORIES);
  };

  const deselectAllChartCategories = () => {
    setSelectedChartCategories([]);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fade-in">
      
      {/* 1. Header with Period Selectors */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-[#E7E2D5] pb-6 bg-white p-5 rounded-3xl shadow-xs">
        <div>
          <span className="text-xs font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            📊 PLANIFICACIÓN Y CONTROL
          </span>
          <h2 className="text-3xl font-extrabold text-[#2C2723] mt-2 flex items-center gap-2">
            💰 Presupuesto de Pareja
          </h2>
          <p className="text-xs text-[#8A817C] font-semibold mt-1">
            Lleven un control transparente del dinero del nido, quincena por quincena 🐾
          </p>
        </div>

        {/* Date Selector Dashboard */}
        <div className="flex flex-wrap items-center gap-4 bg-[#FCFAF7] p-3 rounded-2xl border-2 border-[#E7E2D5]">
          <div className="flex flex-col">
            <span className="text-[9px] text-[#8A817C] font-black uppercase tracking-wider">Mes de Operación</span>
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
              className="p-1 px-2.5 rounded-xl border border-[#E7E2D5] text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer bg-white"
            />
          </div>

          <div className="h-8 w-[2px] bg-[#E7E2D5]" />

          <div className="flex flex-col">
            <span className="text-[9px] text-[#8A817C] font-black uppercase tracking-wider">Período de Quincena</span>
            <div className="flex gap-1.5 mt-0.5">
              <button
                onClick={() => setSelectedFortnight("Q1")}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  selectedFortnight === "Q1"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white text-[#625B57] hover:bg-[#FAF7F2] border border-[#E7E2D5]"
                }`}
              >
                Q1 (Día 1-15)
              </button>
              <button
                onClick={() => setSelectedFortnight("Q2")}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  selectedFortnight === "Q2"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white text-[#625B57] hover:bg-[#FAF7F2] border border-[#E7E2D5]"
                }`}
              >
                Q2 (Día 16-FIN)
              </button>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto animate-infinite" />
          <p className="text-xs text-[#8A817C] font-bold">Cargando cuentas y balances de quincena miau...</p>
        </div>
      ) : (
        <>
          {/* Billboard header: Current state */}
          <div className={`border-2 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
            isActivePeriodClosed 
              ? "bg-[#FAF7F2] border-[#D1D1C6]" 
              : "bg-[#EBF7F2] border-[#D1ECD5]"
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{isActivePeriodClosed ? "🔒" : "🗓️"}</span>
              <div>
                <div className="flex items-center gap-2">
                  <p className={`text-[10px] font-black uppercase tracking-wider ${
                    isActivePeriodClosed ? "text-[#7A6E5D]" : "text-[#2A6B4A]"
                   }`}>
                    Estado de cuentas para
                  </p>
                  {isActivePeriodClosed && (
                    <span className="bg-[#7A6E5D] text-white font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-widest">
                      CERRADA
                    </span>
                  )}
                </div>
                <h3 className={`text-lg font-black ${
                  isActivePeriodClosed ? "text-[#4A3E2D]" : "text-[#1F4E34]"
                }`}>
                  {getMonthNameHuman(selectedMonth)} — {selectedFortnight === "Q1" ? "Primera Quincena" : "Segunda Quincena"}
                </h3>
                {isActivePeriodClosed && (
                  <p className="text-[10px] text-[#867B6E] font-bold mt-0.5">
                    🐾 Esta quincena está archivada. No se permiten más cambios. El saldo restante libre se trasladó automáticamente.
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className={`px-4 py-1.5 rounded-2xl border text-xs font-bold flex items-center gap-1.5 ${
                isActivePeriodClosed
                  ? "bg-white border-[#DCD6CC] text-[#7A6E5D]"
                  : "bg-white/80 border-[#D1ECD5] text-[#2A6B4A]"
              }`}>
                <span>Clave:</span>
                <kbd className={`font-mono px-1.5 py-0.5 rounded-md border ${
                  isActivePeriodClosed ? "bg-[#FAF8F5] border-[#D1D1C6]" : "bg-emerald-50 border-emerald-200"
                }`}>
                  {activeFortnightId}
                </kbd>
              </div>

              {isActivePeriodClosed ? (
                <button
                  type="button"
                  onClick={handleOpenFortnightClick}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-4.5 py-2.5 rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95 transition-all w-full md:w-auto justify-center"
                >
                  🔓 Reabrir Quincena
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCloseFortnightClick}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-4.5 py-2.5 rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95 transition-all w-full md:w-auto justify-center"
                >
                  🔒 Cerrar Quincena 🐾
                </button>
              )}
            </div>
          </div>

          {/* 2. Two main values cards SIDE BY SIDE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Box 1: Incomes */}
            <div className="bg-white rounded-3xl p-6 border-4 border-[#E7E2D5] shadow-xs flex items-center justify-between">
              <div className="space-y-1 w-full">
                <span className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Presupuesto del Ciclo
                </span>
                <p className="text-2xl font-black font-mono text-[#10B981]">
                  {formatCurrency(totalGenuineIncomes)}
                </p>
                <p className="text-[10px] text-[#8A817C] font-semibold">
                  Suma de ingresos en esta quincena ✨
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl font-bold shrink-0 self-start">
                📥
              </div>
            </div>

            {/* Box 2: Expenses */}
            <div className="bg-white rounded-3xl p-6 border-4 border-[#E7E2D5] shadow-xs flex items-center justify-between font-medium">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                  Gastos Realizados
                </span>
                <p className="text-2xl font-black font-mono text-[#EF4444]">
                  {formatCurrency(totalExpenses)}
                </p>
                <p className="text-[10px] text-[#8A817C] font-semibold">
                  Suma de pagos en este ciclo
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl font-bold">
                💸
              </div>
            </div>
          </div>

                  {/* 3. UNDER THE THREE CARDS: Accounts and Value displays with create account button */}
          <div className="bg-[#FCFAF7] border-4 border-[#E7E2D5] rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E2D5] pb-4">
              <div>
                <h3 className="font-extrabold text-[#2C2723] text-sm uppercase flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" /> Valor de Cada Billetera / Cuenta
                </h3>
                <p className="text-xs text-[#8A817C] mt-0.5">
                  El monto acumulado disponible en cada fondo. Se descuenta/suma según los registros guardados abajo miau🐾
                </p>
              </div>

              <button
                onClick={() => setShowAccountModal(true)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs border border-emerald-800 shrink-0 transition-all self-start"
              >
                <Plus className="w-4 h-4" /> Crear Cuenta
              </button>
            </div>

            {/* Total Real Money Summary banner */}
            <div className="bg-[#FAF7F2] border-2 border-[#E7E2D5] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">💰</span>
                <div>
                  <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest leading-none">Dinero Real Colectivo (Fondo Total)</h4>
                  <p className="text-[10px] text-[#8A817C] font-semibold mt-0.5">Suma total de los balances en todas sus billeteras</p>
                </div>
              </div>
              <p className="text-lg font-black font-mono text-emerald-700">
                {formatCurrency(accounts.reduce((sum, acc) => sum + acc.balance, 0))}
              </p>
            </div>

            {accounts.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#8A817C] bg-white rounded-2xl p-4 border border-[#E7E2D5]">
                <p className="font-bold">No hay cuentas activas registradas.</p>
                <p className="text-[11px] font-medium mt-1">Hagan clic en "Crear Cuenta" arriba para registrar su primer monedero miau.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {accounts.map(acc => (
                  <div 
                    key={acc.id} 
                    className="bg-white border-2 border-[#E7E2D5] rounded-2xl p-4 relative flex flex-col justify-between hover:border-emerald-500 transition-all group"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-[#8A817C] uppercase tracking-wider truncate" title={acc.name}>
                        {acc.name}
                      </p>
                      <p className={`text-lg font-black font-mono leading-none ${
                        acc.balance >= 0 ? "text-slate-800" : "text-rose-600 font-extrabold"
                      }`}>
                        {formatCurrency(Math.max(0, acc.balance))}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3 text-[10px] text-[#8A817C] pt-2 border-t border-[#FAF7F2]">
                      <span className="font-mono">Fondo Activo</span>
                      
                      {/* Delete account button - visible on hover */}
                      <button
                        onClick={() => handleDeleteAccount(acc.id, acc.name)}
                        className="text-gray-400 hover:text-rose-600 p-0.5 rounded-md hover:bg-rose-50 cursor-pointer transition-all"
                        title="Borrar esta cuenta"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. UNDER THE ACCOUNTS: Efectividad del Ciclo (siempre empieza en cero cada quincena) */}
          <div className={`rounded-3xl p-6 border-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
            currentBalance >= 0 ? "bg-white border-[#E7E2D5]" : "bg-rose-50/50 border-rose-300"
          }`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs font-black text-[#8A817C] uppercase tracking-wider">
                  Efectividad del Ciclo ({activeFortnightId})
                </span>
                <span className="bg-[#FEFBF2] text-[#B58514] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#F6E6C2]">
                  ✨ Empieza en $0 cada quincena
                </span>
              </div>
              <p className={`text-3xl font-black font-mono ${
                currentBalance >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}>
                {formatCurrency(currentBalance)}
              </p>
              <p className="text-xs text-[#8A817C] font-semibold">
                {currentBalance >= 0 
                  ? "Diferencia neta positiva entre los ingresos recibidos y los gastos realizados en esta quincena 🐾" 
                  : "Atención miau: Los gastos superan los ingresos de este ciclo quincenal 👀"}
              </p>
            </div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
              currentBalance >= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-100 text-rose-700 border border-rose-200"
            }`}>
              {currentBalance >= 0 ? "🛡️" : "⚠️"}
            </div>
          </div>


          {/* 4. Action dashboard for transaction entry and templates */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border-2 border-[#E7E2D5]">
            <div className="flex flex-col">
              <h4 className="text-sm font-extrabold text-[#2C2723] flex items-center gap-1.5">
                <span>⚡ Movimientos de Dinero y Planificación</span>
              </h4>
              <p className="text-xs text-[#8A817C] font-semibold mt-0.5">Controlen sus egresos o carguen quincenas predefinidas</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  if (isActivePeriodClosed) {
                    triggerToast("Miau, esta quincena está cerrada y bloqueada. Reábrela para añadir registros.", "error");
                    return;
                  }
                  setRegType("expense");
                  setRegCategory("");
                  setRegAccount("");
                  setShowRegModal(true);
                }}
                className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer ${
                  isActivePeriodClosed 
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200" 
                    : "bg-[#2C2723] hover:bg-black text-white"
                }`}
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" /> Registrar Ingreso o Gasto
              </button>

              <button
                onClick={() => {
                  setEditingTemplateId(null);
                  setTplName("");
                  setTplFortnight("Q1");
                  setTplRows([
                    { category: "Arriendo", customName: "Pago del arriendo quincenal", type: "expense", amount: 600000 },
                    { category: "Mercado", customName: "Mercado quincenal Éxito", type: "expense", amount: 250000 },
                    { category: "Servicios", customName: "Factura de Luz", type: "expense", amount: 800000 },
                  ]);
                  setShowTemplateModal(true);
                }}
                className="bg-[#FAF7F2] hover:bg-[#E7E2D5] text-[#2C2723] px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-[#E7E2D5]"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Crear Plantilla Presupuesto
              </button>

              <button
                type="button"
                onClick={handleClearAllBudget}
                title="Eliminar todos los datos ingresados en el presupuesto"
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-600" /> Vaciar Presupuesto
              </button>
            </div>
          </div>

          {/* 5. Saved Templates Library for Quick Load */}
          <div className="bg-white rounded-3xl p-6 border-4 border-[#E7E2D5] space-y-4">
            <div className="flex items-center justify-between border-b border-[#FAF7F2] pb-4">
              <div>
                <h3 className="font-extrabold text-[#2C2723] text-base flex items-center gap-2">
                  📋 Moldes y Plantillas de Presupuesto Colectivo
                </h3>
                <p className="text-xs text-[#8A817C] mt-0.5">Diseñen un borrador de gastos e ingresos bases mensuales para cargarlo de un clic miau🐾</p>
              </div>

              <span className="text-xs font-black bg-[#FAF7F2] border text-[#625B57] px-3 py-1 rounded-full">
                {templates.length} Plantilla(s)
              </span>
            </div>

            {templates.length === 0 ? (
              <div className="py-8 text-center bg-[#FCFAF7] rounded-2xl p-4 border border-[#E7E2D5]">
                <p className="text-xs text-[#8A817C] font-bold">Aún no han creado ninguna plantilla base.</p>
                <p className="text-[11px] text-[#8A817C] mt-1 font-semibold">
                  Hagan clic en <b>"Crear Plantilla Presupuesto"</b> arriba para definir sus gastos fijos domésticos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((tpl) => {
                  const itemsCount = tpl.items?.length || 0;
                  const estimatedExpenses = tpl.items
                    ?.filter(i => i.type === "expense")
                    .reduce((sum, s) => sum + s.amount, 0) || 0;
                  const estimatedIncomes = tpl.items
                    ?.filter(i => i.type === "income")
                    .reduce((sum, s) => sum + s.amount, 0) || 0;

                  return (
                    <div 
                      key={tpl.id} 
                      className="border-2 border-[#E7E2D5] rounded-2xl hover:border-emerald-500 transition-all bg-[#FCFAF7] p-5 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full ${
                            tpl.assignedFortnight === "both" 
                              ? "bg-purple-100 text-purple-800" 
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            Período: {tpl.assignedFortnight === "both" ? "Q1 & Q2" : tpl.assignedFortnight}
                          </span>
                          
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTemplateId(tpl.id);
                                setTplName(tpl.name);
                                setTplFortnight(tpl.assignedFortnight);
                                setTplRows(tpl.items ? JSON.parse(JSON.stringify(tpl.items)) : []);
                                setShowTemplateModal(true);
                              }}
                              className="p-1 hover:bg-emerald-50 rounded-lg text-emerald-600 hover:text-emerald-800 transition-all cursor-pointer"
                              title="Modificar/Editar plantilla"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                              className="p-1 hover:bg-rose-50 rounded-lg text-rose-500 hover:text-rose-700 transition-all cursor-pointer"
                              title="Eliminar plantilla permanentemente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h4 className="font-extrabold text-[#2C2723] text-sm leading-snug">{tpl.name}</h4>
                        
                        <div className="space-y-1 pt-1.5 border-t border-[#FAF7F2] text-[11px] text-[#625B57] font-semibold">
                          <p className="flex justify-between">
                            <span>Ingresos estimados:</span>
                            <span className="font-mono text-emerald-600 font-bold">{formatCurrency(estimatedIncomes)}</span>
                          </p>
                          <p className="flex justify-between">
                            <span>Gastos estimados:</span>
                            <span className="font-mono text-rose-600 font-bold">{formatCurrency(estimatedExpenses)}</span>
                          </p>
                          <p className="text-[10px] text-[#8A817C] text-right mt-1 italic">
                            ({itemsCount} rubros preconfigurados)
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleApplyTemplate(tpl.id)}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs mt-2"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Aplicar Estimados de Plantilla
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 6. COMPARATIVE ESTIMATED vs SPENT */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            
            {/* Left Column (3 cols): Comparative progress reports */}
            <div className="lg:col-span-3 bg-white p-6 rounded-3xl border-4 border-[#E7E2D5] space-y-6">
              <div className="flex items-center justify-between border-b border-[#E7E2D5] pb-4">
                <div>
                  <h3 className="font-extrabold text-[#2C2723] text-base flex items-center gap-2">
                    📊 Presupuestos Estimados vs Gastos Reales
                  </h3>
                  <p className="text-xs text-[#8A817C] mt-0.5">
                    ¿Cómo van sus gastos quincenales según sus límites deseados?
                  </p>
                </div>
                <div className="text-[10px] font-black bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
                  ESTADÍSTICA
                </div>
              </div>

              {/* 📊 Cuadros de Control de Presupuesto Colectivo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#FCFAF7] border-2 border-[#E7E2D5] rounded-2xl p-4">
                <div className="bg-white p-3 rounded-xl border border-[#E7E2D5] space-y-1 shadow-xs">
                  <span className="text-[10px] font-black text-[#625B57] uppercase tracking-wider block">Suma Ingreso REAL</span>
                  <p className="text-base font-black font-mono text-emerald-700">{formatCurrency(totalGenuineIncomes)}</p>
                  <p className="text-[9px] text-[#8A817C] font-semibold leading-none">Ingresos reales diligenciados</p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#E7E2D5] space-y-1 shadow-xs">
                  <span className="text-[10px] font-black text-[#625B57] uppercase tracking-wider block">Suma Gastos Plantilla</span>
                  <p className="text-base font-black font-mono text-rose-600">{formatCurrency(templateTotalExpensesSummary)}</p>
                  <p className="text-[9px] text-[#8A817C] font-semibold leading-none">Gastos de la plantilla usada</p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#E7E2D5] space-y-1 shadow-xs">
                  <span className="text-[10px] font-black text-[#625B57] uppercase tracking-wider block">Dinero Restante</span>
                  <p className={`text-base font-black font-mono ${templateRemainingSummary >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {formatCurrency(templateRemainingSummary)}
                  </p>
                  <p className="text-[9px] text-[#8A817C] font-semibold leading-none">REAL - Gastos de plantilla</p>
                </div>
              </div>

              {comparisonList.length === 0 ? (
                <div className="py-20 text-center text-xs text-[#8A817C] font-bold space-y-2">
                  <p className="font-black text-[#625B57]">No hay rubros de comparación para este período.</p>
                  <p className="text-[11px] font-semibold text-[#8A817C]">
                    Hagan clic en <b>"Aplicar Plantilla"</b> arriba, o carguen transacciones reales miau🐾
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comparisonList.map((cat, idx) => {
                    const isExpense = cat.type === "expense";
                    let percentage = 0;
                    if (cat.estimated > 0) {
                      percentage = Math.round((cat.actual / cat.estimated) * 100);
                    }
                    
                    const overspent = isExpense && cat.estimated > 0 && cat.actual > cat.estimated;

                    return (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-2xl border-2 transition-all shadow-2xs space-y-3.5 ${
                          isExpense 
                            ? "bg-[#FFFDFC] border-[#FAD2C0]/50 hover:border-[#FAD2C0]" 
                            : "bg-[#FAFFFA] border-[#C2F0C2]/50 hover:border-[#9CE49C]"
                        }`}
                      >
                        {/* Parent Category Header */}
                        <div className="flex items-center justify-between text-xs font-bold text-[#2C2723]">
                          <span className="flex items-center gap-1.5">
                            <span className={`w-3 h-3 rounded-full ${isExpense ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            <span className="text-[#2C2723] font-black text-[13.5px] tracking-tight">{cat.category}</span> 
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            isExpense ? "bg-rose-100/70 text-rose-800" : "bg-emerald-100/70 text-emerald-800"
                          }`}>
                            {isExpense ? "Gasto" : "Ingreso"}
                          </span>
                        </div>

                        {/* Category totals */}
                        <div className="flex justify-between items-center text-[11px] font-black font-mono border-t border-b border-[#E7E2D5]/40 py-1.5">
                          <span className="text-[#8A817C]">
                            Planeado: <span className="text-[#2C2723]">{cat.estimated > 0 ? formatCurrency(cat.estimated) : "$0 COP (Flotante)"}</span>
                          </span>
                          <span className={isExpense ? (overspent ? "text-rose-600 font-extrabold" : "text-[#2C2723]") : "text-emerald-700 font-extrabold"}>
                            Registrado: <span>{formatCurrency(cat.actual)}</span>
                          </span>
                        </div>

                        {/* Progress slider bar inside target values */}
                        {cat.estimated > 0 ? (
                          <div className="space-y-2">
                            <div className="w-full bg-[#FAF7F2] border border-[#E7E2D5] rounded-full h-3.5 overflow-hidden relative shadow-inner">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  !isExpense 
                                    ? "bg-emerald-500" 
                                    : overspent 
                                      ? "bg-rose-600 animate-pulse animate-infinite" 
                                      : percentage >= 85 
                                        ? "bg-amber-500" 
                                        : "bg-[#76C893]"
                                }`}
                                style={{ width: `${Math.min(100, percentage)}%` }}
                              />
                              <span className="absolute inset-y-0 right-2 text-[9px] text-[#2C2723] font-black flex items-center leading-none">
                                {percentage}%
                              </span>
                            </div>

                            {/* Warnings Alerts */}
                            {overspent && (
                              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>¡Miau! Han sobrepasado el presupuesto estimado de {cat.category}.</span>
                              </div>
                            )}
                            {!isExpense && cat.actual >= cat.estimated && (
                              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>¡Gran logro quincenal! Meta de ingreso completada ✨🐾</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-[#8A817C] italic">Sin tope predefinido (movimiento variable extrapresupuestario)</div>
                        )}

                        {/* Detailed Subcategories Breakdown */}
                        {cat.subcategories.length > 0 && (
                          <div className="bg-[#FAF7F2]/60 border border-[#E7E2D5] rounded-xl p-2.5 space-y-2">
                            <div className="text-[9px] font-black text-[#8A817C] uppercase tracking-wider mb-0.5 flex items-center gap-1">
                              <span>🔍 Desglose de Subconceptos:</span>
                            </div>
                            <div className="space-y-1.5">
                              {cat.subcategories.map((sub, sIdx) => {
                                const subPercent = sub.estimated > 0 ? Math.round((sub.actual / sub.estimated) * 100) : null;
                                const subOverspent = sub.estimated > 0 && sub.actual > sub.estimated;
                                return (
                                  <div key={sIdx} className="bg-white border border-[#E7E2D5] rounded-lg p-2 space-y-1.5 text-[11px] shadow-2xs">
                                    <div className="flex items-center justify-between font-bold text-[#2C2723]">
                                      <span className="flex items-center gap-1">
                                        <span className="text-[#8A817C]">🐾</span>
                                        <span className="text-[#625B57] font-extrabold">{sub.customName}</span>
                                        {sub.account && (
                                          <span className="text-[9px] font-black text-slate-500 bg-slate-100 border border-slate-200 px-1 py-0.2 rounded-sm font-mono">
                                            {sub.account}
                                          </span>
                                        )}
                                      </span>
                                      <span className="font-mono text-[#8A817C]">
                                        {sub.estimated > 0 ? `${subPercent}%` : "Variable"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between font-mono text-[10px] text-[#8A817C] leading-none">
                                      <span>Plan: <b className="text-[#2C2723]">{sub.estimated > 0 ? formatCurrency(sub.estimated) : "$0"}</b></span>
                                      <span>Real: <b className={subOverspent ? "text-rose-600 font-extrabold" : "text-[#2C2723]"}>{formatCurrency(sub.actual)}</b></span>
                                    </div>
                                    {/* Mini visual indicator line */}
                                    {sub.estimated > 0 && (
                                      <div className="w-full bg-[#FAF7F2] h-1 rounded-full overflow-hidden mt-1">
                                        <div 
                                          className={`h-full rounded-full transition-all duration-300 ${
                                            subOverspent ? "bg-rose-500" : subPercent !== null && subPercent >= 90 ? "bg-amber-400" : "bg-emerald-400"
                                          }`}
                                          style={{ width: `${Math.min(100, subPercent || 0)}%` }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column (2 cols): Real-time Transactions Registry */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border-4 border-[#E7E2D5] flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#E7E2D5] pb-4">
                <div>
                  <h3 className="font-extrabold text-[#2C2723] text-base flex items-center gap-2">
                    📝 Registro de Movimientos
                  </h3>
                  <p className="text-xs text-[#8A817C] mt-0.5">
                    Transacciones ejecutadas en este ciclo
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (isActivePeriodClosed) {
                      triggerToast("Miau, esta quincena está cerrada y bloqueada. Reábrela para añadir registros.", "error");
                      return;
                    }
                    setRegType("expense");
                    setRegCategory("");
                    setRegAccount("");
                    setShowRegModal(true);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    isActivePeriodClosed
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                      : "bg-emerald-700 hover:bg-emerald-800 text-white"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar movimiento
                </button>
              </div>

                {/* Account filter pills */}
                {accounts.length > 0 && activePeriodItems.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mb-4 bg-[#FCFAF7] p-1.5 rounded-2xl border-2 border-[#FAF7F2]">
                    <span className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider pl-1.5 mr-1">
                      🔍 Filtrar cuenta:
                    </span>
                    <button
                      type="button"
                      onClick={() => setAccountFilter("all")}
                      className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        accountFilter === "all"
                          ? "bg-amber-600 text-white shadow-3xs"
                          : "bg-white hover:bg-amber-50 text-[#625B57] border border-[#E7E2D5]"
                      }`}
                    >
                      Todas ({activePeriodItems.length})
                    </button>
                    {accounts.map(acc => {
                      const count = activePeriodItems.filter(item => item.account === acc.name || item.destinationAccount === acc.name).length;
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => setAccountFilter(acc.name)}
                          className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                            accountFilter === acc.name
                              ? "bg-amber-600 text-white shadow-3xs"
                              : "bg-white hover:bg-amber-50 text-[#625B57] border border-[#E7E2D5]"
                          }`}
                        >
                          {acc.name} 
                          {count > 0 && (
                            <span className={`text-[9px] px-1 py-0.2 rounded-md font-extrabold ${
                              accountFilter === acc.name ? "bg-white/30 text-white" : "bg-[#FAF7F2] text-[#8A817C]"
                            }`}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {activePeriodItems.length === 0 ? (
                  <div className="py-24 text-center text-xs text-[#8A817C] font-semibold space-y-2">
                    <Wallet className="w-8 h-8 text-[#8A817C] mx-auto opacity-40" />
                    <p className="font-bold">No hay transacciones aún</p>
                    <p className="text-[11px] font-normal">Hagan clic en "Registrar Ingreso o Gasto" para ingresar el flujo monetario real.</p>
                  </div>
                ) : displayedMovements.length === 0 ? (
                  <div className="py-16 text-center text-xs text-[#8A817C] font-semibold space-y-2">
                    <Filter className="w-8 h-8 text-[#8A817C] mx-auto opacity-40 animate-pulse" />
                    <p className="font-bold text-[#625B57]">Sin movimientos filtrados</p>
                    <p className="text-[11px] font-normal">No hay transacciones registradas en la cuenta "{accountFilter}" para esta quincena.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[850px] lg:max-h-[1050px] overflow-y-auto pr-1">
                    {displayedMovements.map((item) => {
                      const isIncome = item.type === "income";
                      const isTransfer = item.category === "Transferencia";

                      return (
                        <div 
                          key={item.id} 
                          className="flex items-center justify-between p-2 rounded-xl bg-[#FCFAF7] border-2 border-[#FAF7F2] hover:border-[#E7E2D5] transition-all group shadow-2xs"
                        >
                          <div className="space-y-0.5 overflow-hidden pr-2">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded-md border ${
                                categoryColors[item.category] || "bg-gray-100 text-gray-855"
                              }`}>
                                {item.category}
                              </span>
                              <span className="text-[8px] font-black text-slate-500 bg-slate-100 px-1 py-0.2 rounded-sm flex items-center gap-0.5">
                                <span>{item.account}</span>
                                {item.category === "Transferencia" && item.destinationAccount && (
                                  <>
                                    <ArrowRight className="w-2 h-2 text-slate-400 inline" />
                                    <span className="text-indigo-600 font-extrabold">{item.destinationAccount}</span>
                                  </>
                                )}
                              </span>
                            </div>

                            <p className="text-xs font-bold text-[#2C2723] truncate">
                              {item.description}
                            </p>

                            <p className="text-[9px] text-[#8A817C] font-semibold font-mono">
                              {item.date}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="text-right">
                              <p className={`font-mono text-xs font-black ${
                                isTransfer ? "text-indigo-600 font-bold" : isIncome ? "text-emerald-700 font-extrabold" : "text-rose-600"
                              }`}>
                                {isTransfer ? "⇅ " : isIncome ? "+" : "-"}{formatCurrency(item.amount)}
                              </p>
                            </div>

                            <button
                              onClick={() => handleStartEditItem(item)}
                              className="text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 border border-amber-200"
                              title="Editar transacción"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 border border-rose-200"
                              title="Borrar transacción"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              {activePeriodItems.length > 0 && (
                <div className="bg-[#FAF7F2] p-2.5 rounded-xl text-[11px] text-[#625B57] font-bold text-center mt-3 border border-[#FAF7F2]">
                  Total movimientos quincenales: {activePeriodItems.length}
                </div>
              )}

              {/* MINI CALCULATOR WIDGET */}
              <div className="mt-4 bg-[#FCFAF7] border-2 border-[#E7E2D5] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#FAF7F2] pb-2">
                  <h4 className="text-xs font-black text-[#2C2723] flex items-center gap-1.5">
                    <span>🧮 Calculadora de Gastos Miau</span>
                  </h4>
                  <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                    Rápida 🐾
                  </span>
                </div>

                {/* Display */}
                <div className="bg-white border-2 border-[#E7E2D5] rounded-xl p-3 text-right font-mono text-base font-black text-[#2C2723] relative overflow-hidden shadow-inner min-h-[44px] flex flex-col justify-center">
                  {calcOp && (
                    <span className="absolute top-1 left-2 text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded">
                      {calcMemory} {calcOp}
                    </span>
                  )}
                  <span>{calcInput}</span>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-4 gap-1">
                  {["7", "8", "9", "/"].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => handleCalcClick(btn)}
                      className={`py-1.5 text-xs font-black rounded-xl border-2 transition-all cursor-pointer ${
                        ["/"].includes(btn)
                          ? "bg-amber-100 border-[#E7E2D5] text-amber-900 hover:bg-amber-200"
                          : "bg-white border-[#E7E2D5] text-[#625B57] hover:bg-gray-50"
                      }`}
                    >
                      {btn}
                    </button>
                  ))}
                  {["4", "5", "6", "*"].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => handleCalcClick(btn)}
                      className={`py-1.5 text-xs font-black rounded-xl border-2 transition-all cursor-pointer ${
                        ["*"].includes(btn)
                          ? "bg-amber-100 border-[#E7E2D5] text-amber-900 hover:bg-amber-200"
                          : "bg-white border-[#E7E2D5] text-[#625B57] hover:bg-gray-50"
                      }`}
                    >
                      {btn === "*" ? "×" : btn}
                    </button>
                  ))}
                  {["1", "2", "3", "-"].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => handleCalcClick(btn)}
                      className={`py-1.5 text-xs font-black rounded-xl border-2 transition-all cursor-pointer ${
                        ["-"].includes(btn)
                          ? "bg-amber-100 border-[#E7E2D5] text-amber-900 hover:bg-amber-200"
                          : "bg-white border-[#E7E2D5] text-[#625B57] hover:bg-gray-50"
                      }`}
                    >
                      {btn}
                    </button>
                  ))}
                  {["C", "0", ".", "+"].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => handleCalcClick(btn)}
                      className={`py-1.5 text-xs font-black rounded-xl border-2 transition-all cursor-pointer ${
                        btn === "C"
                          ? "bg-rose-100 border-rose-200 text-rose-700 hover:bg-rose-200"
                          : btn === "+"
                          ? "bg-amber-100 border-[#E7E2D5] text-amber-900 hover:bg-amber-200"
                          : "bg-white border-[#E7E2D5] text-[#625B57] hover:bg-gray-50"
                      }`}
                    >
                      {btn}
                    </button>
                  ))}
                </div>

                {/* Equals and Use-in-movement buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCalcClick("=")}
                    className="py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs transition-all cursor-pointer shadow-xs border-2 border-amber-600 flex items-center justify-center gap-1"
                  >
                    <span>=</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const numericValue = parseFloat(calcInput);
                      if (isNaN(numericValue) || numericValue <= 0) {
                        triggerToast("Miau, introduce un monto válido mayor a 0", "error");
                        return;
                      }
                      setRegAmount(String(numericValue));
                      setRegType("expense");
                      setShowRegModal(true);
                      triggerToast("¡Monto copiado al formulario miau! 🐾", "success");
                    }}
                    className="py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl text-xs transition-all cursor-pointer shadow-xs border-2 border-emerald-700 flex items-center justify-center gap-1"
                  >
                    <span>✍️ Usar en Registro</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3.1. Recharts - Monthly Expenses Pie Chart */}
          <div className="bg-white rounded-3xl p-6 border-4 border-[#E7E2D5] space-y-6 mt-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#FAF7F2] pb-4">
              <div>
                <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100 uppercase tracking-widest flex items-center gap-1 w-fit">
                  📈 ANALÍTICA HISTÓRICA
                </span>
                <h3 className="font-extrabold text-[#2C2723] text-base mt-1.5 flex items-center gap-2">
                  📊 Distribución de Gastos (Excluye Ingresos) ({getMonthNameHuman(selectedMonth)})
                </h3>
                <p className="text-xs text-[#8A817C] mt-0.5">
                  Visualicen la distribución porcentual de los gastos reales registrados en su hogar para el mes seleccionado. Marquen o desmarquen categorías abajo🐾.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllChartCategories}
                  className="bg-[#FCFAF7] hover:bg-[#E7E2D5] text-[#2C2723] border border-[#E7E2D5] text-[10px] px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer"
                >
                  Seleccionar Todo
                </button>
                <button
                  type="button"
                  onClick={deselectAllChartCategories}
                  className="bg-[#FCFAF7] hover:bg-[#E7E2D5] text-[#2C2723] border border-[#E7E2D5] text-[10px] px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer"
                >
                  Limpiar Todo
                </button>
              </div>
            </div>

            {/* Selector de Categorías Grid */}
            <div className="space-y-2">
              <span className="text-[10px] text-[#8A817C] font-black uppercase tracking-wider block">
                Seleccionen rubros de gastos para incluir:
              </span>
              <div className="flex flex-wrap gap-2">
                {BUDGET_EXPENSE_CATEGORIES.map(cat => {
                  const isSelected = selectedChartCategories.includes(cat);
                  const colorClass = categoryColors[cat] || "bg-gray-100 text-gray-800 border-gray-200";

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleChartCategory(cat)}
                      className={`text-xs px-3 py-1.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-1.5 font-bold ${
                        isSelected 
                          ? `${colorClass} shadow-xs scale-[1.02]`
                          : "bg-gray-50 text-gray-400 border-dashed border-gray-200 hover:bg-gray-100 line-through opacity-60"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span>{cat}</span>
                      {isSelected && <Check className="w-3 h-3 text-current shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chart Area */}
            <div className="bg-[#FCFAF7] border-2 border-[#E7E2D5] rounded-2xl p-4">
              {getPieChartData().length === 0 ? (
                <div className="py-20 text-center text-xs text-[#8A817C] font-bold space-y-1">
                  <p className="text-[#625B57]">No hay gastos registrados o seleccionados para {getMonthNameHuman(selectedMonth)}.</p>
                  <p className="font-semibold text-[11px] text-[#8A817C]">Prueben seleccionando otras categorías arriba o registrando un nuevo gasto miau🐾.</p>
                </div>
              ) : (
                <div className="h-auto min-h-[320px] w-full pt-4 font-sans font-bold flex flex-col md:flex-row items-center justify-center gap-8">
                  <div className="w-full md:w-1/2 h-64 min-w-0 min-h-[256px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
                      <PieChart>
                        <Pie
                          data={getPieChartData()}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={90}
                          dataKey="value"
                        >
                          {getPieChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          formatter={(value: any) => [formatCurrency(Number(value)), 'Total Gasto']} 
                          contentStyle={{ 
                            backgroundColor: '#FCFAF7', 
                            border: '2px solid #E7E2D5', 
                            borderRadius: '16px', 
                            fontSize: '11px',
                            fontWeight: 'bold',
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Custom Legend details table with values and percentages */}
                  <div className="w-full md:w-1/2 max-h-64 overflow-y-auto space-y-2 pr-2">
                    <h4 className="text-[11px] text-[#8A817C] uppercase tracking-wider font-black mb-1">Desglose de Gastos miau🐾:</h4>
                    <div className="divide-y divide-gray-100 font-semibold text-xs text-[#2C2723]">
                      {(() => {
                        const pieData = getPieChartData();
                        const totalSum = pieData.reduce((acc, curr) => acc + curr.value, 0);
                        return pieData.map((entry, idx) => {
                          const pct = totalSum > 0 ? ((entry.value / totalSum) * 100).toFixed(1) : "0";
                          return (
                            <div key={idx} className="flex items-center justify-between py-2">
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                                <span className="font-bold">{entry.name}</span>
                              </div>
                              <div className="text-right font-mono text-[11px]">
                                <span className="font-extrabold text-[#2C2723]">{formatCurrency(entry.value)}</span>
                                <span className="text-gray-400 text-[10px] ml-1.5 font-bold">({pct}%)</span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* MODAL: REGISTER TRANSACTION (Ingreso / Gasto) */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showRegModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="bg-white rounded-3xl border-4 border-[#E7E2D5] max-w-md w-full p-5 sm:p-6 shadow-2xl relative space-y-4 my-auto max-h-[90vh] flex flex-col text-[#2C2723]"
              >
              <div className="flex items-center justify-between border-b border-[#E7E2D5] pb-3 shrink-0">
                <h3 className="font-extrabold text-[#2C2723] text-lg flex items-center gap-2">
                  ✍️ Registrar Flujo de Dinero
                </h3>
                <button 
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="p-1 hover:bg-[#FAF7F2] rounded-full text-gray-500 hover:text-black cursor-pointer transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
                
                {/* Type selection: Income vs Expense */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider block">Tipo de Registro</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setRegType("expense");
                        setRegCategory("");
                      }}
                      className={`py-2.5 px-4 text-xs font-black rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        regType === "expense"
                          ? "bg-rose-50 border-rose-500 text-rose-700"
                          : "bg-white border-[#E7E2D5] text-[#625B57] hover:bg-[#FAF7F2]"
                      }`}
                    >
                      <MinusCircle className="w-4 h-4 text-rose-500" /> Salida / Gasto
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRegType("income");
                        setRegCategory("");
                      }}
                      className={`py-2.5 px-4 text-xs font-black rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        regType === "income"
                          ? "bg-emerald-50 border-[#10b981] text-emerald-750"
                          : "bg-white border-[#E7E2D5] text-[#625B57] hover:bg-[#FAF7F2]"
                      }`}
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-500" /> Entrada / Ingreso
                    </button>
                  </div>
                </div>

                {/* Amount (COP) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider block">Monto en COP ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A817C] font-black text-xs">$</span>
                    <input
                      type="number"
                      required
                      placeholder="Monto en pesos, ej: 15000"
                      value={regAmount}
                      onChange={(e) => setRegAmount(e.target.value)}
                      className="w-full bg-[#FCFAF7] border-2 border-[#E7E2D5] rounded-xl pl-8 pr-4 py-2.5 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Category Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider block">Categoría de Rubro</label>
                  <select
                    value={regCategory}
                    onChange={(e) => {
                      setRegCategory(e.target.value);
                      setSelectedEstimateId("");
                      setRegDescription("");
                    }}
                    required
                    className="w-full bg-[#FCFAF7] border-2 border-[#E7E2D5] rounded-xl px-4 py-2.5 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Seleccione una Categoría --</option>
                    {regType === "income" ? (
                      BUDGET_INCOME_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))
                    ) : (
                      BUDGET_EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))
                    )}
                    <option value="custom">➕ Otra Categoría Personalizada...</option>
                  </select>
                </div>

                {/* Custom Category input if custom selected */}
                {regCategory === "custom" && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">Nombre de la Categoría Personalizada</label>
                    <input
                      type="text"
                      required
                      placeholder="ej: Suscripciones, Mascotas, Regalos, etc."
                      value={regCustomCategory}
                      onChange={(e) => setRegCustomCategory(e.target.value)}
                      className="w-full bg-[#FCFAF7] border-2 border-amber-300 rounded-xl px-4 py-2.5 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}

                {/* Subcategory / Planned Concept Helper Picker */}
                {regCategory && regCategory !== "Transferencia" && (
                  <div className="space-y-1.5 bg-[#FAF7F2] p-3 rounded-2xl border border-[#E7E2D5] text-left">
                    <label className="text-[10px] font-black text-emerald-850 uppercase tracking-wider block flex items-center gap-1">
                      🎯 Concepto / Subcategoría de la Quincena
                    </label>
                    {getSubcategoryConcepts(regCategory, regType).length === 0 ? (
                      <p className="text-[10px] text-[#8A817C] font-semibold">
                        Aún no hay conceptos creados en esta categoría. Puedes escribir uno nuevo abajo.
                      </p>
                    ) : (
                      <>
                        <select
                          value={selectedEstimateId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedEstimateId(val);
                            if (val === "" || val === "custom") {
                              setRegDescription("");
                            } else {
                              const concepts = getSubcategoryConcepts(regCategory, regType);
                              const selected = concepts.find(c => c.id === val);
                              if (selected) {
                                setRegDescription(selected.name);
                                if (selected.account) {
                                  const accExists = accounts.some(acc => acc.name === selected.account);
                                  if (accExists) {
                                    setRegAccount(selected.account);
                                  }
                                }
                              }
                            }
                          }}
                          className="w-full bg-white border border-[#E7E2D5] rounded-xl px-3 py-2 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">-- Usar un concepto existente / similar --</option>
                          {getSubcategoryConcepts(regCategory, regType).map(c => (
                            <option key={c.id} value={c.id}>
                              {c.isPlanned ? "📌 [Planeado] " : "🔹 [Registrado] "} {c.name} {c.amount ? `(${formatCurrency(c.amount)})` : ""}
                            </option>
                          ))}
                          <option value="custom">Otro concepto personalizado...</option>
                        </select>
                        <p className="text-[9px] text-[#8A817C] font-semibold leading-relaxed">
                          Miau, selecciona un concepto existente para que los gastos similares se sumen y acumulen bajo este mismo concepto en los cuadros del presupuesto.
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Account Pick */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider block">
                    {regCategory === "Transferencia" ? "Cuenta de Origen (Dinero sale de)" : "Billetera / Cuenta Origen"}
                  </label>
                  {accounts.length === 0 ? (
                    <p className="text-[10px] text-rose-600 font-bold">¡Por favor, crea una cuenta primero atrás miau!</p>
                  ) : (
                    <select
                      value={regAccount}
                      onChange={(e) => setRegAccount(e.target.value)}
                      required
                      className="w-full bg-[#FCFAF7] border-2 border-[#E7E2D5] rounded-xl px-4 py-2.5 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Seleccione una Cuenta --</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.name}>{acc.name} — ({formatCurrency(acc.balance)})</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Transfer Destination Account Picker */}
                {regCategory === "Transferencia" && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider block">Cuenta de Destino (Dinero ingresa a)</label>
                    {accounts.length === 0 ? (
                      <p className="text-[10px] text-rose-600 font-bold">¡Por favor, crea una cuenta primero atrás miau!</p>
                    ) : (
                      <select
                        value={regDestinationAccount}
                        onChange={(e) => setRegDestinationAccount(e.target.value)}
                        required
                        className="w-full bg-[#FCFAF7] border-2 border-[#E7E2D5] rounded-xl px-4 py-2.5 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">-- Seleccione una Cuenta de Destino --</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.name}>{acc.name} — ({formatCurrency(acc.balance)})</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Personalizable Name Description */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider block">Nombre Personalizado / Concepto</label>
                  <input
                    type="text"
                    placeholder="Escriban un nombre, ej: Suscripción Internet, Salida familiar"
                    value={regDescription}
                    onChange={(e) => setRegDescription(e.target.value)}
                    className="w-full bg-[#FCFAF7] border-2 border-[#E7E2D5] rounded-xl px-4 py-2 text-xs font-semibold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Transaction Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider block">Fecha</label>
                  <input
                    type="date"
                    required
                    value={regDate}
                    onChange={(e) => setRegDate(e.target.value)}
                    className="w-full bg-[#FCFAF7] border-2 border-[#E7E2D5] rounded-xl px-4 py-2 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={accounts.length === 0}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 text-white font-bold py-3 rounded-2xl text-xs transition-style flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Guardar Registro miau🐾
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
      )}

      {/* MODAL: EDIT MOVEMENT */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showEditModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="bg-white rounded-3xl border-4 border-[#E7E2D5] max-w-md w-full p-5 sm:p-6 shadow-2xl relative space-y-4 my-auto max-h-[90vh] flex flex-col text-[#2C2723]"
              >
              <div className="flex items-center justify-between border-b border-[#E7E2D5] pb-3 shrink-0">
                <h3 className="font-extrabold text-[#2C2723] text-lg flex items-center gap-2">
                  ✏️ Editar Movimiento
                </h3>
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="p-1 hover:bg-[#FAF7F2] rounded-full text-gray-500 hover:text-black cursor-pointer transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditItem} className="space-y-4 overflow-y-auto pr-1 flex-1">
                
                {/* Type selection: Income vs Expense */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider block">Tipo de Registro</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditType("expense");
                        setEditCategory("");
                      }}
                      className={`py-2.5 px-4 text-xs font-black rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        editType === "expense"
                          ? "bg-rose-50 border-rose-500 text-rose-700"
                          : "bg-white border-[#E7E2D5] text-[#625B57] hover:bg-[#FAF7F2]"
                      }`}
                    >
                      <MinusCircle className="w-4 h-4 text-rose-500" /> Salida / Gasto
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditType("income");
                        setEditCategory("");
                      }}
                      className={`py-2.5 px-4 text-xs font-black rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        editType === "income"
                          ? "bg-emerald-50 border-[#10b981] text-emerald-750"
                          : "bg-white border-[#E7E2D5] text-[#625B57] hover:bg-[#FAF7F2]"
                      }`}
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-500" /> Entrada / Ingreso
                    </button>
                  </div>
                </div>

                {/* Amount (COP) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider block">Monto en COP ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A817C] font-black text-xs">$</span>
                    <input
                      type="number"
                      required
                      placeholder="Monto en pesos, ej: 15000"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full bg-[#FCFAF7] border-2 border-[#E7E2D5] rounded-xl pl-8 pr-4 py-2.5 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Category Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider block">Categoría de Rubro</label>
                  <select
                    value={editCategory}
                    onChange={(e) => {
                      setEditCategory(e.target.value);
                    }}
                    required
                    className="w-full bg-[#FCFAF7] border-2 border-[#E7E2D5] rounded-xl px-4 py-2.5 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Seleccione una Categoría --</option>
                    {editType === "income" ? (
                      BUDGET_INCOME_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))
                    ) : (
                      BUDGET_EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))
                    )}
                    <option value="custom">➕ Otra Categoría Personalizada...</option>
                  </select>
                </div>

                {/* Custom Category input if custom selected in edit */}
                {editCategory === "custom" && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">Nombre de la Categoría Personalizada</label>
                    <input
                      type="text"
                      required
                      placeholder="ej: Suscripciones, Mascotas, Regalos, etc."
                      value={editCustomCategory}
                      onChange={(e) => setEditCustomCategory(e.target.value)}
                      className="w-full bg-[#FCFAF7] border-2 border-amber-300 rounded-xl px-4 py-2.5 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}

                {/* Account Pick */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider block">
                    {editCategory === "Transferencia" ? "Cuenta de Origen (Dinero sale de)" : "Billetera / Cuenta Origen"}
                  </label>
                  {accounts.length === 0 ? (
                    <p className="text-[10px] text-rose-600 font-bold">¡Por favor, crea una cuenta primero atrás miau!</p>
                  ) : (
                    <select
                      value={editAccount}
                      onChange={(e) => setEditAccount(e.target.value)}
                      required
                      className="w-full bg-[#FCFAF7] border-2 border-[#E7E2D5] rounded-xl px-4 py-2.5 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Seleccione una Cuenta --</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.name}>{acc.name} — ({formatCurrency(acc.balance)})</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Transfer Destination Account Picker */}
                {editCategory === "Transferencia" && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider block">Cuenta de Destino (Dinero ingresa a)</label>
                    {accounts.length === 0 ? (
                      <p className="text-[10px] text-rose-600 font-bold">¡Por favor, crea una cuenta primero atrás miau!</p>
                    ) : (
                      <select
                        value={editDestinationAccount}
                        onChange={(e) => setEditDestinationAccount(e.target.value)}
                        required
                        className="w-full bg-[#FCFAF7] border-2 border-[#E7E2D5] rounded-xl px-4 py-2.5 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">-- Seleccione una Cuenta de Destino --</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.name}>{acc.name} — ({formatCurrency(acc.balance)})</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Subcategory / Concept Helper Picker */}
                {editCategory && editCategory !== "Transferencia" && (
                  <div className="space-y-1.5 bg-[#FAF7F2] p-3 rounded-2xl border border-[#E7E2D5] text-left">
                    <label className="text-[10px] font-black text-emerald-850 uppercase tracking-wider block flex items-center gap-1">
                      🎯 Concepto / Subcategoría de la Quincena
                    </label>
                    {getSubcategoryConcepts(editCategory, editType).length === 0 ? (
                      <p className="text-[10px] text-[#8A817C] font-semibold">
                        Aún no hay conceptos creados en esta categoría. Puedes escribir uno nuevo abajo.
                      </p>
                    ) : (
                      <>
                        <select
                          value={editSelectedEstimateId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditSelectedEstimateId(val);
                            if (val === "" || val === "custom") {
                              setEditDescription("");
                            } else {
                              const concepts = getSubcategoryConcepts(editCategory, editType);
                              const selected = concepts.find(c => c.id === val);
                              if (selected) {
                                setEditDescription(selected.name);
                                if (selected.account) {
                                  const accExists = accounts.some(acc => acc.name === selected.account);
                                  if (accExists) {
                                    setEditAccount(selected.account);
                                  }
                                }
                              }
                            }
                          }}
                          className="w-full bg-white border border-[#E7E2D5] rounded-xl px-3 py-2 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">-- Usar un concepto existente / similar --</option>
                          {getSubcategoryConcepts(editCategory, editType).map(c => (
                            <option key={c.id} value={c.id}>
                              {c.isPlanned ? "📌 [Planeado] " : "🔹 [Registrado] "} {c.name} {c.amount ? `(${formatCurrency(c.amount)})` : ""}
                            </option>
                          ))}
                          <option value="custom">Otro concepto personalizado...</option>
                        </select>
                        <p className="text-[9px] text-[#8A817C] font-semibold leading-relaxed">
                          Miau, selecciona un concepto existente para que los gastos similares se sumen y acumulen bajo este mismo concepto en los cuadros del presupuesto.
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Personalizable Name Description */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider block">Nombre Personalizado / Concepto</label>
                  <input
                    type="text"
                    placeholder="Escriban un nombre, ej: Suscripción Internet, Salida familiar"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full bg-[#FCFAF7] border-2 border-[#E7E2D5] rounded-xl px-4 py-2 text-xs font-semibold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Transaction Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider block">Fecha</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-[#FCFAF7] border-2 border-[#E7E2D5] rounded-xl px-4 py-2 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={accounts.length === 0}
                    className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-2xl text-xs transition-style flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Guardar Cambios miau🐾
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
      )}

      {/* MODAL: CREATE ACCOUNT */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showAccountModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="bg-white rounded-3xl border-4 border-[#E7E2D5] max-w-md w-full p-5 sm:p-6 shadow-2xl relative space-y-4 my-auto max-h-[90vh] flex flex-col text-[#2C2723]"
              >
              <div className="flex items-center justify-between border-b border-[#E7E2D5] pb-3 shrink-0">
                <h3 className="font-extrabold text-[#2C2723] text-lg flex items-center gap-2">
                  🏦 Crear Nueva Cuenta / Billetera
                </h3>
                <button 
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="p-1 hover:bg-[#FAF7F2] rounded-full text-gray-500 hover:text-black cursor-pointer transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAccountSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider block">Nombre de la cuenta</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Nequi Benja 📱, Bancolombia Pareja 💳, Cajón Efectivo"
                    value={accName}
                    onChange={(e) => setAccName(e.target.value)}
                    className="w-full bg-[#FCFAF7] border-2 border-[#E7E2D5] rounded-xl px-4 py-2.5 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider block">Fondo Inicial ($ COP)</label>
                  <input
                    type="number"
                    required
                    placeholder="Sueldo inicial, ej: 1200000"
                    value={accBalance}
                    onChange={(e) => setAccBalance(e.target.value)}
                    className="w-full bg-[#FCFAF7] border-2 border-[#E7E2D5] rounded-xl px-4 py-2.5 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-[#8A817C] italic">Este fondo cambiará automáticamente cuando gasten o reciban ingresos miau.</p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-2xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Check className="w-4 h-4" /> Crear Cuenta de Pareja
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
      )}

      {/* MODAL: DESIGN BUDGET TEMPLATE */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showTemplateModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="bg-white rounded-3xl border-4 border-[#E7E2D5] max-w-3xl w-full p-5 sm:p-6 shadow-2xl relative space-y-4 my-auto max-h-[90vh] flex flex-col text-[#2C2723]"
              >
              <div className="flex items-center justify-between border-b border-[#E7E2D5] pb-3 shrink-0">
                <h3 className="font-extrabold text-[#2C2723] text-lg flex items-center gap-2">
                  {editingTemplateId ? "🛠️ Modificar Plantilla Quincenal" : "🛠️ Diseñador de Plantilla Quincenal"}
                </h3>
                <button 
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="p-1 hover:bg-[#FAF7F2] rounded-full text-gray-500 hover:text-black cursor-pointer transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTemplate} className="space-y-5 overflow-y-auto pr-1 flex-1">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Template Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider block">Nombre de la Plantilla</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Pareja Gastos fijos Q1, Universidad y Arriendo"
                      value={tplName}
                      onChange={(e) => setTplName(e.target.value)}
                      className="w-full bg-[#FCFAF7] border-2 border-[#E7E2D5] rounded-xl px-4 py-2 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Fortnight Association */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider block">Asociar a Quincena</label>
                    <select
                      value={tplFortnight}
                      onChange={(e) => setTplFortnight(e.target.value as any)}
                      className="w-full bg-[#FCFAF7] border-2 border-[#E7E2D5] rounded-xl px-4 py-2.5 text-xs font-bold text-[#2C2723] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Q1">Solo Primera Quincena (Q1, Día 15)</option>
                      <option value="Q2">Solo Segunda Quincena (Q2, Día 30)</option>
                      <option value="both">Ambas Quincenas (Presupuesto estándar)</option>
                    </select>
                  </div>
                </div>

                {/* Rows Editor with Category, Name, Amount, Account */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[#FAF7F2] pb-2">
                    <label className="text-[10px] font-black text-[#8A817C] uppercase tracking-wider">
                      Rubros Estimados (Entradas o Salidas)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddTplRow}
                      className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-xl transition-all font-bold cursor-pointer"
                    >
                      + Añadir Rubro
                    </button>
                  </div>

                  <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                    {tplRows.map((row, index) => (
                      <div key={index} className="flex flex-wrap md:flex-nowrap gap-2 items-center bg-[#FCFAF7] p-3 rounded-2xl border-2 border-[#FAF7F2]">
                        
                        {/* Type */}
                        <select
                          value={row.type}
                          onChange={(e) => handleUpdateTplRow(index, "type", e.target.value)}
                          className="bg-white border rounded-lg px-2 py-1 text-[11px] font-bold h-9 focus:outline-none cursor-pointer"
                        >
                          <option value="expense">gasto (-)</option>
                          <option value="income">ingreso (+)</option>
                        </select>

                        {/* Category */}
                        <select
                          value={row.category}
                          onChange={(e) => handleUpdateTplRow(index, "category", e.target.value)}
                          className="bg-white border rounded-lg px-2 py-1 text-[11px] font-bold h-9 focus:outline-none cursor-pointer flex-1 min-w-[120px]"
                          required
                        >
                          {row.type === "income" ? (
                            BUDGET_INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                          ) : (
                            BUDGET_EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                          )}
                        </select>

                        {/* Custom Name / Personalized Name */}
                        <input
                          type="text"
                          placeholder="Nombre del Gasto (ej: Luz, Wom)"
                          value={row.customName}
                          onChange={(e) => handleUpdateTplRow(index, "customName", e.target.value)}
                          className="bg-white border rounded-lg px-3 py-1 text-[11px] font-bold h-9 flex-1 min-w-[140px] focus:outline-none"
                          required
                        >
                        </input>

                        {/* Amount */}
                        <input
                          type="number"
                          placeholder="Monto ($)"
                          min="1"
                          value={row.amount || ""}
                          onChange={(e) => handleUpdateTplRow(index, "amount", parseFloat(e.target.value) || 0)}
                          className="bg-white border rounded-lg px-3 py-1 text-[11px] font-bold h-9 w-24 focus:outline-none"
                          required
                        />

                        {/* Trash row button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveTplRow(index)}
                          className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg cursor-pointer transition-all"
                          title="Remover rubro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3 border-t border-[#E7E2D5]">
                  <button
                    type="button"
                    onClick={() => setShowTemplateModal(false)}
                    className="bg-gray-100 font-bold hover:bg-gray-200 text-gray-700 text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4" /> {editingTemplateId ? "Guardar Modificaciones miau🐾" : "Guardar Plantilla de Presupuesto miau🐾"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
      )}

      {/* Toast Notice System */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3.5 bg-[#2C2723] text-white rounded-2xl shadow-xl text-xs font-bold border border-[#E7E2D5]"
          >
            <span className="text-sm">
              {toast.type === "success" ? "✨" : toast.type === "error" ? "😿" : "🐾"}
            </span>
            <p>{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="ml-3 text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirm Modal System */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {confirmDialog?.visible && (
            <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-[999] backdrop-blur-xs">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#FCFAF7] border-4 border-[#E7E2D5] rounded-[24px] p-6 max-w-sm w-full shadow-2xl relative text-center"
              >
                <span className="inline-block text-3xl mb-2">🐾❓</span>
                <h4 className="text-sm font-extrabold text-[#2C2723] uppercase tracking-wider mb-2">
                  {confirmDialog.title}
                </h4>
                <p className="text-xs text-[#625B57] leading-relaxed mb-5 font-semibold font-sans">
                  {confirmDialog.message}
                </p>

                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmDialog(null)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmDialog.onConfirm}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-5 py-2.5 rounded-lg cursor-pointer transition-all shadow-xs"
                  >
                    Confirmar miau🐾
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}
