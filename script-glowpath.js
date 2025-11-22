// ===== GlowPath Script  =====

const $ = (sel) => document.querySelector(sel);
const STORAGE_KEY = 'glowpath_workouts';

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

// ---------- Table + summary  ----------

function renderTable(workouts) {
  const tbody = $('#workoutTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  workouts.forEach((w) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${w.date || ''}</td>
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

// ---------- CSV parsing  ----------

function parseCSV(text) {
  if (!text) return [];

  let clean = text.replace(/\r/g, '');
  clean = clean.replace(/^\uFEFF/, '').trim();
  if (!clean) return [];

  const lines = clean.split('\n').filter(Boolean);
  if (lines.length === 0) return [];

  // Auto-detect delimiter: comma, semicolon, or tab
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

// ---------- Back-to-top  ----------

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

// ---------- Charts  ----------

let durationChartInstance = null;
let stepsChartInstance = null;

function renderCharts(workouts) {
  const durationCanvas = $('#durationChart');
  const stepsCanvas = $('#stepsChart');

  // If the page has no chart section, do nothing
  if (!durationCanvas || !stepsCanvas || typeof Chart === 'undefined') return;

  const labels = workouts.map((w) => w.date);
  const durations = workouts.map((w) => Number(w.duration || 0));
  const steps = workouts.map((w) => Number(w.steps || 0));

  const hasData = workouts.length > 0 &&
                  (durations.some((v) => v > 0) || steps.some((v) => v > 0));

  // If no data, destroy existing charts and exit
  if (!hasData) {
    if (durationChartInstance) {
      durationChartInstance.destroy();
      durationChartInstance = null;
    }
    if (stepsChartInstance) {
      stepsChartInstance.destroy();
      stepsChartInstance = null;
    }
    return;
  }

  // Duration line chart
  if (durationChartInstance) {
    durationChartInstance.data.labels = labels;
    durationChartInstance.data.datasets[0].data = durations;
    durationChartInstance.update();
  } else {
    durationChartInstance = new Chart(durationCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Duration (minutes)',
            data: durations
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true }
        },
        scales: {
          x: { title: { display: true, text: 'Date' } },
          y: { title: { display: true, text: 'Minutes' } }
        }
      }
    });
  }

  // Steps bar chart
  if (stepsChartInstance) {
    stepsChartInstance.data.labels = labels;
    stepsChartInstance.data.datasets[0].data = steps;
    stepsChartInstance.update();
  } else {
    stepsChartInstance = new Chart(stepsCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Steps',
            data: steps
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true }
        },
        scales: {
          x: { title: { display: true, text: 'Date' } },
          y: { title: { display: true, text: 'Steps' } }
        }
      }
    });
  }
}

// ---------- Main init ----------

document.addEventListener('DOMContentLoaded', () => {
  const form = $('#glowpath-form');
  const messageEl = $('#glowpath-message');
  const fileInput = $('#csvFileInput');
  const uploadBtn = $('#uploadBtn');
  const clearBtn = $('#clearDataBtn');

  let workouts = loadWorkouts();

  renderTable(workouts);
  updateSummary(workouts);
  renderCharts(workouts);
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

      workouts.push(entry);
      saveWorkouts(workouts);
      renderTable(workouts);
      updateSummary(workouts);
      renderCharts(workouts);

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
          workouts = workouts.concat(rows);
          saveWorkouts(workouts);
          renderTable(workouts);
          updateSummary(workouts);
          renderCharts(workouts);
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

  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const confirmed = window.confirm(
        'Clear all recorded workouts from this browser?'
      );
      if (!confirmed) return;

      workouts = [];
      saveWorkouts(workouts);
      renderTable(workouts);
      updateSummary(workouts);
      renderCharts(workouts);

      if (messageEl) {
        messageEl.textContent = 'All recorded workouts cleared.';
        setTimeout(() => (messageEl.textContent = ''), 2000);
      }
    });
  }
});
