document.addEventListener('DOMContentLoaded', () => {
  const appEl = document.getElementById('app');
  const titleInput = document.getElementById('title');
  const notesInput = document.getElementById('notes');
  const dueInput = document.getElementById('due');
  const priorityInput = document.getElementById('priority');
  const progressInput = document.getElementById('progress');
  const addBtn = document.getElementById('addBtn');
  const clearInputsBtn = document.getElementById('clearInputs');
  const taskContainer = document.getElementById('taskContainer');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('search');
  const filterSelect = document.getElementById('filter');
  const sortSelect = document.getElementById('sort');
  const clearAllBtn = document.getElementById('clearAll');
  const themeToggle = document.getElementById('themeToggle');
  const compactToggle = document.getElementById('compactToggle');
  const overallProgressEl = document.getElementById('overallProgress');
  const overallProgressFill = overallProgressEl.querySelector('.overall-progress-fill');
  const overallProgressLabel = overallProgressEl.querySelector('.overall-progress-label');


  const editModal = document.getElementById('editModal');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const editForm = document.getElementById('editForm');
  const editTitle = document.getElementById('editTitle');
  const editNotes = document.getElementById('editNotes');
  const editDue = document.getElementById('editDue');
  const editPriority = document.getElementById('editPriority');
  const editProgress = document.getElementById('editProgress');
  const saveEditBtn = document.getElementById('saveEdit');
  const cancelEditBtn = document.getElementById('cancelEdit');


  const LS_KEY = 'taskgarage.tasks.v1';
  const LS_PREF = 'taskgarage.prefs.v1';


  let tasks = [];
  let prefs = { theme: 'light', compact: false };
  let editingId = null;


  const uid = () => 't_' + Math.random().toString(36).slice(2, 9);


  function safeParse(json, fallback) {
    try { return JSON.parse(json); } catch { return fallback; }
  }


  function getTodayLocalISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }


  function formatDateLocal(isoDate) {
    if (!isoDate) return '';
    try {
      const parts = isoDate.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return isoDate; }
  }


  function formatDateTimeLocal(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch { return iso; }
  }


  function loadFromStorage() {
    const rawTasks = localStorage.getItem(LS_KEY);
    const rawPrefs = localStorage.getItem(LS_PREF);
    tasks = safeParse(rawTasks, []);
    prefs = safeParse(rawPrefs, prefs);


    tasks = tasks.map(t => {
      if (!t.id) t.id = uid();
      if (!t.createdAt) t.createdAt = new Date().toISOString();
      if (!t.priority) t.priority = 'medium';
      if (!t.progress && t.progress !== 0) t.progress = 0;
      if (t.due === '') t.due = null;
      // Initialize reminderSent flag so notification not repeated
      if (t.reminderSent === undefined) t.reminderSent = false;
      return t;
    });
  }


  function saveToStorage() {
    localStorage.setItem(LS_KEY, JSON.stringify(tasks));
    localStorage.setItem(LS_PREF, JSON.stringify(prefs));
  }


  function applyPrefs() {
    document.documentElement.setAttribute('data-theme', prefs.theme === 'dark' ? 'dark' : 'light');
    appEl.setAttribute('data-compact', prefs.compact ? 'true' : 'false');
    themeToggle.checked = prefs.theme === 'dark';
    compactToggle.checked = !!prefs.compact;
    document.documentElement.style.setProperty('--radius', prefs.compact ? '8px' : '16px');
  }


  function createTaskElement(task) {
    const article = document.createElement('article');
    article.className = `task priority-${task.priority}`;
    if (task.completed) article.classList.add('completed');


    const left = document.createElement('div');
    left.className = 'left';


    const h3 = document.createElement('h3');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!task.completed;
    checkbox.setAttribute('aria-label', 'Mark complete');
    checkbox.addEventListener('change', () => toggleComplete(task.id));


    const titleSpan = document.createElement('span');
    titleSpan.textContent = task.title;
    if (task.completed) {
      titleSpan.style.textDecoration = 'line-through';
      titleSpan.style.opacity = '0.7';
    }


    h3.appendChild(checkbox);
    h3.appendChild(titleSpan);


    const p = document.createElement('p');
    p.textContent = task.notes || '';


    const meta = document.createElement('div');
    meta.className = 'meta';


    const pillPriority = document.createElement('span');
    pillPriority.className = 'pill';
    pillPriority.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
    meta.appendChild(pillPriority);


    if (task.due) {
      const pillDue = document.createElement('span');
      pillDue.className = 'pill';
      pillDue.textContent = 'Due: ' + formatDateLocal(task.due);
      meta.appendChild(pillDue);
    }


    const pillCreated = document.createElement('span');
    pillCreated.className = 'pill';
    pillCreated.textContent = 'Added: ' + formatDateTimeLocal(task.createdAt);
    meta.appendChild(pillCreated);


    if (task.completed) {
      const pillDone = document.createElement('span');
      pillDone.className = 'pill';
      pillDone.textContent = 'Completed';
      pillDone.style.background = 'rgba(34,197,94,0.08)';
      pillDone.style.color = 'var(--success)';
      meta.appendChild(pillDone);
    }


    left.appendChild(h3);
    left.appendChild(p);


    article.appendChild(left);


    const progressWrapper = document.createElement('div');
    progressWrapper.className = 'progress-wrapper';


    const progressValue = task.progress !== undefined ? task.progress : 0;


    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.style.width = progressValue + '%';


    const progressLabel = document.createElement('span');
    progressLabel.className = 'progress-label';
    progressLabel.textContent = progressValue + '% Complete';


    progressWrapper.appendChild(progressBar);
    progressWrapper.appendChild(progressLabel);


    article.appendChild(progressWrapper);


    article.appendChild(meta);


    const actions = document.createElement('div');
    actions.className = 'actions';


    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn edit';
    editBtn.type = 'button';
    editBtn.title = 'Edit task';
    editBtn.innerHTML = '✏️';
    editBtn.addEventListener('click', () => openEditModal(task.id));


    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn delete';
    deleteBtn.type = 'button';
    deleteBtn.title = 'Delete task';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.addEventListener('click', () => {
      removeTask(task.id);
    });


    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);


    article.appendChild(actions);


    return article;
  }

  // New notification reminder feature - check and send browser notifications for due or overdue tasks
  function checkTaskReminders() {
    if (!('Notification' in window)) return;

    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    if (Notification.permission !== 'granted') return;

    const now = new Date();

    tasks.forEach(task => {
      if (!task.due || task.reminderSent || task.completed) return;

      const dueDate = new Date(task.due + 'T23:59:59');
      const timeDiff = dueDate - now;

      if (timeDiff <= 0) {
        new Notification(`Task Due: ${task.title}`, {
          body: 'Due date reached or passed.',
        });
        task.reminderSent = true;
        saveToStorage();
      }
    });
  }

  function render() {
    let list = [...tasks];
    const q = searchInput.value.trim().toLowerCase();
    if (q) {
      list = list.filter(t => {
        const title = (t.title || '').toLowerCase();
        const notes = (t.notes || '').toLowerCase();
        const due = (t.due || '').toLowerCase();
        return title.includes(q) || notes.includes(q) || due.includes(q);
      });
    }
    const f = filterSelect.value;
    const today = getTodayLocalISO();
    if (f === 'active') list = list.filter(t => !t.completed);
    else if (f === 'completed') list = list.filter(t => t.completed);
    else if (f === 'overdue') list = list.filter(t => !t.completed && t.due && t.due < today);
    const s = sortSelect.value;
    if (s === 'newest') list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    else if (s === 'oldest') list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    else if (s === 'due_asc') list.sort((a, b) => (a.due || '9999-12-31').localeCompare(b.due || '9999-12-31'));
    else if (s === 'due_desc') list.sort((a, b) => (b.due || '0000-01-01').localeCompare(a.due || '0000-01-01'));
    else if (s === 'priority') {
      const rank = { high: 1, medium: 2, low: 3 };
      list.sort((a, b) => (rank[a.priority] || 99) - (rank[b.priority] || 99));
    }
    taskContainer.innerHTML = '';
    if (list.length === 0) {
      emptyState.hidden = false;
      overallProgressEl.hidden = true;
    } else {
      emptyState.hidden = true;
      const frag = document.createDocumentFragment();
      for (const t of list) {
        frag.appendChild(createTaskElement(t));
      }
      taskContainer.appendChild(frag);


      if (taskContainer.lastElementChild) {
        void taskContainer.lastElementChild.offsetHeight;
      }


      const totalProgress = list.reduce((acc, t) => acc + (t.progress || 0), 0);
      const avgProgress = list.length ? totalProgress / list.length : 0;


      overallProgressEl.hidden = false;
      overallProgressFill.style.width = avgProgress + '%';
      overallProgressLabel.textContent = Math.round(avgProgress) + '% Overall Progress';

      // Call reminder check after render to notify if any task is due or overdue
      checkTaskReminders();
    }
  }


  function addTask() {
    const title = titleInput.value.trim();
    if (!title) {
      titleInput.focus();
      return;
    }
    let progressVal = parseInt(progressInput.value);
    if (isNaN(progressVal) || progressVal < 0) progressVal = 0;
    else if (progressVal > 100) progressVal = 100;


    const newTask = {
      id: uid(),
      title,
      notes: notesInput.value.trim(),
      due: dueInput.value || null,
      priority: priorityInput.value || 'medium',
      progress: progressVal,
      completed: false,
      createdAt: new Date().toISOString(),
      reminderSent: false, // initialize reminder flag on new task
    };
    tasks.push(newTask);
    saveToStorage();
    render();
    animateAdd();
    clearFormInputs();
    titleInput.focus();
  }


  function clearFormInputs() {
    titleInput.value = '';
    notesInput.value = '';
    dueInput.value = '';
    priorityInput.value = 'medium';
    progressInput.value = '0';
  }


  function toggleComplete(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.completed = !t.completed;
    saveToStorage();
    render();
  }


  function removeTask(id) {
    if (!confirm('Delete this task?')) return;
    tasks = tasks.filter(t => t.id !== id);
    saveToStorage();
    render();
  }


  function clearAllTasks() {
    if (!tasks.length) return;
    if (!confirm('Are you sure you want to delete ALL tasks? This cannot be undone.')) return;
    tasks = [];
    saveToStorage();
    render();
    // Reset overall progress bar and label
    overallProgressFill.style.width = '0%';
    overallProgressLabel.textContent = '0% Overall Progress';
    overallProgressEl.hidden = true;
  }



  function openEditModal(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    editingId = id;
    editTitle.value = t.title;
    editNotes.value = t.notes || '';
    editDue.value = t.due || '';
    editPriority.value = t.priority || 'medium';
    editProgress.value = t.progress || 0;
    showModal();
  }


  function showModal() {
    editModal.classList.add('open');
    editModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => editTitle.focus(), 60);
  }


  function closeModal() {
    editModal.classList.remove('open');
    editModal.setAttribute('aria-hidden', 'true');
    editingId = null;
  }


  saveEditBtn.addEventListener('click', () => {
    if (!editingId) return closeModal();
    const t = tasks.find(x => x.id === editingId);
    if (!t) return closeModal();
    const newTitle = editTitle.value.trim();
    let progressValueEdit = parseInt(editProgress.value);
    if (isNaN(progressValueEdit) || progressValueEdit < 0) progressValueEdit = 0;
    else if (progressValueEdit > 100) progressValueEdit = 100;


    if (!newTitle) {
      editTitle.focus();
      return;
    }
    t.title = newTitle;
    t.notes = editNotes.value.trim();
    t.due = editDue.value || null;
    t.priority = editPriority.value || 'medium';
    t.progress = progressValueEdit;
    t.reminderSent = false;  // Reset reminder flag on edit
    saveToStorage();
    render();
    closeModal();
  });


  cancelEditBtn.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editModal.classList.contains('open')) closeModal();
  });


  function animateAdd() {
    const first = taskContainer.querySelector('.task');
    if (!first) return;
    first.style.transition = 'none';
    first.style.transform = 'scale(0.98)';
    first.style.opacity = '0';
    requestAnimationFrame(() => {
      first.style.transition = 'transform 280ms cubic-bezier(.2,.9,.3,1), opacity 280ms ease';
      first.style.transform = 'none';
      first.style.opacity = '1';
    });
  }


  function debounce(fn, wait = 140) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }


  addBtn.addEventListener('click', () => {
    addTask();
    checkTaskReminders(); // run reminder check after task add
  });
  clearInputsBtn.addEventListener('click', clearFormInputs);
  searchInput.addEventListener('input', debounce(render, 90));
  filterSelect.addEventListener('change', render);
  sortSelect.addEventListener('change', render);
  clearAllBtn.addEventListener('click', clearAllTasks);


  themeToggle.addEventListener('change', (e) => {
    prefs.theme = e.target.checked ? 'dark' : 'light';
    applyPrefs();
    saveToStorage();
  });


  compactToggle.addEventListener('change', (e) => {
    prefs.compact = !!e.target.checked;
    applyPrefs();
    saveToStorage();
  });


  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'n') {
      titleInput.focus();
      e.preventDefault();
    }
    if (e.key === '/') {
      searchInput.focus();
      e.preventDefault();
    }
  });



  loadFromStorage();
  applyPrefs();
  render();

  // Periodic reminder check every 5 minutes while app open
  setInterval(checkTaskReminders, 300000);
});
