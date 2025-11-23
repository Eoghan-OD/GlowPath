// ===== GlowPath Script (Sprint 1 + 2 + extra user stories) =====

const $ = (sel) => document.querySelector(sel);
const STORAGE_KEY = 'glowpath_workouts';

let allWorkouts = [];
let filteredWorkouts = [];

let durationChartInstance = null;
let stepsChartInstance = null;
let caloriesChartInstance = null;

// ---------- Data load/save ----------

function loadWorkouts() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.warn('Failed to parse saved workouts.', e);
    return [];
  }
}

function saveWorkouts(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Format any stored date as DD/MM/YYYY for display
function formatDisplayDate(value) {
  if (!value) return '';

  const d = new Date(value);
  if (isNaN(d)) {
    // fallback: just return the original string if JS cannot parse it
    return value;
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}


// robust date parsing for dataset dates and ISO dates
function parseDate(value) {
  if (!value) return null;
  const direct = new Date(value);
  if (!isNaN(direct)) return direct;

  const parts = String(value).split(/[\/\-]/);
  if (parts.length !== 3) return null;

  let year, month, day;
  if (parts[0].length === 4) {
    // YYYY-MM-DD
    year = Number(parts[0]);
    month = Number(parts[1]) - 1;
    day = Number(parts[2]);
  } else {
    // M/D/YYYY
    month = Number(parts[0]) - 1;
    day = Number(parts[1]);
    year = Number(parts[2]);
  }
  const d = new Date(year, month, day);
  return isNaN(d) ? null : d;
}

// ---------- Table + summary ----------

function renderTable(workouts) {
  const tbody = $('#workoutTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  workouts.forEach((w) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDisplayDate(w.date)}</td>
      <td>${w.activity || ''}</td>
      <td>${Number(w.duration || 0)}</td>
      <td>${Number(w.calories || 0)}</td>
      <td>${w.steps !== undefined && w.steps !== null && w.steps !== '' ? Number(w.steps) : ''}</td>
    `;
    tbody.appendChild(tr);
  });
}

function updateSummary(workouts) {
  const totalWorkouts = workouts.length;
  const totalDuration = workouts.reduce((s, w) => s + Number(w.duration || 0), 0);
  const totalCalories = workouts.reduce((s, w) => s + Number(w.calories || 0), 0);
  const avgDuration = totalWorkouts ? Math.round((totalDuration / totalWorkouts) * 10) / 10 : 0;

  const totalWorkoutsEl = $('#total-workouts');
  const totalDurationEl = $('#total-duration');
  const totalCaloriesEl = $('#total-calories');
  const avgDurationEl = $('#avg-duration');

  if (totalWorkoutsEl) totalWorkoutsEl.textContent = totalWorkouts;
  if (totalDurationEl) totalDurationEl.textContent = totalDuration;
  if (totalCaloriesEl) totalCaloriesEl.textContent = totalCalories;
  if (avgDurationEl) avgDurationEl.textContent = avgDuration;
}

// ---------- CSV parsing ----------

function parseCSV(text) {
  if (!text) return [];

  let clean = text.replace(/\r/g, '');
  clean = clean.replace(/^\uFEFF/, '').trim();
  if (!clean) return [];

  const lines = clean.split('\n').filter(Boolean);
  if (lines.length === 0) return [];

  const firstLine = lines[0];
  const candidates = [',', ';', '\t'];
  let delimiter = ',';
  let maxCount = -1;

  candidates.forEach((d) => {
    const count = (firstLine.match(new RegExp('\\' + d, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      delimiter = d;
    }
  });

  const headerRaw = firstLine.split(delimiter).map((h) => h.trim());
  const header = headerRaw.map((h) => h.toLowerCase());

  const idx = {
    date: header.findIndex((h) => /date/.test(h)),
    activity: header.findIndex((h) => /activity/.test(h)),
    duration: header.findIndex((h) => /duration/.test(h)),
    calories: header.findIndex((h) => /cal/.test(h)),
    steps: header.findIndex((h) => /step/.test(h)),
  };

  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const colsRaw = lines[i].split(delimiter);
    const cols = colsRaw.map((c) => c.trim());

    const get = (index) =>
      index >= 0 && index < cols.length ? cols[index] : '';

    const entry = {
      date: idx.date >= 0 ? get(idx.date) : todayISO(),
      activity: idx.activity >= 0 ? get(idx.activity) || 'Unknown' : 'Unknown',
      duration: idx.duration >= 0 ? Number(get(idx.duration) || 0) : 0,
      calories: idx.calories >= 0 ? Number(get(idx.calories) || 0) : 0,
      steps: idx.steps >= 0 ? Number(get(idx.steps) || 0) : '',
    };

    rows.push(entry);
  }

  return rows;
}

// ---------- Filters, sorting, export ----------

function updateActivityFilterOptions(workouts) {
  const select = $('#filterActivity');
  if (!select) return;

  // remember what is currently selected (default to "all")
  const currentValue = select.value || 'all';

  const existing = new Set();
  workouts.forEach((w) => {
    if (w.activity) existing.add(w.activity);
  });

  // reset options (keep "all" as first)
  select.innerHTML = '<option value="all">All activities</option>';

  Array.from(existing)
    .sort()
    .forEach((act) => {
      const opt = document.createElement('option');
      opt.value = act;
      opt.textContent = act;
      select.appendChild(opt);
    });

  // restore the previous selection if it still exists,
  // otherwise fall back to "all"
  const values = Array.from(select.options).map((o) => o.value);
  if (values.includes(currentValue)) {
    select.value = currentValue;
  } else {
    select.value = 'all';
  }
}


function applyFilters(list) {
  let result = [...list];

  const actSel = $('#filterActivity');
  const fromInput = $('#filterFromDate');
  const toInput = $('#filterToDate');
  const sortSel = $('#sortBy');

  const activityVal = actSel ? actSel.value : 'all';
  const fromValue = fromInput && fromInput.value ? parseDate(fromInput.value) : null;
  const toValue = toInput && toInput.value ? parseDate(toInput.value) : null;

  result = result.filter((w) => {
    const d = parseDate(w.date);
    if (fromValue && d && d < fromValue) return false;
    if (toValue && d && d > toValue) return false;
    if (activityVal && activityVal !== 'all' && w.activity !== activityVal) return false;
    return true;
  });

  if (sortSel) {
    const sortVal = sortSel.value;
    result.sort((a, b) => {
      const da = parseDate(a.date);
      const db = parseDate(b.date);
      switch (sortVal) {
        case 'date-asc':
          return (da || 0) - (db || 0);
        case 'date-desc':
          return (db || 0) - (da || 0);
        case 'duration-desc':
          return Number(b.duration || 0) - Number(a.duration || 0);
        case 'calories-desc':
          return Number(b.calories || 0) - Number(a.calories || 0);
        default:
          return (db || 0) - (da || 0);
      }
    });
  }

  return result;
}

function exportToCsv(workouts) {
  if (!workouts || !workouts.length) {
    alert('No workouts to export.');
    return;
  }

  let csv = 'Date,Activity,Duration,Calories,Steps\n';
  workouts.forEach((w) => {
    csv += `"${w.date}","${w.activity}",${Number(w.duration || 0)},${Number(
      w.calories || 0
    )},${w.steps !== undefined && w.steps !== null ? w.steps : ''}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'glowpath_export.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- Charts ----------

function destroyCharts() {
  if (durationChartInstance) {
    durationChartInstance.destroy();
    durationChartInstance = null;
  }
  if (stepsChartInstance) {
    stepsChartInstance.destroy();
    stepsChartInstance = null;
  }
  if (caloriesChartInstance) {
    caloriesChartInstance.destroy();
    caloriesChartInstance = null;
  }
}

function renderCharts(workouts) {
  const durationCanvas = $('#durationChart');
  const stepsCanvas = $('#stepsChart');
  const caloriesCanvas = $('#caloriesChart');
  const loadingEl = $('#chartLoading');

  if (!durationCanvas || !stepsCanvas || !caloriesCanvas) {
    return;
  }

  // Show loading text and hide charts while "generating"
  if (loadingEl) {
    loadingEl.textContent = 'Generating data...';
    loadingEl.style.display = 'block';
  }
  durationCanvas.style.opacity = '0';
  stepsCanvas.style.opacity = '0';
  caloriesCanvas.style.opacity = '0';

  const dailyStats = computeDailyStats(workouts);
  const labels = dailyStats.map((d) => formatDisplayDate(d.date.toISOString()));
  const durationData = dailyStats.map((d) => d.duration);
  const stepsData = dailyStats.map((d) => d.steps);
  const caloriesData = dailyStats.map((d) => d.calories);

  if (durationChartInstance) durationChartInstance.destroy();
  if (stepsChartInstance) stepsChartInstance.destroy();
  if (caloriesChartInstance) caloriesChartInstance.destroy();

  durationChartInstance = new Chart(durationCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Duration (minutes)',
          data: durationData,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: { display: true },
      },
      scales: {
        x: { title: { display: true, text: 'Date' } },
        y: { title: { display: true, text: 'Minutes' } },
      },
    },
  });

  stepsChartInstance = new Chart(stepsCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Steps',
          data: stepsData,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: { display: true },
      },
      scales: {
        x: { title: { display: true, text: 'Date' } },
        y: { title: { display: true, text: 'Steps' } },
      },
    },
  });

  caloriesChartInstance = new Chart(caloriesCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Calories',
          data: caloriesData,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: { display: true },
      },
      scales: {
        x: { title: { display: true, text: 'Date' } },
        y: { title: { display: true, text: 'Calories' } },
      },
    },
  });

  // After 2 seconds, hide loading text and reveal charts
  setTimeout(() => {
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
    durationCanvas.style.opacity = '1';
    stepsCanvas.style.opacity = '1';
    caloriesCanvas.style.opacity = '1';
  }, 2000);
}

// ---------- Weekly insights ----------

function updateInsights(workouts) {
  const summaryEl = $('#insights-weekly-summary');
  const topActivityEl = $('#insights-top-activity');
  const avgWeekEl = $('#insights-avg-week');
  const compareEl = $('#insights-compare-weeks');
  const reminderEl = $('#insights-reminder');

  // If we are not on the Profile page, just exit
  if (!summaryEl || !topActivityEl || !avgWeekEl || !compareEl || !reminderEl) {
    return;
  }

  // No data at all
  if (!workouts || !workouts.length) {
    summaryEl.textContent =
      'No workouts yet. Import a CSV or add a workout to see insights.';
    topActivityEl.textContent = '';
    avgWeekEl.textContent = '';
    compareEl.textContent = '';
    reminderEl.textContent = '';
    return;
  }

  // Sort workouts by date (oldest → newest)
  const sorted = [...workouts].sort((a, b) => {
    const da = parseDate(a.date);
    const db = parseDate(b.date);
    return (da || 0) - (db || 0);
  });

  const firstDate = parseDate(sorted[0].date);
  const lastDate = parseDate(sorted[sorted.length - 1].date);
  if (!firstDate || !lastDate) {
    return;
  }

  // Define last week (last 7 recorded days) and previous week (7 days before that)
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const lastWeekEnd = lastDate;
  const lastWeekStart = new Date(lastWeekEnd.getTime() - 6 * ONE_DAY_MS);
  const prevWeekEnd = new Date(lastWeekStart.getTime() - ONE_DAY_MS);
  const prevWeekStart = new Date(prevWeekEnd.getTime() - 6 * ONE_DAY_MS);

  const inRange = (d, start, end) => d && d >= start && d <= end;

  const lastWeek = sorted.filter((w) =>
    inRange(parseDate(w.date), lastWeekStart, lastWeekEnd)
  );
  const prevWeek = sorted.filter((w) =>
    inRange(parseDate(w.date), prevWeekStart, prevWeekEnd)
  );

  const lastWeekDuration = lastWeek.reduce(
    (sum, w) => sum + Number(w.duration || 0),
    0
  );
  const lastWeekCalories = lastWeek.reduce(
    (sum, w) => sum + Number(w.calories || 0),
    0
  );
  const lastWeekCount = lastWeek.length;

  const prevWeekDuration = prevWeek.reduce(
    (sum, w) => sum + Number(w.duration || 0),
    0
  );

  // 1) Weekly summary (this week only)
  summaryEl.textContent =
    `In the last 7 recorded days you logged ${lastWeekCount} workout(s), ` +
    `${lastWeekDuration} minutes and ${lastWeekCalories} calories.`;

  // 2) Top activity overall (all data)
  const counts = {};
  workouts.forEach((w) => {
    if (!w.activity) return;
    counts[w.activity] = (counts[w.activity] || 0) + 1;
  });

  let topActivity = null;
  let topCount = 0;
  Object.entries(counts).forEach(([act, count]) => {
    if (count > topCount) {
      topCount = count;
      topActivity = act;
    }
  });

  if (topActivity) {
    topActivityEl.textContent =
      `Your most frequent activity is ${topActivity} ` +
      `(${topCount} workout${topCount !== 1 ? 's' : ''}).`;
  } else {
    topActivityEl.textContent = '';
  }

  // 3) Average minutes per week across ALL data
  const totalDuration = workouts.reduce(
    (sum, w) => sum + Number(w.duration || 0),
    0
  );
  const totalDays =
    Math.round((lastDate.getTime() - firstDate.getTime()) / ONE_DAY_MS) + 1;
  const weeks = Math.max(1, totalDays / 7);
  const avgPerWeek = Math.round((totalDuration / weeks) * 10) / 10;

  avgWeekEl.textContent =
    `On average you do about ${avgPerWeek} minutes of activity per week.`;

  // 4) Compare this week to previous week
  if (prevWeek.length > 0) {
    const diff = lastWeekDuration - prevWeekDuration;
    if (diff > 0) {
      compareEl.textContent =
        `That is ${diff} more minute${diff !== 1 ? 's' : ''} than the previous week. Nice progress.`;
    } else if (diff < 0) {
      const abs = Math.abs(diff);
      compareEl.textContent =
        `That is ${abs} fewer minute${abs !== 1 ? 's' : ''} than the previous week.`;
    } else {
      compareEl.textContent =
        'Your weekly duration is the same as the previous week.';
    }
  } else {
    compareEl.textContent =
      'Not enough data from the previous week to compare yet.';
  }

  // 5) Simple “AI” reminder based on 150 minutes/week goal
  const GOAL = 150; // minutes per week
  if (lastWeekDuration < GOAL) {
    reminderEl.textContent =
      `You recorded ${lastWeekDuration} minutes this week. ` +
      `A common goal is ${GOAL} minutes. Consider adding another workout.`;
  } else {
    reminderEl.textContent =
      'You have reached or passed 150 minutes of activity in the last 7 days. Keep it up.';
  }
}

// ---------- Back-to-top ----------

function setupBackToTop() {
  const btn = $('#backToTop');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.style.display = window.scrollY > 300 ? 'block' : 'none';
  });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ---------- Refresh view (table + summary + charts + insights) ----------

function refreshView() {
  updateActivityFilterOptions(allWorkouts);
  filteredWorkouts = applyFilters(allWorkouts);
  renderTable(filteredWorkouts);
  updateSummary(filteredWorkouts);
  renderCharts(filteredWorkouts);
  updateInsights(filteredWorkouts);   // ← keep this line
}

// AI stuff

async function callGlowpathLLM(summaryText) {
  const apiKey = "PUT THE API KEY HERE OR AI WONT WORK"; // <- put your Groq key here

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are a friendly fitness coach. Give concise, helpful tips."
          },
          {
            role: "user",
            content: `Here is my current filtered workout summary: ${summaryText}.
                      Give me 2 short sentences of personalised feedback.`
          }
        ],
        max_tokens: 150
      })
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Groq HTTP error", res.status, text);
      return `AI service error (${res.status}): ${text}`;
    }

    const data = await res.json();
    return data.choices[0].message.content.trim();

  } catch (err) {
    console.error("Groq fetch error", err);
    return "Could not reach AI right now.";
  }
}



// ---------- Main init ----------

document.addEventListener('DOMContentLoaded', () => {
  const form = $('#glowpath-form');
  const messageEl = $('#glowpath-message');
  const fileInput = $('#csvFileInput');
  const uploadBtn = $('#uploadBtn');
  const clearBtn = $('#clearDataBtn');
  const applyFilterBtn = $('#applyFilterBtn');
  const exportBtn = $('#exportCsvBtn');
  const toggleTableBtn = $('#toggleTableBtn');
  const toggleChartsBtn = $('#toggleChartsBtn');

  allWorkouts = loadWorkouts();
  refreshView();
  setupBackToTop();

  // Manual form submit
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const activity = $('#activity').value.trim();
      const duration = Number($('#duration').value);
      const calories = Number($('#calories').value);
      const stepsRaw = $('#steps').value;
      const steps = stepsRaw === '' ? '' : Number(stepsRaw);

      if (!activity || !duration || !calories) {
        if (messageEl) {
          messageEl.textContent = 'Please fill in all required fields.';
        }
        return;
      }

      const entry = {
        date: todayISO(),
        activity,
        duration,
        calories,
        steps
      };

      allWorkouts.push(entry);
      saveWorkouts(allWorkouts);
      refreshView();

      form.reset();
      if (messageEl) {
        messageEl.textContent = 'Workout saved.';
        setTimeout(() => (messageEl.textContent = ''), 2000);
      }
    });
  }

  // CSV upload/import
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      const file = fileInput && fileInput.files && fileInput.files[0];
      if (!file) {
        if (messageEl) {
          messageEl.textContent = 'Please choose a CSV file first.';
        }
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const rows = parseCSV(ev.target.result);
          if (!rows.length) {
            if (messageEl) {
              messageEl.textContent = 'No valid rows found in the CSV.';
            }
            return;
          }
          allWorkouts = allWorkouts.concat(rows);
          saveWorkouts(allWorkouts);
          refreshView();
          if (messageEl) {
            messageEl.textContent = `CSV imported: ${rows.length} row(s) added.`;
            setTimeout(() => (messageEl.textContent = ''), 2500);
          }
        } catch (err) {
          console.error(err);
          if (messageEl) {
            messageEl.textContent = 'There was an error reading the CSV.';
          }
        }
      };
      reader.readAsText(file);
    });
  }

  // Clear data
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const confirmed = window.confirm(
        'Clear all recorded workouts from this browser?'
      );
      if (!confirmed) return;

      allWorkouts = [];
      saveWorkouts(allWorkouts);
      refreshView();

      if (messageEl) {
        messageEl.textContent = 'All recorded workouts cleared.';
        setTimeout(() => (messageEl.textContent = ''), 2000);
      }
    });
  }

  // Apply filters
  if (applyFilterBtn) {
    applyFilterBtn.addEventListener('click', () => {
      refreshView();
    });
  }
  

  // Export CSV
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportToCsv(filteredWorkouts.length ? filteredWorkouts : allWorkouts);
    });
  }

  // Toggle table / charts
  if (toggleTableBtn || toggleChartsBtn) {
    const tableSection = $('#data-table');
    const chartsSection = $('#data-visualisation');

    if (toggleTableBtn && tableSection && chartsSection) {
      toggleTableBtn.addEventListener('click', () => {
        tableSection.style.display = 'block';
        chartsSection.style.display = 'none';
      });
    }

    if (toggleChartsBtn && tableSection && chartsSection) {
      toggleChartsBtn.addEventListener('click', () => {
        tableSection.style.display = 'none';
        chartsSection.style.display = 'block';
      });
    }

    // Default state when page loads
    if (tableSection) tableSection.style.display = 'block';
    if (chartsSection) chartsSection.style.display = 'none';
    }
    
    // GPT RESPONSE

    const aiBtn = $('#aiInsightBtn');
    const aiText = $('#aiInsightText');

    if (aiBtn && aiText) {
      aiBtn.addEventListener('click', async () => {
        // build a short text summary from the currently filtered workouts
        const totalWorkouts = filteredWorkouts.length;
        const totalMinutes = filteredWorkouts.reduce(
          (s, w) => s + Number(w.duration || 0),
          0
        );
        const totalCalories = filteredWorkouts.reduce(
          (s, w) => s + Number(w.calories || 0),
          0
        );

        const summary = `Workouts: ${totalWorkouts}, minutes: ${totalMinutes}, calories: ${totalCalories}.`;

        aiText.textContent = "Thinking...";
        const reply = await callGlowpathLLM(summary);
        aiText.textContent = reply;
      });
  }

});
