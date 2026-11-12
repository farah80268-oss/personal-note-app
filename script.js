// ========== 1. GET ELEMENTS ==========
// document.getElementById("x") finds the HTML element with id="x"
const app = document.getElementById('app');
const lockscreen = document.getElementById('lockscreen');
const lockInput = document.getElementById('lockinput');
const unlockBtn = document.getElementById('unlockbtn');
const lockError = document.getElementById('error');
const lockBtn = document.getElementById('lockBtn');

const calGrid = document.getElementById('calendarGrid');
const calMonthYear = document.getElementById('calMonthYear');
const prevMonth = document.getElementById('prevMonth');
const nextMonth = document.getElementById('nextMonth');

const moodOptions = document.getElementById('moodOptions');
const selectedMoodText = document.getElementById('selectedMoodText');
const saveBtn = document.getElementById('saveEntryBtn');
const deleteBtn = document.getElementById('deleteEntryBtn');
const entriesList = document.getElementById('entriesList');
const entryCount = document.getElementById('entryCount');
const searchInput = document.getElementById('searchInput');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

// ========== 2. DATA (STATE) ==========
const PASSWORD = '1234'; // change it!

// localStorage keeps data even after you close the browser.
// It only stores TEXT, so we use JSON.parse / JSON.stringify to convert.
// Example of stored data: { "2026-07-04": { html: "<p>Hello</p>", mood: "🤩" } }
let entries = JSON.parse(localStorage.getItem('diaryEntries')) || {};

let viewDate = new Date();            // which month the calendar shows
let selectedKey = toKey(new Date());  // which day is selected
let selectedMood = '';

// ========== 3. HELPERS ==========
// Turns a Date into "2026-07-04". We avoid toISOString() because it uses
// UTC time and can give you the wrong day in some time zones.
function toKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0'); // "7" -> "07"
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function saveToStorage() {
    localStorage.setItem('diaryEntries', JSON.stringify(entries));
}

// ========== 4. QUILL EDITOR ==========
const quill = new Quill('#editor-container', {
    theme: 'snow',
    placeholder: 'Write your thoughts here...',
    modules: {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['blockquote', 'code-block'],
            [{ header: [1, 2, 3, false] }],
            ['link', 'image'],
            ['clean']
        ]
    }
});

// ========== 5. LOCK SCREEN ==========
function unlock() {
    if (lockInput.value === PASSWORD) {
        lockscreen.classList.add('hidden');  // uses your CSS .hidden
        app.style.display = 'flex';          // show the app
        lockError.textContent = '';
        lockInput.value = '';
    } else {
        lockError.textContent = 'Wrong password, try again';
    }
}

if (lockscreen) {
    unlockBtn.addEventListener('click', unlock);
    lockInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') unlock();
    });
    lockBtn.addEventListener('click', () => {
        lockscreen.classList.remove('hidden');
        app.style.display = 'none';
    });
} else {
    // No lock screen in the HTML, so just show the app
    app.style.display = 'flex';
}

// ========== 6. CALENDAR ==========
function renderCalendar() {
    calGrid.innerHTML = '';
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth(); // 0 = January

    calMonthYear.textContent = viewDate.toLocaleString('en-US', {
        month: 'long', year: 'numeric'
    });

    // Day names
    ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].forEach(name => {
        const label = document.createElement('div');
        label.className = 'day-label';
        label.textContent = name;
        calGrid.appendChild(label);
    });

    // getDay() gives 0 for Sunday ... 6 for Saturday
    const firstWeekday = new Date(year, month, 1).getDay();
    const todayKey = toKey(new Date());

    // 42 cells = 6 full weeks, so the layout never jumps
    for (let i = 0; i < 42; i++) {
        const date = new Date(year, month, 1 - firstWeekday + i);
        const key = toKey(date);

        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.textContent = date.getDate();

        if (date.getMonth() !== month) cell.classList.add('other-month');
        if (key === todayKey) cell.classList.add('today');
        if (key === selectedKey) cell.classList.add('selected');
        if (entries[key]) cell.classList.add('has-entry');

        cell.addEventListener('click', () => {
            selectedKey = key;
            loadEntry();
            renderCalendar();
        });

        calGrid.appendChild(cell);
    }
}

prevMonth.addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() - 1);
    renderCalendar();
});
nextMonth.addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() + 1);
    renderCalendar();
});

// ========== 7. MOOD ==========
function setMood(mood, label) {
    selectedMood = mood;
    selectedMoodText.textContent = mood ? label : 'None';
    moodOptions.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mood === mood);
    });
}

moodOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    setMood(btn.dataset.mood, btn.title);
});

// ========== 8. LOAD / SAVE / DELETE ==========
function loadEntry() {
    const entry = entries[selectedKey];
    if (entry) {
        quill.root.innerHTML = entry.html;
        const btn = moodOptions.querySelector(`[data-mood="${entry.mood}"]`);
        setMood(entry.mood, btn ? btn.title : '');
    } else {
        quill.setText('');
        setMood('', '');
    }
    renderEntries();
}

saveBtn.addEventListener('click', () => {
    if (quill.getText().trim() === '') {
        alert('Write something first!');
        return;
    }
    entries[selectedKey] = { html: quill.root.innerHTML, mood: selectedMood };
    saveToStorage();
    renderCalendar();
    renderEntries();
});

function deleteEntry(key) {
    if (!confirm('Delete this entry?')) return;
    delete entries[key];
    saveToStorage();
    if (key === selectedKey) {
        quill.setText('');
        setMood('', '');
    }
    renderCalendar();
    renderEntries();
}

deleteBtn.addEventListener('click', () => deleteEntry(selectedKey));

// ========== 9. ENTRIES LIST + SEARCH ==========
function renderEntries() {
    const term = searchInput.value.trim().toLowerCase();

    const keys = Object.keys(entries)
        .sort()
        .reverse() // newest first
        .filter(key => {
            const text = new DOMParser()
                .parseFromString(entries[key].html, 'text/html')
                .body.textContent.toLowerCase();
            return text.includes(term) || key.includes(term);
        });

    entryCount.textContent = `${keys.length} ${keys.length === 1 ? 'entry' : 'entries'}`;
    entriesList.innerHTML = '';

    if (keys.length === 0) {
        entriesList.innerHTML = '<div class="no-entries">No entries found.</div>';
        return;
    }

    keys.forEach(key => {
        const entry = entries[key];
        const plain = new DOMParser()
            .parseFromString(entry.html, 'text/html').body.textContent;

        const item = document.createElement('div');
        item.className = 'entry-item';

        const preview = document.createElement('div');
        preview.className = 'entry-preview';
        const date = document.createElement('strong');
        date.textContent = key;
        const text = document.createElement('span');
        text.className = 'entry-text';
        text.textContent = plain;
        preview.append(date, text);

        const mood = document.createElement('span');
        mood.className = 'entry-mood';
        mood.textContent = entry.mood || '';

        const del = document.createElement('button');
        del.className = 'entry-delete-bnt';
        del.innerHTML = '<i class="fas fa-trash-alt"></i>';
        del.addEventListener('click', (e) => {
            e.stopPropagation(); // don't also trigger the item's click
            deleteEntry(key);
        });

        item.append(preview, mood, del);

        item.addEventListener('click', () => {
            selectedKey = key;
            const [y, m] = key.split('-');
            viewDate = new Date(Number(y), Number(m) - 1, 1);
            loadEntry();
            renderCalendar();
        });

        entriesList.appendChild(item);
    });
}

searchInput.addEventListener('input', renderEntries);

// ========== 10. DARK MODE ==========
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('diaryTheme', theme);
}

themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
});

applyTheme(localStorage.getItem('diaryTheme') || 'light');

// ========== 11. START ==========
renderCalendar();
loadEntry();