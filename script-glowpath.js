// ===== GlowPath Script (enhanced) =====

// --- Helpers ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const STORAGE_KEY = 'glowpath_workouts';

// Load workouts from localStorage
function loadWorkouts() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.warn('Failed to parse saved workouts.', e);
    return [];
  }
}

// Save workouts to localStorage
function saveWorkouts(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// Format today as YYYY-MM-DD
function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Render workouts table
function renderTable(workouts) {
  const tbody = $('#workoutTable tbody');
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

// Update summary metrics
function updateSummary(workouts) {
  const totalWorkouts = workouts.length;
  const totalDuration = workouts.reduce((s, w) => s + Number(w.duration || 0), 0);
  const totalCalories = workouts.reduce((s, w) => s + Number(w.calories || 0), 0);
  const avgDuration = totalWorkouts ? Math.round((totalDuration / totalWorkouts) * 10) / 10 : 0;

  $('#total-workouts').textContent = totalWorkouts;
  $('#total-duration').textContent = totalDuration;
  $('#total-calories').textContent = totalCalories;
  $('#avg-duration').textContent = avgDuration;
}

// Basic CSV parser (comma-separated, with a header row expected)
function parseCSV(text) {
  // Normalize newlines and split
  const lines = text.replace(/\r/g, '').trim().split('\n').filter(Boolean);
  if (lines.length === 0) return [];

  // Detect header
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = {
    date: header.findIndex(h => /date/i.test(h)),
    activity: header.findIndex(h => /activity/i.test(h)),
    duration: header.findIndex(h => /duration/i.test(h)),
    calories: header.findIndex(h => /cal/i.test(h)),
    steps: header.findIndex(h => /step/i.test(h)),
  };

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const entry = {
      date: idx.date >= 0 ? cols[idx.date] : todayISO(),
      activity: idx.activity >= 0 ? cols[idx.activity] : 'Unknown',
      duration: idx.duration >= 0 ? Number(cols[idx.duration] || 0) : 0,
      calories: idx.calories >= 0 ? Number(cols[idx.calories] || 0) : 0,
      steps: idx.steps >= 0 ? Number(cols[idx.steps] || 0) : '',
    };
    rows.push(entry);
  }
  return rows;
}

// Back to Top visibility toggle
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

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  const form = $('#glowpath-form');
  const messageEl = $('#glowpath-message');
  const fileInput = $('#csvFileInput');
  const uploadBtn = $('#uploadBtn');

  // Load + render existing data
  let workouts = loadWorkouts();
  renderTable(workouts);
  updateSummary(workouts);
  setupBackToTop();

  // Handle manual form submissions
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const activity = $('#activity').value.trim();
      const duration = Number($('#duration').value);
      const calories = Number($('#calories').value);
      const stepsRaw = $('#steps').value;
      const steps = stepsRaw === '' ? '' : Number(stepsRaw);

      if (!activity || !duration || !calories) {
        messageEl.textContent = 'Please fill in all required fields.';
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

      form.reset();
      messageEl.textContent = 'Workout saved!';
      setTimeout(() => (messageEl.textContent = ''), 2000);
    });
  }

  // Handle CSV preview/import
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      const file = fileInput && fileInput.files && fileInput.files[0];
      if (!file) {
        messageEl.textContent = 'Please choose a CSV file first.';
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const rows = parseCSV(ev.target.result);
          if (!rows.length) {
            messageEl.textContent = 'No valid rows found in the CSV.';
            return;
          }
          // Append to current workouts
          workouts = workouts.concat(rows);
          saveWorkouts(workouts);
          renderTable(workouts);
          updateSummary(workouts);
          messageEl.textContent = `CSV imported: ${rows.length} row(s) added.`;
          setTimeout(() => (messageEl.textContent = ''), 2500);
        } catch (err) {
          console.error(err);
          messageEl.textContent = 'There was an error reading the CSV.';
        }
      };
      reader.readAsText(file);
    });
  }
});
