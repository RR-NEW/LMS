const API_BASE = "http://localhost:1001/api";

// === AUTHENTICATED FETCH HELPER ===
async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem("lms_token");

    if (!token) {
        localStorage.removeItem("lms_token");
        localStorage.removeItem("lms_user");
        window.location.href = "login.html";
        return null;
    }

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        ...(options.headers || {})
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    if (response.status === 401) {
        alert("Session expired or unauthorized. Please log in again.");
        localStorage.removeItem("lms_token");
        localStorage.removeItem("lms_user");
        window.location.href = "login.html";
        return null;
    }

    return response;
}

document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem("lms_user") || "null");
    const token = localStorage.getItem("lms_token");

    if (!user || !token) {
        window.location.href = "login.html";
        return;
    }

    const welcomeMsg = document.getElementById("welcome-message");
    if (welcomeMsg) {
        welcomeMsg.textContent = `Logged in as: ${user.fullname || user.username}`;
    }

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("lms_token");
            localStorage.removeItem("lms_user");
            window.location.href = "login.html";
        });
    }

    loadAllDashboardData();
    setupFormListeners();
});

async function loadAllDashboardData() {
    try {
        const [leadsRes, servicesRes, contactsRes] = await Promise.all([
            apiFetch("/leads"),
            apiFetch("/services"),
            apiFetch("/contacts")
        ]);

        if (!leadsRes || !servicesRes || !contactsRes) return;

        const leadsData = await leadsRes.json();
        const servicesData = await servicesRes.json();
        const contactsData = await contactsRes.json();

        const leads = leadsData.status === "success" ? leadsData.leads : [];
        const services = servicesData.status === "success" ? servicesData.services : [];
        const contacts = contactsData.status === "success" ? contactsData.contacts : [];

        updateStatCards(leads, services, contacts);

        renderLeadsTable(leads);
        renderServicesTable(services);
        renderContactsTable(contacts);

        renderUnifiedTable(leads, services, contacts);
        populateLeadDropdowns(leads);

    } catch (error) {
        console.error("Error loading dashboard data:", error);
    }
}

function updateStatCards(leads, services, contacts) {
    const totalLeadsElem = document.getElementById("stat-total-leads");
    const wonLeadsElem = document.getElementById("stat-won-leads");
    const totalServicesElem = document.getElementById("stat-total-services");
    const totalContactsElem = document.getElementById("stat-total-contacts");
    const totalRevenueElem = document.getElementById("stat-total-revenue");

    if (totalLeadsElem) totalLeadsElem.textContent = leads.length;
    
    if (wonLeadsElem) {
        const wonLeads = leads.filter(l => l.status === "Won").length;
        wonLeadsElem.textContent = wonLeads;
    }

    if (totalServicesElem) totalServicesElem.textContent = services.length;
    if (totalContactsElem) totalContactsElem.textContent = contacts.length;

    if (totalRevenueElem) {
        const totalRevenue = services.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
        totalRevenueElem.textContent = `$${totalRevenue.toLocaleString()}`;
    }
}

function populateLeadDropdowns(leads) {
    const serviceSelect = document.getElementById("service-lead-select");
    const contactSelect = document.getElementById("contact-lead-select");

    if (!serviceSelect || !contactSelect) return;

    let optionsHTML = '<option value="">-- Select Linked Lead (Business) --</option>';
    leads.forEach(lead => {
        optionsHTML += `<option value="${lead._id}">${lead.businessName}</option>`;
    });

    serviceSelect.innerHTML = optionsHTML;
    contactSelect.innerHTML = optionsHTML;
}

function renderUnifiedTable(leads, services, contacts) {
    const tbody = document.querySelector("#unified-table tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    leads.forEach(lead => {
        const leadServices = services.filter(s => s.lead && (s.lead._id === lead._id || s.lead === lead._id));
        const leadContacts = contacts.filter(c => c.lead && (c.lead._id === lead._id || c.lead === lead._id));

        let servicesHTML = '<em style="color:var(--text-muted, gray);">None</em>';
        if (leadServices.length > 0) {
            servicesHTML = `<ul class="list-unstyled">` + 
                leadServices.map(s => `<li>• <strong>${s.serviceName}</strong> ($${s.price || 0})</li>`).join('') + 
                `</ul>`;
        }

        let contactsHTML = '<em style="color:var(--text-muted, gray);">None</em>';
        if (leadContacts.length > 0) {
            contactsHTML = `<ul class="list-unstyled">` + 
                leadContacts.map(c => `<li>• <strong>${c.name}</strong> (${c.role || 'Contact'})<br>&nbsp;&nbsp;📞 ${c.phoneno}</li>`).join('') + 
                `</ul>`;
        }

        const demoDateStr = lead.demoDate ? new Date(lead.demoDate).toLocaleDateString() : 'N/A';
        const followDateStr = lead.followupDate ? new Date(lead.followupDate).toLocaleDateString() : 'N/A';

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${lead.businessName || 'N/A'}</strong></td>
            <td>${lead.location || 'N/A'}</td>
            <td><strong>${lead.status || 'New'}</strong></td>
            <td>${servicesHTML}</td>
            <td>${contactsHTML}</td>
            <td><small>Demo: ${demoDateStr}<br>Follow: ${followDateStr}</small></td>
            <td>
                <button class="btn-delete" onclick="deleteLead('${lead._id}')">Delete Lead</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderLeadsTable(leads) {
    const tbody = document.querySelector("#leads-table tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    leads.forEach(lead => {
        const demoDateStr = lead.demoDate ? new Date(lead.demoDate).toLocaleDateString() : 'N/A';
        const followDateStr = lead.followupDate ? new Date(lead.followupDate).toLocaleDateString() : 'N/A';

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="id-badge">${lead._id ? lead._id.slice(-6) : 'N/A'}</td>
            <td><strong>${lead.businessName || 'N/A'}</strong></td>
            <td>${lead.location || 'N/A'}</td>
            <td>
                <select class="status-select" onchange="updateLeadStatus('${lead._id}', this.value)">
                    <option value="New" ${lead.status === 'New' ? 'selected' : ''}>New</option>
                    <option value="Demo Scheduled" ${lead.status === 'Demo Scheduled' ? 'selected' : ''}>Demo Scheduled</option>
                    <option value="Demo Done" ${lead.status === 'Demo Done' ? 'selected' : ''}>Demo Done</option>
                    <option value="Negotiation" ${lead.status === 'Negotiation' ? 'selected' : ''}>Negotiation</option>
                    <option value="Won" ${lead.status === 'Won' ? 'selected' : ''}>Won</option>
                    <option value="Lost" ${lead.status === 'Lost' ? 'selected' : ''}>Lost</option>
                </select>
            </td>
            <td>${demoDateStr}</td>
            <td>${followDateStr}</td>
            <td>${lead.notes || '-'}</td>
            <td>
                <button class="btn-delete" onclick="deleteLead('${lead._id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderServicesTable(services) {
    const tbody = document.querySelector("#services-table tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    services.forEach(service => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="id-badge">${service._id ? service._id.slice(-6) : 'N/A'}</td>
            <td><strong>${service.serviceName || 'N/A'}</strong></td>
            <td>${service.lead ? service.lead.businessName : '<em>Unassigned</em>'}</td>
            <td>${service.description || '-'}</td>
            <td>$${service.price || 0}</td>
            <td>
                <button class="btn-delete" onclick="deleteService('${service._id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderContactsTable(contacts) {
    const tbody = document.querySelector("#contacts-table tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    contacts.forEach(contact => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="id-badge">${contact._id ? contact._id.slice(-6) : 'N/A'}</td>
            <td><strong>${contact.name || 'N/A'}</strong></td>
            <td>${contact.phoneno || 'N/A'}</td>
            <td>${contact.role || 'N/A'}</td>
            <td>${contact.lead ? contact.lead.businessName : '<em>Unassigned</em>'}</td>
            <td>
                <button class="btn-delete" onclick="deleteContact('${contact._id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateLeadStatus = async function(id, newStatus) {
    try {
        const res = await apiFetch(`/leads/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        if (res && res.ok) {
            loadAllDashboardData();
        } else if (res) {
            alert("Failed to update status");
        }
    } catch (error) {
        alert("Failed to update status: Connection error");
    }
};

window.deleteLead = async function(id) {
    if (!confirm("Are you sure you want to delete this lead? Linked services and contacts will also be removed.")) return;
    
    try {
        const res = await apiFetch(`/leads/${id}`, { method: 'DELETE' });
        if (res && res.ok) loadAllDashboardData();
        else if (res) alert("Failed to delete lead");
    } catch (error) {
        alert("Failed to delete lead: Connection error");
    }
};

window.deleteService = async function(id) {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
        const res = await apiFetch(`/services/${id}`, { method: 'DELETE' });
        if (res && res.ok) loadAllDashboardData();
        else if (res) alert("Failed to delete service");
    } catch (error) {
        alert("Failed to delete service: Connection error");
    }
};

window.deleteContact = async function(id) {
    if (!confirm("Are you sure you want to delete this contact person?")) return;

    try {
        const res = await apiFetch(`/contacts/${id}`, { method: 'DELETE' });
        if (res && res.ok) loadAllDashboardData();
        else if (res) alert("Failed to delete contact");
    } catch (error) {
        alert("Failed to delete contact: Connection error");
    }
};

function setupFormListeners() {
    
    const leadForm = document.getElementById("add-lead-form");
    if (leadForm) {
        leadForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const body = {
                businessName: document.getElementById("lead-business").value,
                location: document.getElementById("lead-location").value,
                status: document.getElementById("lead-status").value,
                demoDate: document.getElementById("lead-demodate").value || null,
                followupDate: document.getElementById("lead-followdate").value || null,
                notes: document.getElementById("lead-notes").value,
                contactPhone: document.getElementById("lead-contact-phone") ? document.getElementById("lead-contact-phone").value : ""
            };

            try {
                const res = await apiFetch(`/leads`, {
                    method: "POST",
                    body: JSON.stringify(body)
                });
                if (!res) return;

                const data = await res.json();

                if (data.status === "success") {
                    e.target.reset();
                    loadAllDashboardData();
                } else {
                    alert("Failed to save Lead: " + data.message);
                }
            } catch (err) {
                alert("Server Connection Error! Is backend running on port 1001?");
            }
        });
    }

    const serviceForm = document.getElementById("add-service-form");
    if (serviceForm) {
        serviceForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const selectedLead = document.getElementById("service-lead-select").value;

            const body = {
                serviceName: document.getElementById("service-name").value,
                lead: selectedLead ? selectedLead : null,
                description: document.getElementById("service-desc").value,
                price: document.getElementById("service-price").value
            };

            try {
                const res = await apiFetch(`/services`, {
                    method: "POST",
                    body: JSON.stringify(body)
                });
                if (!res) return;

                const data = await res.json();

                if (data.status === "success") {
                    e.target.reset();
                    loadAllDashboardData();
                } else {
                    alert("Failed to save Service: " + data.message);
                }
            } catch (err) {
                alert("Server Connection Error! Is backend running on port 1001?");
            }
        });
    }

    const contactForm = document.getElementById("add-contact-form");
    if (contactForm) {
        contactForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const selectedLead = document.getElementById("contact-lead-select").value;

            const body = {
                name: document.getElementById("contact-name").value,
                phoneno: document.getElementById("contact-phone").value,
                role: document.getElementById("contact-role").value,
                lead: selectedLead ? selectedLead : null
            };

            try {
                const res = await apiFetch(`/contacts`, {
                    method: "POST",
                    body: JSON.stringify(body)
                });
                if (!res) return;

                const data = await res.json();

                if (data.status === "success") {
                    e.target.reset();
                    loadAllDashboardData();
                } else {
                    alert("Failed to save Contact: " + data.message);
                }
            } catch (err) {
                alert("Server Connection Error! Is backend running on port 1001?");
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (!themeToggleBtn) return;
    
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

    document.documentElement.setAttribute('data-theme', currentTheme);
    updateToggleIcon(currentTheme);

    themeToggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);
        
        updateToggleIcon(currentTheme);
    });

    function updateToggleIcon(theme) {
        themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
});