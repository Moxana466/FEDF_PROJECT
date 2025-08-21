/* ===== Basic State & Helpers ===== */
const STORAGE_KEY = "ecotrack:v1";
const TODAY_KEY = () => new Date().toISOString().slice(0,10); // YYYY-MM-DD

const el = (id) => document.getElementById(id);
const $habitList = el("habitList");
const $totalCount = el("totalCount");
const $completedCount = el("completedCount");
const $progress = el("progress");
const $streak = el("streak");
const $today = el("today");
const $installBtn = el("installBtn");

const SUGGESTIONS = [
  "Carry a water bottle",
  "Use bus/metro",
  "Turn off fans/lights",
  "Two-sided printing",
  "Segregate waste",
  "Short showers",
  "No plastic cutlery",
  "Plant watering schedule",
];
/* install suggestions as clickable chips */
const chips = document.getElementById("suggestions");
SUGGESTIONS.forEach(txt => {
  const c = document.createElement("button");
  c.className = "chip";
  c.type = "button";
  c.textContent = txt;
  c.addEventListener("click", () => addHabit(txt));
  chips.appendChild(c);
});

/* ===== Load / Save ===== */
function load() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  return {
    habits: saved.habits || [],
    lastDay: saved.lastDay || TODAY_KEY(),
    streak: saved.streak || 0,
  };
}
function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ===== App State ===== */
let state = load();

/* Reset daily checkboxes when a new day starts, update streak */
function ensureToday() {
  const today = TODAY_KEY();
  if (state.lastDay !== today) {
    const allDoneYesterday = state.habits.length > 0 && state.habits.every(h => h.done);
    if (allDoneYesterday) state.streak += 1; else state.streak = 0;
    state.habits = state.habits.map(h => ({...h, done:false}));
    state.lastDay = today;
    save(state);
  }
}
ensureToday();

/* ===== UI Rendering ===== */
function render() {
  $today.textContent = new Date().toLocaleDateString();
  $habitList.innerHTML = "";

  state.habits.forEach((h, idx) => {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <label>
        <input type="checkbox" ${h.done ? "checked":""} data-idx="${idx}">
        <span>${h.title}</span>
      </label>
      <div>
        <button class="btn secondary" data-del="${idx}">Delete</button>
      </div>
    `;
    $habitList.appendChild(li);
  });

  const total = state.habits.length;
  const done = state.habits.filter(h => h.done).length;
  $totalCount.textContent = total;
  $completedCount.textContent = done;
  $progress.value = total ? Math.round((done/total)*100) : 0;
  $streak.textContent = state.streak;
}

/* ===== Events ===== */
document.addEventListener("change", (e) => {
  if (e.target.matches('input[type="checkbox"][data-idx]')) {
    const i = +e.target.dataset.idx;
    state.habits[i].done = e.target.checked;
    save(state); render();
  }
});
document.addEventListener("click", (e) => {
  const del = e.target.getAttribute("data-del");
  if (del !== null) {
    state.habits.splice(+del, 1);
    save(state); render();
  }
});

function addHabit(title) {
  const clean = title.trim();
  if (!clean) return;
  state.habits.push({ title: clean, done: false });
  save(state); render();
}

document.getElementById("addForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("habitInput");
  addHabit(input.value);
  input.value = "";
});

document.getElementById("clearAll").addEventListener("click", () => {
  if (confirm("Delete ALL habits?")) {
    state.habits = [];
    save(state); render();
  }
});
document.getElementById("resetDay").addEventListener("click", () => {
  state.habits = state.habits.map(h => ({...h, done:false}));
  save(state); render();
});

/* ===== PWA: Service Worker + Install prompt ===== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}

let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $installBtn.hidden = false;
});
$installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $installBtn.hidden = true;
});

render();
