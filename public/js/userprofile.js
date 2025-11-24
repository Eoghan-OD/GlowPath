// userprofile.js
// Handles login and sign up using a popup modal and links users to workout data.

// Storage keys
const UP_USERS_KEY = 'glowpath_users';
const UP_CURRENT_USER_KEY = 'glowpath_current_user';
const UP_WORKOUT_STORAGE_KEY = 'glowpath_workouts';

// ---------- Helpers for users ----------

function upLoadUsers() {
  try {
    const raw = localStorage.getItem(UP_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to parse users from localStorage', e);
    return [];
  }
}

function upSaveUsers(users) {
  localStorage.setItem(UP_USERS_KEY, JSON.stringify(users));
}

function upGetCurrentUserName() {
  return localStorage.getItem(UP_CURRENT_USER_KEY) || null;
}

function upSetCurrentUserName(name) {
  if (name) {
    localStorage.setItem(UP_CURRENT_USER_KEY, name);
  } else {
    localStorage.removeItem(UP_CURRENT_USER_KEY);
  }
}

function upUpdateAuthUI() {
  const label = document.getElementById('currentUserLabel');
  const displayNameEl = document.getElementById('userDisplayName');
  const name = upGetCurrentUserName();

  if (label) {
    label.textContent = name ? `Logged in as ${name}` : 'No user logged in';
  }
  if (displayNameEl) {
    // Show the logged-in name, or a generic label if nobody logged in
    displayNameEl.textContent = name || 'Guest';
  }
}

// Read whatever workouts are currently stored
function upGetCurrentWorkoutsSnapshot() {
  if (Array.isArray(window.allWorkouts)) {
    return window.allWorkouts;
  }
  try {
    const raw = localStorage.getItem(UP_WORKOUT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to read workouts from localStorage', e);
    return [];
  }
}

// Set the active workouts and refresh the main view
function upSetCurrentWorkouts(workouts) {
  const safeArray = Array.isArray(workouts) ? workouts : [];
  window.allWorkouts = safeArray;
  try {
    localStorage.setItem(UP_WORKOUT_STORAGE_KEY, JSON.stringify(safeArray));
  } catch (e) {
    console.warn('Failed to write workouts to localStorage', e);
  }
  if (typeof window.refreshView === 'function') {
    window.refreshView();
  }
}

// Export users so they can be opened in Excel
function upExportUsersToCsv() {
  const users = upLoadUsers();
  if (!users.length) {
    alert('No users to export.');
    return;
  }
  let csv = 'Name,Password,WorkoutCount\n';
  users.forEach((u) => {
    const count = Array.isArray(u.workouts) ? u.workouts.length : 0;
    csv += `"${u.username}","${u.password}",${count}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'glowpath_users.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- Modal helpers ----------

function upShowAuthModal() {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  modal.classList.remove('auth-modal-hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function upHideAuthModal() {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  modal.classList.add('auth-modal-hidden');
  modal.setAttribute('aria-hidden', 'true');
}

// ---------- DOM wiring ----------

document.addEventListener('DOMContentLoaded', () => {
  const openModalBtn = document.getElementById('openAuthModalBtn');
  const closeModalBtn = document.getElementById('closeAuthModalBtn');
  const logoutNavBtn = document.getElementById('logoutNavBtn');
  const downloadUsersBtn = document.getElementById('downloadUsersBtn');
  const authMessageEl = document.getElementById('authMessage');

  const loginForm = document.getElementById('loginModalForm');
  const signupForm = document.getElementById('signupModalForm');

  // Initial label + profile name
  upUpdateAuthUI();

  // Auto open modal if no user logged in
  if (!upGetCurrentUserName()) {
    upShowAuthModal();
  }

  // Open modal from button
  if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
      upShowAuthModal();
    });
  }

  // Close modal button
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      upHideAuthModal();
    });
  }

  // Close modal when clicking outside content
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        upHideAuthModal();
      }
    });
  }

  // Sign up inside modal
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('signup-modal-name');
      const passInput = document.getElementById('signup-modal-password');
      const username = nameInput ? nameInput.value.trim() : '';
      const password = passInput ? passInput.value.trim() : '';

      if (!username || !password) {
        if (authMessageEl) authMessageEl.textContent = 'Name and password are required to sign up.';
        return;
      }

      const users = upLoadUsers();
      if (users.some((u) => u.username === username)) {
        if (authMessageEl) authMessageEl.textContent = 'That name is already taken. Choose another.';
        return;
      }

      const snapshot = upGetCurrentWorkoutsSnapshot();

      const newUser = {
        username,
        password,
        workouts: Array.isArray(snapshot) ? snapshot : []
      };

      users.push(newUser);
      upSaveUsers(users);
      upSetCurrentUserName(username);
      upUpdateAuthUI();

      if (authMessageEl) {
        authMessageEl.textContent =
          'Account created. Your current workouts have been saved to this user.';
      }

      signupForm.reset();
      upHideAuthModal();
    });
  }

  // Login inside modal
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('login-modal-name');
      const passInput = document.getElementById('login-modal-password');
      const username = nameInput ? nameInput.value.trim() : '';
      const password = passInput ? passInput.value.trim() : '';

      const users = upLoadUsers();
      const user = users.find((u) => u.username === username);

      if (!user || user.password !== password) {
        if (authMessageEl) authMessageEl.textContent = 'Login failed. Check name and password.';
        return;
      }

      upSetCurrentUserName(username);
      upSetCurrentWorkouts(user.workouts || []);
      upUpdateAuthUI();

      if (authMessageEl) {
        authMessageEl.textContent = `Logged in as ${username}. Showing your saved workouts.`;
      }

      loginForm.reset();
      upHideAuthModal();
    });
  }

  // Logout from nav bar
  if (logoutNavBtn) {
    logoutNavBtn.addEventListener('click', () => {
      upSetCurrentUserName(null);
      upUpdateAuthUI();
      if (authMessageEl) {
        authMessageEl.textContent =
          'Logged out. Workouts on screen remain as currently loaded on this device.';
      }
    });
  }

  // Download users CSV
  if (downloadUsersBtn) {
    downloadUsersBtn.addEventListener('click', () => {
      upExportUsersToCsv();
    });
  }
});
