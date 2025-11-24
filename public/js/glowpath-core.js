// ===== GlowPath Script (Sprint 1 + 2 + extra user stories) =====

const $ = (sel) => document.querySelector(sel);
const STORAGE_KEY = "glowpath_workouts";

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
    console.warn("Failed to parse saved workouts.", e);
    return [];
  }
}

function saveWorkouts(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Format any stored date as DD/MM/YYYY for display
function formatDisplayDate(value) {
  if (!value) return "";

  const d = new Date(value);
  if (isNaN(d)) {
    // fallback: just return the original string if JS cannot parse it
    return value;
  }

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Robust date parsing for dataset dates and ISO dates
function parseDate(value) {
  if (!value) return null;

  const direct = new Date(value);
  if (!isNaN(direct)) return direct;

  const parts = String(value).split(/[\/\-]/);
  if (parts.length !== 3) return null;

  let year, month, day;

  // If it looks like YYYY-MM-DD
  if (parts[0].length === 4) {
    year = Number(parts[0]);
    month = Number(parts[1]) - 1;
    day = Number(parts[2]);
  } else {
    // Otherwise assume DD/MM/YYYY or similar
    day = Number(parts[0]);
    month = Number(parts[1]) - 1;
    year = Number(parts[2]);
  }

  const d = new Date(year, month, day);
  return isNaN(d) ? null : d;
}

// ---------- Table + summary ----------

function renderTable(workouts) {
  const tbody = $("#workoutTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  workouts.forEach((w) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDisplayDate(w.date)}</td>
      <td>${w.activity || ""}</td>
      <td>${Number(w.duration || 0)}</td>
      <td>${Number(w.calories || 0)}</td>
      <td>${
        w.steps !== undefined && w.steps !== null && w.steps !== ""
          ? Number(w.steps)
          : ""
      }</td>
    `;
    tbody.appendChild(tr);
  });
}

function updateSummary(workouts) {
  const totalWorkouts = workouts.length;
  const totalDuration = workouts.reduce(
    (s, w) => s + Number(w.duration || 0),
    0
  );
  const totalCalories = workouts.reduce(
    (s, w) => s + Number(w.calories || 0),
    0
  );
  const avgDuration = totalWorkouts
    ? Math.round((totalDuration / totalWorkouts) * 10) / 10
    : 0;

  const totalWorkoutsEl = $("#total-workouts");
  const totalDurationEl = $("#total-duration");
  const totalCaloriesEl = $("#total-calories");
  const avgDurationEl = $("#avg-duration");

  if (totalWorkoutsEl) totalWorkoutsEl.textContent = totalWorkouts;
  if (totalDurationEl) totalDurationEl.textContent = totalDuration;
  if (totalCaloriesEl) totalCaloriesEl.textContent = totalCalories;
  if (avgDurationEl) avgDurationEl.textContent = avgDuration;
}

// ---------- CSV parsing ----------

function parseCSV(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return [];
  }

  // Auto detect delimiter from first row
  const firstLine = lines[0];
  const candidates = [",", ";", "\t"];
  let delimiter = ",";
  let maxCount = -1;

  candidates.forEach((d) => {
    const count = (firstLine.match(new RegExp("\\" + d, "g")) || []).length;
    if (count > maxCount) {
      maxCount = count;
      delimiter = d;
    }
  });

  const headerRaw = firstLine.split(delimiter).map((h) => h.trim());
  const header = headerRaw.map((h) => h.toLowerCase());

  // Find column indices
  const idx = {
    date:
      header.indexOf("date") >= 0
        ? header.indexOf("date")
        : header.indexOf("activitydate"),
    activity:
      header.indexOf("activity") >= 0
        ? header.indexOf("activity")
        : header.indexOf("activitytype"),
    duration:
      header.indexOf("duration") >= 0
        ? header.indexOf("duration")
        : header.indexOf("totalminutes"),
    calories:
      header.indexOf("calories") >= 0
        ? header.indexOf("calories")
        : header.indexOf("caloriesburned"),
    steps: header.indexOf("steps") >= 0 ? header.indexOf("steps") : -1,
  };

  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const colsRaw = lines[i].split(delimiter);
    const cols = colsRaw.map((c) => c.trim());

    const get = (index) =>
      index >= 0 && index < cols.length ? cols[index] : "";

    const entry = {
      date: idx.date >= 0 ? get(idx.date) : todayISO(),
      activity:
        idx.activity >= 0 ? get(idx.activity) || "Unknown" : "Unknown",
      duration: idx.duration >= 0 ? Number(get(idx.duration) || 0) : 0,
      calories: idx.calories >= 0 ? Number(get(idx.calories) || 0) : 0,
      steps: idx.steps >= 0 ? Number(get(idx.steps) || 0) : "",
      source: "csv",
    };

    // Skip completely empty lines
    if (
      !entry.date &&
      !entry.activity &&
      !entry.duration &&
      !entry.calories
    ) {
      continue;
    }

    rows.push(entry);
  }

  return rows;
}

// ---------- Filters, sorting, export ----------

function updateActivityFilterOptions(workouts) {
  const select = $("#filterActivity");
  if (!select) return;

  // Remember what is currently selected (default to "all")
  const currentValue = select.value || "all";

  const existing = new Set();
  workouts.forEach((w) => {
    if (w.activity) existing.add(w.activity);
  });

  // Reset options (keep "all" as first)
  select.innerHTML = '<option value="all">All activities</option>';

  Array.from(existing)
    .sort()
    .forEach((act) => {
      const opt = document.createElement("option");
      opt.value = act;
      opt.textContent = act;
      select.appendChild(opt);
    });

  // Re apply previous selection if possible
  const values = Array.from(select.options).map((o) => o.value);
  if (values.includes(currentValue)) {
    select.value = currentValue;
  } else {
    select.value = "all";
  }
}

function applyFilters(list) {
  let result = [...list];

  const actSel = $("#filterActivity");
  const fromInput = $("#filterFromDate");
  const toInput = $("#filterToDate");
  const sortSel = $("#sortBy");

  const activityVal = actSel ? actSel.value : "all";
  const fromValue =
    fromInput && fromInput.value ? parseDate(fromInput.value) : null;
  const toValue = toInput && toInput.value ? parseDate(toInput.value) : null;
  const sortValue = sortSel ? sortSel.value : "date-desc";

  // Activity filter
  if (activityVal && activityVal !== "all") {
    result = result.filter(
      (w) => (w.activity || "").toLowerCase() === activityVal.toLowerCase()
    );
  }

  // Date range filter
  if (fromValue) {
    result = result.filter((w) => {
      const d = parseDate(w.date);
      return d && d >= fromValue;
    });
  }

  if (toValue) {
    result = result.filter((w) => {
      const d = parseDate(w.date);
      return d && d <= toValue;
    });
  }

  // Sorting
  result.sort((a, b) => {
    const da = parseDate(a.date) || new Date(0);
    const db = parseDate(b.date) || new Date(0);

    switch (sortValue) {
      case "date-asc":
        return da - db;
      case "date-desc":
        return db - da;
      case "duration-desc":
        return Number(b.duration || 0) - Number(a.duration || 0);
      case "calories-desc":
        return Number(b.calories || 0) - Number(a.calories || 0);
      default:
        return db - da;
    }
  });

  return result;
}

function exportToCsv(workouts) {
  if (!workouts || workouts.length === 0) {
    alert("No workouts to export.");
    return;
  }

  const header = ["Date", "Activity", "Duration", "Calories", "Steps"];
  const lines = [header.join(",")];

  workouts.forEach((w) => {
    const row = [
      formatDisplayDate(w.date),
      (w.activity || "").replace(/,/g, ";"),
      Number(w.duration || 0),
      Number(w.calories || 0),
      w.steps !== undefined && w.steps !== null && w.steps !== ""
        ? Number(w.steps)
        : "",
    ];
    lines.push(row.join(","));
  });

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "glowpath_workouts_export.csv";
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
  const durationCanvas = document.getElementById("durationChart");
  const stepsCanvas = document.getElementById("stepsChart");
  const caloriesCanvas = document.getElementById("caloriesChart");

  // If none of the canvases exist on this page, there is nothing to do
  if (!durationCanvas && !stepsCanvas && !caloriesCanvas) {
    return;
  }

  // If there is no data, destroy any existing charts and exit
  if (!workouts || workouts.length === 0) {
    destroyCharts();
    return;
  }

  // Group metrics by activity date (YYYY-MM-DD) using parseDate
  const byDate = {};
  workouts.forEach((w) => {
    const d = parseDate(w.date);
    if (!d) return;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const key = `${year}-${month}-${day}`;

    if (!byDate[key]) {
      byDate[key] = { duration: 0, steps: 0, calories: 0 };
    }
    byDate[key].duration += Number(w.duration || 0);
    byDate[key].steps += Number(w.steps || 0);
    byDate[key].calories += Number(w.calories || 0);
  });

  const dateKeys = Object.keys(byDate);
  if (!dateKeys.length) {
    destroyCharts();
    return;
  }

  // Sort dates chronologically and prepare data series
  const dates = dateKeys.sort();
  const labels = dates.map((d) => formatDisplayDate(d));
  const durations = dates.map((d) => byDate[d].duration);
  const steps = dates.map((d) => byDate[d].steps);
  const calories = dates.map((d) => byDate[d].calories);

  // Duration chart (bar)
  if (durationCanvas) {
    if (durationChartInstance) {
      durationChartInstance.data.labels = labels;
      durationChartInstance.data.datasets[0].data = durations;
      durationChartInstance.update();
    } else {
      durationChartInstance = new Chart(durationCanvas, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Duration (minutes)",
              data: durations,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            x: { title: { display: true, text: "Date" } },
            y: { title: { display: true, text: "Minutes" } },
          },
        },
      });
    }
  }

  // Steps chart (bar)
  if (stepsCanvas) {
    if (stepsChartInstance) {
      stepsChartInstance.data.labels = labels;
      stepsChartInstance.data.datasets[0].data = steps;
      stepsChartInstance.update();
    } else {
      stepsChartInstance = new Chart(stepsCanvas, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Steps",
              data: steps,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            x: { title: { display: true, text: "Date" } },
            y: { title: { display: true, text: "Steps" } },
          },
        },
      });
    }
  }

  // Calories chart (line)
  if (caloriesCanvas) {
    if (caloriesChartInstance) {
      caloriesChartInstance.data.labels = labels;
      caloriesChartInstance.data.datasets[0].data = calories;
      caloriesChartInstance.update();
    } else {
      caloriesChartInstance = new Chart(caloriesCanvas, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Calories",
              data: calories,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            x: { title: { display: true, text: "Date" } },
            y: { title: { display: true, text: "Calories" } },
          },
        },
      });
    }
  }
}

// ---------- Weekly insights ----------

function updateInsights(workouts) {
  const summaryEl = $("#insights-weekly-summary");
  const topActivityEl = $("#insights-top-activity");
  const avgWeekEl = $("#insights-avg-week");
  const compareEl = $("#insights-compare-weeks");
  const reminderEl = $("#insights-reminder");

  if (
    !summaryEl ||
    !topActivityEl ||
    !avgWeekEl ||
    !compareEl ||
    !reminderEl
  ) {
    return;
  }

  if (!workouts || workouts.length === 0) {
    summaryEl.textContent =
      "No workouts recorded yet. Add a workout to see insights.";
    topActivityEl.textContent = "";
    avgWeekEl.textContent = "";
    compareEl.textContent = "";
    reminderEl.textContent = "";
    return;
  }

  // Sort by date ascending
  const sorted = [...workouts].sort((a, b) => {
    const da = parseDate(a.date) || new Date(0);
    const db = parseDate(b.date) || new Date(0);
    return da - db;
  });

  const latestDate = parseDate(sorted[sorted.length - 1].date);
  if (!latestDate) {
    summaryEl.textContent = "Could not parse dates for insights.";
    return;
  }

  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const sevenDaysAgo = new Date(latestDate.getTime() - 6 * MS_PER_DAY);
  const fourteenDaysAgo = new Date(latestDate.getTime() - 13 * MS_PER_DAY);

  const lastWeek = sorted.filter((w) => {
    const d = parseDate(w.date);
    return d && d >= sevenDaysAgo && d <= latestDate;
  });

  const previousWeek = sorted.filter((w) => {
    const d = parseDate(w.date);
    return d && d >= fourteenDaysAgo && d < sevenDaysAgo;
  });

  const lastWeekDuration = lastWeek.reduce(
    (s, w) => s + Number(w.duration || 0),
    0
  );
  const lastWeekCalories = lastWeek.reduce(
    (s, w) => s + Number(w.calories || 0),
    0
  );
  const lastWeekCount = lastWeek.length;

  const fromDate = formatDisplayDate(sevenDaysAgo);
  const toDate = formatDisplayDate(latestDate);

  summaryEl.textContent = `In the last 7 days (${fromDate} to ${toDate}), you logged ${lastWeekCount} workout${
    lastWeekCount !== 1 ? "s" : ""
  }, for ${lastWeekDuration} total minutes and ${lastWeekCalories} calories.`;

  if (lastWeekCount > 0) {
    const activityCounts = {};
    lastWeek.forEach((w) => {
      const a = w.activity || "Unknown";
      activityCounts[a] = (activityCounts[a] || 0) + 1;
    });

    const top = Object.entries(activityCounts).sort((a, b) => b[1] - a[1])[0];
    if (top) {
      topActivityEl.textContent = `Your most common activity this week is ${top[0]} (${top[1]} time${
        top[1] !== 1 ? "s" : ""
      }).`;
    } else {
      topActivityEl.textContent = "";
    }
  } else {
    topActivityEl.textContent = "";
  }

  const byWeek = {};
  sorted.forEach((w) => {
    const d = parseDate(w.date);
    if (!d) return;
    const isoWeekStart = new Date(d);
    isoWeekStart.setDate(d.getDate() - d.getDay());
    const key = isoWeekStart.toISOString().slice(0, 10);
    if (!byWeek[key]) {
      byWeek[key] = { duration: 0, count: 0 };
    }
    byWeek[key].duration += Number(w.duration || 0);
    byWeek[key].count += 1;
  });

  const weekKeys = Object.keys(byWeek);
  if (weekKeys.length > 0) {
    const totalWeekDuration = weekKeys.reduce(
      (sum, wk) => sum + byWeek[wk].duration,
      0
    );
    const avgWeekDuration =
      Math.round((totalWeekDuration / weekKeys.length) * 10) / 10;
    avgWeekEl.textContent = `On average, you log about ${avgWeekDuration} minutes of activity per week.`;
  } else {
    avgWeekEl.textContent = "";
  }

  if (previousWeek.length > 0) {
    const prevDuration = previousWeek.reduce(
      (s, w) => s + Number(w.duration || 0),
      0
    );
    const diff = lastWeekDuration - prevDuration;
    const abs = Math.abs(diff);

    if (diff > 0) {
      compareEl.textContent = `You recorded ${abs} more minute${
        abs !== 1 ? "s" : ""
      } of activity this week compared to the previous week.`;
    } else if (diff < 0) {
      compareEl.textContent = `You recorded ${abs} fewer minute${
        abs !== 1 ? "s" : ""
      } this week compared to the previous week.`;
    } else {
      compareEl.textContent =
        "Your weekly duration is the same as the previous week.";
    }
  } else {
    compareEl.textContent =
      "Not enough data from the previous week to compare yet.";
  }

  // Simple reminder based on 150 minutes/week goal
  const GOAL = 150; // minutes per week
  if (lastWeekDuration < GOAL) {
    reminderEl.textContent =
      `You recorded ${lastWeekDuration} minutes this week. ` +
      `A common goal is ${GOAL} minutes. Consider adding another workout.`;
  } else {
    reminderEl.textContent =
      "You have reached or passed 150 minutes of activity in the last 7 days. Keep it up.";
  }
}

// ---------- Back-to-top ----------

function setupBackToTop() {
  const btn = $("#backToTop");
  if (!btn) return;
  window.addEventListener("scroll", () => {
    btn.style.display = window.scrollY > 300 ? "block" : "none";
  });
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ---------- Refresh view (table + summary + charts + insights) ----------

function refreshView() {
  updateActivityFilterOptions(allWorkouts);
  filteredWorkouts = applyFilters(allWorkouts);
  renderTable(filteredWorkouts);
  updateSummary(filteredWorkouts);
  renderCharts(filteredWorkouts);
  updateInsights(filteredWorkouts);
}
