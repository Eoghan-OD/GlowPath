// Handle manual form submission
document.getElementById('glowpath-form').addEventListener('submit', function(e) {
  e.preventDefault();

  const activity = document.getElementById('activity').value;
  const duration = document.getElementById('duration').value;
  const calories = document.getElementById('calories').value;
  const steps = document.getElementById('steps').value || '—';

  if (!activity || !duration || !calories) {
    alert('Please fill in all required fields.');
    return;
  }

  const workout = {
    date: new Date().toLocaleDateString(),
    activity,
    duration,
    calories,
    steps
  };

  const data = JSON.parse(localStorage.getItem('glowpathWorkouts')) || [];
  data.push(workout);
  localStorage.setItem('glowpathWorkouts', JSON.stringify(data));

  document.getElementById('glowpath-message').textContent = 'Workout saved successfully!';
  document.getElementById('glowpath-form').reset();

  renderTable();
});

// Render workout table
function renderTable() {
  const data = JSON.parse(localStorage.getItem('glowpathWorkouts')) || [];
  const tbody = document.querySelector('#workoutTable tbody');
  tbody.innerHTML = '';

  data.forEach(entry => {
    const row = `<tr>
      <td>${entry.date}</td>
      <td>${entry.activity}</td>
      <td>${entry.duration}</td>
      <td>${entry.calories}</td>
      <td>${entry.steps}</td>
    </tr>`;
    tbody.insertAdjacentHTML('beforeend', row);
  });
}

// CSV Upload Preview
document.getElementById('uploadBtn').addEventListener('click', () => {
  const fileInput = document.getElementById('csvFileInput');
  const file = fileInput.files[0];
  if (!file) {
    alert('Please select a CSV file first.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const lines = text.trim().split('\n').slice(1); // skip header
    lines.forEach(line => {
      const [date, activity, duration, calories, steps] = line.split(',');
      const workout = { date, activity, duration, calories, steps };
      const data = JSON.parse(localStorage.getItem('glowpathWorkouts')) || [];
      data.push(workout);
      localStorage.setItem('glowpathWorkouts', JSON.stringify(data));
    });
    renderTable();
    alert('CSV data imported successfully!');
  };
  reader.readAsText(file);
});

// Load existing data on startup
window.addEventListener('DOMContentLoaded', renderTable);
