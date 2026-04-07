import { Chart, registerables } from 'chart.js';
import { createIcons, icons } from 'lucide';
import * as d3 from 'd3';
import CryptoJS from 'crypto-js';

Chart.register(...registerables);

interface Asset {
  id: string;
  name: string;
  value: number;
  target: number;
  color: string;
  category: 'Groei' | 'Defensief' | 'Speculatief';
}

interface HistoryEntry {
  date: string;
  totalValue: number;
  assets: Asset[];
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

let assets: Asset[] = [...DEFAULT_ASSETS];

let history: HistoryEntry[] = [];
let investmentAmount = 1000;
let isPlannerMode = true;
let isDarkMode = false;
let masterPassword = '';
let isEncrypted = false;
let pieChart: Chart | null = null;
let barChartCurrent: Chart | null = null;
let barChartComparison: Chart | null = null;
let historyChart: Chart | null = null;

// Track previous values for animations
let prevTotalValue = 0;
let prevCategoryValues = { Groei: 0, Defensief: 0, Speculatief: 0 };

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('nl-NL').format(value);
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

function encrypt(data: string, key: string): string {
  return CryptoJS.AES.encrypt(data, key).toString();
}

function decrypt(data: string, key: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(data, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return '';
  }
}

function saveState() {
  const dateInput = document.getElementById('current-date') as HTMLInputElement;
  const state = {
    assets,
    investmentAmount,
    date: dateInput.value,
    history,
    isDarkMode,
    isPlannerMode,
    isEncrypted: !!masterPassword
  };
  
  let dataToSave = JSON.stringify(state);
  if (masterPassword) {
    dataToSave = encrypt(dataToSave, masterPassword);
  }
  
  localStorage.setItem(STORAGE_KEY, dataToSave);
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    // Check if it's encrypted (doesn't start with {)
    if (!saved.trim().startsWith('{')) {
      isEncrypted = true;
      showLockScreen();
      return;
    }

    try {
      const state = JSON.parse(saved);
      applyState(state);
    } catch (e) {
      console.error('Failed to load state', e);
    }
  }
}

function applyState(state: any) {
  if (state.assets) assets = state.assets;
  if (state.investmentAmount !== undefined) investmentAmount = state.investmentAmount;
  if (state.history) history = state.history;
  if (state.isDarkMode !== undefined) {
    isDarkMode = state.isDarkMode;
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.body.classList.toggle('dark', isDarkMode);
  }
  if (state.isPlannerMode !== undefined) {
    isPlannerMode = state.isPlannerMode;
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
    if (input) input.focus();
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
  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
  
  const newEntry: HistoryEntry = {
    date: dateInput.value || new Date().toISOString().split('T')[0],
    totalValue,
    assets: JSON.parse(JSON.stringify(assets))
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
  const id = Math.random().toString(36).substring(2, 9);
  const colors = ['#3b82f6', '#10b981', '#6366f1', '#22c55e', '#eab308', '#94a3b8', '#f97316', '#ec4899'];
  const newAsset: Asset = {
    id,
    name: 'Nieuwe Asset',
    value: 0,
    target: 0,
    color: colors[assets.length % colors.length],
    category: 'Groei'
  };
  assets.push(newAsset);
  updateUI();
}

function resetToDefaults() {
  if (confirm('Weet je zeker dat je alle assets wilt herstellen naar de standaardwaarden? Je huidige invoer gaat verloren.')) {
    assets = JSON.parse(JSON.stringify(DEFAULT_ASSETS));
    updateUI();
  }
}

function updateUI() {
  saveState();
  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalTarget = assets.reduce((sum, asset) => sum + asset.target, 0);

  const categories = { Groei: 0, Defensief: 0, Speculatief: 0 };
  assets.forEach(a => categories[a.category] += a.value);

  // Animate total values
  animateValue('total-value', prevTotalValue, totalValue, 500, formatCurrency);
  animateValue('pie-total-value', prevTotalValue, totalValue, 500, formatCurrency);
  
  const pieCenterValue = document.getElementById('pie-center-value');
  const pieCenterStatus = document.getElementById('pie-center-status');
  if (pieCenterValue && pieCenterStatus) {
    animateValue('pie-center-value', prevTotalValue, totalValue, 500, formatCurrency);
    
    const specPercent = totalValue > 0 ? (categories.Speculatief / totalValue) * 100 : 0;
    const growthPercent = totalValue > 0 ? (categories.Groei / totalValue) * 100 : 0;
    const defPercent = totalValue > 0 ? (categories.Defensief / totalValue) * 100 : 0;
    
    let status = "Gebalanceerd";
    let statusClass = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    
    if (specPercent > 15) {
      status = "Speculatief";
      statusClass = "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400";
    } else if (growthPercent > 60) {
      status = "Groeigericht";
      statusClass = "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
    } else if (defPercent > 60) {
      status = "Defensief";
      statusClass = "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
    }
    
    pieCenterStatus.textContent = status;
    pieCenterStatus.className = `text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 uppercase tracking-tighter ${statusClass}`;
  }

  prevTotalValue = totalValue;

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
  
  const categoryCards = document.getElementById('category-cards');
  if (categoryCards) {
    categoryCards.innerHTML = Object.entries(categories).map(([name, value]) => {
      const percent = totalValue > 0 ? (value / totalValue) * 100 : 0;
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
      const percent = totalValue > 0 ? (value / totalValue) * 100 : 0;
      const prevPercent = prevTotalValue > 0 ? (prevValue / prevTotalValue) * 100 : 0;
      
      animateValue(`cat-percent-${idPrefix}`, prevPercent, percent, 500, formatPercent);
      animateValue(`cat-value-${idPrefix}`, prevValue, value, 500, formatCurrency);
    });
    prevCategoryValues = { ...categories };
  }

  const tableBody = document.getElementById('asset-table-body');
  if (tableBody) {
    tableBody.innerHTML = assets.map(asset => {
      const currentPercent = totalValue > 0 ? (asset.value / totalValue) * 100 : 0;
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
                    class="asset-input w-20 sm:w-24 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-0 transition-all outline-none py-1 font-mono text-sm sm:text-base dark:text-white dark:hover:border-slate-700"
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
  }

  const rebalanceList = document.getElementById('rebalance-list');
  if (rebalanceList) {
    rebalanceList.innerHTML = assets.map(asset => {
      const currentPercent = totalValue > 0 ? (asset.value / totalValue) * 100 : 0;
      const deviation = currentPercent - asset.target;
      const targetValue = (asset.target / 100) * totalValue;
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

  const recommendationsList = document.getElementById('recommendations-list');
  const recommendationsContainer = document.getElementById('investment-recommendations');
  
  if (recommendationsList && recommendationsContainer) {
    if (investmentAmount > 0) {
      const newTotal = totalValue + investmentAmount;
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

  const dateInput = document.getElementById('current-date') as HTMLInputElement;
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  const pieTotalValue = document.getElementById('pie-total-value');
  if (pieTotalValue) {
    pieTotalValue.textContent = formatCurrency(totalValue);
  }

  const pieLegend = document.getElementById('pie-legend');
  if (pieLegend) {
    pieLegend.innerHTML = assets.map(asset => {
      const currentPercent = totalValue > 0 ? (asset.value / totalValue) * 100 : 0;
      return `
        <div class="flex items-center text-sm sm:text-base group">
          <div class="w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0 mr-2 sm:mr-3 transition-transform group-hover:scale-125" style="background-color: ${asset.color}"></div>
          <span class="text-slate-600 flex-1 truncate dark:text-slate-400" title="${asset.name}">${asset.name}</span>
          <span class="font-mono font-bold text-slate-900 ml-2 dark:text-white text-sm sm:text-base">${formatPercent(currentPercent)}</span>
        </div>
      `;
    }).join('');
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

  const labels = assets.map(a => a.name);
  const values = assets.map(a => a.value);
  const colors = assets.map(a => a.color);
  const totalValue = assets.reduce((sum, a) => sum + a.value, 0);
  const currentPercents = assets.map(a => totalValue > 0 ? (a.value / totalValue) * 100 : 0);
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
        padding: 15
      },
      onClick: (event, elements) => {
        if (elements.length > 0) {
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
          callbacks: {
            label: (context) => formatCurrency(context.raw as number)
          }
        }
      },
      cutout: '60%'
    }
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
      const name = (d.data as any).name;
      const value = formatCurrency((d.data as any).value);
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

  const investmentInput = document.getElementById('investment-input') as HTMLInputElement;
  let investmentTimeout: any = null;
  if (investmentInput) {
    investmentInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const val = parseFloat(target.value);
      const isValid = !isNaN(val) && val >= 0;
      
      if (!isValid && target.value !== '') {
        target.classList.add('ring-2', 'ring-red-500', 'border-red-500');
      } else {
        target.classList.remove('ring-2', 'ring-red-500', 'border-red-500');
      }

      investmentAmount = isValid ? val : 0;
      if (investmentTimeout) clearTimeout(investmentTimeout);
      investmentTimeout = setTimeout(() => updateUI(), 100);
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
  const saveHistoryBtnMobile = document.getElementById('save-history-btn-mobile');
  
  const handleSaveHistory = () => {
    addToHistory();
  };

  if (saveHistoryBtn) saveHistoryBtn.addEventListener('click', handleSaveHistory);
  if (saveHistoryBtnMobile) saveHistoryBtnMobile.addEventListener('click', handleSaveHistory);

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
  const themeToggleMobile = document.getElementById('theme-toggle-mobile');
  
  const handleThemeToggle = () => {
    isDarkMode = !isDarkMode;
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.body.classList.toggle('dark', isDarkMode);
    saveState();
    updateUI();
  };

  if (themeToggle) themeToggle.addEventListener('click', handleThemeToggle);
  if (themeToggleMobile) themeToggleMobile.addEventListener('click', handleThemeToggle);

  const plannerToggle = document.getElementById('planner-toggle');
  const plannerToggleMobile = document.getElementById('planner-toggle-mobile');

  const handlePlannerToggle = () => {
    isPlannerMode = !isPlannerMode;
    saveState();
    updateUI();
  };

  if (plannerToggle) plannerToggle.addEventListener('click', handlePlannerToggle);
  if (plannerToggleMobile) plannerToggleMobile.addEventListener('click', handlePlannerToggle);

  const toggleSimulator = document.getElementById('toggle-simulator');
  const simulatorContent = document.getElementById('simulator-content');
  const simulatorChevron = document.getElementById('simulator-chevron');

  if (toggleSimulator && simulatorContent && simulatorChevron) {
    toggleSimulator.addEventListener('click', () => {
      const isHidden = simulatorContent.classList.contains('h-0');
      if (isHidden) {
        simulatorContent.classList.remove('h-0', 'opacity-0', 'mt-0');
        simulatorChevron.classList.remove('-rotate-90');
      } else {
        simulatorContent.classList.add('h-0', 'opacity-0', 'mt-0');
        simulatorChevron.classList.add('-rotate-90');
      }
    });
  }

  const treemapContainer = document.getElementById('treemap-container');
  if (treemapContainer) {
    const resizeObserver = new ResizeObserver(() => {
      updateTreemap();
    });
    resizeObserver.observe(treemapContainer);
  }

  // Security UI
  const securityBtn = document.getElementById('security-btn');
  const securityBtnMobile = document.getElementById('security-btn-mobile');
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
    if (masterPassword) {
      if (securityStatusText) securityStatusText.textContent = 'Portfolio is versleuteld';
      if (securityStatusIcon) {
        securityStatusIcon.className = 'p-2 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
        securityStatusIcon.innerHTML = '<i data-lucide="lock" class="w-5 h-5"></i>';
      }
      if (savePasswordBtn) savePasswordBtn.textContent = 'Wachtwoord Wijzigen';
      if (removePasswordBtn) removePasswordBtn.classList.remove('hidden');
      if (lockNowBtn) lockNowBtn.classList.remove('hidden');
      if (confirmPasswordContainer) confirmPasswordContainer.classList.remove('hidden');
    } else {
      if (securityStatusText) securityStatusText.textContent = 'Geen wachtwoord ingesteld';
      if (securityStatusIcon) {
        securityStatusIcon.className = 'p-2 rounded-lg bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
        securityStatusIcon.innerHTML = '<i data-lucide="unlock" class="w-5 h-5"></i>';
      }
      if (savePasswordBtn) savePasswordBtn.textContent = 'Wachtwoord Instellen';
      if (removePasswordBtn) removePasswordBtn.classList.add('hidden');
      if (lockNowBtn) lockNowBtn.classList.add('hidden');
      if (confirmPasswordContainer) confirmPasswordContainer.classList.add('hidden');
    }
    createIcons({ icons });
  };

  if (lockNowBtn) {
    lockNowBtn.addEventListener('click', () => {
      masterPassword = '';
      securityModal?.classList.add('hidden');
      showLockScreen();
    });
  }

  if (securityBtn && securityModal) {
    securityBtn.addEventListener('click', () => {
      securityModal.classList.remove('hidden');
      updateSecurityUI();
    });
  }

  if (securityBtnMobile && securityModal) {
    securityBtnMobile.addEventListener('click', () => {
      securityModal.classList.remove('hidden');
      updateSecurityUI();
    });
  }

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

  // Unlock logic
  const unlockBtn = document.getElementById('unlock-btn');
  const unlockInput = document.getElementById('unlock-password-input') as HTMLInputElement;
  const forgotPasswordBtn = document.getElementById('forgot-password-btn');

  const attemptUnlock = () => {
    const pass = unlockInput.value;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && pass) {
      const decrypted = decrypt(saved, pass);
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

  createIcons({ icons });
}

// Initial Load
loadState();
updateUI();
initEventListeners();
