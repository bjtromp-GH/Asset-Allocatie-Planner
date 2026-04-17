import { Chart, registerables } from 'chart.js';
import { 
  createIcons, 
  TrendingUp, 
  HelpCircle, 
  Sun, 
  Moon, 
  Info, 
  Users, 
  Lock, 
  RotateCcw, 
  Save, 
  Calendar, 
  Eye, 
  ChevronDown, 
  LayoutDashboard, 
  Smile, 
  Wallet, 
  RefreshCw, 
  Plus, 
  MinusCircle, 
  BarChart3, 
  PieChart, 
  Database, 
  Target, 
  Clock, 
  Coffee, 
  CheckCircle2, 
  Plane, 
  Flame, 
  LayoutGrid, 
  History, 
  LineChart, 
  List, 
  X, 
  ShieldCheck, 
  Unlock, 
  Download, 
  Upload, 
  Calculator, 
  PenTool, 
  Check, 
  ArrowRight, 
  MessageSquarePlus, 
  Bug, 
  ChevronRight, 
  Lightbulb, 
  ArrowLeft, 
  EyeOff, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  CheckCircle,
  Sparkles,
  Frown,
  ThumbsUp
} from 'lucide';
import { hierarchy, treemap, select } from 'd3';
import CryptoJS from 'crypto-js';

const usedIcons = {
  TrendingUp,
  HelpCircle,
  Sun,
  Moon,
  Info,
  Users,
  Lock,
  RotateCcw,
  Save,
  Calendar,
  Eye,
  ChevronDown,
  LayoutDashboard,
  Smile,
  Wallet,
  RefreshCw,
  Plus,
  MinusCircle,
  BarChart3,
  PieChart,
  Database,
  Target,
  Clock,
  Coffee,
  CheckCircle2,
  Plane,
  Flame,
  LayoutGrid,
  History,
  LineChart,
  List,
  X,
  ShieldCheck,
  Unlock,
  Download,
  Upload,
  Calculator,
  PenTool,
  Check,
  ArrowRight,
  MessageSquarePlus,
  Bug,
  ChevronRight,
  Lightbulb,
  ArrowLeft,
  EyeOff,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle,
  Sparkles,
  Frown,
  ThumbsUp
};

Chart.register(...registerables);

// --- Chart.js Plugin for Center Text ---
const centerTextPlugin = {
  id: 'centerText',
  afterDatasetsDraw: (chart: any) => {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const { left, top, width, height } = chartArea;
    const options = chart.options.plugins.centerText;
    if (!options || !options.display) return;

    ctx.save();
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    // Main Value
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = options.valueFont || '900 24px Inter, sans-serif';
    ctx.fillStyle = options.valueColor || (document.documentElement.classList.contains('dark') ? '#ffffff' : '#0f172a');
    ctx.fillText(options.value, centerX, centerY - 5);

    // Label
    ctx.font = options.labelFont || 'bold 10px Inter, sans-serif';
    ctx.fillStyle = options.labelColor || '#a1a1aa';
    ctx.fillText(options.label.toUpperCase(), centerX, centerY + 18);
    
    // Badge (optional)
    if (options.badge && options.badge.text) {
      const badgeText = options.badge.text;
      const badgeColor = options.badge.color;
      const badgeBg = options.badge.bg;
      
      ctx.font = 'bold 9px Inter, sans-serif';
      const textWidth = ctx.measureText(badgeText.toUpperCase()).width;
      const badgeW = textWidth + 12;
      const badgeH = 16;
      const badgeX = centerX - badgeW / 2;
      const badgeY = centerY + 32;
      
      ctx.fillStyle = badgeBg;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
      } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH);
      }
      ctx.fill();
      
      ctx.fillStyle = badgeColor;
      ctx.fillText(badgeText.toUpperCase(), centerX, badgeY + badgeH / 2 + 1);
    }
    
    ctx.restore();
  }
};

Chart.register(centerTextPlugin);

interface Asset {
  id: string;
  name: string;
  value: number;
  target: number;
  color: string;
  category: 'Groei' | 'Defensief' | 'Speculatief';
  isRealEstate?: boolean;
}

interface Debt {
  id: string;
  name: string;
  value: number;
  target: number;
}

interface HistoryEntry {
  date: string;
  totalValue: number;
  assets: Asset[];
  debts?: Debt[];
}

const DEFAULT_ASSETS: Asset[] = [
  { id: '1', name: 'Aandelen', value: 5000, target: 45, color: '#10b981', category: 'Groei', isRealEstate: false },
  { id: '2', name: 'Obligaties', value: 1500, target: 15, color: '#10b981', category: 'Defensief', isRealEstate: false },
  { id: '3', name: 'Vastgoed', value: 1000, target: 10, color: '#0d9488', category: 'Groei', isRealEstate: true },
  { id: '4', name: 'Spaargeld', value: 1000, target: 5, color: '#22c55e', category: 'Defensief', isRealEstate: false },
  { id: '5', name: 'Goud', value: 500, target: 5, color: '#eab308', category: 'Defensief', isRealEstate: false },
  { id: '6', name: 'Zilver', value: 200, target: 2, color: '#94a3b8', category: 'Defensief', isRealEstate: false },
  { id: '7', name: 'Bitcoin', value: 800, target: 10, color: '#f97316', category: 'Speculatief', isRealEstate: false },
  { id: '8', name: 'Auto', value: 1000, target: 8, color: '#ec4899', category: 'Defensief', isRealEstate: false },
];

let assets: Asset[] = [];
let debts: Debt[] = [];

let history: HistoryEntry[] = [];
let investmentAmount = 1000;
let targetNetWorth = 1000000;
let isPlannerMode = true;
let isDarkMode = false;
let isPrivacyMode = false;
let monthlyExpenses = 2500;
let freedomCustomNetWorth = 0;
let masterPassword = '';
let isEncrypted = false;
let pieChart: Chart | null = null;
let pieChartMode: 'bruto' | 'netto' = 'bruto';
let barChartCurrent: Chart | null = null;
let barChartComparison: Chart | null = null;
let historyChart: Chart | null = null;
let summaryPieChart: Chart | null = null;
let averageDutchChart: Chart | null = null;

// Track previous values for animations
let prevNetWorth = 0;
let prevPieTotal = 0;
let prevTotalAssets = 0;
let prevCategoryValues = { Groei: 0, Defensief: 0, Speculatief: 0 };

const formatCurrency = (value: number) => {
  if (isPrivacyMode) return '€ •••••';
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number) => {
  if (isPrivacyMode) return '•••%';
  return `${value.toFixed(1)}%`;
};

const formatNumber = (value: number) => {
  if (isPrivacyMode) return '•••••';
  return new Intl.NumberFormat('nl-NL', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(value);
};

const parseNumber = (value: string) => {
  const cleanValue = value.replace(/\./g, '').replace(',', '.');
  const val = parseFloat(cleanValue);
  return isNaN(val) ? 0 : val;
};

const formatNumericInput = (input: HTMLInputElement, onUpdate: (val: number) => void) => {
  input.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    const originalValue = target.value;
    if (originalValue === '') {
      onUpdate(0);
      return;
    }

    // Capture cursor position and digit count before it
    const cursorPosition = target.selectionStart || 0;
    const valueBeforeCursor = originalValue.substring(0, cursorPosition);
    const digitsBeforeCursor = valueBeforeCursor.replace(/\D/g, '').length;
    
    // Parse and format
    const val = parseNumber(originalValue);
    const formatted = formatNumber(val);
    target.value = formatted;

    // Reset cursor position based on digit count
    let newCursorPos = 0;
    let currentDigitCount = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        currentDigitCount++;
      }
      newCursorPos = i + 1;
      if (currentDigitCount >= digitsBeforeCursor) break;
    }
    
    // If we just typed a non-digit at the end (like a comma that was swallowed or something), 
    // or if the value is empty, this logic holds.
    target.setSelectionRange(newCursorPos, newCursorPos);
    onUpdate(val);
  });
};

const animateValue = (id: string, start: number, end: number, duration: number, formatter: (v: number) => string) => {
  const obj = document.getElementById(id);
  if (!obj) return;
  
  if (isPrivacyMode) {
    obj.innerHTML = formatter(end);
    return;
  }
  
  let startTimestamp: number | null = null;
  const step = (timestamp: number) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const current = progress * (end - start) + start;
    obj.innerHTML = formatter(current);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}-${month}-${year}`;
};

const STORAGE_KEY = 'asset_planner_state';
const OBFUSCATION_KEY = 'asset_planner_v1_obfuscate';

function encrypt(data: string, key: string): string {
  return CryptoJS.AES.encrypt(data, key).toString();
}

function decrypt(data: string, key: string): string {
  if (!data || !key) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(data, key);
    if (!bytes) return '';
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (e) {
    return '';
  }
}

function saveState() {
  if (isEncrypted) return; // Never save while the app is locked to prevent data corruption
  
  const dateInput = document.getElementById('current-date') as HTMLInputElement;
  const state = {
    assets,
    debts,
    investmentAmount,
    targetNetWorth,
    date: dateInput ? dateInput.value : '',
    history,
    isDarkMode,
    isPrivacyMode,
    monthlyExpenses,
    freedomCustomNetWorth,
    isPlannerMode,
    pieChartMode
  };
  
  const json = JSON.stringify(state);
  const isLocked = !!masterPassword;
  const key = isLocked ? masterPassword : OBFUSCATION_KEY;
  const payload = encrypt(json, key);
  
  const envelope = {
    v: 2,
    locked: isLocked,
    data: payload
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  
  // Cleanup old unencrypted keys if they exist
  const oldKeys = ['current_assets', 'current_debts', 'balance_history', 'theme'];
  oldKeys.forEach(k => localStorage.removeItem(k));
}

function loadExampleData(silent = false) {
  const sampleAssets: Asset[] = [
    { id: 'ex1', name: 'Eigen Woning', value: 250000, target: 50, color: '#059669', category: 'Groei', isRealEstate: true },
    { id: 'ex2', name: 'Spaargeld', value: 50000, target: 20, color: '#10b981', category: 'Defensief', isRealEstate: false },
    { id: 'ex3', name: 'Beleggingen', value: 30000, target: 20, color: '#f97316', category: 'Groei', isRealEstate: false },
    { id: 'ex4', name: 'Overig', value: 20000, target: 10, color: '#0d9488', category: 'Defensief', isRealEstate: false }
  ];
  const sampleDebts: Debt[] = [
    { id: 'd1', name: 'Hypotheek', value: 180000, target: 90 },
    { id: 'd2', name: 'Studieschuld', value: 15000, target: 10 }
  ];
  assets = sampleAssets;
  debts = sampleDebts;
  freedomCustomNetWorth = 0;
  monthlyExpenses = 2500;
  
  // Update inputs manually to reflect reset values
  const monthlyExpensesInput = document.getElementById('monthly-expenses-input') as HTMLInputElement;
  if (monthlyExpensesInput) monthlyExpensesInput.value = '2500';
  
  const freedomCustomNetworthInput = document.getElementById('freedom-custom-networth') as HTMLInputElement;
  if (freedomCustomNetworthInput) freedomCustomNetworthInput.value = '';

  // Handle onboarding completion if called from onboarding/intro
  localStorage.setItem('onboarding_completed', 'true');
  const onboardingModal = document.getElementById('onboarding-modal');
  if (onboardingModal) onboardingModal.classList.add('hidden');
  const introScreen = document.getElementById('intro-screen');
  if (introScreen) introScreen.classList.add('hidden');
  
  const banner = document.getElementById('example-data-banner');
  if (banner) banner.classList.remove('hidden');

  updateUI();
  
  if (window.innerWidth < 1024) {
    openBeheerSheet();
  }
  
  if (!silent) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-6 py-3 rounded-xl shadow-2xl z-[200] animate-in fade-in slide-in-from-bottom-4';
    toast.innerHTML = '<div class="flex items-center gap-2"><i data-lucide="check-circle" class="w-4 h-4 text-green-400"></i><span class="font-bold text-sm">Voorbeeldgegevens geladen!</span></div>';
    document.body.appendChild(toast);
    createIcons({ icons: usedIcons });
    setTimeout(() => {
      toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-4');
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }
}

function loadState() {
  // Migration: Check if old keys exist and try to import them if no new state exists
  const hasNewState = localStorage.getItem(STORAGE_KEY);
  if (!hasNewState) {
    const oldAssets = localStorage.getItem('current_assets');
    const oldDebts = localStorage.getItem('current_debts');
    
    if (oldAssets || oldDebts) {
      try {
        if (oldAssets) {
          const parsed = JSON.parse(oldAssets);
          assets = parsed.map((a: any) => ({
            id: a.id || Math.random().toString(36).substring(2, 9),
            name: a.description || a.name || 'Asset',
            value: a.amount || a.value || 0,
            target: 0,
            color: '#10b981',
            category: 'Groei'
          }));
        }
        
        if (oldDebts) {
          const parsed = JSON.parse(oldDebts);
          debts = parsed.map((d: any) => ({
            id: d.id || Math.random().toString(36).substring(2, 9),
            name: d.description || d.name || 'Schuld',
            value: d.amount || d.value || 0,
            target: 0
          }));
        }
        
        saveState();
      } catch (e) {
        console.error('Migration failed', e);
      }
    }
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    if (saved.trim().startsWith('{')) {
      const envelope = JSON.parse(saved);
      
      // New envelope format
      if (envelope.v === 2) {
        if (envelope.locked) {
          if (!masterPassword) {
            isEncrypted = true;
            showLockScreen();
            return;
          }
          const decrypted = decrypt(envelope.data, masterPassword);
          if (decrypted) {
            applyState(JSON.parse(decrypted));
          } else {
            isEncrypted = true;
            showLockScreen();
          }
        } else {
          const decrypted = decrypt(envelope.data, OBFUSCATION_KEY);
          if (decrypted) {
            applyState(JSON.parse(decrypted));
          }
        }
        return;
      }
      
      // Legacy plain JSON format
      applyState(envelope);
    } else {
      // Legacy encrypted format (raw string)
      isEncrypted = true;
      showLockScreen();
    }
  } catch (e) {
    console.error('Failed to load state', e);
    // If it fails, it might be an old encrypted format that JSON.parse failed on
    if (!saved.trim().startsWith('{')) {
      isEncrypted = true;
      showLockScreen();
    }
  }
}

function applyState(state: any) {
  if (state.assets) assets = state.assets;
  if (state.debts) debts = state.debts;
  if (state.investmentAmount !== undefined) investmentAmount = state.investmentAmount;
  if (state.targetNetWorth !== undefined) targetNetWorth = state.targetNetWorth;
  if (state.history) history = state.history;
  if (state.isDarkMode !== undefined) {
    isDarkMode = state.isDarkMode;
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.body.classList.toggle('dark', isDarkMode);
  }
  if (state.isPrivacyMode !== undefined) {
    isPrivacyMode = state.isPrivacyMode;
  }
  if (state.monthlyExpenses !== undefined) {
    monthlyExpenses = state.monthlyExpenses;
  }
  if (state.freedomCustomNetWorth !== undefined) {
    freedomCustomNetWorth = state.freedomCustomNetWorth;
  }
  if (state.isPlannerMode !== undefined) {
    isPlannerMode = state.isPlannerMode;
  }
  if (state.pieChartMode !== undefined) {
    pieChartMode = state.pieChartMode;
  }
  if (state.date) {
    const dateInput = document.getElementById('current-date') as HTMLInputElement;
    if (dateInput) dateInput.value = state.date;
  }
  updateUI();
}

function showLockScreen() {
  const lockScreen = document.getElementById('lock-screen');
  if (lockScreen) {
    lockScreen.classList.remove('hidden');
    const input = document.getElementById('unlock-password-input') as HTMLInputElement;
    if (input) {
      try {
        input.focus();
      } catch (e) {
        // Ignore focus errors in cross-origin iframes
      }
    }
  }
}

function hideLockScreen() {
  const lockScreen = document.getElementById('lock-screen');
  if (lockScreen) {
    lockScreen.classList.add('hidden');
  }
}

function addToHistory() {
  const dateInput = document.getElementById('current-date') as HTMLInputElement;
  const totalAssets = assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalDebts = debts.reduce((sum, debt) => sum + debt.value, 0);
  const netWorth = totalAssets - totalDebts;
  
  const newEntry: HistoryEntry = {
    date: dateInput.value || new Date().toISOString().split('T')[0],
    totalValue: netWorth,
    assets: JSON.parse(JSON.stringify(assets)),
    debts: JSON.parse(JSON.stringify(debts))
  };

  // Check if entry for this date already exists
  const existingIndex = history.findIndex(h => h.date === newEntry.date);
  if (existingIndex !== -1) {
    history[existingIndex] = newEntry;
  } else {
    history.push(newEntry);
  }

  // Sort by date
  history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  updateUI();
}

function deleteFromHistory(index: number) {
  history.splice(index, 1);
  updateUI();
}

function loadFromHistory(index: number) {
  const entry = history[index];
  assets = JSON.parse(JSON.stringify(entry.assets));
  if (entry.debts) debts = JSON.parse(JSON.stringify(entry.debts));
  else debts = [];
  const dateInput = document.getElementById('current-date') as HTMLInputElement;
  if (dateInput) dateInput.value = entry.date;
  updateUI();
}

function deleteAsset(id: string) {
  if (assets.length <= 1) return;
  assets = assets.filter(a => a.id !== id);
  updateUI();
}

function addAsset() {
  const addAssetModal = document.getElementById('add-asset-modal');
  const newAssetName = document.getElementById('new-asset-name') as HTMLInputElement;
  const newAssetCategory = document.getElementById('new-asset-category') as HTMLSelectElement;
  const newAssetTarget = document.getElementById('new-asset-target') as HTMLInputElement;

  if (addAssetModal && newAssetName && newAssetCategory && newAssetTarget) {
    newAssetName.value = '';
    newAssetCategory.value = 'Groei';
    newAssetTarget.value = '0';
    addAssetModal.classList.remove('hidden');
    newAssetName.focus();
  }
}

function saveNewAsset() {
  const addAssetModal = document.getElementById('add-asset-modal');
  const newAssetName = document.getElementById('new-asset-name') as HTMLInputElement;
  const newAssetCategory = document.getElementById('new-asset-category') as HTMLSelectElement;
  const newAssetTarget = document.getElementById('new-asset-target') as HTMLInputElement;
  const newAssetIsRealEstate = document.getElementById('new-asset-is-real-estate') as HTMLInputElement;

  if (!newAssetName || !newAssetCategory || !newAssetTarget) return;

  const name = newAssetName.value.trim() || 'Nieuwe Asset';
  const category = newAssetCategory.value as Asset['category'];
  const target = parseFloat(newAssetTarget.value) || 0;
  const isRealEstate = newAssetIsRealEstate?.checked || false;

  const id = Math.random().toString(36).substring(2, 9);
  const colors = ['#10b981', '#059669', '#0d9488', '#22c55e', '#eab308', '#94a3b8', '#f97316', '#ec4899'];
  
  const newAsset: Asset = {
    id,
    name,
    value: 0,
    target,
    color: colors[assets.length % colors.length],
    category,
    isRealEstate
  };

  assets.push(newAsset);
  if (addAssetModal) addAssetModal.classList.add('hidden');
  updateUI();
}

function resetToDefaults() {
  if (confirm('Weet je zeker dat je alle assets wilt herstellen naar de standaardwaarden? Je huidige invoer gaat verloren.')) {
    assets = JSON.parse(JSON.stringify(DEFAULT_ASSETS));
    updateUI();
  }
}

function initAverageDutchChart() {
  const ctx = document.getElementById('average-dutch-chart') as HTMLCanvasElement;
  if (!ctx) return;

  if (averageDutchChart) averageDutchChart.destroy();

  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#a1a1aa' : '#71717a';

  averageDutchChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Eigen Woning', 'Spaargeld', 'Beleggingen', 'Overig'],
      datasets: [{
        data: [58, 22, 12, 8],
        backgroundColor: ['#10b981', '#059669', '#f97316', '#0d9488'],
        borderWidth: 0,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      layout: {
        padding: 30
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => ` ${context.label}: ${context.raw}%`
          }
        }
      }
    }
  });
}

function updateGreeting() {
  const greetingText = document.getElementById('greeting-text');
  const greetingSubtext = document.getElementById('greeting-subtext');
  if (!greetingText || !greetingSubtext) return;

  const now = new Date();
  const hour = now.getHours();
  let greeting = '';
  let subtext = '';

  if (hour >= 5 && hour < 12) {
    greeting = 'Goedemorgen! ☀️';
    subtext = 'Klaar voor een nieuwe dag vol groei?';
  } else if (hour >= 12 && hour < 18) {
    greeting = 'Goedemiddag! ☕';
    subtext = 'Je vermogen werkt hard voor je.';
  } else if (hour >= 18 && hour < 24) {
    greeting = 'Goedenavond! 🌙';
    subtext = 'Even ontspannen en je doelen checken.';
  } else {
    greeting = 'Goedenacht! 💤';
    subtext = 'Droom groot, je vermogen groeit door.';
  }

  // Af en toe een willekeurige tip
  const quotes = [
    "Rijkdom is wat je niet ziet: de auto's die je niet koopt.",
    "Geduld is de beste vriend van je vermogen.",
    "Kleine beetjes maken een groot verschil op de lange termijn.",
    "Focus op je spaarpercentage voor maximale impact.",
    "Beleggen is het kopen van je toekomstige vrijheid."
  ];

  // Gebruik de subtext als we geen quote tonen
  if (Math.random() > 0.8) {
    subtext = quotes[Math.floor(Math.random() * quotes.length)];
  }

  greetingText.textContent = greeting;
  greetingSubtext.textContent = subtext;
}

function updateUI() {
  saveState();
  updateGreeting();
  
  const privacyToggles = document.querySelectorAll('.privacy-toggle-btn');
  privacyToggles.forEach(btn => {
    btn.innerHTML = isPrivacyMode ? '<i data-lucide="eye-off" class="w-5 h-5"></i>' : '<i data-lucide="eye" class="w-5 h-5"></i>';
  });

  const totalAssets = assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalDebts = debts.reduce((sum, debt) => sum + debt.value, 0);
  const netWorth = totalAssets - totalDebts;

  const freedomDebts = debts
    .filter(debt => !debt.name.toLowerCase().includes('hypotheek'))
    .reduce((sum, debt) => sum + debt.value, 0);

  const liquidValue = assets
    .filter(asset => !asset.isRealEstate)
    .reduce((sum, asset) => sum + asset.value, 0);

  const yieldValue = assets
    .filter(asset => {
      const name = asset.name.toLowerCase();
      // Exclude non-liquid or non-yield assets from 4% rule calculation
      if (asset.isRealEstate) return false;
      if (name.includes('spaar') || name.includes('bank') || name.includes('cash')) return false;
      if (name.includes('goud') || name.includes('zilver')) return false;
      if (name.includes('auto') || name.includes('ebike') || name.includes('fiets')) return false;
      
      // Include Groei, Speculatief, or explicitly identified yield assets like Bonds/ETFs
      return asset.category === 'Groei' || 
             asset.category === 'Speculatief' || 
             name.includes('obligatie') || 
             name.includes('bond') ||
             name.includes('etf') ||
             name.includes('aandeel') ||
             name.includes('crypto') ||
             name.includes('bitcoin');
    })
    .reduce((sum, asset) => sum + asset.value, 0);

  const totalTarget = assets.reduce((sum, asset) => sum + asset.target, 0);

  // Update Pie Chart Toggle Styles
  const viewBrutoBtn = document.getElementById('view-bruto-btn');
  const viewNettoBtn = document.getElementById('view-netto-btn');
  const pieTotalLabel = document.getElementById('pie-total-label');

  if (viewBrutoBtn && viewNettoBtn) {
    if (pieChartMode === 'bruto') {
      viewBrutoBtn.className = 'px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all bg-white shadow-sm text-emerald-600';
      viewNettoBtn.className = 'px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all text-white/80 hover:text-white';
      if (pieTotalLabel) pieTotalLabel.textContent = 'Bruto Vermogen';
    } else {
      viewNettoBtn.className = 'px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all bg-white shadow-sm text-emerald-600';
      viewBrutoBtn.className = 'px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all text-white/80 hover:text-white';
      if (pieTotalLabel) pieTotalLabel.textContent = 'Netto Vermogen';
    }
  }

  // Freedom Calculator Logic
  const freedomTimeEl = document.getElementById('freedom-time');
  const freedomPassiveEl = document.getElementById('freedom-passive');
  const monthlyExpensesInput = document.getElementById('monthly-expenses-input') as HTMLInputElement;
  const freedomCustomNetworthInput = document.getElementById('freedom-custom-networth') as HTMLInputElement;

  if (monthlyExpensesInput) {
    monthlyExpenses = parseFloat(monthlyExpensesInput.value) || 0;
  }

  if (freedomCustomNetworthInput && !freedomCustomNetworthInput.matches(':focus')) {
    freedomCustomNetworthInput.value = freedomCustomNetWorth > 0 ? formatNumber(freedomCustomNetWorth) : '';
  }

  if (freedomTimeEl && freedomPassiveEl) {
    const calcValue = freedomCustomNetWorth > 0 ? freedomCustomNetWorth : (liquidValue - freedomDebts);
    const yieldValueForPassive = freedomCustomNetWorth > 0 ? freedomCustomNetWorth : (yieldValue - freedomDebts);
    
    const months = monthlyExpenses > 0 ? calcValue / monthlyExpenses : 0;
    const passiveMonthly = (Math.max(0, yieldValueForPassive) * 0.04) / 12;

    if (isPrivacyMode) {
      freedomTimeEl.textContent = '•• mnd';
      freedomPassiveEl.textContent = '€ ••••';
    } else {
      if (months >= 12) {
        freedomTimeEl.textContent = `${(months / 12).toFixed(1)} jr`;
      } else {
        freedomTimeEl.textContent = `${Math.max(0, Math.floor(months))} mnd`;
      }
      freedomPassiveEl.textContent = formatCurrency(Math.max(0, passiveMonthly));
    }

    // Milestones
    const updateMilestone = (id: number, condition: boolean) => {
      const icon = document.getElementById(`milestone-icon-${id}`);
      const check = document.getElementById(`milestone-check-${id}`);
      if (icon && check) {
        if (condition) {
          icon.classList.remove('bg-zinc-100', 'dark:bg-zinc-800', 'text-zinc-400');
          icon.classList.add('bg-emerald-100', 'dark:bg-emerald-900/40', 'text-emerald-600', 'dark:text-emerald-400');
          check.classList.remove('text-zinc-200', 'dark:text-zinc-800');
          check.classList.add('text-emerald-500');
        } else {
          icon.classList.add('bg-zinc-100', 'dark:bg-zinc-800', 'text-zinc-400');
          icon.classList.remove('bg-emerald-100', 'dark:bg-emerald-900/40', 'text-emerald-600', 'dark:text-emerald-400');
          check.classList.add('text-zinc-200', 'dark:text-zinc-800');
          check.classList.remove('text-emerald-500');
        }
      }
    };

    updateMilestone(1, months >= 1);
    updateMilestone(2, months >= 12);
    updateMilestone(3, months >= 60); // 5 years
  }

  const categories = { Groei: 0, Defensief: 0, Speculatief: 0 };
  assets.forEach(a => categories[a.category] += a.value);

  // Animate total values
  const currentDisplayValue = pieChartMode === 'bruto' ? totalAssets : netWorth;
  animateValue('total-value', prevNetWorth, netWorth, 500, formatCurrency);
  animateValue('pie-total-value', prevPieTotal, currentDisplayValue, 500, formatCurrency);
  
  prevNetWorth = netWorth;
  prevPieTotal = currentDisplayValue;
  
  const specPercent = totalAssets > 0 ? (categories.Speculatief / totalAssets) * 100 : 0;
  const growthPercent = totalAssets > 0 ? (categories.Groei / totalAssets) * 100 : 0;
  const defPercent = totalAssets > 0 ? (categories.Defensief / totalAssets) * 100 : 0;
  
  let status = "Gebalanceerd";
  let statusColors = {
    color: isDarkMode ? '#4ade80' : '#15803d',
    bg: isDarkMode ? 'rgba(22, 101, 52, 0.3)' : '#f0fdf4'
  };
  
  if (specPercent > 15) {
    status = "Speculatief";
    statusColors = {
      color: isDarkMode ? '#fb923c' : '#c2410c',
      bg: isDarkMode ? 'rgba(154, 52, 18, 0.3)' : '#fff7ed'
    };
  } else if (growthPercent > 60) {
    status = "Groeigericht";
    statusColors = {
      color: isDarkMode ? '#10b981' : '#059669',
      bg: isDarkMode ? 'rgba(5, 150, 105, 0.3)' : '#ecfdf5'
    };
  } else if (defPercent > 60) {
    status = "Defensief";
    statusColors = {
      color: isDarkMode ? '#4ade80' : '#15803d',
      bg: isDarkMode ? 'rgba(22, 101, 52, 0.3)' : '#f0fdf4'
    };
  }

  // Store status for chart plugin
  (window as any).chartStatus = { text: status, ...statusColors };
  (window as any).chartTotalValue = formatCurrency(currentDisplayValue);

  // Pie Chart Empty State Logic
  const pieEmptyState = document.getElementById('pie-empty-state');
  const pieSummary = document.getElementById('pie-summary-container');
  const pieLegend = document.getElementById('pie-legend');
  
  if (pieEmptyState) {
    if (totalAssets === 0) {
      pieEmptyState.classList.remove('hidden');
      pieSummary?.classList.add('hidden');
      pieLegend?.classList.add('hidden');
      (window as any).chartCenterTextDisplay = false;
    } else {
      pieEmptyState.classList.add('hidden');
      pieSummary?.classList.remove('hidden');
      pieLegend?.classList.remove('hidden');
      (window as any).chartCenterTextDisplay = true;
    }
  }

  prevNetWorth = netWorth;
  prevPieTotal = currentDisplayValue;
  prevTotalAssets = totalAssets;

  // Target Net Worth Logic
  const targetNetWorthInput = document.getElementById('target-net-worth-input') as HTMLInputElement;
  const targetProgressBar = document.getElementById('target-progress-bar');
  const targetProgressPercent = document.getElementById('target-progress-percent');
  const targetRemainingText = document.getElementById('target-remaining-text');
  const targetPrompt = document.getElementById('target-prompt');

  if (targetNetWorthInput && !targetNetWorthInput.matches(':focus')) {
    targetNetWorthInput.value = targetNetWorth > 0 ? formatNumber(targetNetWorth) : '';
  }

  if (targetPrompt) {
    if (targetNetWorth === 0 && (!targetNetWorthInput || !targetNetWorthInput.matches(':focus'))) {
      targetPrompt.style.opacity = '1';
      targetPrompt.style.transform = 'translateY(-50%) scale(1)';
    } else {
      targetPrompt.style.opacity = '0';
      targetPrompt.style.transform = 'translateY(-50%) scale(0.9)';
    }
  }

  if (targetProgressBar && targetProgressPercent && targetRemainingText) {
    const progress = targetNetWorth > 0 ? (netWorth / targetNetWorth) * 100 : 0;
    const clampedProgress = Math.min(100, progress);
    const remaining = Math.max(0, targetNetWorth - netWorth);

    targetProgressBar.style.width = `${clampedProgress}%`;
    targetProgressPercent.textContent = `${progress.toFixed(1)}%`;
    targetRemainingText.textContent = targetNetWorth === 0
      ? 'Stel een doel in om je voortgang te zien.'
      : (remaining > 0 ? `Nog ${formatCurrency(remaining)} te gaan` : 'Doel bereikt! 🎉');
    
    if (progress >= 100) {
      targetProgressBar.classList.remove('bg-emerald-600');
      targetProgressBar.classList.add('bg-green-500');
    } else {
      targetProgressBar.classList.add('bg-emerald-600');
      targetProgressBar.classList.remove('bg-green-500');
    }
  }

  const targetWarning = document.getElementById('target-warning');
  if (targetWarning) {
    if (isPlannerMode && totalTarget !== 100) {
      targetWarning.textContent = `Doel: ${totalTarget}% (moet 100% zijn)`;
      targetWarning.className = `hidden sm:inline-block text-xs font-medium px-2 py-1 rounded-full ${totalTarget > 100 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`;
    } else {
      targetWarning.className = 'hidden';
    }
  }

  const simulatorSection = document.getElementById('simulator-section');
  const rebalanceSection = document.getElementById('rebalance-section');
  const targetColumnHeader = document.getElementById('target-column-header');
  const debtTargetColumnHeader = document.getElementById('debt-target-column-header');
  const comparisonSection = document.getElementById('comparison-section');

  if (simulatorSection) simulatorSection.style.display = isPlannerMode ? '' : 'none';
  if (rebalanceSection) rebalanceSection.style.display = isPlannerMode ? '' : 'none';
  if (comparisonSection) comparisonSection.style.display = isPlannerMode ? '' : 'none';
  
  // Keep the headers visible to avoid column misalignment, but update text
  if (targetColumnHeader) {
    targetColumnHeader.textContent = isPlannerMode ? 'Doel (%)' : 'Categorie';
  }
  if (debtTargetColumnHeader) {
    // Hidden because debt doesn't have a category in the same slot
    debtTargetColumnHeader.style.opacity = isPlannerMode ? '1' : '0';
  }
  
  renderAssets();
  renderDebts();
  renderHistory();
  renderCategoryCards();
  renderRebalancePlan();
  renderRecommendations();
  updateCharts();
  updateTreemap();
  updateSummaryDetails();
  createIcons({ icons: usedIcons });
}

function updateSummaryDetails() {
  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalDebts = debts.reduce((sum, d) => sum + d.value, 0);
  const netWorth = totalAssets - totalDebts;

  const assetsEl = document.getElementById('summary-assets-total');
  const debtsEl = document.getElementById('summary-debts-total');
  const descEl = document.getElementById('summary-text-description');
  const statusIcon = document.getElementById('summary-status-icon');
  const canvas = document.getElementById('summary-pie-chart') as HTMLCanvasElement;

  if (assetsEl) assetsEl.textContent = isPrivacyMode ? '€ •••••' : formatCurrency(totalAssets);
  if (debtsEl) debtsEl.textContent = isPrivacyMode ? '€ •••••' : formatCurrency(totalDebts);

  // Dynamic description and icon
  if (descEl) {
    const topAsset = [...assets].sort((a, b) => b.value - a.value)[0];
    const debtRatio = totalAssets > 0 ? (totalDebts / totalAssets) * 100 : 0;
    let statusText = "Je vermogen is vandaag stabiel. ";
    let iconName = "smile";

    if (totalAssets === 0 && totalDebts === 0) {
      statusText = "Tijd voor een frisse start! ";
      iconName = "sparkles";
    } else if (debtRatio > 30) {
      statusText = "Let op je schulden, deze vormen een aanzienlijk deel van je portfolio. ";
      iconName = "frown";
    } else if (netWorth > 100000) {
      statusText = "Lekker bezig! Je vermogen groeit gestaag. ";
      iconName = "thumbs-up";
    }

    if (totalAssets === 0 && totalDebts === 0) {
      descEl.innerHTML = `${statusText}Begin met het toevoegen van je eerste assets om je financiële reis te visualiseren.`;
    } else {
      const topAssetName = isPrivacyMode ? '•••••' : (topAsset?.name || 'onbekend');
      descEl.innerHTML = `${statusText}Je grootste asset is <span class="text-emerald-600 font-bold">${topAssetName}</span> en je bent op weg naar je doel!`;
    }
    
    if (statusIcon) {
      statusIcon.setAttribute('data-lucide', iconName);
      createIcons({ icons: usedIcons });
    }
  }

  // Summary Pie Chart
  if (canvas) {
    if (summaryPieChart) summaryPieChart.destroy();
    summaryPieChart = new Chart(canvas.getContext('2d')!, {
      type: 'doughnut',
      data: {
        labels: ['Bezittingen', 'Schulden'],
        datasets: [{
          data: [totalAssets, totalDebts],
          backgroundColor: ['#10b981', '#ef4444'],
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1,
        plugins: {
          legend: { display: false },
          tooltip: { 
            enabled: !isPrivacyMode,
            callbacks: {
              label: (context: any) => {
                const value = context.raw as number;
                return ` ${context.label}: ${formatCurrency(value)}`;
              }
            }
          }
        },
        layout: {
          padding: 20
        },
        cutout: '70%'
      }
    });
  }
}

function renderDebts() {
  const tbody = document.getElementById('debt-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (debts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="px-6 py-8 text-center text-zinc-400 italic text-sm">
          Geen schulden toegevoegd
        </td>
      </tr>
    `;
    return;
  }

  debts.forEach(debt => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group';
    tr.innerHTML = `
      <td class="px-3 sm:px-6 py-4">
        <input type="text" value="${isPrivacyMode ? '•••••' : debt.name}" class="debt-name-input bg-transparent border-none p-0 focus:ring-0 font-medium text-zinc-900 dark:text-white w-full text-base" data-id="${debt.id}" />
      </td>
      <td class="px-3 sm:px-6 py-4">
        <div class="flex items-center gap-1">
          <span class="text-zinc-400 text-sm">€</span>
          <input type="text" value="${formatNumber(debt.value)}" class="debt-value-input bg-transparent border-none p-0 focus:ring-0 font-mono font-bold text-red-600 dark:text-red-400 w-full text-base" data-id="${debt.id}" />
        </div>
      </td>
      <td class="px-3 sm:px-6 py-4 text-right">
        <div class="${isPlannerMode ? 'flex' : 'hidden'} items-center justify-end gap-1">
          <input
            type="number"
            value="${debt.target || 0}"
            data-id="${debt.id}"
            class="debt-target-input w-10 bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-red-500 focus:ring-0 transition-all outline-none py-1 font-mono text-right text-sm dark:text-white dark:hover:border-zinc-700"
          />
          <span class="text-zinc-400 font-mono text-xs">%</span>
        </div>
      </td>
      <td class="px-3 sm:px-6 py-4 text-right">
        <button class="delete-debt-btn p-2 text-zinc-300 hover:text-red-500 transition-colors" data-id="${debt.id}">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Add event listeners for inputs
  tbody.querySelectorAll('.debt-name-input').forEach(input => {
    input.addEventListener('focus', (e) => {
      const target = e.target as HTMLInputElement;
      const id = target.dataset.id;
      const debt = debts.find(d => d.id === id);
      if (debt) target.value = debt.name;
    });
    input.addEventListener('change', (e) => {
      const id = (e.target as HTMLInputElement).dataset.id;
      const name = (e.target as HTMLInputElement).value;
      debts = debts.map(d => d.id === id ? { ...d, name } : d);
      updateUI();
    });
  });

  tbody.querySelectorAll('.debt-value-input').forEach(input => {
    input.addEventListener('focus', (e) => {
      const target = e.target as HTMLInputElement;
      const id = target.dataset.id;
      const debt = debts.find(d => d.id === id);
      if (debt) target.value = debt.value.toString();
    });
    formatNumericInput(input as HTMLInputElement, (val) => {
      const id = (input as HTMLInputElement).dataset.id;
      debts = debts.map(d => d.id === id ? { ...d, value: val } : d);
      if ((window as any).debtUpdateTimeout) clearTimeout((window as any).debtUpdateTimeout);
      (window as any).debtUpdateTimeout = setTimeout(() => updateUI(), 500);
    });
  });

  tbody.querySelectorAll('.debt-target-input').forEach(input => {
    input.addEventListener('blur', (e) => {
      const target = e.target as HTMLInputElement;
      const id = target.dataset.id;
      const targetVal = parseFloat(target.value) || 0;
      debts = debts.map(d => d.id === id ? { ...d, target: targetVal } : d);
      updateUI();
    });
    input.addEventListener('keypress', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') (e.target as HTMLInputElement).blur();
    });
  });

  tbody.querySelectorAll('.delete-debt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.id;
      debts = debts.filter(d => d.id !== id);
      updateUI();
    });
  });
}

function renderCategoryCards() {
  const categoryCards = document.getElementById('category-cards');
  if (!categoryCards) return;

  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const categories = { Groei: 0, Defensief: 0, Speculatief: 0 };
  assets.forEach(a => categories[a.category] += a.value);

  categoryCards.innerHTML = Object.entries(categories).map(([name, value]) => {
    const percent = totalAssets > 0 ? (value / totalAssets) * 100 : 0;
    const color = name === 'Groei' ? '#10b981' : name === 'Defensief' ? '#059669' : '#f97316';
    const idPrefix = name.toLowerCase();
    return `
      <div class="bg-white p-6 rounded-xl border border-zinc-200 flex items-center justify-between dark:bg-zinc-900 dark:border-zinc-800">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1 dark:text-zinc-400">${name}</p>
          <p id="cat-percent-${idPrefix}" class="text-2xl font-bold dark:text-white">${formatPercent(percent)}</p>
          <p id="cat-value-${idPrefix}" class="text-sm text-zinc-400 dark:text-zinc-500">${formatCurrency(value)}</p>
        </div>
        <div class="w-12 h-12 rounded-full flex items-center justify-center" style="background-color: ${color}15">
          <div class="w-6 h-6 rounded-full" style="background-color: ${color}"></div>
        </div>
      </div>
    `;
  }).join('');

  // Animate category values
  Object.entries(categories).forEach(([name, value]) => {
    const idPrefix = name.toLowerCase();
    const prevValue = (prevCategoryValues as any)[name] || 0;
    const percent = totalAssets > 0 ? (value / totalAssets) * 100 : 0;
    const prevPercent = prevTotalAssets > 0 ? (prevValue / prevTotalAssets) * 100 : 0;
    
    animateValue(`cat-percent-${idPrefix}`, prevPercent, percent, 500, formatPercent);
    animateValue(`cat-value-${idPrefix}`, prevValue, value, 500, formatCurrency);
  });
  prevCategoryValues = { ...categories };
}

function renderAssets() {
  const tableBody = document.getElementById('asset-table-body');
  if (!tableBody) return;

  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);

  tableBody.innerHTML = assets.map(asset => {
    const currentPercent = totalAssets > 0 ? (asset.value / totalAssets) * 100 : 0;
    return `
      <tr class="hover:bg-zinc-50/50 transition-colors group dark:hover:bg-zinc-800/50">
        <td class="px-3 sm:px-6 py-4 min-w-[120px] sm:min-w-[180px]">
          <div class="flex flex-col gap-1">
            <input
              type="text"
              value="${isPrivacyMode ? '•••••' : asset.name}"
              data-id="${asset.id}"
              data-type="name"
              class="asset-input w-full bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-emerald-500 focus:ring-0 transition-all outline-none py-0 sm:py-0.5 text-sm sm:text-base font-bold text-zinc-800 dark:text-zinc-200 dark:hover:border-zinc-700"
            />
            <div class="flex items-center gap-2">
              <select
                data-id="${asset.id}"
                data-type="category"
                class="asset-input bg-transparent border-none text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-600/70 focus:ring-0 cursor-pointer hover:text-emerald-600 dark:text-emerald-400/70 dark:hover:text-emerald-400 p-0"
              >
                <option value="Groei" ${asset.category === 'Groei' ? 'selected' : ''}>Groei</option>
                <option value="Defensief" ${asset.category === 'Defensief' ? 'selected' : ''}>Defensief</option>
                <option value="Speculatief" ${asset.category === 'Speculatief' ? 'selected' : ''}>Speculatief</option>
              </select>
              ${asset.isRealEstate ? '<span class="text-xs font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded dark:bg-emerald-900/40 dark:text-emerald-300">Vastgoed</span>' : ''}
            </div>
          </div>
        </td>
        <td class="px-3 sm:px-6 py-4 min-w-[120px] sm:min-w-[200px]">
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between gap-1 sm:gap-2">
              <div class="flex items-center gap-1">
                <span class="text-zinc-400 font-mono text-base">€</span>
                <input
                  type="text"
                  value="${formatNumber(asset.value)}"
                  data-id="${asset.id}"
                  data-type="value"
                  class="asset-input asset-value-input w-24 sm:w-28 bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-emerald-500 focus:ring-0 transition-all outline-none py-1 font-mono text-base dark:text-white dark:hover:border-zinc-700"
                />
              </div>
              <span class="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">${formatPercent(currentPercent)}</span>
            </div>
            <!-- Progress Bar -->
            <div class="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div 
                class="h-full rounded-full transition-all duration-500" 
                style="width: ${Math.min(100, currentPercent)}%; background-color: ${asset.color}"
              ></div>
            </div>
          </div>
        </td>
        <td class="px-3 sm:px-6 py-4 text-right min-w-[80px] sm:min-w-[100px]">
          <div class="flex items-center justify-end gap-1">
            <div class="${isPlannerMode ? 'flex' : 'hidden'} items-center gap-1">
              <input
                type="number"
                value="${asset.target}"
                data-id="${asset.id}"
                data-type="target"
                class="asset-input w-8 sm:w-10 bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-emerald-500 focus:ring-0 transition-all outline-none py-1 font-mono text-right text-sm dark:text-white dark:hover:border-zinc-700"
              />
              <span class="text-zinc-400 font-mono text-xs sm:text-sm">%</span>
            </div>
            <span class="${!isPlannerMode ? 'block' : 'hidden'} text-xs font-mono text-zinc-400">${formatPercent(asset.target)}</span>
          </div>
        </td>
        <td class="px-3 sm:px-6 py-4 text-right">
          <button data-id="${asset.id}" class="delete-asset-btn p-2 text-zinc-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title="Verwijderen">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Add event listeners for inputs
  tableBody.querySelectorAll('.asset-input').forEach(input => {
    if ((input as HTMLInputElement).dataset.type === 'value') {
      formatNumericInput(input as HTMLInputElement, (val) => {
        const id = (input as HTMLInputElement).dataset.id;
        assets = assets.map(a => a.id === id ? { ...a, value: val } : a);
        if ((window as any).assetUpdateTimeout) clearTimeout((window as any).assetUpdateTimeout);
        (window as any).assetUpdateTimeout = setTimeout(() => updateUI(), 500);
      });
    }

    input.addEventListener('focus', (e) => {
      const target = e.target as HTMLInputElement;
      const id = target.dataset.id;
      const type = target.dataset.type;
      const asset = assets.find(a => a.id === id);
      if (!asset) return;

      if (type === 'value') {
        target.value = asset.value.toString();
      } else if (type === 'name') {
        target.value = asset.name;
      }
    });

    input.addEventListener('blur', (e) => {
      const target = e.target as HTMLInputElement;
      const id = target.dataset.id;
      const type = target.dataset.type;
      
      if (type === 'value') {
        const value = parseNumber(target.value);
        assets = assets.map(a => a.id === id ? { ...a, value } : a);
      } else if (type === 'name') {
        assets = assets.map(a => a.id === id ? { ...a, name: target.value } : a);
      } else if (type === 'target') {
        assets = assets.map(a => a.id === id ? { ...a, target: parseFloat(target.value) || 0 } : a);
      }
      updateUI();
    });

    input.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      if (target.dataset.type === 'category') {
        const id = target.dataset.id;
        assets = assets.map(a => a.id === id ? { ...a, category: target.value as Asset['category'] } : a);
        updateUI();
      }
    });

    input.addEventListener('keypress', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') (e.target as HTMLInputElement).blur();
    });
  });

  tableBody.querySelectorAll('.delete-asset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.id;
      deleteAsset(id!);
    });
  });
}

function renderRebalancePlan() {
  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const rebalanceList = document.getElementById('rebalance-list');
  if (!rebalanceList) return;

  rebalanceList.innerHTML = assets.map(asset => {
    const currentPercent = totalAssets > 0 ? (asset.value / totalAssets) * 100 : 0;
    const deviation = currentPercent - asset.target;
    const targetValue = (asset.target / 100) * totalAssets;
    const rebalanceAmount = targetValue - asset.value;
    
    const isOver = deviation > 1;
    const isUnder = deviation < -1;
    const statusClass = isOver ? "bg-red-50/50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30" : isUnder ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/30" : "bg-zinc-50/50 border-zinc-100 dark:bg-zinc-800/50 dark:border-zinc-800";
    const icon = isOver ? "arrow-up-right" : isUnder ? "arrow-down-right" : "minus";
    const iconColor = isOver ? "text-red-500" : isUnder ? "text-emerald-500" : "text-zinc-400";

    return `
      <div class="p-4 rounded-xl border flex flex-col gap-1 ${statusClass}">
        <div class="flex justify-between items-start">
          <span class="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">${asset.name}</span>
          <i data-lucide="${icon}" class="w-4 h-4 ${iconColor}"></i>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-lg font-bold dark:text-white">${rebalanceAmount > 0 ? '+' : ''}${formatCurrency(rebalanceAmount)}</span>
          <span class="text-xs font-medium ${deviation > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}">
            (${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}%)
          </span>
        </div>
        <p class="text-xs text-zinc-500 mt-1 dark:text-zinc-400">
          ${rebalanceAmount > 0 ? `Koop ${formatCurrency(rebalanceAmount)} om doel te bereiken.` : rebalanceAmount < 0 ? `Verkoop ${formatCurrency(Math.abs(rebalanceAmount))} om doel te bereiken.` : "Asset is in balans."}
        </p>
      </div>
    `;
  }).join('');
}

function renderRecommendations() {
  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const recommendationsList = document.getElementById('recommendations-list');
  const recommendationsContainer = document.getElementById('investment-recommendations');
  
  if (recommendationsList && recommendationsContainer) {
    if (investmentAmount > 0) {
      const newTotal = totalAssets + investmentAmount;
      const distribution = assets.map(asset => {
        const idealValue = (asset.target / 100) * newTotal;
        const needed = idealValue - asset.value;
        return { ...asset, needed: Math.max(0, needed) };
      });
      const totalNeeded = distribution.reduce((sum, d) => sum + d.needed, 0);
      
      const smartInvestment = distribution.map(d => ({
        name: d.name,
        amount: totalNeeded > 0 ? (d.needed / totalNeeded) * investmentAmount : 0,
        color: d.color
      })).filter(d => d.amount > 0.01);

      if (smartInvestment.length > 0) {
        recommendationsContainer.classList.remove('hidden');
        recommendationsList.innerHTML = smartInvestment.map(item => `
          <div class="bg-white/10 backdrop-blur-md rounded-xl p-3 flex items-center justify-between border border-white/10">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full" style="background-color: ${item.color}"></div>
              <span class="text-sm font-medium">${isPrivacyMode ? '•••••' : item.name}</span>
            </div>
            <span class="font-bold">${formatCurrency(item.amount)}</span>
          </div>
        `).join('');
      } else {
        recommendationsContainer.classList.add('hidden');
      }
    } else {
      recommendationsContainer.classList.add('hidden');
    }
  }
}

function renderHistory() {
  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalDebts = debts.reduce((sum, d) => sum + d.value, 0);
  const netWorth = totalAssets - totalDebts;
  const currentDisplayValue = pieChartMode === 'bruto' ? totalAssets : netWorth;

  const dateInput = document.getElementById('current-date') as HTMLInputElement;
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  const pieTotalValue = document.getElementById('pie-total-value');
  if (pieTotalValue) {
    pieTotalValue.textContent = formatCurrency(currentDisplayValue);
  }

  const pieLegend = document.getElementById('pie-legend');
  if (pieLegend) {
    if (pieChartMode === 'bruto') {
      pieLegend.innerHTML = assets.map(asset => {
        const currentPercent = totalAssets > 0 ? (asset.value / totalAssets) * 100 : 0;
        const displayName = isPrivacyMode ? '•••••' : asset.name;
        return `
          <div class="flex items-center text-sm sm:text-base group">
            <div class="w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0 mr-2 sm:mr-3 transition-transform group-hover:scale-125" style="background-color: ${asset.color}"></div>
            <span class="text-zinc-600 flex-1 truncate dark:text-zinc-400" title="${displayName}">${displayName}</span>
            <span class="font-mono font-bold text-zinc-900 ml-2 dark:text-white text-sm sm:text-base">${formatPercent(currentPercent)}</span>
          </div>
        `;
      }).join('');
    } else {
      const assetPercent = (totalAssets + totalDebts) > 0 ? (totalAssets / (totalAssets + totalDebts)) * 100 : 0;
      const debtPercent = (totalAssets + totalDebts) > 0 ? (totalDebts / (totalAssets + totalDebts)) * 100 : 0;
      pieLegend.innerHTML = `
        <div class="flex items-center text-sm sm:text-base group">
          <div class="w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0 mr-2 sm:mr-3 transition-transform group-hover:scale-125" style="background-color: #10b981"></div>
          <span class="text-zinc-600 flex-1 truncate dark:text-zinc-400">Bezittingen</span>
          <span class="font-mono font-bold text-zinc-900 ml-2 dark:text-white text-sm sm:text-base">${formatPercent(assetPercent)}</span>
        </div>
        <div class="flex items-center text-sm sm:text-base group">
          <div class="w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0 mr-2 sm:mr-3 transition-transform group-hover:scale-125" style="background-color: #ef4444"></div>
          <span class="text-zinc-600 flex-1 truncate dark:text-zinc-400">Schulden</span>
          <span class="font-mono font-bold text-zinc-900 ml-2 dark:text-white text-sm sm:text-base">${formatPercent(debtPercent)}</span>
        </div>
      `;
    }
  }

  const historyTableBody = document.getElementById('history-table-body');
  if (historyTableBody) {
    historyTableBody.innerHTML = history.slice().reverse().map((entry, idx) => {
      const realIdx = history.length - 1 - idx;
      return `
        <tr class="hover:bg-zinc-50/50 transition-colors group dark:hover:bg-zinc-800/50">
          <td class="px-6 py-4 text-sm font-medium text-zinc-700 whitespace-nowrap dark:text-zinc-300">${formatDate(entry.date)}</td>
          <td class="px-6 py-4 text-sm font-mono dark:text-zinc-400">${formatCurrency(entry.totalValue)}</td>
          <td class="px-6 py-4 text-right space-x-2">
            <button data-idx="${realIdx}" class="load-history-btn text-emerald-600 hover:text-emerald-800 p-1 transition-colors dark:text-emerald-400 dark:hover:text-emerald-300" title="Laden">
              <i data-lucide="upload" class="w-4 h-4"></i>
            </button>
            <button data-idx="${realIdx}" class="delete-history-btn text-red-600 hover:text-red-800 p-1 transition-colors dark:text-red-400 dark:hover:text-red-300" title="Verwijderen">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  updateCharts();
}

function updateCharts() {
  const pieCanvas = document.getElementById('pie-chart') as HTMLCanvasElement;
  const barCurrentCanvas = document.getElementById('bar-chart-current') as HTMLCanvasElement;
  const barComparisonCanvas = document.getElementById('bar-chart-comparison') as HTMLCanvasElement;
  const historyCanvas = document.getElementById('history-chart') as HTMLCanvasElement;
  
  if (!pieCanvas || !barCurrentCanvas || !barComparisonCanvas || !historyCanvas) return;

  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalDebts = debts.reduce((sum, d) => sum + d.value, 0);
  const netWorth = totalAssets - totalDebts;

  let labels: string[] = [];
  let values: number[] = [];
  let colors: string[] = [];

  if (pieChartMode === 'bruto') {
    labels = assets.map(a => isPrivacyMode ? '•••••' : a.name);
    values = assets.map(a => a.value);
    colors = assets.map(a => a.color);
  } else {
    labels = ['Bezittingen', 'Schulden'];
    values = [totalAssets, totalDebts];
    colors = ['#10b981', '#ef4444'];
  }

  const currentPercents = assets.map(a => totalAssets > 0 ? (a.value / totalAssets) * 100 : 0);
  const targets = assets.map(a => a.target);

  const textColor = isDarkMode ? '#a1a1aa' : '#71717a';
  const gridColor = isDarkMode ? '#27272a' : '#f4f4f5';

  // Robust chart destruction to prevent ghosting
  const destroyChart = (chartVar: Chart | null, canvas: HTMLCanvasElement) => {
    if (chartVar) chartVar.destroy();
    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();
  };

  destroyChart(pieChart, pieCanvas);
  pieChart = new Chart(pieCanvas.getContext('2d')!, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: isDarkMode ? 2 : 0,
        borderColor: isDarkMode ? '#09090b' : '#ffffff',
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: 20
      },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          if (pieChartMode === 'bruto') {
            const assetId = assets[index].id;
            highlightAssetRow(assetId);
          } else {
            // Netto mode: 0 = Bezittingen, 1 = Schulden
            if (index === 0) {
              document.getElementById('assets-section')?.scrollIntoView({ behavior: 'smooth' });
            } else if (index === 1) {
              document.getElementById('debts-section')?.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDarkMode ? '#27272a' : '#ffffff',
          titleColor: isDarkMode ? '#ffffff' : '#09090b',
          bodyColor: isDarkMode ? '#d4d4d8' : '#71717a',
          borderColor: isDarkMode ? '#3f3f46' : '#e4e4e7',
          borderWidth: 1,
          yAlign: 'bottom',
          callbacks: {
            label: (context) => {
              if (isPrivacyMode) return ` ${context.label}: •••••`;
              const value = context.raw as number;
              const total = context.dataset.data.reduce((a: any, b: any) => a + b, 0) as number;
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
              return ` ${context.label}: ${formatCurrency(value)} (${percentage}%)`;
            }
          }
        },
        centerText: {
          display: (window as any).chartCenterTextDisplay !== false,
          value: (window as any).chartTotalValue || '€ 0',
          label: pieChartMode === 'bruto' ? 'Bruto' : 'Netto',
          badge: {
            text: (window as any).chartStatus?.text,
            color: (window as any).chartStatus?.color,
            bg: (window as any).chartStatus?.bg
          }
        }
      },
      cutout: '75%'
    } as any
  });

  destroyChart(barChartCurrent, barCurrentCanvas);
  barChartCurrent = new Chart(barCurrentCanvas.getContext('2d')!, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: currentPercents,
        backgroundColor: colors,
        borderRadius: 4,
        barThickness: 20
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { 
          grid: { display: false }, 
          border: { display: false },
          ticks: { color: textColor }
        }
      }
    }
  });

  destroyChart(barChartComparison, barComparisonCanvas);
  barChartComparison = new Chart(barComparisonCanvas.getContext('2d')!, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Huidig',
          data: currentPercents,
          backgroundColor: '#10b981',
          borderRadius: 4,
          barThickness: 12
        },
        {
          label: 'Doel',
          data: targets,
          backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0',
          borderRadius: 4,
          barThickness: 12
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          position: 'bottom', 
          labels: { 
            usePointStyle: true, 
            boxWidth: 6,
            color: textColor
          } 
        },
        tooltip: {
          backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
          titleColor: isDarkMode ? '#ffffff' : '#0f172a',
          bodyColor: isDarkMode ? '#cbd5e1' : '#64748b',
          borderColor: isDarkMode ? '#334155' : '#e2e8f0',
          borderWidth: 1
        }
      },
      scales: {
        x: { display: false },
        y: { 
          grid: { display: false }, 
          border: { display: false },
          ticks: { color: textColor }
        }
      }
    }
  });

  destroyChart(historyChart, historyCanvas);
  historyChart = new Chart(historyCanvas.getContext('2d')!, {
    type: 'line',
    data: {
      labels: history.map(h => formatDate(h.date)),
      datasets: [{
        label: 'Totaal Vermogen',
        data: history.map(h => h.totalValue),
        borderColor: '#10b981',
        backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#10b981'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
          titleColor: isDarkMode ? '#ffffff' : '#0f172a',
          bodyColor: isDarkMode ? '#cbd5e1' : '#64748b',
          borderColor: isDarkMode ? '#334155' : '#e2e8f0',
          borderWidth: 1,
          callbacks: {
            label: (context) => formatCurrency(context.raw as number)
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            callback: (value) => formatCurrency(value as number)
          }
        },
        x: {
          grid: { display: false },
          ticks: { color: textColor }
        }
      }
    }
  });

  updateTreemap();
}

function updateTreemap() {
  const container = document.getElementById('treemap-container');
  if (!container) return;

  // Clear previous content
  container.innerHTML = '';

  const width = container.clientWidth;
  const height = container.clientHeight;

  if (width === 0 || height === 0) return;

  const data = {
    name: "Assets",
    children: assets.filter(a => a.value > 0)
  };

  const root = hierarchy(data)
    .sum(d => (d as any).value)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  treemap()
    .size([width, height])
    .padding(2)
    .round(true)
    (root);

  const svg = select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

  const leaf = svg.selectAll("g")
    .data(root.leaves())
    .join("g")
    .attr("transform", (d: any) => `translate(${d.x0},${d.y0})`);

  leaf.append("rect")
    .attr("id", (d: any) => (d.data as any).id)
    .attr("fill", (d: any) => (d.data as any).color)
    .attr("fill-opacity", 0.8)
    .attr("width", (d: any) => d.x1 - d.x0)
    .attr("height", (d: any) => d.y1 - d.y0)
    .attr("rx", 4)
    .attr("ry", 4)
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      highlightAssetRow((d.data as any).id);
    });

  leaf.append("text")
    .attr("clip-path", (d: any) => `url(#clip-${(d.data as any).id})`)
    .selectAll("tspan")
    .data((d: any) => {
      const totalValue = root.value || 1;
      const p = (((d.value || 0) / totalValue) * 100).toFixed(1);
      const name = isPrivacyMode ? '•••••' : (d.data as any).name;
      const percentage = isPrivacyMode ? '•••' : p;
      const value = `${formatCurrency((d.data as any).value)} (${percentage}%)`;
      return [name, value];
    })
    .join("tspan")
    .attr("x", 5)
    .attr("y", (d: any, i: number, nodes: any) => {
      const offset = (i === nodes.length - 1) ? 0.3 : 0;
      return `${offset + 1.1 + i * 0.9}em`;
    })
    .attr("fill", "#fff")
    .attr("font-weight", (d: any, i: number) => i === 0 ? "bold" : "normal")
    .text((d: any) => d);
}

// Bottom Sheet Logic
const setupSwipeToClose = (sheetId: string) => {
  const sheet = document.getElementById(sheetId);
  if (!sheet) return;

  let startY = 0;
  let currentY = 0;
  let isDragging = false;
  let rafPending = false;

  sheet.addEventListener('touchstart', (e) => {
    const scrollableContent = sheet.querySelector('.overflow-y-auto');
    if (scrollableContent && scrollableContent.scrollTop > 0) return;
    
    startY = e.touches[0].clientY;
    currentY = startY;
    isDragging = true;
    sheet.style.transition = 'none';
    sheet.style.willChange = 'transform';
  }, { passive: true });

  sheet.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    
    currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;
    
    if (deltaY > 0) {
      if (e.cancelable) e.preventDefault();
      
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(() => {
          sheet.style.transform = `translateY(${deltaY}px)`;
          rafPending = false;
        });
      }
    } else {
      // If user swipes up, reset transform to keep it at top
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(() => {
          sheet.style.transform = '';
          rafPending = false;
        });
      }
    }
  }, { passive: false });

  sheet.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    rafPending = false;
    
    const deltaY = currentY - startY;
    sheet.style.willChange = '';
    sheet.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    
    if (deltaY > 120) {
      closeSheets();
      setTimeout(() => {
        sheet.style.transform = '';
      }, 400);
    } else {
      sheet.style.transform = '';
    }
  });
};

const openSheet = (sheet: HTMLElement | null) => {
  const overlay = document.getElementById('bottom-sheet-overlay');
  if (!sheet || !overlay) return;
  
  // Reset any leftover transform from previous swipes
  sheet.style.transform = '';
  sheet.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
  
  overlay.classList.add('open');
  sheet.classList.add('open');
  document.body.style.overflow = 'hidden';
};

const closeSheets = () => {
  const overlay = document.getElementById('bottom-sheet-overlay');
  const beheerSheet = document.getElementById('beheer-bottom-sheet');
  const historieSheet = document.getElementById('historie-bottom-sheet');
  const vrijheidSheet = document.getElementById('vrijheid-bottom-sheet');
  
  const sheets = [beheerSheet, historieSheet, vrijheidSheet];
  sheets.forEach(s => {
    if (s) {
      s.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      s.style.transform = '';
      s.classList.remove('open');
    }
  });
  
  overlay?.classList.remove('open');
  document.body.style.overflow = '';
};

const openBeheerSheet = () => {
  const content = document.getElementById('mobile-beheer-content');
  const source = document.getElementById('assets-section');
  const debtsSource = document.getElementById('debts-section');
  const beheerSheet = document.getElementById('beheer-bottom-sheet');
  if (content && source && debtsSource) {
    content.appendChild(source);
    content.appendChild(debtsSource);
    openSheet(beheerSheet);
  }
};

function highlightAssetRow(id: string) {
  if (window.innerWidth < 1024) {
    openBeheerSheet();
  }
  
  const inputs = document.querySelectorAll(`.asset-input[data-id="${id}"]`);
  inputs.forEach(input => {
    const tr = input.closest('tr');
    if (tr) {
      tr.classList.add('bg-emerald-50', 'dark:bg-emerald-900/20', 'scale-[1.01]', 'ring-1', 'ring-emerald-200', 'dark:ring-emerald-800');
      tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        tr.classList.remove('bg-emerald-50', 'dark:bg-emerald-900/20', 'scale-[1.01]', 'ring-1', 'ring-emerald-200', 'dark:ring-emerald-800');
      }, 2000);
    }
  });
}

function showCoachMark() {
  setTimeout(() => {
    const firstValueInput = document.querySelector('.asset-value-input') as HTMLInputElement;
    const coachMark = document.getElementById('coach-mark');
    
    if (firstValueInput && coachMark) {
      const rect = firstValueInput.getBoundingClientRect();
      coachMark.style.top = `${window.scrollY + rect.top - 50}px`;
      coachMark.style.left = `${window.scrollX + rect.left + rect.width / 2 - 80}px`;
      coachMark.classList.remove('hidden');
      
      const hide = () => {
        coachMark.classList.add('hidden');
        document.removeEventListener('mousedown', hide);
        firstValueInput.removeEventListener('input', hide);
      };
      document.addEventListener('mousedown', hide);
      firstValueInput.addEventListener('input', hide);
    }
  }, 500);
}

function showFeatureHint() {
  const featureHint = document.getElementById('feature-hint');
  if (featureHint) {
    setTimeout(() => {
      featureHint.classList.remove('hidden');
      
      const hide = () => {
        featureHint.classList.add('hidden');
        document.removeEventListener('mousedown', hide);
        featureHint.removeEventListener('click', hide);
      };
      
      // Auto-hide after 8 seconds or on click
      setTimeout(hide, 8000);
      document.addEventListener('mousedown', hide);
      featureHint.addEventListener('click', hide);
    }, 1000);
  }
}

function checkOnboarding() {
  const completed = localStorage.getItem('onboarding_completed');
  const hasData = localStorage.getItem(STORAGE_KEY);
  
  if (!completed && !hasData) {
    const introScreen = document.getElementById('intro-screen');
    if (introScreen) {
      introScreen.classList.remove('hidden');
    }
  } else {
    // Onboarding already done, show hint once per session
    if (!sessionStorage.getItem('feature_hint_shown')) {
      showFeatureHint();
      sessionStorage.setItem('feature_hint_shown', 'true');
    }
  }
}

function initEventListeners() {
  const mobileBeheerBtn = document.getElementById('mobile-beheer-btn');
  const mobileHistorieBtn = document.getElementById('mobile-historie-btn');
  const mobileVrijheidBtn = document.getElementById('mobile-vrijheid-btn');
  const closeSheetBtns = document.querySelectorAll('.close-bottom-sheet');
  const overlay = document.getElementById('bottom-sheet-overlay');
  const beheerSheet = document.getElementById('beheer-bottom-sheet');
  const historieSheet = document.getElementById('historie-bottom-sheet');
  const vrijheidSheet = document.getElementById('vrijheid-bottom-sheet');

  const tableBody = document.getElementById('asset-table-body');
  if (tableBody) {
    tableBody.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.classList.contains('asset-input')) {
        const type = target.dataset.type;
        if (type === 'target') {
          const val = parseFloat(target.value);
          const isValid = !isNaN(val) && val >= 0 && val <= 100;
          if (!isValid && target.value !== '') {
            target.classList.add('ring-2', 'ring-red-500', 'border-red-500');
          } else {
            target.classList.remove('ring-2', 'ring-red-500', 'border-red-500');
          }
        }
      }
    });

    tableBody.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.classList.contains('asset-input')) {
        const id = target.dataset.id;
        const type = target.dataset.type;
        const rawValue = target.value;
        
        let val: any = rawValue;
        if (type === 'value') {
          val = parseNumber(rawValue);
        } else if (type === 'target') {
          val = parseFloat(rawValue) || 0;
          if (val < 0) val = 0;
          if (val > 100) val = 100;
        }
        
        assets = assets.map(a => {
          if (a.id === id) {
            if (type === 'name') return { ...a, name: rawValue };
            if (type === 'category') return { ...a, category: rawValue as any };
            return { ...a, [type === 'value' ? 'value' : 'target']: val };
          }
          return a;
        });
        updateUI();
      }
    });

    tableBody.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const deleteBtn = target.closest('.delete-asset-btn') as HTMLButtonElement;
      if (deleteBtn) {
        const id = deleteBtn.dataset.id!;
        deleteAsset(id);
      }
    });
  }

  const addAssetBtn = document.getElementById('add-asset-btn');
  if (addAssetBtn) {
    addAssetBtn.addEventListener('click', () => {
      addAsset();
    });
  }

  const resetColorsBtn = document.getElementById('reset-colors-btn');
  if (resetColorsBtn) {
    resetColorsBtn.addEventListener('click', () => {
      resetToDefaults();
    });
  }

  // Pie Chart Empty State Buttons
  const loadExampleBtn = document.getElementById('load-example-btn');
  const pieEmptyIcon = document.getElementById('pie-empty-icon');
  const introMascot = document.getElementById('intro-mascot');
  const onboardingMascot = document.getElementById('onboarding-mascot');
  const explanationMascot = document.getElementById('explanation-mascot');
  const freedomMascot = document.getElementById('freedom-mascot');
  const headerPieIcon = document.getElementById('header-pie-icon');
  
  if (loadExampleBtn) {
    loadExampleBtn.addEventListener('click', () => {
      loadExampleData();
    });
  }

  if (pieEmptyIcon) {
    pieEmptyIcon.addEventListener('click', () => {
      loadExampleData();
    });
  }

  if (introMascot) {
    introMascot.addEventListener('click', () => {
      loadExampleData();
    });
  }

  if (onboardingMascot) {
    onboardingMascot.addEventListener('click', () => {
      loadExampleData();
    });
  }

  if (explanationMascot) {
    explanationMascot.addEventListener('click', () => {
      loadExampleData();
    });
  }

  if (freedomMascot) {
    freedomMascot.addEventListener('click', () => {
      loadExampleData();
    });
  }

  if (headerPieIcon) {
    headerPieIcon.addEventListener('click', () => {
      loadExampleData();
    });
  }

  const focusAssetsBtn = document.getElementById('focus-assets-btn');
  if (focusAssetsBtn) {
    focusAssetsBtn.addEventListener('click', () => {
      if (window.innerWidth < 1024) {
        openBeheerSheet();
      } else {
        document.getElementById('assets-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      // Highlight the first input
      setTimeout(() => {
        const firstInput = document.querySelector('.asset-value-input') as HTMLInputElement;
        firstInput?.focus();
        firstInput?.select();
      }, 800);
    });
  }

  const targetNetWorthInput = document.getElementById('target-net-worth-input') as HTMLInputElement;
  let targetNetWorthTimeout: any = null;
  if (targetNetWorthInput) {
    targetNetWorthInput.addEventListener('focus', () => {
      updateUI();
    });
    targetNetWorthInput.addEventListener('blur', () => {
      updateUI();
    });

    formatNumericInput(targetNetWorthInput, (val) => {
      targetNetWorth = val;
      if (targetNetWorthTimeout) clearTimeout(targetNetWorthTimeout);
      targetNetWorthTimeout = setTimeout(() => updateUI(), 100);
      
      const isValid = !isNaN(val) && val >= 0;
      if (!isValid && targetNetWorthInput.value !== '') {
        targetNetWorthInput.classList.add('text-red-500');
      } else {
        targetNetWorthInput.classList.remove('text-red-500');
      }
    });

    targetNetWorthInput.addEventListener('blur', () => {
      targetNetWorthInput.value = formatNumber(targetNetWorth > 0 ? targetNetWorth : 0);
    });
  }

  const dateInput = document.getElementById('current-date') as HTMLInputElement;
  if (dateInput) {
    dateInput.addEventListener('change', () => {
      saveState();
    });
    
    // Open date picker when clicking the icon or label
    const dateLabel = dateInput.parentElement;
    if (dateLabel) {
      dateLabel.addEventListener('click', (e) => {
        if (e.target !== dateInput) {
          try {
            dateInput.showPicker();
          } catch (err) {
            dateInput.focus();
          }
        }
      });
    }
  }

  const saveHistoryBtn = document.getElementById('save-history-btn');
  
  const handleSaveHistory = () => {
    addToHistory();
  };

  if (saveHistoryBtn) saveHistoryBtn.addEventListener('click', handleSaveHistory);

  const historyTableBody = document.getElementById('history-table-body');
  if (historyTableBody) {
    historyTableBody.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const loadBtn = target.closest('.load-history-btn') as HTMLButtonElement;
      const deleteBtn = target.closest('.delete-history-btn') as HTMLButtonElement;

      if (loadBtn) {
        const idx = parseInt(loadBtn.dataset.idx!);
        loadFromHistory(idx);
      } else if (deleteBtn) {
        const idx = parseInt(deleteBtn.dataset.idx!);
        deleteFromHistory(idx);
      }
    });
  }

  const themeToggle = document.getElementById('theme-toggle');
  
  const handleThemeToggle = () => {
    isDarkMode = !isDarkMode;
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.body.classList.toggle('dark', isDarkMode);
    saveState();
    updateUI();
  };

  if (themeToggle) themeToggle.addEventListener('click', handleThemeToggle);

  const treemapContainer = document.getElementById('treemap-container');
  if (treemapContainer) {
    const resizeObserver = new ResizeObserver(() => {
      updateTreemap();
    });
    resizeObserver.observe(treemapContainer);
  }

  // Security UI
  const securityBtn = document.getElementById('security-btn');
  const securityModal = document.getElementById('security-modal');
  const closeSecurityModal = document.getElementById('close-security-modal');
  const savePasswordBtn = document.getElementById('save-password-btn');
  const removePasswordBtn = document.getElementById('remove-password-btn');
  const masterPasswordInput = document.getElementById('master-password-input') as HTMLInputElement;
  const confirmPasswordInput = document.getElementById('confirm-password-input') as HTMLInputElement;
  const confirmPasswordContainer = document.getElementById('confirm-password-container');
  const securityStatusText = document.getElementById('security-status-text');
  const securityStatusIcon = document.getElementById('security-status-icon');
  
  const lockNowBtn = document.getElementById('lock-now-btn');
  
  const updateSecurityUI = () => {
    const statusDesc = securityStatusText?.nextElementSibling as HTMLElement;
    const securityBadge = document.getElementById('security-badge');

    if (masterPassword) {
      if (securityStatusText) securityStatusText.textContent = 'Portfolio is versleuteld';
      if (statusDesc) {
        statusDesc.innerHTML = '<span class="text-green-600 dark:text-green-400 font-semibold">Huidige status: AES-256 Encryptie.</span><br>Je data is cryptografisch beveiligd met je persoonlijke wachtwoord.';
      }
      if (securityStatusIcon) {
        securityStatusIcon.className = 'p-2 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
        securityStatusIcon.innerHTML = '<i data-lucide="lock" class="w-5 h-5"></i>';
      }
      if (savePasswordBtn) savePasswordBtn.textContent = 'Wachtwoord Wijzigen';
      if (removePasswordBtn) removePasswordBtn.classList.remove('hidden');
      if (lockNowBtn) lockNowBtn.classList.remove('hidden');
      
      securityBadge?.classList.add('hidden');
    } else {
      if (securityStatusText) securityStatusText.textContent = 'Geen wachtwoord ingesteld';
      if (statusDesc) {
        statusDesc.innerHTML = '<span class="text-amber-600 dark:text-amber-400 font-semibold">Huidige status: Basis obfuscatie.</span><br>Zonder wachtwoord is je data verborgen in de browser, maar niet cryptografisch beveiligd tegen hackers. Stel een wachtwoord in voor volledige AES-256 encryptie.';
      }
      if (securityStatusIcon) {
        securityStatusIcon.className = 'p-2 rounded-lg bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400';
        securityStatusIcon.innerHTML = '<i data-lucide="unlock" class="w-5 h-5"></i>';
      }
      if (savePasswordBtn) savePasswordBtn.textContent = 'Wachtwoord Instellen';
      if (removePasswordBtn) removePasswordBtn.classList.add('hidden');
      if (lockNowBtn) lockNowBtn.classList.add('hidden');

      securityBadge?.classList.remove('hidden');
    }
    if (confirmPasswordContainer) confirmPasswordContainer.classList.remove('hidden');
    createIcons({ icons: usedIcons });
  };

  if (lockNowBtn) {
    lockNowBtn.addEventListener('click', () => {
      masterPassword = '';
      securityModal?.classList.add('hidden');
      showLockScreen();
    });
  }

  // Info Modal UI
  const infoBtn = document.getElementById('info-btn');
  const infoModal = document.getElementById('info-modal');
  const closeInfoModal = document.getElementById('close-info-modal');
  const infoModalOk = document.getElementById('info-modal-ok');

  const openInfo = () => {
    infoModal?.classList.remove('hidden');
  };

  if (infoBtn) infoBtn.addEventListener('click', openInfo);

  if (closeInfoModal && infoModal) {
    closeInfoModal.addEventListener('click', () => {
      infoModal.classList.add('hidden');
    });
  }

  if (infoModalOk && infoModal) {
    infoModalOk.addEventListener('click', () => {
      infoModal.classList.add('hidden');
    });
  }

  if (infoModal) {
    infoModal.addEventListener('click', (e) => {
      if (e.target === infoModal) {
        infoModal.classList.add('hidden');
      }
    });
  }

  const monthlyExpensesInput = document.getElementById('monthly-expenses-input') as HTMLInputElement;
  if (monthlyExpensesInput) {
    if (!monthlyExpensesInput.matches(':focus')) {
      monthlyExpensesInput.value = formatNumber(monthlyExpenses);
    }
    formatNumericInput(monthlyExpensesInput, (val) => {
      monthlyExpenses = val;
      updateUI();
    });
  }

  const freedomCustomNetworthInput = document.getElementById('freedom-custom-networth') as HTMLInputElement;
  if (freedomCustomNetworthInput) {
    if (!freedomCustomNetworthInput.matches(':focus')) {
      freedomCustomNetworthInput.value = freedomCustomNetWorth > 0 ? formatNumber(freedomCustomNetWorth) : '';
    }
    formatNumericInput(freedomCustomNetworthInput, (val) => {
      freedomCustomNetWorth = val;
      updateUI();
    });
    freedomCustomNetworthInput.addEventListener('blur', (e) => {
      const input = e.target as HTMLInputElement;
      if (freedomCustomNetWorth > 0) {
        input.value = formatNumber(freedomCustomNetWorth);
      } else {
        input.value = '';
      }
    });
  }

  // Add Asset Modal UI
  const addAssetModal = document.getElementById('add-asset-modal');
  const closeAddAssetModal = document.getElementById('close-add-asset-modal');
  const cancelAddAsset = document.getElementById('cancel-add-asset');
  const saveNewAssetBtn = document.getElementById('save-new-asset');

  if (closeAddAssetModal && addAssetModal) {
    closeAddAssetModal.addEventListener('click', () => {
      addAssetModal.classList.add('hidden');
    });
  }

  if (cancelAddAsset && addAssetModal) {
    cancelAddAsset.addEventListener('click', () => {
      addAssetModal.classList.add('hidden');
    });
  }

  if (saveNewAssetBtn) {
    saveNewAssetBtn.addEventListener('click', saveNewAsset);
  }

  if (addAssetModal) {
    addAssetModal.addEventListener('click', (e) => {
      if (e.target === addAssetModal) {
        addAssetModal.classList.add('hidden');
      }
    });

    // Handle Enter key
    addAssetModal.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveNewAsset();
      } else if (e.key === 'Escape') {
        addAssetModal.classList.add('hidden');
      }
    });
  }

  if (securityBtn && securityModal) {
    securityBtn.addEventListener('click', () => {
      securityModal.classList.remove('hidden');
      updateSecurityUI();
    });
  }

  const privacyToggles = document.querySelectorAll('.privacy-toggle-btn');
  privacyToggles.forEach(btn => {
    btn.addEventListener('click', () => {
      isPrivacyMode = !isPrivacyMode;
      saveState();
      updateUI();
    });
  });

  // Add a dedicated lock button or use the security button to lock?
  // Let's add a "Lock Now" button in the security modal.

  if (closeSecurityModal && securityModal) {
    closeSecurityModal.addEventListener('click', () => {
      securityModal.classList.add('hidden');
      masterPasswordInput.value = '';
      confirmPasswordInput.value = '';
    });
  }

  if (savePasswordBtn) {
    savePasswordBtn.addEventListener('click', () => {
      const newPass = masterPasswordInput.value.trim();
      const confirmPass = confirmPasswordInput.value.trim();
      
      if (!newPass) {
        alert('Voer een wachtwoord in.');
        return;
      }
      
      if (masterPassword && newPass !== confirmPass) {
        alert('Wachtwoorden komen niet overeen.');
        return;
      }
      
      if (!masterPassword && confirmPasswordContainer?.classList.contains('hidden')) {
        confirmPasswordContainer.classList.remove('hidden');
        savePasswordBtn.textContent = 'Bevestig Wachtwoord';
        return;
      }

      if (!masterPassword && newPass !== confirmPass) {
        alert('Wachtwoorden komen niet overeen.');
        return;
      }

      masterPassword = newPass;
      saveState();
      securityModal?.classList.add('hidden');
      masterPasswordInput.value = '';
      confirmPasswordInput.value = '';
      updateSecurityUI(); // Ensure UI reflects the new state
      alert('Portfolio is nu versleuteld met je wachtwoord.');
    });
  }

  if (removePasswordBtn) {
    removePasswordBtn.addEventListener('click', () => {
      if (confirm('Weet je zeker dat je de versleuteling wilt verwijderen? Je gegevens worden weer onbeveiligd opgeslagen.')) {
        masterPassword = '';
        saveState();
        updateSecurityUI();
        alert('Versleuteling verwijderd.');
      }
    });
  }

  const resetApp = () => {
    if (confirm('Weet je zeker dat je helemaal opnieuw wilt beginnen? Alle opgeslagen gegevens en instellingen worden gewist.')) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('onboarding_completed');
      location.reload();
    }
  };

  const resetAppBtn = document.getElementById('reset-app-btn');
  if (resetAppBtn) resetAppBtn.addEventListener('click', resetApp);

  const clearAllDataBtn = document.getElementById('clear-all-data-btn');
  if (clearAllDataBtn) {
    clearAllDataBtn.addEventListener('click', () => {
      if (confirm('LET OP: Dit verwijdert al je assets, historie en instellingen permanent. Weet je het zeker?')) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('onboarding_completed');
        location.reload();
      }
    });
  }

  // Backup & Restore
  const exportBtn = document.getElementById('export-backup-btn');
  const importBtn = document.getElementById('import-backup-btn');
  const backupFileInput = document.getElementById('backup-file-input') as HTMLInputElement;

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        alert('Geen data gevonden om te exporteren.');
        return;
      }
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  if (importBtn && backupFileInput) {
    importBtn.addEventListener('click', () => {
      backupFileInput.click();
    });

    backupFileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          // Basic validation
          const parsed = JSON.parse(content);
          if (parsed.v === 2 && parsed.data) {
            if (confirm('Weet je zeker dat je deze backup wilt importeren? Je huidige gegevens worden overschreven.')) {
              localStorage.setItem(STORAGE_KEY, content);
              location.reload();
            }
          } else {
            alert('Ongeldig backup bestand.');
          }
        } catch (err) {
          alert('Fout bij het lezen van het bestand.');
        }
      };
      reader.readAsText(file);
    });
  }

  // Unlock logic
  const unlockBtn = document.getElementById('unlock-btn');
  const unlockInput = document.getElementById('unlock-password-input') as HTMLInputElement;
  const forgotPasswordBtn = document.getElementById('forgot-password-btn');

  const attemptUnlock = () => {
    const pass = unlockInput.value.trim();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && pass) {
      let payload = saved;
      try {
        if (saved.trim().startsWith('{')) {
          const envelope = JSON.parse(saved);
          if (envelope.v === 2) {
            payload = envelope.data;
          }
        }
      } catch (e) {}

      const decrypted = decrypt(payload, pass);
      if (decrypted) {
        try {
          const state = JSON.parse(decrypted);
          masterPassword = pass;
          applyState(state);
          hideLockScreen();
          unlockInput.value = '';
          updateSecurityUI(); // Ensure UI reflects the unlocked state
        } catch (e) {
          alert('Ongeldig wachtwoord of beschadigde data.');
        }
      } else {
        alert('Ongeldig wachtwoord.');
      }
    }
  };

  // Password visibility toggles
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = (btn as HTMLElement).dataset.target;
      const input = document.getElementById(targetId!) as HTMLInputElement;
      const icon = btn.querySelector('i');
      
      if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.setAttribute('data-lucide', 'eye-off');
      } else {
        input.type = 'password';
        if (icon) icon.setAttribute('data-lucide', 'eye');
      }
      createIcons({ icons: usedIcons });
    });
  });

  if (unlockBtn) {
    unlockBtn.addEventListener('click', attemptUnlock);
  }

  if (unlockInput) {
    unlockInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') attemptUnlock();
    });
  }

  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', () => {
      if (confirm('LET OP: Als je je wachtwoord vergeet, kunnen we je gegevens niet herstellen. Wil je alle gegevens wissen en opnieuw beginnen?')) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      }
    });
  }

  updateSecurityUI();

  const averageDutchBtn = document.getElementById('average-dutch-btn');
  const averageDutchBtnInline = document.getElementById('average-dutch-btn-inline');
  const averageDutchModal = document.getElementById('average-dutch-modal');
  const closeAverageDutchModal = document.getElementById('close-average-dutch-modal');
  const closeAverageDutchModalBtn = document.getElementById('close-average-dutch-modal-btn');

  const handleOpenAverageDutch = () => {
    if (averageDutchModal) {
      averageDutchModal.classList.remove('hidden');
      initAverageDutchChart();
    }
  };

  const handleCloseAverageDutch = () => {
    if (averageDutchModal) averageDutchModal.classList.add('hidden');
  };

  if (averageDutchBtn) averageDutchBtn.addEventListener('click', handleOpenAverageDutch);
  if (averageDutchBtnInline) averageDutchBtnInline.addEventListener('click', handleOpenAverageDutch);
  if (closeAverageDutchModal) closeAverageDutchModal.addEventListener('click', handleCloseAverageDutch);
  if (closeAverageDutchModalBtn) closeAverageDutchModalBtn.addEventListener('click', handleCloseAverageDutch);
  if (averageDutchModal) {
    averageDutchModal.addEventListener('click', (e) => {
      if (e.target === averageDutchModal) handleCloseAverageDutch();
    });
  }

  const startIntroBtn = document.getElementById('start-intro-btn');
  if (startIntroBtn) {
    startIntroBtn.addEventListener('click', () => {
      const introScreen = document.getElementById('intro-screen');
      const onboardingModal = document.getElementById('onboarding-modal');
      
      if (introScreen) {
        introScreen.classList.add('fade-out');
        setTimeout(() => {
          introScreen.classList.add('hidden');
          if (onboardingModal) {
            onboardingModal.classList.remove('hidden');
            // Smooth fade-up effect for the question
            const questionEl = document.getElementById('onboarding-question');
            if (questionEl) {
              setTimeout(() => {
                questionEl.classList.remove('opacity-0', 'translate-y-4', 'blur-sm');
              }, 400);
            }
          }
        }, 500);
      }
    });
  }

  // Intro Carousel Logic
  const introCarousel = document.getElementById('intro-carousel');
  const introDots = document.querySelectorAll('.intro-pagination-dot');
  
  if (introCarousel && introDots.length > 0) {
    const introScreen = document.getElementById('intro-screen');
    const introFooterText = document.getElementById('intro-footer-text');

    introCarousel.addEventListener('scroll', () => {
      const scrollPos = introCarousel.scrollLeft;
      const width = introCarousel.offsetWidth;
      const activeIndex = Math.round(scrollPos / width);
      
      introDots.forEach((dot, idx) => {
        if (idx === activeIndex) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });

      // Update background and footer text color based on active slide
      if (introScreen && introFooterText && startIntroBtn) {
        if (activeIndex === 0) {
          introScreen.classList.remove('bg-emerald-600');
          introScreen.classList.add('bg-white');
          introFooterText.classList.remove('text-emerald-100', 'opacity-0', 'pointer-events-none');
          introFooterText.classList.add('text-zinc-400', 'dark:text-zinc-500', 'opacity-100');
          
          // Button state: Emerald on White
          startIntroBtn.classList.remove('bg-white', 'text-emerald-600', 'hover:bg-zinc-100');
          startIntroBtn.classList.add('bg-emerald-600', 'text-white', 'hover:bg-emerald-700');
        } else {
          introScreen.classList.remove('bg-white');
          introScreen.classList.add('bg-emerald-600');
          introFooterText.classList.remove('text-zinc-400', 'dark:text-zinc-500', 'opacity-100');
          introFooterText.classList.add('text-emerald-100', 'opacity-0', 'pointer-events-none');

          // Button state: White on Emerald
          startIntroBtn.classList.remove('bg-emerald-600', 'text-white', 'hover:bg-emerald-700');
          startIntroBtn.classList.add('bg-white', 'text-emerald-600', 'hover:bg-zinc-100');
        }
      }
    }, { passive: true });

    // Enable clicking dots to navigate
    introDots.forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        const width = introCarousel.offsetWidth;
        introCarousel.scrollTo({
          left: idx * width,
          behavior: 'smooth'
        });
      });
    });

    // Arrow controls
    const prevBtn = document.getElementById('intro-prev-btn');
    const nextBtn = document.getElementById('intro-next-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const width = introCarousel.offsetWidth;
        const currentIdx = Math.round(introCarousel.scrollLeft / width);
        if (currentIdx > 0) {
          introCarousel.scrollTo({
            left: (currentIdx - 1) * width,
            behavior: 'smooth'
          });
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const width = introCarousel.offsetWidth;
        const currentIdx = Math.round(introCarousel.scrollLeft / width);
        if (currentIdx < introDots.length - 1) {
          introCarousel.scrollTo({
            left: (currentIdx + 1) * width,
            behavior: 'smooth'
          });
        }
      });
    }
  }

  // Onboarding
  const onboardingModal = document.getElementById('onboarding-modal');
  const onboardingStartBtn = document.getElementById('onboarding-start-btn');
  const onboardingExampleBtn = document.getElementById('onboarding-example-btn');
  const onboardingCheckboxes = document.querySelectorAll('.onboarding-asset-checkbox') as NodeListOf<HTMLInputElement>;

  if (onboardingStartBtn) {
    onboardingStartBtn.addEventListener('click', () => {
      const selectedAssets: Asset[] = [];
      const selectedDebts: Debt[] = [];
      const colors = ['#10b981', '#059669', '#f97316', '#0d9488', '#eab308', '#ec4899'];
      
      onboardingCheckboxes.forEach((cb, index) => {
        if (cb.checked) {
          if (cb.value === 'Schulden' || cb.value === 'Hypotheekschuld') {
            selectedDebts.push({
              id: Math.random().toString(36).substring(2, 9),
              name: cb.value === 'Hypotheekschuld' ? 'Hypotheek' : 'Schulden',
              value: 0,
              target: 0
            });
          } else {
            selectedAssets.push({
              id: Math.random().toString(36).substring(2, 9),
              name: cb.value,
              value: 0,
              target: 0,
              color: colors[index % colors.length],
              category: cb.value === 'Crypto' ? 'Speculatief' : (cb.value === 'Spaargeld' || cb.value === 'Goud' ? 'Defensief' : 'Groei'),
              isRealEstate: cb.value === 'Eigen Woning'
            });
          }
        }
      });
      
      if (selectedAssets.length === 0 && selectedDebts.length === 0) {
        alert('Selecteer ten minste één asset of schuld om te beginnen.');
        return;
      }
      
      assets = selectedAssets;
      debts = selectedDebts;
      localStorage.setItem('onboarding_completed', 'true');
      if (onboardingModal) onboardingModal.classList.add('hidden');
      
      const explanationModal = document.getElementById('onboarding-explanation-modal');
      if (explanationModal) explanationModal.classList.remove('hidden');
      
      saveState();
      updateUI();
      showCoachMark();
    });
  }

  const closeExplanationBtn = document.getElementById('close-explanation-btn');
  if (closeExplanationBtn) {
    closeExplanationBtn.addEventListener('click', () => {
      const explanationModal = document.getElementById('onboarding-explanation-modal');
      if (explanationModal) explanationModal.classList.add('hidden');
      showFeatureHint();
    });
  }

  if (onboardingExampleBtn) {
    onboardingExampleBtn.addEventListener('click', () => {
      loadExampleData();
    });
  }

  const removeExampleBtn = document.getElementById('remove-example-data');
  if (removeExampleBtn) {
    removeExampleBtn.addEventListener('click', () => {
      const banner = document.getElementById('example-data-banner');
      if (banner) banner.classList.add('hidden');
    });
  }

  mobileBeheerBtn?.addEventListener('click', openBeheerSheet);

  mobileHistorieBtn?.addEventListener('click', () => {
    const content = document.getElementById('mobile-historie-content');
    const source = document.getElementById('history-section');
    if (content && source) {
      content.appendChild(source);
      openSheet(historieSheet);
    }
  });

  mobileVrijheidBtn?.addEventListener('click', () => {
    const content = document.getElementById('mobile-vrijheid-content');
    const source = document.getElementById('freedom-calculator-section');
    if (content && source) {
      content.appendChild(source);
      openSheet(vrijheidSheet);
    }
  });

  overlay?.addEventListener('click', closeSheets);
  closeSheetBtns.forEach(btn => btn.addEventListener('click', closeSheets));

  // Feedback Logic
  const feedbackFab = document.getElementById('feedback-fab');
  const feedbackModal = document.getElementById('feedback-modal');
  const closeFeedbackModal = document.getElementById('close-feedback-modal');
  const feedbackSelection = document.getElementById('feedback-selection');
  const feedbackForm = document.getElementById('feedback-form');
  const feedbackSuccess = document.getElementById('feedback-success');
  const feedbackOptionBtns = document.querySelectorAll('.feedback-option-btn');
  const backToSelection = document.getElementById('back-to-selection');
  const submitFeedback = document.getElementById('submit-feedback');
  const closeFeedbackSuccess = document.getElementById('close-feedback-success');
  const feedbackText = document.getElementById('feedback-text') as HTMLTextAreaElement;
  const feedbackFormTitle = document.getElementById('feedback-form-title');

  const toggleFeedbackModal = () => {
    if (feedbackModal) {
      const isHidden = feedbackModal.classList.contains('hidden');
      feedbackModal.classList.toggle('hidden');
      
      // Toggle FAB icons
      const msgIcon = feedbackFab?.querySelector('[data-lucide="message-square-plus"]');
      const xIcon = feedbackFab?.querySelector('[data-lucide="x"]');
      const pulse1 = document.getElementById('feedback-pulse-1');
      const pulse2 = document.getElementById('feedback-pulse-2');
      
      if (isHidden) {
        msgIcon?.classList.add('hidden');
        xIcon?.classList.remove('hidden');
        pulse1?.classList.add('hidden');
        pulse2?.classList.add('hidden');
        // Reset to selection state when opening
        feedbackSelection?.classList.remove('hidden');
        feedbackForm?.classList.add('hidden');
        feedbackSuccess?.classList.add('hidden');
        if (feedbackText) feedbackText.value = '';
      } else {
        msgIcon?.classList.remove('hidden');
        xIcon?.classList.add('hidden');
        pulse1?.classList.remove('hidden');
        pulse2?.classList.remove('hidden');
      }
    }
  };

  if (feedbackFab) feedbackFab.addEventListener('click', toggleFeedbackModal);
  if (closeFeedbackModal) closeFeedbackModal.addEventListener('click', toggleFeedbackModal);

  // Bruto/Netto Toggle
  const viewBrutoBtn = document.getElementById('view-bruto-btn');
  const viewNettoBtn = document.getElementById('view-netto-btn');

  // Summary Panel Logic
  const toggleSummaryBtn = document.getElementById('toggle-summary-panel');
  const summaryPanel = document.getElementById('summary-panel');
  const summaryToggleIcon = document.getElementById('summary-toggle-icon');
  const showSummaryDetailsBtn = document.getElementById('show-summary-details');
  const summaryDetailsContent = document.getElementById('summary-details-content');

  toggleSummaryBtn?.addEventListener('click', () => {
    const isOpen = summaryPanel?.classList.contains('opacity-100');
    if (isOpen) {
      summaryPanel?.classList.add('-translate-y-full', 'opacity-0', 'pointer-events-none');
      summaryPanel?.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
      summaryToggleIcon?.classList.remove('rotate-180');
    } else {
      summaryPanel?.classList.remove('-translate-y-full', 'opacity-0', 'pointer-events-none');
      summaryPanel?.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
      summaryToggleIcon?.classList.add('rotate-180');
    }
  });

  showSummaryDetailsBtn?.addEventListener('click', () => {
    summaryDetailsContent?.classList.toggle('hidden');
    if (!summaryDetailsContent?.classList.contains('hidden')) {
      updateSummaryDetails();
    }
  });

  viewBrutoBtn?.addEventListener('click', () => {
    pieChartMode = 'bruto';
    updateUI();
  });

  viewNettoBtn?.addEventListener('click', () => {
    pieChartMode = 'netto';
    updateUI();
  });

  const investmentInput = document.getElementById('investment-amount-input') as HTMLInputElement;
  if (investmentInput) {
    formatNumericInput(investmentInput, (val) => {
      investmentAmount = val;
      updateUI();
    });
  }

  // Debt Management
  const addDebtBtn = document.getElementById('add-debt-btn');
  const addDebtModal = document.getElementById('add-debt-modal');
  const closeAddDebtModal = document.getElementById('close-add-debt-modal');
  const cancelAddDebt = document.getElementById('cancel-add-debt');
  const saveNewDebtBtn = document.getElementById('save-new-debt');
  const newDebtName = document.getElementById('new-debt-name') as HTMLInputElement;
  const newDebtValue = document.getElementById('new-debt-value') as HTMLInputElement;

  addDebtBtn?.addEventListener('click', () => {
    if (addDebtModal && newDebtName && newDebtValue) {
      newDebtName.value = '';
      newDebtValue.value = '';
      addDebtModal.classList.remove('hidden');
      newDebtName.focus();
    }
  });

  if (newDebtValue) {
    formatNumericInput(newDebtValue, (val) => {
      // Just formatting here, value is read on save
    });
  }

  const hideDebtModal = () => {
    if (addDebtModal) addDebtModal.classList.add('hidden');
  };

  closeAddDebtModal?.addEventListener('click', hideDebtModal);
  cancelAddDebt?.addEventListener('click', hideDebtModal);

  saveNewDebtBtn?.addEventListener('click', () => {
    if (!newDebtName || !newDebtValue) return;
    const name = newDebtName.value.trim() || 'Nieuwe Schuld';
    const value = parseNumber(newDebtValue.value);
    const target = parseFloat((document.getElementById('new-debt-target') as HTMLInputElement)?.value) || 0;
    const id = Math.random().toString(36).substring(2, 9);
    debts.push({ id, name, value, target });
    hideDebtModal();
    updateUI();
  });

  feedbackOptionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = (btn as HTMLElement).dataset.type;
      feedbackSelection?.classList.add('hidden');
      feedbackForm?.classList.remove('hidden');
      if (feedbackFormTitle) {
        feedbackFormTitle.textContent = type === 'bug' ? 'Meld een probleem' : 'Stel een functie voor';
      }
      if (feedbackText) {
        feedbackText.placeholder = type === 'bug' ? 'Wat gaat er mis?' : 'Wat zou je graag willen zien?';
        setTimeout(() => feedbackText.focus(), 100);
      }
    });
  });

  if (backToSelection) {
    backToSelection.addEventListener('click', () => {
      feedbackForm?.classList.add('hidden');
      feedbackSelection?.classList.remove('hidden');
    });
  }

  if (submitFeedback) {
    submitFeedback.addEventListener('click', () => {
      if (feedbackText && feedbackText.value.trim().length < 5) {
        alert('Vertel ons iets meer...');
        return;
      }
      // Simulate sending
      feedbackForm?.classList.add('hidden');
      feedbackSuccess?.classList.remove('hidden');
    });
  }

  if (closeFeedbackSuccess) {
    closeFeedbackSuccess.addEventListener('click', toggleFeedbackModal);
  }

  // FAQ Modal
  const faqBtn = document.getElementById('faq-btn');
  const mobileFaqBtn = document.getElementById('mobile-faq-btn');
  const faqModal = document.getElementById('faq-modal');
  const closeFaqModal = document.getElementById('close-faq-modal');
  const faqModalOk = document.getElementById('faq-modal-ok');

  const toggleFaqModal = () => {
    faqModal?.classList.toggle('hidden');
  };

  faqBtn?.addEventListener('click', toggleFaqModal);
  mobileFaqBtn?.addEventListener('click', toggleFaqModal);
  closeFaqModal?.addEventListener('click', toggleFaqModal);
  faqModalOk?.addEventListener('click', toggleFaqModal);

  // Inspiration Modal
  const inspirationTrigger = document.getElementById('inspiration-trigger');
  const inspirationModal = document.getElementById('inspiration-modal');
  const closeInspirationBtn = document.getElementById('close-inspiration-btn');

  inspirationTrigger?.addEventListener('click', () => {
    inspirationModal?.classList.remove('hidden');
  });

  closeInspirationBtn?.addEventListener('click', () => {
    inspirationModal?.classList.add('hidden');
  });

  // Setup swipe-to-close for bottom sheets
  setupSwipeToClose('beheer-bottom-sheet');
  setupSwipeToClose('historie-bottom-sheet');
  setupSwipeToClose('vrijheid-bottom-sheet');

  createIcons({ icons: usedIcons });
}

// Initial Load
loadState();
checkOnboarding();
updateUI();
initEventListeners();
