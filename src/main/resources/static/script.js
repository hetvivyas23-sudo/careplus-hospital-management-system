
const API = {
    patients: "/api/patients",
    doctors: "/api/doctors",
    departments: "/api/departments"
};

const state = {
    patients: [],
    doctors: [],
    departments: []
};

function notify(message) {
    const toast = document.getElementById("toast");

    if (!toast) {
        alert(message);
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => toast.classList.remove("show"), 3000);
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Request failed: ${response.status}`);
    }

    if (response.status === 204) return null;

    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// Navigation: matches the section IDs in index.html
function openSection(section) {
    document.querySelectorAll(".section").forEach(element => {
        element.classList.toggle("hidden", element.id !== section);
    });

    document.querySelectorAll(".nav-btn").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.section === section
        );
    });

    const titles = {
        dashboard: "Dashboard",
        patients: "Patients",
        doctors: "Doctors",
        departments: "Departments"
    };

    const heading = document.getElementById("page-title");
    if (heading) heading.textContent = titles[section] || "Dashboard";

    if (section === "dashboard") {
        loadDashboard();
    } else if (API[section]) {
        loadSection(section);
    }
}

// Support both the HTML onclick functions and navigation
function showSection(section) {
    openSection(section);
}

async function loadSection(section) {
    try {
        const records = await apiRequest(API[section]);
        state[section] = Array.isArray(records) ? records : [];

        if (section === "patients") {
            renderTable("patients-table", state.patients, [
                ["id", "ID"],
                ["name", "Name"],
                ["age", "Age"],
                ["gender", "Gender"],
                ["email", "Email"],
                ["phone", "Phone"],
                ["address", "Address"]
            ], "patient");
        }

        if (section === "doctors") {
            renderTable("doctors-table", state.doctors, [
                ["id", "ID"],
                ["name", "Name"],
                ["specialization", "Specialization"],
                ["email", "Email"],
                ["phone", "Phone"]
            ], "doctor");
        }

        if (section === "departments") {
            renderTable("departments-table", state.departments, [
                ["id", "ID"],
                ["name", "Name"],
                ["description", "Description"]
            ], "department");
        }
    } catch (error) {
        console.error(`Error loading ${section}:`, error);
        notify(`Could not load ${section}: ${error.message}`);
    }
}

// The IDs passed here are <tbody> elements, not complete tables
function renderTable(bodyId, records, columns, type) {
    const body = document.getElementById(bodyId);

    if (!body) {
        console.warn(`Cannot find table body: ${bodyId}`);
        return;
    }

    if (!records.length) {
        body.innerHTML = `
            <tr>
                <td colspan="${columns.length + 1}">No records found.</td>
            </tr>`;
        return;
    }

    body.innerHTML = records.map(record => `
        <tr>
            ${columns.map(([key]) =>
                `<td>${escapeHTML(record[key])}</td>`
            ).join("")}
            <td>
                <button type="button" class="action-btn"
                    onclick="editRecord('${type}', ${Number(record.id)})">
                    Edit
                </button>
                <button type="button" class="action-btn delete"
                    onclick="deleteRecord('${type}', ${Number(record.id)})">
                    Delete
                </button>
            </td>
        </tr>
    `).join("");
}

function updateCount(type, count) {
    const element = document.getElementById(`${type}-count`);
    if (element) element.textContent = count;
}

async function loadDashboard() {
    try {
        const results = await Promise.all([
            apiRequest(API.patients),
            apiRequest(API.doctors),
            apiRequest(API.departments)
        ]);

        state.patients = Array.isArray(results[0]) ? results[0] : [];
        state.doctors = Array.isArray(results[1]) ? results[1] : [];
        state.departments = Array.isArray(results[2]) ? results[2] : [];

        updateCount("patient", state.patients.length);
        updateCount("doctor", state.doctors.length);
        updateCount("department", state.departments.length);

        const recentBody = document.getElementById("recent-patients");

        if (recentBody) {
            const recent = [...state.patients].slice(-5).reverse();

            recentBody.innerHTML = recent.length
                ? recent.map(patient => `
                    <tr>
                        <td>${escapeHTML(patient.id)}</td>
                        <td>${escapeHTML(patient.name)}</td>
                        <td>${escapeHTML(patient.age)}</td>
                        <td>${escapeHTML(patient.gender)}</td>
                        <td>${escapeHTML(patient.email)}</td>
                    </tr>
                `).join("")
                : `<tr><td colspan="5">No patients registered yet.</td></tr>`;
        }
    } catch (error) {
        console.error("Dashboard loading error:", error);
        notify("Dashboard could not load: " + error.message);
    }
}

// These functions match onclick="showForm('patient')" in index.html
function showForm(type) {
    const wrapper = document.getElementById(`${type}-form`);
    const form = document.getElementById(`${type}-data-form`);

    if (!wrapper || !form) {
        notify(`Could not find the ${type} form.`);
        return;
    }

    form.reset();

    const idField = document.getElementById(`${type}-id`);
    if (idField) idField.value = "";

    wrapper.classList.remove("hidden");
    wrapper.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hideForm(type) {
    const wrapper = document.getElementById(`${type}-form`);
    if (wrapper) wrapper.classList.add("hidden");
}

function getFormFields(type) {
    if (type === "patient") {
        return {
            id: "patient-id",
            name: "patient-name",
            age: "patient-age",
            gender: "patient-gender",
            email: "patient-email",
            phone: "patient-phone",
            address: "patient-address"
        };
    }

    if (type === "doctor") {
        return {
            id: "doctor-id",
            name: "doctor-name",
            specialization: "doctor-specialization",
            email: "doctor-email",
            phone: "doctor-phone"
        };
    }

    return {
        id: "department-id",
        name: "department-name",
        description: "department-description"
    };
}

function getFormData(type) {
    const fields = getFormFields(type);
    const data = {};

    for (const [key, elementId] of Object.entries(fields)) {
        if (key === "id") continue;

        const element = document.getElementById(elementId);
        if (element) {
            data[key] = element.value.trim();
        }
    }

    if (type === "patient" && data.age !== undefined) {
        data.age = Number(data.age);
    }

    return data;
}

function setFormData(type, record) {
    const fields = getFormFields(type);

    for (const [key, elementId] of Object.entries(fields)) {
        const element = document.getElementById(elementId);

        if (element) {
            element.value = record[key] ?? "";
        }
    }
}

async function editRecord(type, id) {
    const section = `${type}s`;

    try {
        if (!state[section].length) {
            await loadSection(section);
        }

        const record = state[section].find(
            item => Number(item.id) === Number(id)
        );

        if (!record) {
            notify("Record not found. Please refresh and try again.");
            return;
        }

        const wrapper = document.getElementById(`${type}-form`);
        const form = document.getElementById(`${type}-data-form`);

        if (!wrapper || !form) {
            notify(`Could not find the ${type} form.`);
            return;
        }

        setFormData(type, record);
        wrapper.classList.remove("hidden");
        wrapper.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
        notify("Could not edit record: " + error.message);
    }
}

async function deleteRecord(type, id) {
    const section = `${type}s`;

    if (!confirm(`Are you sure you want to delete this ${type}?`)) {
        return;
    }

    try {
        await apiRequest(`${API[section]}/${id}`, {
            method: "DELETE"
        });

        notify(`${type} deleted successfully.`);
        await loadSection(section);
        await loadDashboard();
    } catch (error) {
        notify("Delete failed: " + error.message);
    }
}

async function saveRecord(event, type) {
    event.preventDefault();

    const section = `${type}s`;
    const idElement = document.getElementById(`${type}-id`);
    const id = idElement ? idElement.value.trim() : "";
    const data = getFormData(type);

    if (type === "patient" && !Number.isFinite(data.age)) {
        notify("Please enter a valid patient age.");
        return;
    }

    try {
        await apiRequest(
            id ? `${API[section]}/${id}` : API[section],
            {
                method: id ? "PUT" : "POST",
                body: JSON.stringify(data)
            }
        );

        hideForm(type);
        notify(`${type} ${id ? "updated" : "added"} successfully.`);

        await loadSection(section);
        await loadDashboard();
    } catch (error) {
        console.error("Save error:", error);
        notify("Save failed: " + error.message);
    }
}

// Connect forms and load the dashboard
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".nav-btn[data-section]").forEach(button => {
        button.addEventListener("click", () => {
            openSection(button.dataset.section);
        });
    });

    [
        ["patient", "patient-data-form"],
        ["doctor", "doctor-data-form"],
        ["department", "department-data-form"]
    ].forEach(([type, formId]) => {
        const form = document.getElementById(formId);

        if (form) {
            form.addEventListener("submit", event => {
                saveRecord(event, type);
            });
        }
    });

    openSection("dashboard");
});
