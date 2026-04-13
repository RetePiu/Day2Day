// ===================================
// TASK ORGANIZER — Main Logic v2
// ===================================

// State
let currentDate = new Date();
let selectedDate = null;
let selectedCalDay = null;
let currentView = 'home';

// Persistent Data
let taskData = JSON.parse(localStorage.getItem('taskOrg_data')) || {};
let activeTasks = JSON.parse(localStorage.getItem('taskOrg_tasks')) || [];
let projectsData = JSON.parse(localStorage.getItem('taskOrg_projects')) || [];

// Category base colors
const CATEGORY_COLORS = {
    'icon-allenamento': '#e0e0e0',
    'icon-video': '#cccccc',
    'icon-codice': '#b3b3b3',
    'icon-lettura': '#999999',
    'icon-musica': '#ffffff'
};
const ORIGINAL_COLORS = {
    'icon-allenamento': '#ff0000',
    'icon-video': '#f40000',
    'icon-codice': '#ea0000',
    'icon-lettura': '#df0000',
    'icon-musica': '#a51b0b'
};

const ICON_MAP = {
    'icon-allenamento': '💪',
    'icon-video': '🎬',
    'icon-codice': '💻',
    'icon-lettura': '📖',
    'icon-musica': '🎵'
};

const MONTH_NAMES = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const MONTH_ABBR = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];
const WEEKDAY_MAP = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

// Pastel colors for each month in calendar view
const MONTH_PASTELS = [
    '#E3F2FD', // Gennaio - light blue
    '#FCE4EC', // Febbraio - light pink
    '#E8F5E9', // Marzo - light green
    '#FFFDE7', // Aprile - light yellow
    '#F3E5F5', // Maggio - light purple
    '#FFF3E0', // Giugno - light orange
    '#E0F7FA', // Luglio - light cyan
    '#FFEBEE', // Agosto - light red
    '#EDE7F6', // Settembre - light indigo
    '#E0F2F1', // Ottobre - light teal
    '#FBE9E7', // Novembre - light deep orange
    '#ECEFF1'  // Dicembre - light blue grey
];

// DOM refs
const views = {
    home: document.getElementById('home-view'),
    dayTasks: document.getElementById('day-tasks-view'),
    projects: document.getElementById('projects-view'),
    calendar: document.getElementById('calendar-view'),
    stats: document.getElementById('stats-view')
};

const calendarGrid = document.getElementById('calendar-grid');
const monthYearDisplay = document.getElementById('month-year-display');
const sidebarTasks = document.getElementById('sidebar-tasks');
const modalProject = document.getElementById('modal-project');
const overlay = document.getElementById('sidebar-overlay');

// ========================
// COLOR UTILS
// ========================
function lightenColor(hex, factor) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.round(r + (255 - r) * factor);
    g = Math.round(g + (255 - g) * factor);
    b = Math.round(b + (255 - b) * factor);
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

function getTaskColor(task) {
    return '#f9fafb';
}

// ========================
// INIT
// ========================
function init() {
    if (activeTasks.length === 0) {
        activeTasks = [
            { id: 't_allenamento', name: 'Allenamento', iconClass: 'icon-allenamento' },
            { id: 't_lettura', name: 'Lettura', iconClass: 'icon-lettura' },
            { id: 't_video', name: 'Video', iconClass: 'icon-video' }
        ];
        saveState();
    }

    updateCalendarWidget();
    startClock();
    renderCalendar();

    // Home buttons
    document.getElementById('calendar-widget').addEventListener('click', () => {
        selectedDate = new Date();
        openDayTasksFromHome(selectedDate);
    });

    document.getElementById('btn-wrench').addEventListener('click', () => switchView('projects'));
    document.getElementById('btn-calendar').addEventListener('click', () => switchView('calendar'));
    document.getElementById('btn-stats').addEventListener('click', () => switchView('stats'));

    // Back buttons
    document.querySelectorAll('.back-to-home-btn').forEach(btn => {
        btn.addEventListener('click', () => switchView('home'));
    });
    document.getElementById('day-tasks-back').addEventListener('click', () => switchView('home'));

    // Calendar
    document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => changeMonth(1));
    document.getElementById('today-btn').addEventListener('click', () => {
        currentDate = new Date();
        renderCalendar();
    });

    // Sidebar
    document.getElementById('btn-open-sidebar').addEventListener('click', () => {
        renderActiveTasksList();
        openSidebar(sidebarTasks);
    });
    document.getElementById('new-project-btn').addEventListener('click', () => openSidebar(modalProject));
    document.getElementById('close-sidebar').addEventListener('click', () => closeSidebar(sidebarTasks));
    document.getElementById('close-project-modal').addEventListener('click', () => closeSidebar(modalProject));
    overlay.addEventListener('click', () => {
        closeSidebar(sidebarTasks);
        closeSidebar(modalProject);
    });

    // Add task/project
    document.getElementById('btn-add-task').addEventListener('click', handleAddTask);
    document.getElementById('btn-add-proj').addEventListener('click', handleAddProject);
    document.getElementById('new-task-name').addEventListener('keydown', e => { if (e.key === 'Enter') handleAddTask(); });
    document.getElementById('new-proj-name').addEventListener('keydown', e => { if (e.key === 'Enter') handleAddProject(); });
}

// ========================
// RETRO CLOCK
// ========================
let prevTime = '';

function startClock() {
    updateClock();
    setInterval(updateClock, 200);
}

function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const timeStr = h + m + s;

    const ids = ['clock-h1', 'clock-h2', 'clock-m1', 'clock-m2', 'clock-s1', 'clock-s2'];
    for (let i = 0; i < 6; i++) {
        const el = document.getElementById(ids[i]);
        const newDigit = timeStr[i];
        if (el.textContent !== newDigit) {
            el.textContent = newDigit;
            el.classList.remove('flip');
            void el.offsetWidth; // force reflow
            el.classList.add('flip');
        }
    }
    prevTime = timeStr;
}

// ========================
// CALENDAR WIDGET (Home)
// ========================
function updateCalendarWidget() {
    const now = new Date();
    const day = now.getDate();
    const weekdayIndex = now.getDay();
    const monthIndex = now.getMonth();

    const weekdayKey = WEEKDAY_MAP[weekdayIndex];
    const monthKey = MONTH_NAMES[monthIndex].toLowerCase();

    // Weekday (bottom-right)
    const weekdayImg = document.getElementById('cal-weekday');
    if (weekdayImg) {
        weekdayImg.src = `calendar images/asset ${weekdayKey}.png`;
        weekdayImg.alt = weekdayKey.toUpperCase();
    }

    // Month image (bottom-left)
    const monthImg = document.getElementById('cal-month');
    if (monthImg) {
        monthImg.src = `calendar images/asset ${monthKey}.png`;
        monthImg.alt = monthKey.toUpperCase();
    }

    // Day digits (top-left and top-right)
    const tensImg = document.getElementById('cal-digit-tens');
    const onesImg = document.getElementById('cal-digit-ones');

    if (tensImg && onesImg) {
        if (day < 10) {
            tensImg.classList.add('hidden');
            onesImg.classList.add('single-digit');
            onesImg.src = `calendar images/asset giorno ${day}.png`;
        } else {
            const tens = Math.floor(day / 10);
            const ones = day % 10;
            tensImg.classList.remove('hidden');
            onesImg.classList.remove('single-digit');
            tensImg.src = `calendar images/asset giorno ${tens}.png`;
            onesImg.src = `calendar images/asset giorno ${ones}.png`;
        }
    }
}

// ========================
// NAVIGATION
// ========================
function switchView(target) {
    currentView = target;
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[target].classList.add('active');

    if (target === 'stats') renderStats();
    if (target === 'projects') renderProjects();
    if (target === 'calendar') renderCalendar();
    if (target === 'home') updateCalendarWidget();
}

function openSidebar(el) {
    el.classList.add('active');
    overlay.classList.add('active');
}
function closeSidebar(el) {
    el.classList.remove('active');
    overlay.classList.remove('active');
}

// ========================
// CALENDAR VIEW
// ========================
function renderCalendar() {
    calendarGrid.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    monthYearDisplay.textContent = `${MONTH_NAMES[month]} ${year}`;

    const calCard = document.getElementById('calendar-card');
    calCard.style.backgroundColor = '#ffffff';

    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
        const d = document.createElement('div');
        d.className = 'cal-day';
        if ((i + 1) % 7 === 0) d.classList.add('no-right-border');
        if (i >= totalCells - 7) d.classList.add('no-bottom-border');

        if (i < startOffset || i >= startOffset + daysInMonth) {
            d.classList.add('empty');
        } else {
            const dayNum = i - startOffset + 1;
            const dateObj = new Date(year, month, dayNum);
            const dateString = formatDate(dateObj);

            d.textContent = dayNum;
            if (dateString === formatDate(today)) d.classList.add('today');

            // Check if this is currently selected
            if (selectedCalDay === dateString) d.classList.add('selected');

            // Task dots
            const dayTasks = taskData[dateString] || {};
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'task-dots';
            let dotCount = 0;
            activeTasks.forEach(t => {
                if (dayTasks[t.id] > 0 && dotCount < 3) {
                    const dot = document.createElement('div');
                    dot.className = 'dot';
                    dotsContainer.appendChild(dot);
                    dotCount++;
                }
            });
            d.appendChild(dotsContainer);

            d.addEventListener('click', () => {
                selectedCalDay = dateString;
                renderCalendar(); // re-render to show selection
                showInlineTasksForDay(dateObj, dateString);
            });
        }
        calendarGrid.appendChild(d);
    }
}

function showInlineTasksForDay(dateObj, dateString) {
    const section = document.getElementById('cal-inline-tasks');
    const container = document.getElementById('cal-inline-container');
    const emptyMsg = document.getElementById('cal-inline-empty');
    const title = document.getElementById('cal-inline-title');

    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    const text = dateObj.toLocaleDateString('it-IT', options);
    title.textContent = text.charAt(0).toUpperCase() + text.slice(1);

    section.style.display = 'block';
    container.innerHTML = '';

    if (!taskData[dateString]) taskData[dateString] = {};

    const dayData = taskData[dateString];
    let hasAny = false;

    activeTasks.forEach(task => {
        const val = dayData[task.id] || 0;
        if (val > 0) hasAny = true;

        const icon = ICON_MAP[task.iconClass] || '📋';
        const color = getTaskColor(task);
        const card = document.createElement('div');
        card.className = 'task-card';
        card.style.backgroundColor = color;
        card.style.borderLeftColor = ORIGINAL_COLORS[task.iconClass] || '#999';

        card.innerHTML = `
            <div class="task-info">
                <div class="task-icon">${icon}</div>
                <div class="task-name">${task.name}</div>
            </div>
            <div class="task-controls">
                <button class="action-btn minus-btn" aria-label="Diminuisci">−</button>
                <div class="task-value" id="val-inline-${task.id}">${val}</div>
                <button class="action-btn plus-btn" aria-label="Aumenta">+</button>
            </div>
        `;

        card.querySelector('.minus-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            updateInlineTaskValue(dateString, task.id, -1, e);
        });
        card.querySelector('.plus-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            updateInlineTaskValue(dateString, task.id, 1, e);
        });

        container.appendChild(card);
    });

    if (activeTasks.length === 0) {
        emptyMsg.style.display = 'block';
        emptyMsg.textContent = 'Nessuna task creata. Usa "+ Task" per aggiungerne.';
    } else {
        emptyMsg.style.display = 'none';
    }
}

function updateInlineTaskValue(dateString, taskId, change, event) {
    let val = taskData[dateString][taskId] || 0;
    val += change;
    if (val < 0) val = 0;
    taskData[dateString][taskId] = val;

    const el = document.getElementById(`val-inline-${taskId}`);
    if (el) {
        el.textContent = val;
        el.style.transform = 'scale(1.3)';
        setTimeout(() => { el.style.transform = 'scale(1)'; }, 150);
    }
    saveState();

    // Update dots on calendar
    renderCalendar();
    // Re-show inline tasks
    const dateObj = new Date(dateString + 'T00:00:00');
    showInlineTasksForDay(dateObj, dateString);

    if (change > 0) throwConfetti(event.clientX, event.clientY);
}

function changeMonth(dir) {
    currentDate.setMonth(currentDate.getMonth() + dir);
    selectedCalDay = null;
    document.getElementById('cal-inline-tasks').style.display = 'none';
    renderCalendar();
}

// ========================
// DAY TASKS FROM HOME
// ========================
function openDayTasksFromHome(date) {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const text = date.toLocaleDateString('it-IT', options);
    document.getElementById('day-tasks-title').textContent = 'Task di Oggi';
    document.getElementById('day-tasks-date').textContent = text.charAt(0).toUpperCase() + text.slice(1);

    const dateString = formatDate(date);
    if (!taskData[dateString]) taskData[dateString] = {};

    renderTaskCards('day-tasks-container', 'day-tasks-empty', dateString);
    switchView('dayTasks');
}

// ========================
// RENDER TASK CARDS (shared)
// ========================
function renderTaskCards(containerId, emptyId, dateString) {
    const container = document.getElementById(containerId);
    const emptyState = document.getElementById(emptyId);
    container.innerHTML = '';

    if (activeTasks.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    activeTasks.forEach(task => {
        const val = taskData[dateString][task.id] || 0;
        const icon = ICON_MAP[task.iconClass] || '📋';
        const color = getTaskColor(task);

        const card = document.createElement('div');
        card.className = 'task-card';
        card.style.backgroundColor = color;
        card.style.borderLeftColor = ORIGINAL_COLORS[task.iconClass] || '#999';

        card.innerHTML = `
            <div class="task-info">
                <div class="task-icon">${icon}</div>
                <div class="task-name">${task.name}</div>
            </div>
            <div class="task-controls">
                <button class="action-btn minus-btn" aria-label="Diminuisci">−</button>
                <div class="task-value" id="val-${containerId}-${task.id}">${val}</div>
                <button class="action-btn plus-btn" aria-label="Aumenta">+</button>
            </div>
        `;

        card.querySelector('.minus-btn').addEventListener('click', (e) => updateTaskValue(dateString, task.id, -1, e, containerId));
        card.querySelector('.plus-btn').addEventListener('click', (e) => updateTaskValue(dateString, task.id, 1, e, containerId));

        container.appendChild(card);
    });
}

function updateTaskValue(dateString, taskId, change, event, containerId) {
    let val = taskData[dateString][taskId] || 0;
    val += change;
    if (val < 0) val = 0;
    taskData[dateString][taskId] = val;

    const el = document.getElementById(`val-${containerId}-${taskId}`);
    if (el) {
        el.textContent = val;
        el.style.transform = 'scale(1.3)';
        setTimeout(() => { el.style.transform = 'scale(1)'; }, 150);
    }
    saveState();
    if (change > 0) throwConfetti(event.clientX, event.clientY);
}

// ========================
// SIDEBAR: MANAGE TASKS (with drag-and-drop reorder)
// ========================
let dragSrcIndex = null;

function renderActiveTasksList() {
    const list = document.getElementById('active-tasks-list');
    list.innerHTML = '';

    if (activeTasks.length === 0) {
        list.innerHTML = '<p class="empty-state" style="padding:20px;">Nessuna task creata.</p>';
        return;
    }

    activeTasks.forEach((task, index) => {
        const icon = ICON_MAP[task.iconClass] || '📋';
        const item = document.createElement('div');
        item.className = 'sidebar-task-item';
        item.style.borderLeftColor = ORIGINAL_COLORS[task.iconClass] || '#999';
        item.draggable = true;
        item.dataset.index = index;

        item.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="cursor:grab; font-size:1rem; color:#aaa;">☰</span>
                <span>${icon}</span>
                <span>${task.name}</span>
            </div>
            <button class="remove-task-btn" aria-label="Rimuovi task">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
        `;

        // Drag events
        item.addEventListener('dragstart', (e) => {
            dragSrcIndex = index;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            document.querySelectorAll('.sidebar-task-item').forEach(el => el.classList.remove('drag-over'));
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            document.querySelectorAll('.sidebar-task-item').forEach(el => el.classList.remove('drag-over'));
            item.classList.add('drag-over');
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            const destIndex = parseInt(item.dataset.index);
            if (dragSrcIndex !== null && dragSrcIndex !== destIndex) {
                const movedTask = activeTasks.splice(dragSrcIndex, 1)[0];
                activeTasks.splice(destIndex, 0, movedTask);
                saveState();
                renderActiveTasksList();
            }
        });

        item.querySelector('.remove-task-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            activeTasks.splice(index, 1);
            saveState();
            renderActiveTasksList();
        });

        list.appendChild(item);
    });
}

function handleAddTask() {
    const nameInput = document.getElementById('new-task-name');
    const name = nameInput.value.trim();
    const iconClass = document.getElementById('new-task-icon').value;

    if (!name) { nameInput.focus(); return; }

    activeTasks.push({
        id: 't_' + Date.now(),
        name: name,
        iconClass: iconClass
    });

    saveState();
    nameInput.value = '';
    renderActiveTasksList();
}

// ========================
// PROJECTS (with bug fixes)
// ========================
let expandedProjects = new Set();

function handleAddProject() {
    const nameInput = document.getElementById('new-proj-name');
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }

    const newId = 'p_' + Date.now();
    projectsData.push({ id: newId, name, parts: [] });
    expandedProjects.add(newId);

    saveState();
    nameInput.value = '';
    closeSidebar(modalProject);
    renderProjects();
}

function renderProjects() {
    const container = document.getElementById('projects-list-container');
    const emptyState = document.getElementById('projects-empty');
    container.innerHTML = '';

    if (projectsData.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    projectsData.forEach(proj => {
        const completed = proj.parts.filter(p => p.checked).length;
        const total = proj.parts.length;
        const isExpanded = expandedProjects.has(proj.id);

        const card = document.createElement('div');
        card.className = 'project-card';

        // Header
        const header = document.createElement('div');
        header.className = 'proj-header';
        header.innerHTML = `
            <div class="proj-title">⚠️ ${proj.name}</div>
            <div class="proj-progress">${completed}/${total}
                <span class="chevron" style="transform: rotate(${isExpanded ? 180 : 0}deg)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
                </span>
            </div>
        `;

        // Body
        const body = document.createElement('div');
        body.className = 'proj-body' + (isExpanded ? ' expanded' : '');

        // Parts list
        const partsList = document.createElement('div');
        partsList.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

        proj.parts.forEach((part, partIndex) => {
            const partEl = document.createElement('div');
            partEl.className = 'part-item';
            partEl.innerHTML = `
                <input type="checkbox" class="part-checkbox" ${part.checked ? 'checked' : ''}>
                <span class="part-text ${part.checked ? 'checked' : ''}">${part.name}</span>
                <button class="part-delete-btn" aria-label="Elimina parte">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                </button>
            `;

            // Checkbox — toggle without collapsing
            partEl.querySelector('.part-checkbox').addEventListener('change', (e) => {
                e.stopPropagation();
                part.checked = e.target.checked;
                // Update text style locally
                const textEl = partEl.querySelector('.part-text');
                textEl.classList.toggle('checked', part.checked);
                // Update progress count in header
                const newCompleted = proj.parts.filter(p => p.checked).length;
                header.querySelector('.proj-progress').childNodes[0].textContent = `${newCompleted}/${total} `;
                saveState();
                if (part.checked) {
                    throwConfetti(e.clientX || window.innerWidth / 2, e.clientY || window.innerHeight / 2);
                }
            });

            // Delete part
            partEl.querySelector('.part-delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                proj.parts.splice(partIndex, 1);
                saveState();
                // Re-render but keep expanded
                expandedProjects.add(proj.id);
                renderProjects();
            });

            partsList.appendChild(partEl);
        });

        body.appendChild(partsList);

        // Add part form
        const addForm = document.createElement('div');
        addForm.className = 'add-part-form';
        addForm.innerHTML = `
            <input type="text" class="flat-input" placeholder="Nuova parte..." autocomplete="off">
            <button class="flat-btn small primary">+</button>
        `;

        const partInput = addForm.querySelector('input');
        const partBtn = addForm.querySelector('button');

        const addPart = () => {
            const pName = partInput.value.trim();
            if (!pName) return;
            proj.parts.push({ id: 'part_' + Date.now(), name: pName, checked: false });
            saveState();
            expandedProjects.add(proj.id);
            renderProjects();
        };

        partBtn.addEventListener('click', (e) => { e.stopPropagation(); addPart(); });
        partInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.stopPropagation(); addPart(); } });
        partInput.addEventListener('click', (e) => e.stopPropagation());

        body.appendChild(addForm);

        // Delete project button — FIXED: no confirm, stopPropagation
        const delBtn = document.createElement('button');
        delBtn.className = 'proj-delete-btn';
        delBtn.textContent = 'Elimina Progetto';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            projectsData = projectsData.filter(p => p.id !== proj.id);
            expandedProjects.delete(proj.id);
            saveState();
            renderProjects();
        });
        body.appendChild(delBtn);

        card.appendChild(header);
        card.appendChild(body);

        // Toggle expand on header click
        header.addEventListener('click', () => {
            if (expandedProjects.has(proj.id)) {
                expandedProjects.delete(proj.id);
            } else {
                expandedProjects.add(proj.id);
            }
            body.classList.toggle('expanded');
            const chevron = header.querySelector('.chevron');
            chevron.style.transform = body.classList.contains('expanded') ? 'rotate(180deg)' : 'rotate(0deg)';
        });

        container.appendChild(card);
    });
}

// ========================
// STATS / TRENDS
// ========================
let chartInstances = {};

function renderStats() {
    const container = document.getElementById('charts-container');
    container.innerHTML = '';

    if (activeTasks.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><p>Nessuna task attiva.</p></div>';
        return;
    }

    const todayStr = formatDate(new Date());
    const weekAgoStr = formatDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));

    activeTasks.forEach(task => {
        const icon = ICON_MAP[task.iconClass] || '📋';
        const baseColor = CATEGORY_COLORS[task.iconClass] || '#999';

        const box = document.createElement('div');
        box.className = 'chart-box';
        box.style.borderColor = baseColor;

        box.innerHTML = `
            <div class="chart-header">
                <div class="chart-title"><span>${icon}</span><strong>${task.name}</strong></div>
                <div class="chart-controls">
                    <label>Da: <input type="date" id="from-${task.id}" value="${weekAgoStr}"></label>
                    <label>A: <input type="date" id="to-${task.id}" value="${todayStr}"></label>
                </div>
            </div>
            <div class="chart-canvas-wrap"><canvas id="chart-${task.id}"></canvas></div>
        `;

        container.appendChild(box);

        document.getElementById(`from-${task.id}`).addEventListener('change', () => renderChartForTask(task));
        document.getElementById(`to-${task.id}`).addEventListener('change', () => renderChartForTask(task));
        renderChartForTask(task);
    });
}

function renderChartForTask(task) {
    const fromStr = document.getElementById(`from-${task.id}`).value;
    const toStr = document.getElementById(`to-${task.id}`).value;
    if (!fromStr || !toStr) return;

    let fromDate = new Date(fromStr + 'T00:00:00');
    let toDate = new Date(toStr + 'T00:00:00');
    if (fromDate > toDate) [fromDate, toDate] = [toDate, fromDate];

    const diffDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
    if (diffDays > 365) { alert('Intervallo massimo: 1 anno.'); return; }

    const labels = [], dates = [];
    let current = new Date(fromDate);
    while (current <= toDate) {
        labels.push(`${current.getDate()}/${current.getMonth() + 1}`);
        dates.push(formatDate(current));
        current.setDate(current.getDate() + 1);
    }

    const data = dates.map(d => (taskData[d] && taskData[d][task.id]) ? taskData[d][task.id] : 0);

    const canvas = document.getElementById(`chart-${task.id}`);
    if (!canvas) return;
    if (chartInstances[task.id]) chartInstances[task.id].destroy();

    const ctx = canvas.getContext('2d');
    const baseColor = CATEGORY_COLORS[task.iconClass] || '#999';
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, baseColor + 'AA');
    gradient.addColorStop(1, baseColor + '11');

    chartInstances[task.id] = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Completamenti',
                data,
                borderColor: baseColor,
                backgroundColor: gradient,
                tension: 0.4,
                fill: true,
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: baseColor,
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: '#1f2937', cornerRadius: 8, padding: 10 }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Outfit', size: 11 } }, grid: { color: '#f3f4f6' } },
                x: { ticks: { font: { family: 'Outfit', size: 10 }, maxRotation: 45 }, grid: { display: false } }
            },
            interaction: { intersect: false, mode: 'index' }
        }
    });
}

// ========================
// UTILS
// ========================
function saveState() {
    localStorage.setItem('taskOrg_tasks', JSON.stringify(activeTasks));
    localStorage.setItem('taskOrg_data', JSON.stringify(taskData));
    localStorage.setItem('taskOrg_projects', JSON.stringify(projectsData));
}

function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function throwConfetti(x, y) {
    if (typeof confetti === 'undefined') return;
    confetti({
        particleCount: 40, spread: 60,
        origin: { x: x / window.innerWidth, y: y / window.innerHeight },
        colors: ['#000000', '#333333', '#666666', '#999999', '#e60000'],
        shapes: ['circle', 'square'],
        disableForReducedMotion: true,
        scalar: 0.8
    });
}

// ========================
// START
// ========================
document.addEventListener('DOMContentLoaded', init);
