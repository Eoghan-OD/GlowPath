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
        steps,
        source: 'manual'
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
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const newRows = parseCSV(text);
          if (!newRows.length) {
            if (messageEl) {
              messageEl.textContent =
                'Could not find valid data rows in this CSV file.';
            }
            return;
          }

          allWorkouts = [...allWorkouts, ...newRows];
          saveWorkouts(allWorkouts);
          refreshView();

          if (messageEl) {
            messageEl.textContent = `Imported ${newRows.length} row(s) from CSV.`;
            setTimeout(() => (messageEl.textContent = ''), 3000);
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

        const loadingEl = document.getElementById('chartLoading');
        if (loadingEl) {
          loadingEl.style.display = 'block';
        }

        setTimeout(() => {
          refreshView();
          if (loadingEl) {
            loadingEl.style.display = 'none';
          }
        }, 2000);
      });
    }
  }

  // AI insight button
  const aiBtn = document.getElementById("aiInsightBtn");
  const aiText = document.getElementById("aiInsightText");
  if (aiBtn && aiText) {
    aiBtn.addEventListener("click", async () => {
      if (!filteredWorkouts || !filteredWorkouts.length) {
        aiText.textContent = "No workouts found for the current filters.";
        return;
      }

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
