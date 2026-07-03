
/* ============================================================
   STUDYSPHERE — script.js (Firebase Edition)
   ============================================================ */
 
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
 
/* ---- Firebase Init ---- */
const firebaseConfig = {
  apiKey: "AIzaSyDw43jna--00H0fiRXz8RoEFIac5W26D84",
  authDomain: "study-sphere-c4b30.firebaseapp.com",
  projectId: "study-sphere-c4b30",
  storageBucket: "study-sphere-c4b30.firebasestorage.app",
  messagingSenderId: "355902541755",
  appId: "1:355902541755:web:6bd5a11fcdb249825b3e9e",
  measurementId: "G-FW93YQEGEN"
};
 
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
 
let currentUser = null;
let saveTimeout = null;
 
/* ---- Helpers ---- */
const $ = id => document.getElementById(id);
const CIRCUMFERENCE = 2 * Math.PI * 90;
 
function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
 
/* ============================================================
   AUTH GATE — must be logged in to see this page
   ============================================================ */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  await loadUserData();
  initApp();
});
 
$('logoutBtn')?.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = "login.html";
});
 
/* ============================================================
   FIRESTORE DATA LAYER
   ============================================================ */
let subjects = [];
let exams    = [];
let habits   = [];
let xp       = { total: 0, level: 1 };
let streak   = { count: 0, lastDate: '' };
let pomodoroCount = 0;
let unlockedAchievements = [];
 
async function loadUserData() {
  try {
    const ref  = doc(db, "users", currentUser.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      subjects = d.subjects || [];
      exams    = d.exams || [];
      habits   = d.habits || [];
      xp       = d.xp || { total: 0, level: 1 };
      streak   = d.streak || { count: 0, lastDate: '' };
      pomodoroCount = d.pomodoroCount || 0;
      unlockedAchievements = d.achievements || [];
    } else {
      // first time user — create empty doc
      await saveAllData();
    }
  } catch (e) {
    console.error("Failed to load data:", e);
    showToast('⚠️ Could not load your data. Check your connection.');
  }
}
 
function saveAllData() {
  // debounce so we don't spam Firestore on rapid actions
  clearTimeout(saveTimeout);
  return new Promise(resolve => {
    saveTimeout = setTimeout(async () => {
      try {
        const ref = doc(db, "users", currentUser.uid);
        await setDoc(ref, {
          subjects, exams, habits, xp, streak,
          pomodoroCount, achievements: unlockedAchievements,
          updatedAt: new Date().toISOString()
        });
      } catch (e) {
        console.error("Save failed:", e);
        showToast('⚠️ Could not save. Check your connection.');
      }
      resolve();
    }, 400);
  });
}
 
/* ============================================================
   INIT APP (runs once after auth + data load)
   ============================================================ */
function initApp() {
  $('authGate').style.display = 'none';
  $('mainApp').style.display = 'flex';
  $('mainContent').style.display = 'block';
 
  const name = currentUser.displayName || currentUser.email.split('@')[0];
  $('userInfo').textContent = `👋 ${name}`;
  $('greetingName').textContent = `Welcome back, ${name}!`;
 
  const hour = new Date().getHours();
  $('greetingText').textContent =
    hour < 12 ? 'Good morning ☕' : hour < 17 ? 'Good afternoon ☕' : 'Good evening ☕';
 
  setupTheme();
  setupNavigation();
  setupSubjects();
  setupExams();
  setupHabits();
  setupPomodoro();
  setupAI();
 
  renderXP();
  renderStreak();
  renderSubjects();
  renderExams();
  renderHabits();
  renderAchievements();
  updateDashStats();
 
  $('pomodoroCount').textContent = pomodoroCount;
}
 
/* ============================================================
   THEME
   ============================================================ */
function setupTheme() {
  const themeBtn = $('themeBtn');
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeBtn.textContent = '☀️ Light Mode';
  }
  themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeBtn.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    renderCharts();
  });
}
 
/* ============================================================
   NAVIGATION
   ============================================================ */
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
      item.classList.add('active');
      $('tab-' + item.dataset.tab).classList.add('active');
      if (item.dataset.tab === 'analytics') renderCharts();
    });
  });
}
 
/* ============================================================
   XP SYSTEM
   ============================================================ */
function xpForLevel(lvl) { return lvl * 100; }
 
function addXP(amount, reason) {
  xp.total += amount;
  while (xp.total >= xpForLevel(xp.level)) {
    xp.total -= xpForLevel(xp.level);
    xp.level++;
    showToast(`🎉 Level Up! You're now Level ${xp.level}!`);
  }
  renderXP();
  if (reason) showToast(`+${amount} XP — ${reason}`);
  checkAchievements();
  saveAllData();
}
 
function renderXP() {
  $('xpLevel').textContent   = xp.level;
  $('xpCurrent').textContent = xp.total;
  $('xpNext').textContent    = xpForLevel(xp.level);
  $('xpFill').style.width    = (xp.total / xpForLevel(xp.level) * 100) + '%';
}
 
/* ============================================================
   STREAK
   ============================================================ */
function updateStreak() {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (streak.lastDate === today) return;
  if (streak.lastDate === yesterday) streak.count++;
  else streak.count = 1;
  streak.lastDate = today;
  renderStreak();
  saveAllData();
}
 
function renderStreak() {
  $('streakCount').textContent = streak.count;
}
 
/* ============================================================
   ACHIEVEMENTS
   ============================================================ */
const ACHIEVEMENTS = [
  { id: 'first_subject', icon: '📖', label: 'First Subject', desc: 'Add your first subject', check: () => subjects.length >= 1 },
  { id: 'five_subjects', icon: '📚', label: 'Bookworm',      desc: '5 subjects tracked',    check: () => subjects.length >= 5 },
  { id: 'first_exam',   icon: '📅', label: 'Exam Ready',    desc: 'Add your first exam',   check: () => exams.length >= 1 },
  { id: 'full_chapter', icon: '💯', label: 'Chapter Master', desc: '100% on any subject',  check: () => subjects.some(s => s.completed === s.total && s.total > 0) },
  { id: 'three_streak', icon: '🔥', label: '3-Day Streak',  desc: '3 days in a row',       check: () => streak.count >= 3 },
  { id: 'week_streak',  icon: '🌟', label: 'Week Warrior',  desc: '7-day streak',           check: () => streak.count >= 7 },
  { id: 'pomodoro_5',   icon: '🍅', label: 'Tomato Timer',  desc: '5 pomodoro sessions',   check: () => pomodoroCount >= 5 },
  { id: 'habit_hero',   icon: '✅', label: 'Habit Hero',    desc: 'Complete all habits today', check: () => {
    const today = new Date().toDateString();
    return habits.length > 0 && habits.every(h => (h.doneOn || []).includes(today));
  }},
];
 
function checkAchievements() {
  let newUnlocks = false;
  ACHIEVEMENTS.forEach(a => {
    if (!unlockedAchievements.includes(a.id) && a.check()) {
      unlockedAchievements.push(a.id);
      newUnlocks = true;
      showToast(`🏆 Achievement: ${a.label}!`);
      xp.total += 50; // direct add to avoid recursive save loop
    }
  });
  if (newUnlocks) {
    renderXP();
    saveAllData();
  }
  renderAchievements();
  updateDashStats();
}
 
function renderAchievements() {
  const grid = $('achievementsGrid');
  grid.innerHTML = '';
  ACHIEVEMENTS.forEach(a => {
    const unlocked = unlockedAchievements.includes(a.id);
    const badge = document.createElement('div');
    badge.className = 'achievement-badge ' + (unlocked ? 'unlocked' : 'locked');
    badge.title = a.desc;
    badge.innerHTML = `${a.icon} ${a.label}`;
    grid.appendChild(badge);
  });
  $('statAchievements').textContent = unlockedAchievements.length;
}
 
/* ============================================================
   DASHBOARD STATS
   ============================================================ */
function updateDashStats() {
  $('statSubjects').textContent = subjects.length;
  $('statExams').textContent    = exams.filter(e => new Date(e.date) >= new Date()).length;
 
  const today = new Date().toDateString();
  const doneToday = habits.filter(h => (h.doneOn || []).includes(today)).length;
  $('statHabits').textContent = `${doneToday}/${habits.length}`;
 
  const dashExams = $('dashExams');
  const upcoming = exams
    .map(e => ({ ...e, days: Math.ceil((new Date(e.date) - new Date()) / 86400000) }))
    .filter(e => e.days >= 0)
    .sort((a, b) => a.days - b.days)
    .slice(0, 4);
 
  if (upcoming.length === 0) {
    dashExams.innerHTML = '<p style="color:var(--text2);font-size:0.9rem">No upcoming exams. Enjoy the break! ☕</p>';
  } else {
    dashExams.innerHTML = upcoming.map(e => `
      <div class="dash-exam-item">
        <span><strong>${e.name}</strong> — ${new Date(e.date).toLocaleDateString()}</span>
        <span class="exam-days-pill ${e.days <= 3 ? 'urgent' : e.days <= 7 ? 'soon' : ''}">
          ${e.days === 0 ? 'Today!' : e.days + 'd'}
        </span>
      </div>
    `).join('');
  }
}
 
/* ============================================================
   SUBJECTS
   ============================================================ */
function renderSubjects() {
  const container = $('subjectsContainer');
  container.innerHTML = '';
  if (subjects.length === 0) {
    container.innerHTML = '<p style="color:var(--text2);text-align:center;padding:30px 0">No subjects yet. Add one above! 📖</p>';
    return;
  }
  subjects.forEach((s, i) => {
    const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.innerHTML = `
      <div class="subject-header">
        <span class="subject-name">${s.name}</span>
        <span class="subject-pct">${pct}%</span>
      </div>
      <p class="subject-meta">${s.completed} / ${s.total} chapters completed</p>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="subject-actions">
        <button class="btn-ghost" style="padding:6px 12px;font-size:0.82rem" data-edit="${i}">✏️ Update</button>
        <button class="delete-btn" data-delete="${i}">🗑 Delete</button>
      </div>
    `;
    container.appendChild(card);
  });
 
  container.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', () => editSubjectProgress(Number(btn.dataset.edit))));
  container.querySelectorAll('[data-delete]').forEach(btn =>
    btn.addEventListener('click', () => deleteSubject(Number(btn.dataset.delete))));
 
  updateDashStats();
  checkAchievements();
}
 
function deleteSubject(i) {
  subjects.splice(i, 1);
  saveAllData();
  renderSubjects();
  showToast('Subject removed.');
}
 
function editSubjectProgress(i) {
  const s = subjects[i];
  const val = prompt(`Update completed chapters for "${s.name}" (out of ${s.total}):`, s.completed);
  if (val === null) return;
  const n = Number(val);
  if (isNaN(n) || n < 0 || n > s.total) { showToast('Invalid value.'); return; }
  subjects[i].completed = n;
  if (n === s.total) addXP(30, 'Subject completed!');
  else addXP(10, 'Progress updated');
  renderSubjects();
}
 
function setupSubjects() {
  $('addSubjectBtn').addEventListener('click', () => {
    const name      = $('subjectName').value.trim();
    const completed = Number($('completedChapters').value);
    const total     = Number($('totalChapters').value);
    if (!name)           { showToast('Enter a subject name.'); return; }
    if (total <= 0)      { showToast('Total chapters must be > 0.'); return; }
    if (completed < 0)   { showToast('Completed chapters cannot be negative.'); return; }
    if (completed > total) { showToast('Completed cannot exceed total.'); return; }
    subjects.push({ name, completed, total });
    addXP(20, 'New subject added!');
    updateStreak();
    renderSubjects();
    $('subjectName').value = $('completedChapters').value = $('totalChapters').value = '';
    $('subjectName').focus();
  });
 
  $('subjectName').addEventListener('keydown', e => e.key === 'Enter' && $('completedChapters').focus());
  $('completedChapters').addEventListener('keydown', e => e.key === 'Enter' && $('totalChapters').focus());
  $('totalChapters').addEventListener('keydown', e => e.key === 'Enter' && $('addSubjectBtn').click());
}
 
/* ============================================================
   EXAMS
   ============================================================ */
function renderExams() {
  const container = $('examsContainer');
  container.innerHTML = '';
  const sorted = [...exams].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sorted.length === 0) {
    container.innerHTML = '<p style="color:var(--text2);text-align:center;padding:30px 0">No exams added yet. 📅</p>';
    return;
  }
  sorted.forEach((e, i) => {
    const days = Math.ceil((new Date(e.date) - new Date()) / 86400000);
    const urgencyClass = days <= 3 ? 'urgent' : days >= 14 ? 'far' : '';
    const label = days < 0 ? 'Passed' : days === 0 ? 'Today!' : `${days}`;
    const sublabel = days < 0 ? '' : days === 0 ? '' : 'days left';
    const card = document.createElement('div');
    card.className = 'exam-card';
    card.innerHTML = `
      <div class="exam-info">
        <h3>${e.name}</h3>
        <p>📅 ${new Date(e.date).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</p>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <div class="exam-countdown ${urgencyClass}">
          <div class="days-num">${label}</div>
          <div class="days-lbl">${sublabel}</div>
        </div>
        <button class="delete-btn" data-delete-exam="${i}">🗑</button>
      </div>
    `;
    container.appendChild(card);
  });
 
  container.querySelectorAll('[data-delete-exam]').forEach(btn =>
    btn.addEventListener('click', () => deleteExam(Number(btn.dataset.deleteExam))));
 
  updateDashStats();
  checkAchievements();
}
 
function deleteExam(i) {
  const sorted = [...exams].sort((a, b) => new Date(a.date) - new Date(b.date));
  const target = sorted[i];
  exams = exams.filter(e => !(e.name === target.name && e.date === target.date));
  saveAllData();
  renderExams();
  showToast('Exam removed.');
}
 
function setupExams() {
  $('addExamBtn').addEventListener('click', () => {
    const name = $('examName').value.trim();
    const date = $('examDate').value;
    if (!name || !date) { showToast('Fill in all fields.'); return; }
    exams.push({ name, date });
    addXP(15, 'Exam added!');
    renderExams();
    $('examName').value = $('examDate').value = '';
  });
}
 
/* ============================================================
   HABITS
   ============================================================ */
function renderHabits() {
  const container = $('habitsContainer');
  const today = new Date().toDateString();
  $('habitDate').textContent = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' });
 
  if (habits.length === 0) {
    container.innerHTML = '<p style="color:var(--text2);text-align:center;padding:20px 0">No habits yet. Add one above! ✅</p>';
    return;
  }
 
  container.innerHTML = '';
  habits.forEach((h, i) => {
    const done = (h.doneOn || []).includes(today);
    const item = document.createElement('div');
    item.className = 'habit-item';
    item.innerHTML = `
      <div class="habit-check ${done ? 'done' : ''}" data-toggle="${i}">${done ? '✓' : ''}</div>
      <span class="habit-icon">${h.icon}</span>
      <span class="habit-label ${done ? 'done-label' : ''}">${h.name}</span>
      <button class="habit-delete" data-delete-habit="${i}">✕</button>
    `;
    container.appendChild(item);
  });
 
  container.querySelectorAll('[data-toggle]').forEach(el =>
    el.addEventListener('click', () => toggleHabit(Number(el.dataset.toggle))));
  container.querySelectorAll('[data-delete-habit]').forEach(btn =>
    btn.addEventListener('click', () => deleteHabit(Number(btn.dataset.deleteHabit))));
 
  updateDashStats();
  checkAchievements();
}
 
function toggleHabit(i) {
  const today = new Date().toDateString();
  if (!habits[i].doneOn) habits[i].doneOn = [];
  if (habits[i].doneOn.includes(today)) {
    habits[i].doneOn = habits[i].doneOn.filter(d => d !== today);
    saveAllData();
  } else {
    habits[i].doneOn.push(today);
    addXP(10, 'Habit completed!');
    updateStreak();
  }
  renderHabits();
}
 
function deleteHabit(i) {
  habits.splice(i, 1);
  saveAllData();
  renderHabits();
  showToast('Habit removed.');
}
 
function setupHabits() {
  $('addHabitBtn').addEventListener('click', () => {
    const name = $('habitName').value.trim();
    const icon = $('habitIcon').value;
    if (!name) { showToast('Enter a habit name.'); return; }
    habits.push({ name, icon, doneOn: [] });
    addXP(10, 'New habit added!');
    renderHabits();
    $('habitName').value = '';
  });
}
 
/* ============================================================
   POMODORO TIMER
   ============================================================ */
let timerInterval = null;
let timerSecondsLeft = 25 * 60;
let timerTotalSeconds = 25 * 60;
let timerRunning = false;
let currentMode = 25;
 
function setupPomodoro() {
  const ringProgress = $('ringProgress');
  ringProgress.style.strokeDasharray  = CIRCUMFERENCE;
  ringProgress.style.strokeDashoffset = 0;
 
  function setTimerDisplay(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    $('timerDisplay').textContent = `${m}:${s}`;
    const progress = seconds / timerTotalSeconds;
    ringProgress.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  }
 
  function setMode(minutes) {
    clearInterval(timerInterval);
    timerRunning = false;
    currentMode = minutes;
    timerSecondsLeft = timerTotalSeconds = minutes * 60;
    const labels = { 25: 'Focus Time 🍅', 5: 'Short Break ☕', 15: 'Long Break 🛋️' };
    $('timerLabel').textContent = labels[minutes] || 'Timer';
    setTimerDisplay(timerSecondsLeft);
    document.querySelectorAll('.pomo-mode-btn').forEach(b => {
      b.classList.toggle('active', Number(b.dataset.mode) === minutes);
    });
  }
 
  document.querySelectorAll('.pomo-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => setMode(Number(btn.dataset.mode)));
  });
 
  $('startTimer').addEventListener('click', () => {
    if (timerRunning) return;
    timerRunning = true;
    timerInterval = setInterval(() => {
      timerSecondsLeft--;
      setTimerDisplay(timerSecondsLeft);
      if (timerSecondsLeft <= 0) {
        clearInterval(timerInterval);
        timerRunning = false;
        if (currentMode === 25) {
          pomodoroCount++;
          $('pomodoroCount').textContent = pomodoroCount;
          addXP(25, 'Pomodoro done!');
          checkAchievements();
          updateStreak();
          showToast('🍅 Focus session complete! Take a break.');
        } else {
          showToast('Break over! Ready to focus? 🍅');
        }
      }
    }, 1000);
  });
 
  $('pauseTimer').addEventListener('click', () => {
    clearInterval(timerInterval);
    timerRunning = false;
  });
 
  $('resetTimer').addEventListener('click', () => {
    clearInterval(timerInterval);
    timerRunning = false;
    timerSecondsLeft = timerTotalSeconds;
    setTimerDisplay(timerSecondsLeft);
  });
}
 
/* ============================================================
   ANALYTICS CHARTS
   ============================================================ */
let chartInstances = {};
 
function getChartColors() {
  const dark = document.body.classList.contains('dark-mode');
  return {
    text:   dark ? '#C9B9A8' : '#7A6654',
    grid:   dark ? '#3D2E22' : '#E4D3C2',
    accent: dark ? '#D7A56D' : '#8B5E3C',
    accent2:dark ? '#E7C8A0' : '#C68E5A',
  };
}
 
function renderCharts() {
  const clrs = getChartColors();
  Object.values(chartInstances).forEach(c => c.destroy());
  chartInstances = {};
 
  const subCtx = $('subjectChart');
  if (subCtx && subjects.length > 0) {
    chartInstances.subject = new Chart(subCtx, {
      type: 'bar',
      data: {
        labels: subjects.map(s => s.name),
        datasets: [{ label: '% Complete', data: subjects.map(s => s.total > 0 ? Math.round(s.completed / s.total * 100) : 0), backgroundColor: clrs.accent2, borderRadius: 8 }]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: clrs.text } } },
        scales: { x: { ticks: { color: clrs.text }, grid: { color: clrs.grid } }, y: { ticks: { color: clrs.text }, grid: { color: clrs.grid }, max: 100 } }
      }
    });
  }
 
  const habitCtx = $('habitChart');
  if (habitCtx) {
    const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 86400000).toDateString());
    const labels = days.map(d => new Date(d).toLocaleDateString('en-GB', { weekday: 'short' }));
    const data   = days.map(d => habits.filter(h => (h.doneOn || []).includes(d)).length);
    chartInstances.habit = new Chart(habitCtx, {
      type: 'line',
      data: { labels, datasets: [{ label: 'Habits Done', data, borderColor: clrs.accent, backgroundColor: clrs.accent + '33', fill: true, tension: 0.4, pointBackgroundColor: clrs.accent }] },
      options: { responsive: true, plugins: { legend: { labels: { color: clrs.text } } }, scales: { x: { ticks: { color: clrs.text }, grid: { color: clrs.grid } }, y: { ticks: { color: clrs.text }, grid: { color: clrs.grid }, min: 0 } } }
    });
  }
 
  const examCtx = $('examChart');
  if (examCtx) {
    const upcoming = exams.map(e => ({ name: e.name, days: Math.ceil((new Date(e.date) - new Date()) / 86400000) })).filter(e => e.days >= 0).sort((a, b) => a.days - b.days).slice(0, 8);
    chartInstances.exam = new Chart(examCtx, {
      type: 'bar',
      data: { labels: upcoming.map(e => e.name), datasets: [{ label: 'Days Until Exam', data: upcoming.map(e => e.days), backgroundColor: upcoming.map(e => e.days <= 3 ? '#A94442' : e.days <= 7 ? '#C68E5A' : clrs.accent), borderRadius: 8 }] },
      options: { indexAxis: 'y', responsive: true, plugins: { legend: { labels: { color: clrs.text } } }, scales: { x: { ticks: { color: clrs.text }, grid: { color: clrs.grid } }, y: { ticks: { color: clrs.text }, grid: { color: clrs.grid } } } }
    });
  }
}
 
/* ============================================================
   AI STUDY SCHEDULER
   ============================================================ */
function setupAI() {
  $('generateSchedule').addEventListener('click', () => {
    const outputCard = $('aiOutputCard');
    const output = $('aiOutput');
    outputCard.style.display = 'block';
    output.innerHTML = `
      <div style="text-align:center;padding:30px 0">
        <div style="font-size:3rem;margin-bottom:16px">🚧</div>
        <h3 style="color:var(--accent);font-family:var(--font-display);margin-bottom:10px">
          AI Scheduler Coming Soon!
        </h3>
        <p style="color:var(--text2);line-height:1.7;max-width:400px;margin:0 auto">
          We're working on connecting the AI securely.
          In the meantime, use your <strong>Subjects</strong> and
          <strong>Exams</strong> tabs to plan your study sessions! 📚☕
        </p>
      </div>
    `;
  });
}