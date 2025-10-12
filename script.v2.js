document.addEventListener('DOMContentLoaded', () => {
  const appEl = document.getElementById('app');
  const taskForm = document.getElementById('taskForm');
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

  const requestNotificationPermissionBtn = document.getElementById('requestNotificationPermissionBtn');

  const LS_KEY = 'taskgarage.tasks.v1';
  const LS_PREF = 'taskgarage.prefs.v1';

  let tasks = [];
  let prefs = {
    theme: 'light',
    compact: false
  };
  let editingId = null;

  const uid = () => 't_' + Math.random().toString(36).slice(2, 9);

  function safeParse(json, fallback) {
    try {
      return JSON.parse(json);
    } catch (e) {
      console.error("Failed to parse data from localStorage:", e);
      return fallback;
    }
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
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return isoDate;
    }
  }

  function formatDateTimeLocal(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch (e) {
      console.error("Error formatting date-time:", e);
      return iso;
    }
  }

  function loadFromStorage() {
    try {
      const rawTasks = localStorage.getItem(LS_KEY);
      const rawPrefs = localStorage.getItem(LS_PREF);
      tasks = safeParse(rawTasks, []);
      prefs = safeParse(rawPrefs, prefs);

      tasks = tasks.map(t => {
        if (!t.id) t.id = uid();
        if (!t.createdAt) t.createdAt = new Date().toISOString();
        if (!t.priority) t.priority = 'medium';
        if (t.progress === undefined) t.progress = 0;
        if (t.due === '') t.due = null;
        if (t.lastNotified === undefined) t.lastNotified = null;
        return t;
      });
    } catch (e) {
      console.error("Failed to load data from storage:", e);
      alert("Failed to load tasks. Check console for details.");
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(tasks));
      localStorage.setItem(LS_PREF, JSON.stringify(prefs));
    } catch (e) {
      console.error("Failed to save data to storage:", e);
      alert("Failed to save tasks. Check console for details.");
    }
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

  const overdueMessages = [
    "Your task has gone rogue. Better catch it before it causes more chaos! 😈",
    "This task is now overdue. Let's get back on track! 📅",
    "Wake up, sleepyhead! A task is waiting for you. ⏰",
    "The deadline has passed, but it's not too late to conquer this task! 🚀",
    "This task is patiently waiting for your attention. Or maybe it's not so patient anymore. 🤔",
    "Looks like this task is a bit behind. Time to give it a boost! ✨"
  ];

  const dueTodayMessages = [
    "Tick-tock, your task is on the clock! ⏰",
    "Just a friendly reminder: your task is due today! 🎯",
    "This is it! Time to get your task done. 💪",
    "Your task is having its big moment today! Don't miss it! ✨",
    "The final countdown is on for this task! 🏁",
    "Today's the day! Let's get this task checked off. ✅"
  ];

  const dueSoonMessages = [
    "Heads up! Your task is nearing its finish line. Don't quit now! 🏃",
    "This task is coming up quick! Are you ready? 🤔",
    "Almost there! Just a little more to go on this task. 💪",
    "Your task is tapping its foot impatiently. Better get to it! ⏳",
    "This task is right around the corner! Get ready to tackle it. 💡",
    "A future you will thank you for starting this task now. 😉"
  ];

  const clearAllMessages = [
    "You're a Task Master! 🎉 All tasks have been cleared. Time for a well-deserved break!",
    "Mission accomplished! The task list is empty. Take a moment to celebrate. 🥳",
    "Done and done! Your to-do list is spotless. Enjoy the freedom! 😎",
    "Success! The task list is now pristine. What's next on your adventure? 🗺️",
    "Zero tasks, zero problems. You've cleared the way! 🤩",
    "Your task list has been wiped clean. Go forth and be productive (or not)! ✨"
  ];

  function getRandomMessage(messages) {
    return messages[Math.floor(Math.random() * messages.length)];
  }

  function checkTaskReminders() {
    if (Notification.permission !== "granted") {
      return;
    }

    const now = new Date();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const threeDaysInMs = 3 * oneDayInMs;

    tasks.forEach(task => {
      if (task.completed) return;

      const dueDate = new Date(task.due + "T23:59:59");
      const timeDiff = dueDate - now;

      // Check for overdue tasks
      if (timeDiff <= 0) {
        // Only send a new notification if it's been more than 24 hours since the last one, or if it's the first time
        if (!task.lastNotified || (now - new Date(task.lastNotified)) >= oneDayInMs) {
          const message = getRandomMessage(overdueMessages);
          new Notification("Task is Overdue: " + task.title, {
            body: message,
            icon: "icon.png"
          });
          task.lastNotified = now.toISOString();
          saveToStorage();
        }
      }
      // Check for tasks due today
      else if (timeDiff <= oneDayInMs) {
        if (!task.lastNotified) {
          const message = getRandomMessage(dueTodayMessages);
          new Notification("Task Due Today: " + task.title, {
            body: message,
            icon: "icon.png"
          });
          task.lastNotified = now.toISOString();
          saveToStorage();
        }
      }
      // Check for tasks due within the next 3 days
      else if (timeDiff <= 3 * oneDayInMs) {
        if (!task.lastNotified) {
          const message = getRandomMessage(dueSoonMessages);
          new Notification("Task Due Soon: " + task.title, {
            body: message,
            icon: "icon.png"
          });
          task.lastNotified = now.toISOString();
          saveToStorage();
        }
      }
    });
  }

  function render() {
    try {
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
        const rank = {
          high: 1,
          medium: 2,
          low: 3
        };
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

        const totalProgress = tasks.reduce((acc, t) => {
          if (t.completed) {
            return acc + 100;
          }
          return acc + (t.progress || 0);
        }, 0);

        const avgProgress = tasks.length ? totalProgress / tasks.length : 0;

        overallProgressEl.hidden = false;
        overallProgressFill.style.width = avgProgress + '%';
        overallProgressLabel.textContent = Math.round(avgProgress) + '% Overall Progress';
      }
    } catch (e) {
      console.error("Error during rendering:", e);
      alert("Failed to display tasks. Check console for details.");
    }
  }

  function addTask() {
  try {
    const title = titleInput.value.trim();
    if (!title) {
      alert("Task title cannot be empty.");
      titleInput.focus();
      return;
    }
    let progressVal = parseInt(progressInput.value);
    if (isNaN(progressVal) || progressVal < 0) {
      alert("Progress must be a number between 0 and 100.");
      progressInput.focus();
      return;
    } else if (progressVal > 100) {
      progressVal = 100;
    }
    const newTask = {
      id: uid(),
      title,
      notes: notesInput.value.trim(),
      due: dueInput.value || null,
      priority: priorityInput.value || 'medium',
      progress: progressVal,
      completed: false,
      createdAt: new Date().toISOString(),
      lastNotified: null,
    };
    tasks.push(newTask);
    saveToStorage();
    render();
    // Animate THE LAST task in the container (newly added one)
    const tasksEls = taskContainer.querySelectorAll('.task');
    const newTaskEl = tasksEls[tasksEls.length - 1];
    animateNewTask(newTaskEl);
    clearFormInputs();
    titleInput.focus();
  } catch (e) {
    console.error("Error adding task:", e);
    alert("Failed to add task. Check console for details.");
  }
}


  function clearFormInputs() {
    titleInput.value = '';
    notesInput.value = '';
    dueInput.value = '';
    priorityInput.value = 'medium';
    progressInput.value = '0';
  }

  function toggleComplete(id) {
    try {
      const t = tasks.find(x => x.id === id);
      if (!t) throw new Error("Task not found.");
      t.completed = !t.completed;
      if (t.completed) {
        t.progress = 100;
      } else {
        t.progress = 0;
      }
      saveToStorage();
      render();
    } catch (e) {
      console.error("Error toggling task completion:", e);
      alert("Failed to toggle task status. Check console for details.");
    }
  }

  function removeTask(id) {
    if (!confirm('Delete this task?')) return;
    try {
      tasks = tasks.filter(t => t.id !== id);
      saveToStorage();
      render();
    } catch (e) {
      console.error("Error removing task:", e);
      alert("Failed to delete task. Check console for details.");
    }
  }

  function clearAllTasks() {
    if (!tasks.length) return;
    if (!confirm('Are you sure you want to delete ALL tasks? This cannot be undone.')) return;
    try {
      const wereTasksPresent = tasks.length > 0;
      tasks = [];
      saveToStorage();
      render();
      overallProgressFill.style.width = '0%';
      overallProgressLabel.textContent = '0% Overall Progress';
      overallProgressEl.hidden = true;
      if (wereTasksPresent && Notification.permission === "granted") {
        const message = getRandomMessage(clearAllMessages);
        new Notification("You're a Task Master! 🎉", {
          body: message,
        });
      }
    } catch (e) {
      console.error("Error clearing all tasks:", e);
      alert("Failed to save data to storage. Tasks were cleared from the display, but may reappear on reload.");
    }
  }

  function openEditModal(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) {
      alert("Task to edit not found.");
      return;
    }
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
    if (isNaN(progressValueEdit) || progressValueEdit < 0) {
      alert("Progress must be a number between 0 and 100.");
      editProgress.focus();
      return;
    } else if (progressValueEdit > 100) {
      progressValueEdit = 100;
    }

    if (!newTitle) {
      alert("Title cannot be empty.");
      editTitle.focus();
      return;
    }
    try {
      t.title = newTitle;
      t.notes = editNotes.value.trim();
      t.due = editDue.value || null;
      t.priority = editPriority.value || 'medium';
      t.progress = progressValueEdit;
      t.completed = progressValueEdit === 100;
      t.lastNotified = null; // Reset notification flag on edit
      saveToStorage();
      render();
      closeModal();
    } catch (e) {
      console.error("Error saving task:", e);
      alert("Failed to save changes. Check console for details.");
    }
  });

  cancelEditBtn.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editModal.classList.contains('open')) closeModal();
  });

  function animateAdd() {
    const first = taskContainer.querySelector('.task');
    if (!first) return;

    // Apply the initial state immediately and without transition
    first.style.transition = 'none';
    first.style.transform = 'scale(0.98)';
    first.style.opacity = '0';
    
    // Force a re-paint by reading a property that requires layout info
    // This makes the browser aware of the element in its starting state
    void first.offsetHeight;
    
    // Now, add the final state, which triggers the transition
    requestAnimationFrame(() => {
        first.style.transition = 'transform 280ms cubic-bezier(.2,.9,.3,1), opacity 280ms ease';
        first.style.transform = 'none';
        first.style.opacity = '1';
    });
  }


  function animateNewTask(element) {
  if (!element) return;
  element.classList.add('just-added');
  void element.offsetHeight; // Force reflow so the transition can kick in
  element.classList.add('just-animate');
  setTimeout(() => {
    element.classList.remove('just-added', 'just-animate');
  }, 320); // Time should match your CSS transition
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
  });

  taskForm.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        addTask();
    }
  });

  if (requestNotificationPermissionBtn) {
    requestNotificationPermissionBtn.addEventListener('click', () => {
      if ("Notification" in window) {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            new Notification("Notifications Enabled!", { body: "You will now receive task reminders." });
          }
        });
      } else {
        alert("Your browser does not support notifications.");
      }
    });
  }

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

  setInterval(checkTaskReminders, 1000);
});