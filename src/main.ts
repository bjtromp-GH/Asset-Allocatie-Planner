import { Chart, registerables } from 'chart.js';
import { createIcons, icons } from 'lucide';

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

let assets: Asset[] = [
  { id: '1', name: 'Aandelen', value: 5000, target: 40, color: '#3b82f6', category: 'Groei' },
  { id: '2', name: 'Pensioenbeleggen', value: 2000, target: 20, color: '#10b981', category: 'Groei' },
  { id: '3', name: 'Obligaties', value: 1500, target: 15, color: '#6366f1', category: 'Defensief' },
  { id: '4', name: 'Cash', value: 1000, target: 5, color: '#f59e0b', category: 'Defensief' },
  { id: '5', name: 'Goud', value: 500, target: 5, color: '#eab308', category: 'Defensief' },
  { id: '6', name: 'Zilver', value: 200, target: 2, color: '#94a3b8', category: 'Defensief' },
  { id: '7', name: 'Bitcoin', value: 800, target: 8, color: '#f97316', category: 'Speculatief' },
  { id: '8', name: 'Bezittingen', value: 1000, target: 5, color: '#ec4899', category: 'Defensief' },
];

let history: HistoryEntry[] = [];
let investmentAmount = 1000;
let isDarkMode = false;
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

function saveState() {
  const dateInput = document.getElementById('current-date') as HTMLInputElement;
  const state = {
    assets,
    investmentAmount,
    date: dateInput.value,
    history,
    isDarkMode
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const state = JSON.parse(saved);
      if (state.assets) assets = state.assets;
      if (state.investmentAmount !== undefined) investmentAmount = state.investmentAmount;
      if (state.history) history = state.history;
      if (state.isDarkMode !== undefined) {
        isDarkMode = state.isDarkMode;
        document.documentElement.classList.toggle('dark', isDarkMode);
        document.body.classList.toggle('dark', isDarkMode);
      }
      if (state.date) {
        const dateInput = document.getElementById('current-date') as HTMLInputElement;
        if (dateInput) dateInput.value = state.date;
      }
    } catch (e) {
      console.error('Failed to load state', e);
    }
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
  const colors = ['#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#eab308', '#94a3b8', '#f97316', '#ec4899'];
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

function updateUI() {
  saveState();
  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalTarget = assets.reduce((sum, asset) => sum + asset.target, 0);

  // Animate total values
  animateValue('total-value', prevTotalValue, totalValue, 500, formatCurrency);
  animateValue('pie-total-value', prevTotalValue, totalValue, 500, formatCurrency);
  prevTotalValue = totalValue;

  const targetWarning = document.getElementById('target-warning');
  if (targetWarning) {
    if (totalTarget !== 100) {
      targetWarning.classList.remove('hidden');
      targetWarning.textContent = `Doel: ${totalTarget}% (moet 100% zijn)`;
      targetWarning.className = `text-xs font-medium px-2 py-1 rounded-full ${totalTarget > 100 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`;
    } else {
      targetWarning.classList.add('hidden');
    }
  }

  const categories = { Groei: 0, Defensief: 0, Speculatief: 0 };
  assets.forEach(a => categories[a.category] += a.value);
  
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
              <div class="w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0" style="background-color: ${asset.color}"></div>
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
            <div class="flex items-center gap-1 sm:gap-2">
              <span class="text-slate-400 font-mono text-xs sm:text-base">€</span>
              <input
                type="text"
                value="${formatNumber(asset.value)}"
                data-id="${asset.id}"
                data-type="value"
                class="asset-input w-20 sm:w-24 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-0 transition-all outline-none py-1 font-mono text-xs sm:text-base dark:text-white dark:hover:border-slate-700"
              />
              <span class="font-mono text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">${formatPercent(currentPercent)}</span>
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
              <div class="hidden sm:flex items-center gap-1">
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
        <div class="flex items-center text-xs sm:text-sm group">
          <div class="w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0 mr-2 sm:mr-3 transition-transform group-hover:scale-125" style="background-color: ${asset.color}"></div>
          <span class="text-slate-600 flex-1 truncate dark:text-slate-400" title="${asset.name}">${asset.name}</span>
          <span class="font-mono font-bold text-slate-900 ml-2 dark:text-white">${formatPercent(currentPercent)}</span>
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
        
        const val = parseFloat(rawValue) || 0;
        
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

  const investmentInput = document.getElementById('investment-input') as HTMLInputElement;
  let investmentTimeout: any = null;
  if (investmentInput) {
    investmentInput.addEventListener('input', (e) => {
      investmentAmount = parseFloat((e.target as HTMLInputElement).value) || 0;
      if (investmentTimeout) clearTimeout(investmentTimeout);
      investmentTimeout = setTimeout(() => updateUI(), 100);
    });
  }

  const dateInput = document.getElementById('current-date') as HTMLInputElement;
  if (dateInput) {
    dateInput.addEventListener('change', () => {
      saveState();
    });
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
}

// Initial Load
loadState();
updateUI();
initEventListeners();
