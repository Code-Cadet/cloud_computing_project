// ===== Notes App =====
// Uses localStorage + JSON + browser events (click, keydown, drag & drop).
const STORAGE_KEY = "ist4035-notes-app-v1";

 // In-memory notes array
let notes = [];

// UI elements
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("titleInput");
const contentInput = document.getElementById("contentInput");
const tagsInput = document.getElementById("tagsInput");
const priorityInput = document.getElementById("priorityInput");
const clearFormBtn = document.getElementById("clearFormBtn");
const deleteAllBtn = document.getElementById("deleteAllBtn");
const editorTitle = document.getElementById("editorTitle");
const editorStatus = document.getElementById("editorStatus");
const searchInput = document.getElementById("searchInput");
const filterPriority = document.getElementById("filterPriority");
const notesList = document.getElementById("notesList");
const notesCount = document.getElementById("notesCount");

// Current filters and editing state
let currentSearchText = "";
let currentPriorityFilter = "all";
let currentEditingId = null; // null -> creating new note

// For drag & drop
let draggedNoteId = null;

// ---------- Storage helpers ----------
function loadNotesFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            notes = [];
            return;
        }
        const parsed = JSON.parse(raw);
        // Ensure it is an array
        notes = Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.error("Failed to parse notes from localStorage", err);
        notes = [];
    }
}
function saveNotesToStorage() {
    try {
        const json = JSON.stringify(notes);
        localStorage.setItem(STORAGE_KEY, json);
    } catch (err) {
        console.error("Failed to save notes to localStorage", err);
    }
}

// ---------- Utility functions ----------
function generateId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return (
        "note-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(16).slice(2)
    );
}
function parseTags(input) {
    if (!input.trim()) return [];
    return input
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
}
function formatDate(isoString) {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "Unknown";
    return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}
function pluralize(count, singular, plural) {
    return count === 1 ? singular : plural;
}
 
// ---------- Rendering ----------
function renderNotes() {
    // Filter
    const search = currentSearchText.toLowerCase();
    const filtered = notes.filter((note) => {
        if (currentPriorityFilter !== "all" && note.priority !== currentPriorityFilter)
            return false;
        if (!search) return true;
        const haystack = (
            note.title +
            " " +
            note.content +
            " " +
            note.tags.join(" ")
        ).toLowerCase();
        return haystack.includes(search);
    });
    // Clear list
    notesList.innerHTML = "";
    if (filtered.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "No notes match the current filter.";
        empty.style.fontSize = "0.9rem";
        empty.style.color = "#6b7280";
        notesList.appendChild(empty);
    } else {
        filtered.forEach((note) => {
            const card = createNoteCard(note);
            notesList.appendChild(card);
        });
    }
    notesCount.textContent = `${filtered.length} ${pluralize(
        filtered.length,
        "note",
        "notes"
    )}`;
}

function createNoteCard(note) {
    const card = document.createElement("article");
    card.className = "note-card";
    card.draggable = true;
    card.dataset.id = note.id;


// ----- Header -----
const header = document.createElement("div");
header.className = "note-header";
const title = document.createElement("div");
title.className = "note-title";
title.textContent = note.title;
const meta = document.createElement("div");
meta.className = "note-meta";
const prioritySpan = document.createElement("span");
prioritySpan.className =
    "priority-pill priority-" + (note.priority || "low");
prioritySpan.textContent = `Priority: ${note.priority ?? "low"}`;
const dateSpan = document.createElement("span");
dateSpan.textContent = `Updated: ${formatDate(note.updatedAt)}`;
meta.appendChild(prioritySpan);
meta.appendChild(dateSpan);
header.appendChild(title);
header.appendChild(meta);

// ----- Body -----
const body = document.createElement("div");
body.className = "note-body";
const contentP = document.createElement("p");
contentP.textContent = note.content;
body.appendChild(contentP);
if (note.tags && note.tags.length > 0) {
    const tagsRow = document.createElement("div");
    tagsRow.className = "tags-row";
    note.tags.forEach((tag) => {
        const tagSpan = document.createElement("span");
        tagSpan.className = "tag-pill";
        tagSpan.textContent = tag;
        tagsRow.appendChild(tagSpan);
    });
    body.appendChild(tagsRow);
}

// ----- Actions -----
const actions = document.createElement("div");
actions.className = "note-actions";
const editBtn = document.createElement("button");
editBtn.type = "button";
editBtn.className = "btn";
editBtn.textContent = "Edit";
editBtn.dataset.action = "edit";
editBtn.dataset.id = note.id;
const deleteBtn = document.createElement("button");
deleteBtn.type = "button";
deleteBtn.className = "btn danger";
deleteBtn.textContent = "Delete";
deleteBtn.dataset.action = "delete";
deleteBtn.dataset.id = note.id;
actions.appendChild(editBtn);
actions.appendChild(deleteBtn);
 

    // ----- Assemble card -----
    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(actions);
    // Drag & drop events
    card.addEventListener("dragstart", handleDragStart);
    card.addEventListener("dragover", handleDragOver);
    card.addEventListener("drop", handleDrop);
    card.addEventListener("dragend", handleDragEnd);
    return card;
}

// ---------- Form helpers ----------
function resetForm() {
    noteForm.reset();
    priorityInput.value = "medium";
    currentEditingId = null;
    editorTitle.textContent = "New Note";
    editorStatus.textContent = "Creating a new note.";
}
function loadNoteIntoForm(note) {
    titleInput.value = note.title;
    contentInput.value = note.content;
    tagsInput.value = note.tags.join(", ");
    priorityInput.value = note.priority;
    currentEditingId = note.id;
    editorTitle.textContent = "Edit Note";
    editorStatus.textContent = `Editing note last updated on ${formatDate(
        note.updatedAt
    )}`;
}
 

// ---------- Event handlers ----------
// Submit (create or update)
noteForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    if (!title || !content) {
        alert("Title and content are required.");
        return;
    }
    const tags = parseTags(tagsInput.value);
    const priority = priorityInput.value || "medium";
    const now = new Date().toISOString();
    if (currentEditingId === null) {
        // Create new note
        const newNote = {
            id: generateId(),
            title,
            content,
            tags,
            priority,
            createdAt: now,
            updatedAt: now,
        };
        notes.unshift(newNote); // add to top
    } else {
        // Update existing
        const idx = notes.findIndex((n) => n.id === currentEditingId);
        if (idx !== -1) {
            notes[idx] = {
                ...notes[idx],
                title,
                content,
                tags,
                priority,
                updatedAt: now,
            };
        }
    }
    saveNotesToStorage();
    renderNotes();
    resetForm();
});
// Clear form
clearFormBtn.addEventListener("click", () => {
    resetForm();
});
// Delete all notes
deleteAllBtn.addEventListener("click", () => {
    if (!notes.length) return;
    const confirmDelete = confirm(
        "Are you sure you want to delete ALL notes? This cannot be undone."
    );
    if (!confirmDelete) return;
    notes = [];
    saveNotesToStorage();
    renderNotes();
    resetForm();
});
// Delegated click for Edit/Delete
notesList.addEventListener("click", (e) => {
    const btn = e.target;
    if (!btn.dataset || !btn.dataset.action) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    if (action === "edit") {
        loadNoteIntoForm(note);
        titleInput.focus();
    } else if (action === "delete") {
        const ok = confirm("Delete this note?");
        if (!ok) return;
        notes = notes.filter((n) => n.id !== id);
        saveNotesToStorage();
        renderNotes();
        if (currentEditingId === id) {
            resetForm();
        }
    }
});
 
// Search & filter
searchInput.addEventListener("input", () => {
    currentSearchText = searchInput.value;
    renderNotes();
});
filterPriority.addEventListener("change", () => {
    currentPriorityFilter = filterPriority.value;
    renderNotes();
});
// Global keyboard shortcuts
document.addEventListener("keydown", (e) => {
    // Windows: Ctrl, Mac: Meta (Command)
    const isCtrlLike = e.ctrlKey || e.metaKey;
    if (isCtrlLike && e.key.toLowerCase() === "q") {
        e.preventDefault();
        resetForm();
        titleInput.focus();
    }
    if (isCtrlLike && e.key.toLowerCase() === "s") {
        e.preventDefault();
        // Trigger form submit programmatically
        noteForm.requestSubmit();
    }
});
 

// ---------- Drag & drop handlers ----------
function handleDragStart(e) {
    const card = e.currentTarget;
    draggedNoteId = card.dataset.id;
    card.classList.add("dragging");
    // For some browsers, dataTransfer must have data set.
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", draggedNoteId);
}
function handleDragOver(e) {
    e.preventDefault(); // Allow drop
    e.dataTransfer.dropEffect = "move";
}
function handleDrop(e) {
    e.preventDefault();
    const targetCard = e.currentTarget;
    const targetId = targetCard.dataset.id;
    const sourceId = draggedNoteId;
    if (!sourceId || !targetId || sourceId === targetId) return;
    const sourceIndex = notes.findIndex((n) => n.id === sourceId);
    const targetIndex = notes.findIndex((n) => n.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;
    // Reorder array: move source to targetIndex
    const [moved] = notes.splice(sourceIndex, 1);
    notes.splice(targetIndex, 0, moved);
    saveNotesToStorage();
    renderNotes();
}
function handleDragEnd(e) {
    e.currentTarget.classList.remove("dragging");
    draggedNoteId = null;
}
 
// ---------- Initial load ----------
window.addEventListener("DOMContentLoaded", () => {
    loadNotesFromStorage();
    renderNotes();
});
 
  
 
 
 
 
 
 
