import { Chart, registerables } from 'chart.js';
import { createIcons, icons } from 'lucide';
import * as d3 from 'd3';
import CryptoJS from 'crypto-js';

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
    ctx.fillStyle = options.labelColor || '#94a3b8';
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
}

interface Debt {
  id: string;
  name: string;
  value: number;
}

interface HistoryEntry {
  date: string;
  totalValue: number;
  assets: Asset[];
  debts?: Debt[];
}

const DEFAULT_ASSETS: Asset[] = [
  { id: '1', name: 'Aandelen', value: 5000, target: 45, color: '#3b82f6', category: 'Groei' },
  { id: '2', name: 'Obligaties', value: 1500, target: 15, color: '#10b981', category: 'Defensief' },
  { id: '3', name: 'Vastgoed', value: 1000, target: 10, color: '#6366f1', category: 'Groei' },
  { id: '4', name: 'Spaargeld', value: 1000, target: 5, color: '#22c55e', category: 'Defensief' },
  { id: '5', name: 'Goud', value: 500, target: 5, color: '#eab308', category: 'Defensief' },
  { id: '6', name: 'Zilver', value: 200, target: 2, color: '#94a3b8', category: 'Defensief' },
  { id: '7', name: 'Bitcoin', value: 800, target: 10, color: '#f97316', category: 'Speculatief' },
  { id: '8', name: 'Auto', value: 1000, target: 8, color: '#ec4899', category: 'Defensief' },
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
let averageDutchChart: Chart | null = null;

// Track previous values for animations
let prevTotalValue = 0;
let prevCategoryValues = { Groei: 0, Defensief: 0, Speculatief: 0 };

const formatCurrency = (value: number) => {
  if (isPrivacyMode) return '€ ••••';
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('nl-NL').format(value);
};

const parseNumber = (value: string) => {
  const cleanValue = value.replace(/[^0-9,.]/g, '').replace(',', '.');
  return parseFloat(cleanValue) || 0;
};

const animateValue = (id: string, start: number, end: number, duration: number, formatter: (v: number) => string) => {
  const obj = document.getElementById(id);
  if (!obj) return;
  
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
  try {
    const bytes = CryptoJS.AES.decrypt(data, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (e) {
    return '';
  }
}

function saveState() {
  const dateInput = document.getElementById('current-date') as HTMLInputElement;
  const state = {
    assets,
    investmentAmount,
    targetNetWorth,
    date: dateInput ? dateInput.value : '',
    history,
    isDarkMode,
    isPrivacyMode,
    monthlyExpenses,
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

function loadState() {
  // Migration: Check if old keys exist and try to import them if no new state exists
  const hasNewState = localStorage.getItem(STORAGE_KEY);
  if (!hasNewState) {
    const oldAssets = localStorage.getItem('current_assets');
    if (oldAssets) {
      try {
        const parsed = JSON.parse(oldAssets);
        assets = parsed.map((a: any) => ({
          id: a.id || Math.random().toString(36).substring(2, 9),
          name: a.description || a.name || 'Asset',
          value: a.amount || a.value || 0,
          target: 0,
          color: '#3b82f6',
          category: 'Groei'
        }));
        saveState();
      } catch (e) {}
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

  if (!newAssetName || !newAssetCategory || !newAssetTarget) return;

  const name = newAssetName.value.trim() || 'Nieuwe Asset';
  const category = newAssetCategory.value as Asset['category'];
  const target = parseFloat(newAssetTarget.value) || 0;

  const id = Math.random().toString(36).substring(2, 9);
  const colors = ['#3b82f6', '#10b981', '#6366f1', '#22c55e', '#eab308', '#94a3b8', '#f97316', '#ec4899'];
  
  const newAsset: Asset = {
    id,
    name,
    value: 0,
    target,
    color: colors[assets.length % colors.length],
    category
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
  const textColor = isDark ? '#94a3b8' : '#64748b';

  averageDutchChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Eigen Woning', 'Spaargeld', 'Beleggingen', 'Overig'],
      datasets: [{
        data: [58, 22, 12, 8],
        backgroundColor: ['#3b82f6', '#10b981', '#f97316', '#6366f1'],
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

function updateUI() {
  saveState();
  
  const privacyToggles = document.querySelectorAll('.privacy-toggle-btn');
  privacyToggles.forEach(btn => {
    btn.innerHTML = isPrivacyMode ? '<i data-lucide="eye-off" class="w-5 h-5"></i>' : '<i data-lucide="eye" class="w-5 h-5"></i>';
  });
  createIcons({ icons });

  const totalAssets = assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalDebts = debts.reduce((sum, debt) => sum + debt.value, 0);
  const netWorth = totalAssets - totalDebts;

  const liquidValue = assets
    .filter(asset => !asset.name.toLowerCase().includes('vastgoed'))
    .reduce((sum, asset) => sum + asset.value, 0);
  const totalTarget = assets.reduce((sum, asset) => sum + asset.target, 0);

  // Update Pie Chart Toggle Styles
  const viewBrutoBtn = document.getElementById('view-bruto-btn');
  const viewNettoBtn = document.getElementById('view-netto-btn');
  const pieTotalLabel = document.getElementById('pie-total-label');

  if (viewBrutoBtn && viewNettoBtn) {
    if (pieChartMode === 'bruto') {
      viewBrutoBtn.className = 'px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400';
      viewNettoBtn.className = 'px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all text-slate-500 dark:text-slate-400';
      if (pieTotalLabel) pieTotalLabel.textContent = 'Bruto Vermogen';
    } else {
      viewNettoBtn.className = 'px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400';
      viewBrutoBtn.className = 'px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all text-slate-500 dark:text-slate-400';
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
    const calcValue = freedomCustomNetWorth > 0 ? freedomCustomNetWorth : (liquidValue - totalDebts);
    const months = monthlyExpenses > 0 ? calcValue / monthlyExpenses : 0;
    const passiveMonthly = (calcValue * 0.04) / 12;

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
          icon.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-400');
          icon.classList.add('bg-emerald-100', 'dark:bg-emerald-900/40', 'text-emerald-600', 'dark:text-emerald-400');
          check.classList.remove('text-slate-200', 'dark:text-slate-800');
          check.classList.add('text-emerald-500');
        } else {
          icon.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-400');
          icon.classList.remove('bg-emerald-100', 'dark:bg-emerald-900/40', 'text-emerald-600', 'dark:text-emerald-400');
          check.classList.add('text-slate-200', 'dark:text-slate-800');
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
  animateValue('total-value', prevTotalValue, netWorth, 500, formatCurrency);
  animateValue('pie-total-value', prevTotalValue, currentDisplayValue, 500, formatCurrency);
  
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
      color: isDarkMode ? '#60a5fa' : '#1d4ed8',
      bg: isDarkMode ? 'rgba(30, 64, 175, 0.3)' : '#eff6ff'
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

  prevTotalValue = currentDisplayValue;

  // Target Net Worth Logic
  const targetNetWorthInput = document.getElementById('target-net-worth-input') as HTMLInputElement;
  const targetProgressBar = document.getElementById('target-progress-bar');
  const targetProgressPercent = document.getElementById('target-progress-percent');
  const targetRemainingText = document.getElementById('target-remaining-text');

  if (targetNetWorthInput && !targetNetWorthInput.matches(':focus')) {
    targetNetWorthInput.value = formatNumber(targetNetWorth);
  }

  if (targetProgressBar && targetProgressPercent && targetRemainingText) {
    const progress = targetNetWorth > 0 ? (netWorth / targetNetWorth) * 100 : 0;
    const clampedProgress = Math.min(100, progress);
    const remaining = Math.max(0, targetNetWorth - netWorth);

    targetProgressBar.style.width = `${clampedProgress}%`;
    targetProgressPercent.textContent = `${progress.toFixed(1)}%`;
    targetRemainingText.textContent = remaining > 0 
      ? `Nog ${formatCurrency(remaining)} te gaan`
      : 'Doel bereikt! 🎉';
    
    if (progress >= 100) {
      targetProgressBar.classList.remove('bg-blue-600');
      targetProgressBar.classList.add('bg-green-500');
    } else {
      targetProgressBar.classList.add('bg-blue-600');
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
  const comparisonSection = document.getElementById('comparison-section');

  if (simulatorSection) simulatorSection.style.display = isPlannerMode ? '' : 'none';
  if (rebalanceSection) rebalanceSection.style.display = isPlannerMode ? '' : 'none';
  if (targetColumnHeader) targetColumnHeader.style.display = isPlannerMode ? '' : 'none';
  if (comparisonSection) comparisonSection.style.display = isPlannerMode ? '' : 'none';
  
  renderAssets();
  renderDebts();
  renderHistory();
  renderCategoryCards();
  renderRebalancePlan();
  renderRecommendations();
  updateCharts();
  updateTreemap();
}

function renderDebts() {
  const tbody = document.getElementById('debt-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (debts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="px-6 py-8 text-center text-slate-400 italic text-sm">
          Geen schulden toegevoegd
        </td>
      </tr>
    `;
    return;
  }

  debts.forEach(debt => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group';
    tr.innerHTML = `
      <td class="px-3 sm:px-6 py-4">
        <input type="text" value="${debt.name}" class="debt-name-input bg-transparent border-none p-0 focus:ring-0 font-medium text-slate-900 dark:text-white w-full" data-id="${debt.id}" />
      </td>
      <td class="px-3 sm:px-6 py-4">
        <div class="flex items-center gap-1">
          <span class="text-slate-400 text-xs">€</span>
          <input type="text" value="${formatNumber(debt.value)}" class="debt-value-input bg-transparent border-none p-0 focus:ring-0 font-mono font-bold text-red-600 dark:text-red-400 w-full" data-id="${debt.id}" />
        </div>
      </td>
      <td class="px-3 sm:px-6 py-4 text-right">
        <button class="delete-debt-btn p-2 text-slate-300 hover:text-red-500 transition-colors" data-id="${debt.id}">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Add event listeners for inputs
  tbody.querySelectorAll('.debt-name-input').forEach(input => {
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
      target.value = parseNumber(target.value).toString();
    });
    input.addEventListener('blur', (e) => {
      const target = e.target as HTMLInputElement;
      const id = target.dataset.id;
      const value = parseNumber(target.value);
      debts = debts.map(d => d.id === id ? { ...d, value } : d);
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

  createIcons({ icons });
}

function renderCategoryCards() {
  const categoryCards = document.getElementById('category-cards');
  if (!categoryCards) return;

  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const categories = { Groei: 0, Defensief: 0, Speculatief: 0 };
  assets.forEach(a => categories[a.category] += a.value);

  categoryCards.innerHTML = Object.entries(categories).map(([name, value]) => {
    const percent = totalAssets > 0 ? (value / totalAssets) * 100 : 0;
    const color = name === 'Groei' ? '#3b82f6' : name === 'Defensief' ? '#10b981' : '#f97316';
    const idPrefix = name.toLowerCase();
    return `
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between dark:bg-slate-900 dark:border-slate-800">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 dark:text-slate-400">${name}</p>
          <p id="cat-percent-${idPrefix}" class="text-2xl font-bold dark:text-white">${formatPercent(percent)}</p>
          <p id="cat-value-${idPrefix}" class="text-sm text-slate-400 dark:text-slate-500">${formatCurrency(value)}</p>
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
    const prevPercent = prevTotalValue > 0 ? (prevValue / prevTotalValue) * 100 : 0;
    
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
      <tr class="hover:bg-slate-50/50 transition-colors group dark:hover:bg-slate-800/50">
        <td class="px-3 sm:px-6 py-4 min-w-[120px] sm:min-w-[150px]">
          <div class="flex items-center gap-2 sm:gap-3">
            <input
              type="text"
              value="${asset.name}"
              data-id="${asset.id}"
              data-type="name"
              class="asset-input w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-0 transition-all outline-none py-0 sm:py-1 text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300 dark:hover:border-slate-700"
            />
          </div>
        </td>
        <td class="px-3 sm:px-6 py-4 min-w-[100px] sm:min-w-[180px]">
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between gap-1 sm:gap-2">
              <div class="flex items-center gap-1">
                <span class="text-slate-400 font-mono text-sm sm:text-base">€</span>
                <input
                  type="text"
                  value="${formatNumber(asset.value)}"
                  data-id="${asset.id}"
                  data-type="value"
                  class="asset-input asset-value-input w-20 sm:w-24 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-0 transition-all outline-none py-1 font-mono text-sm sm:text-base dark:text-white dark:hover:border-slate-700"
                />
              </div>
              <span class="font-mono text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">${formatPercent(currentPercent)}</span>
            </div>
            <!-- Progress Bar -->
            <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                class="h-full rounded-full transition-all duration-500" 
                style="width: ${Math.min(100, currentPercent)}%; background-color: ${asset.color}"
              ></div>
            </div>
          </div>
        </td>
        <td class="px-3 sm:px-6 py-4 text-right min-w-[60px] sm:min-w-[180px]">
          <div class="flex items-center justify-end gap-2 sm:gap-3">
            <select
              data-id="${asset.id}"
              data-type="category"
              class="asset-input hidden sm:block bg-transparent border-none text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 focus:ring-0 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 p-0"
            >
              <option value="Groei" ${asset.category === 'Groei' ? 'selected' : ''}>Groei</option>
              <option value="Defensief" ${asset.category === 'Defensief' ? 'selected' : ''}>Defensief</option>
              <option value="Speculatief" ${asset.category === 'Speculatief' ? 'selected' : ''}>Speculatief</option>
            </select>
            <div class="${isPlannerMode ? 'hidden sm:flex' : 'hidden'} items-center gap-1">
              <input
                type="number"
                value="${asset.target}"
                data-id="${asset.id}"
                data-type="target"
                class="asset-input w-8 sm:w-10 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-0 transition-all outline-none py-1 font-mono text-right text-sm dark:text-white dark:hover:border-slate-700"
              />
              <span class="text-slate-400 font-mono text-xs sm:text-sm">%</span>
            </div>
            <button data-id="${asset.id}" class="delete-asset-btn text-slate-300 hover:text-red-500 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Add event listeners for inputs
  tableBody.querySelectorAll('.asset-input').forEach(input => {
    input.addEventListener('focus', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.dataset.type === 'value') {
        target.value = parseNumber(target.value).toString();
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

  createIcons({ icons });
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
    const statusClass = isOver ? "bg-red-50/50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30" : isUnder ? "bg-blue-50/50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/30" : "bg-slate-50/50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800";
    const icon = isOver ? "arrow-up-right" : isUnder ? "arrow-down-right" : "minus";
    const iconColor = isOver ? "text-red-500" : isUnder ? "text-blue-500" : "text-slate-400";

    return `
      <div class="p-4 rounded-xl border flex flex-col gap-1 ${statusClass}">
        <div class="flex justify-between items-start">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">${asset.name}</span>
          <i data-lucide="${icon}" class="w-4 h-4 ${iconColor}"></i>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-lg font-bold dark:text-white">${rebalanceAmount > 0 ? '+' : ''}${formatCurrency(rebalanceAmount)}</span>
          <span class="text-xs font-medium ${deviation > 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}">
            (${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}%)
          </span>
        </div>
        <p class="text-xs text-slate-500 mt-1 dark:text-slate-400">
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
              <span class="text-sm font-medium">${item.name}</span>
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
        return `
          <div class="flex items-center text-sm sm:text-base group">
            <div class="w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0 mr-2 sm:mr-3 transition-transform group-hover:scale-125" style="background-color: ${asset.color}"></div>
            <span class="text-slate-600 flex-1 truncate dark:text-slate-400" title="${asset.name}">${asset.name}</span>
            <span class="font-mono font-bold text-slate-900 ml-2 dark:text-white text-sm sm:text-base">${formatPercent(currentPercent)}</span>
          </div>
        `;
      }).join('');
    } else {
      const assetPercent = (totalAssets + totalDebts) > 0 ? (totalAssets / (totalAssets + totalDebts)) * 100 : 0;
      const debtPercent = (totalAssets + totalDebts) > 0 ? (totalDebts / (totalAssets + totalDebts)) * 100 : 0;
      pieLegend.innerHTML = `
        <div class="flex items-center text-sm sm:text-base group">
          <div class="w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0 mr-2 sm:mr-3 transition-transform group-hover:scale-125" style="background-color: #3b82f6"></div>
          <span class="text-slate-600 flex-1 truncate dark:text-slate-400">Bezittingen</span>
          <span class="font-mono font-bold text-slate-900 ml-2 dark:text-white text-sm sm:text-base">${formatPercent(assetPercent)}</span>
        </div>
        <div class="flex items-center text-sm sm:text-base group">
          <div class="w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0 mr-2 sm:mr-3 transition-transform group-hover:scale-125" style="background-color: #ef4444"></div>
          <span class="text-slate-600 flex-1 truncate dark:text-slate-400">Schulden</span>
          <span class="font-mono font-bold text-slate-900 ml-2 dark:text-white text-sm sm:text-base">${formatPercent(debtPercent)}</span>
        </div>
      `;
    }
  }

  const historyTableBody = document.getElementById('history-table-body');
  if (historyTableBody) {
    historyTableBody.innerHTML = history.slice().reverse().map((entry, idx) => {
      const realIdx = history.length - 1 - idx;
      return `
        <tr class="hover:bg-slate-50/50 transition-colors group dark:hover:bg-slate-800/50">
          <td class="px-6 py-4 text-sm font-medium text-slate-700 whitespace-nowrap dark:text-slate-300">${formatDate(entry.date)}</td>
          <td class="px-6 py-4 text-sm font-mono dark:text-slate-400">${formatCurrency(entry.totalValue)}</td>
          <td class="px-6 py-4 text-right space-x-2">
            <button data-idx="${realIdx}" class="load-history-btn text-blue-600 hover:text-blue-800 p-1 transition-colors dark:text-blue-400 dark:hover:text-blue-300" title="Laden">
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
  createIcons({ icons });
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
    labels = assets.map(a => a.name);
    values = assets.map(a => a.value);
    colors = assets.map(a => a.color);
  } else {
    labels = ['Bezittingen', 'Schulden'];
    values = [totalAssets, totalDebts];
    colors = ['#3b82f6', '#ef4444'];
  }

  const currentPercents = assets.map(a => totalAssets > 0 ? (a.value / totalAssets) * 100 : 0);
  const targets = assets.map(a => a.target);

  const textColor = isDarkMode ? '#94a3b8' : '#64748b';
  const gridColor = isDarkMode ? '#1e293b' : '#f1f5f9';

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
        borderColor: isDarkMode ? '#0f172a' : '#ffffff',
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: 30
      },
      onClick: (event, elements) => {
        if (elements.length > 0 && pieChartMode === 'bruto') {
          const index = elements[0].index;
          const assetId = assets[index].id;
          highlightAssetRow(assetId);
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
          titleColor: isDarkMode ? '#ffffff' : '#0f172a',
          bodyColor: isDarkMode ? '#cbd5e1' : '#64748b',
          borderColor: isDarkMode ? '#334155' : '#e2e8f0',
          borderWidth: 1,
          yAlign: 'bottom',
          callbacks: {
            label: (context) => {
              const value = context.raw as number;
              const total = context.dataset.data.reduce((a: any, b: any) => a + b, 0) as number;
              const percentage = ((value / total) * 100).toFixed(1);
              return ` ${context.label}: ${formatCurrency(value)} (${percentage}%)`;
            }
          }
        },
        centerText: {
          display: true,
          value: (window as any).chartTotalValue || '€ 0',
          label: pieChartMode === 'bruto' ? 'Bruto' : 'Netto',
          badge: {
            text: (window as any).chartStatus?.text,
            color: (window as any).chartStatus?.color,
            bg: (window as any).chartStatus?.bg
          }
        }
      },
      cutout: '60%'
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
          backgroundColor: '#3b82f6',
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
        borderColor: '#3b82f6',
        backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#3b82f6'
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

  const root = d3.hierarchy(data)
    .sum(d => (d as any).value)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  d3.treemap()
    .size([width, height])
    .padding(2)
    .round(true)
    (root);

  const svg = d3.select(container)
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
      const percentage = (((d.value || 0) / totalValue) * 100).toFixed(1);
      const name = (d.data as any).name;
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

function highlightAssetRow(id: string) {
  const inputs = document.querySelectorAll(`.asset-input[data-id="${id}"]`);
  inputs.forEach(input => {
    const tr = input.closest('tr');
    if (tr) {
      tr.classList.add('bg-blue-50', 'dark:bg-blue-900/20', 'scale-[1.01]', 'ring-1', 'ring-blue-200', 'dark:ring-blue-800');
      tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        tr.classList.remove('bg-blue-50', 'dark:bg-blue-900/20', 'scale-[1.01]', 'ring-1', 'ring-blue-200', 'dark:ring-blue-800');
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

function checkOnboarding() {
  const completed = localStorage.getItem('onboarding_completed');
  const hasData = localStorage.getItem(STORAGE_KEY);
  
  if (!completed && !hasData) {
    const modal = document.getElementById('onboarding-modal');
    if (modal) {
      modal.classList.remove('hidden');
      
      // Smooth fade-up effect for the question
      const questionEl = document.getElementById('onboarding-question');
      if (questionEl) {
        setTimeout(() => {
          questionEl.classList.remove('opacity-0', 'translate-y-4', 'blur-sm');
        }, 400); // Delay slightly after modal appears
      }
    }
  }
}

function initEventListeners() {
  const tableBody = document.getElementById('asset-table-body');
  if (tableBody) {
    tableBody.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.classList.contains('asset-input')) {
        const type = target.dataset.type;
        if (type === 'value' || type === 'target') {
          let rawValue = target.value;
          if (type === 'value') {
            rawValue = rawValue.replace(/\./g, '').replace(',', '.');
          }
          const val = parseFloat(rawValue);
          const isValid = !isNaN(val) && val >= 0 && (type !== 'target' || val <= 100);
          
          if (!isValid && rawValue !== '') {
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
        let rawValue = target.value;
        
        if (type === 'value') {
          // Remove dots (thousands) and replace comma with dot (decimal) for parsing
          rawValue = rawValue.replace(/\./g, '').replace(',', '.');
        }
        
        let val = parseFloat(rawValue);
        
        // Validation logic
        if (type === 'value' || type === 'target') {
          if (isNaN(val) || val < 0) {
            val = 0;
          } else if (type === 'target' && val > 100) {
            val = 100;
          }
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

  const targetNetWorthInput = document.getElementById('target-net-worth-input') as HTMLInputElement;
  let targetNetWorthTimeout: any = null;
  if (targetNetWorthInput) {
    targetNetWorthInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const cleanValue = target.value.replace(/[^0-9,.]/g, '').replace(',', '.');
      const val = parseFloat(cleanValue);
      const isValid = !isNaN(val) && val >= 0;
      
      if (!isValid && target.value !== '') {
        target.classList.add('text-red-500');
      } else {
        target.classList.remove('text-red-500');
      }

      targetNetWorth = isValid ? val : 0;
      if (targetNetWorthTimeout) clearTimeout(targetNetWorthTimeout);
      targetNetWorthTimeout = setTimeout(() => updateUI(), 100);
    });

    targetNetWorthInput.addEventListener('blur', () => {
      targetNetWorthInput.value = formatNumber(targetNetWorth);
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
        securityStatusIcon.className = 'p-2 rounded-lg bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
        securityStatusIcon.innerHTML = '<i data-lucide="unlock" class="w-5 h-5"></i>';
      }
      if (savePasswordBtn) savePasswordBtn.textContent = 'Wachtwoord Instellen';
      if (removePasswordBtn) removePasswordBtn.classList.add('hidden');
      if (lockNowBtn) lockNowBtn.classList.add('hidden');

      securityBadge?.classList.remove('hidden');
    }
    if (confirmPasswordContainer) confirmPasswordContainer.classList.remove('hidden');
    createIcons({ icons });
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
    monthlyExpensesInput.value = monthlyExpenses.toString();
    monthlyExpensesInput.addEventListener('input', () => {
      monthlyExpenses = parseFloat(monthlyExpensesInput.value) || 0;
      updateUI();
    });
  }

  const freedomCustomNetworthInput = document.getElementById('freedom-custom-networth') as HTMLInputElement;
  if (freedomCustomNetworthInput) {
    freedomCustomNetworthInput.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      freedomCustomNetWorth = parseNumber(val);
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
      const newPass = masterPasswordInput.value;
      const confirmPass = confirmPasswordInput.value;
      
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
    const pass = unlockInput.value;
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
        } catch (e) {
          alert('Ongeldig wachtwoord.');
        }
      } else {
        alert('Ongeldig wachtwoord.');
      }
    }
  };

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

  // Onboarding
  const onboardingModal = document.getElementById('onboarding-modal');
  const onboardingStartBtn = document.getElementById('onboarding-start-btn');
  const onboardingExampleBtn = document.getElementById('onboarding-example-btn');
  const onboardingCheckboxes = document.querySelectorAll('.onboarding-asset-checkbox') as NodeListOf<HTMLInputElement>;

  if (onboardingStartBtn) {
    onboardingStartBtn.addEventListener('click', () => {
      const selectedAssets: Asset[] = [];
      const colors = ['#3b82f6', '#10b981', '#f97316', '#6366f1', '#eab308', '#ec4899'];
      
      onboardingCheckboxes.forEach((cb, index) => {
        if (cb.checked) {
          selectedAssets.push({
            id: Math.random().toString(36).substring(2, 9),
            name: cb.value,
            value: 0,
            target: 0,
            color: colors[index % colors.length],
            category: cb.value === 'Crypto' ? 'Speculatief' : (cb.value === 'Spaargeld' || cb.value === 'Goud' ? 'Defensief' : 'Groei')
          });
        }
      });
      
      if (selectedAssets.length === 0) {
        alert('Selecteer ten minste één asset om te beginnen.');
        return;
      }
      
      assets = selectedAssets;
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
    });
  }

  if (onboardingExampleBtn) {
    onboardingExampleBtn.addEventListener('click', () => {
      assets = [
        { id: 'ex1', name: 'Eigen Woning', value: 250000, target: 50, color: '#3b82f6', category: 'Groei' },
        { id: 'ex2', name: 'Spaargeld', value: 50000, target: 20, color: '#10b981', category: 'Defensief' },
        { id: 'ex3', name: 'Beleggingen', value: 30000, target: 20, color: '#f97316', category: 'Groei' },
        { id: 'ex4', name: 'Overig', value: 20000, target: 10, color: '#6366f1', category: 'Defensief' },
      ];
      localStorage.setItem('onboarding_completed', 'true');
      if (onboardingModal) onboardingModal.classList.add('hidden');
      
      const banner = document.getElementById('example-data-banner');
      if (banner) banner.classList.remove('hidden');
      
      saveState();
      updateUI();
    });
  }

  const removeExampleBtn = document.getElementById('remove-example-data');
  if (removeExampleBtn) {
    removeExampleBtn.addEventListener('click', () => {
      const banner = document.getElementById('example-data-banner');
      if (banner) banner.classList.add('hidden');
    });
  }

  // Bottom Sheet Logic
  const overlay = document.getElementById('bottom-sheet-overlay');
  const beheerSheet = document.getElementById('beheer-bottom-sheet');
  const historieSheet = document.getElementById('historie-bottom-sheet');
  const vrijheidSheet = document.getElementById('vrijheid-bottom-sheet');
  const mobileBeheerBtn = document.getElementById('mobile-beheer-btn');
  const mobileHistorieBtn = document.getElementById('mobile-historie-btn');
  const mobileVrijheidBtn = document.getElementById('mobile-vrijheid-btn');
  const closeSheetBtns = document.querySelectorAll('.close-bottom-sheet');

  const openSheet = (sheet: HTMLElement | null) => {
    if (!sheet || !overlay) return;
    overlay.classList.add('open');
    sheet.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeSheets = () => {
    overlay?.classList.remove('open');
    beheerSheet?.classList.remove('open');
    historieSheet?.classList.remove('open');
    vrijheidSheet?.classList.remove('open');
    document.body.style.overflow = '';
  };

  mobileBeheerBtn?.addEventListener('click', () => {
    const content = document.getElementById('mobile-beheer-content');
    const source = document.getElementById('assets-section');
    const debtsSource = document.getElementById('debts-section');
    if (content && source && debtsSource) {
      content.appendChild(source);
      content.appendChild(debtsSource);
      openSheet(beheerSheet);
    }
  });

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

  viewBrutoBtn?.addEventListener('click', () => {
    pieChartMode = 'bruto';
    updateUI();
  });

  viewNettoBtn?.addEventListener('click', () => {
    pieChartMode = 'netto';
    updateUI();
  });

  // Debt Management
  const addDebtBtn = document.getElementById('add-debt-btn');
  addDebtBtn?.addEventListener('click', () => {
    const id = Math.random().toString(36).substring(2, 9);
    debts.push({ id, name: 'Nieuwe Schuld', value: 0 });
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

  createIcons({ icons });
}

// Initial Load
loadState();
checkOnboarding();
updateUI();
initEventListeners();
