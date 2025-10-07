// Selects key elements from the HTML
const form = document.getElementById('glowpath-form');
const message = document.getElementById('glowpath-message');
const tableBody = document.querySelector('#workoutTable tbody');
const csvInput = document.getElementById('csvFileInput');
const uploadBtn = document.getElementById('uploadBtn');

// Load stored workouts when the page opens
window.addEventListener('load', loadWorkouts);

// When the form is submitted, save the workout data
form.addEventListener('submit', (e) => {
  e.preventDefault(); // Prevents page reload

  // Get form values
  const activity = document.getElementById('activity').value;
  const duration = document.getElementById('duration').value;
  const calories = document.getElementById('calories').value;
  const steps = document.getElementById('steps').value || '—'; // optional field

  // Create a workout entry object
  const workout = {
    date: new Date().toLocaleDateString(),
    activity,
    duration,
    calories,
    steps,
  };

  // Save the workout to local storage
  saveWorkout(workout);

  // Update the table with the new entry
  addWorkoutToTable(workout);

  // Display a quick success message
  message.textContent = 'Workout saved!';
  message.style.color = 'green';

  // Clear form fields
  form.reset();
});

// Save a workout entry into localStorage
function saveWorkout(workout) {
  const workouts = JSON.parse(localStorage.getItem('workouts')) || [];
  workouts.push(workout);
  localStorage.setItem('workouts', JSON.stringify(workouts));
}

// Load all workouts from storage and show them in the table
function loadWorkouts() {
  const workouts = JSON.parse(localStorage.getItem('workouts')) || [];
  workouts.forEach(addWorkoutToTable);
}

// Add a workout entry into the table
function addWorkoutToTable(workout) {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${workout.date}</td>
    <td>${workout.activity}</td>
    <td>${workout.duration}</td>
    <td>${workout.calories}</td>
    <td>${workout.steps}</td>
  `;
  tableBody.appendChild(row);
}

// Handle CSV file upload
uploadBtn.addEventListener('click', () => {
  const file = csvInput.files[0];
  if (!file) {
    alert('Please select a CSV file first.');
    return;
  }

  const reader = new FileReader();

  // When the file is successfully read
  reader.onload = function (e) {
    const text = e.target.result;
    const data = parseCSV(text);

    // Add each CSV row to the table and save to local storage
    data.forEach((workout) => {
      addWorkoutToTable(workout);
      saveWorkout(workout);
    });

    alert('CSV data uploaded successfully!');
  };

  reader.readAsText(file); // Reads the CSV file as plain text
});

// Simple CSV parser that converts text to an array of workout objects
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');

  // Convert each line (except header) into an object
  const workouts = lines.slice(1).map((line) => {
    const values = line.split(',');
    const entry = {};
    headers.forEach((header, index) => {
      entry[header.trim()] = values[index].trim();
    });
    return entry;
  });

  return workouts;
}
