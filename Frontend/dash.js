const API_BASE = "http://localhost:1001";

// 1. Theme Configuration Management
function toggleTheme() {
  const root = document.documentElement;
  const nextTheme = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  root.setAttribute("data-theme", nextTheme);
  localStorage.setItem("lms-theme", nextTheme);
}

// Load saved theme configuration on startup
if (localStorage.getItem("lms-theme") === "dark") {
  document.documentElement.setAttribute("data-theme", "dark");
}

// 2. Metrics Analytics Engine
function updateMetricsOverview(leads) {
  const total = leads.length;
  const sold = leads.filter(l => l.status === 'Sold').length;
  const active = total - sold;

  document.getElementById("metric-total").textContent = total;
  document.getElementById("metric-active").textContent = active;
  document.getElementById("metric-sold").textContent = sold;
}

// 3. Dynamic Status Style Decorator
function getStatusClass(status) {
  const classes = {
    'New': 'status-new',
    'Contacted': 'status-contacted',
    'Follow up': 'status-fallback',
    'Trial': 'status-fallback',
    'Sold': 'status-sold'
  };
  return classes[status] || 'status-new';
}

// 4. Fetch Collection Records and Populate UI Render Layouts
async function loadDashboardData() {
  try {
    const res = await fetch(`${API_BASE}/api/leads`);
    const data = await res.json();
    const tbody = document.getElementById("leads-tbody");
    
    if (!data.leads || data.leads.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 2rem;">No operational pipeline records tracked in the database.</td></tr>`;
      updateMetricsOverview([]);
      return;
    }

    updateMetricsOverview(data.leads);

    tbody.innerHTML = data.leads.map(lead => `
      <tr id="row-${lead._id}">
        <td>
          <div class="entity-title">${lead.businessName || 'Unnamed Business'}</div>
          <div class="entity-subtext">ID: ${lead._id.substring(0, 8)}...</div>
        </td>
        <td>${lead.location || 'Remote / Unspecified'}</td>
        <td>
          <span class="status-badge ${getStatusClass(lead.status)}">${lead.status || 'New'}</span>
        </td>
        <td>
          <select class="table-select" onchange="updateStatus('${lead._id}', this.value)">
            <option value="New" ${lead.status === 'New' ? 'selected' : ''}>New</option>
            <option value="Contacted" ${lead.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
            <option value="Follow up" ${lead.status === 'Follow up' ? 'selected' : ''}>Follow up</option>
            <option value="Trial" ${lead.status === 'Trial' ? 'selected' : ''}>Trial</option>
            <option value="Sold" ${lead.status === 'Sold' ? 'selected' : ''}>Sold</option>
          </select>
        </td>
        <td>
          <div class="log-annotation-box">${lead.notes || '<span class="none-text">No custom logs recorded</span>'}</div>
          <div class="entity-subtext">Updated: ${new Date(lead.updatedAt || Date.now()).toLocaleTimeString()}</div>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error("Layout population fault stream:", err);
    document.getElementById("leads-tbody").innerHTML = `
      <tr><td colspan="5" style="text-align:center; color: #dc3545; padding: 2rem; font-weight: 500;">
        Failed to communicate with API backend on port 1001. Ensure your Node.js application is online.
      </td></tr>
    `;
  }
}

// 5. Inbound Collection Creation Form Submission Handler
document.getElementById('lead-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  const payload = {
    businessName: document.getElementById('businessName').value.trim(),
    location: document.getElementById('location').value.trim(),
    notes: document.getElementById('notes').value.trim(),
    status: 'New'
  };

  try {
    const response = await fetch(`${API_BASE}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      document.getElementById('lead-form').reset();
      await loadDashboardData();
    } else {
      alert('Failed to parse input schema validation layout formats.');
    }
  } catch (error) {
    console.error("Inbound write structural error stream:", error);
  } finally {
    submitBtn.disabled = false;
  }
});

// 6. Asynchronous State Mutation Transmission Rules
async function updateStatus(id, newStatus) {
  try {
    const response = await fetch(`${API_BASE}/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (response.ok) {
      // Perform a localized UI animation row highlight swap instead of hitting full page refresh loops
      const row = document.getElementById(`row-${id}`);
      if (row) {
        const badge = row.querySelector('.status-badge');
        badge.className = `status-badge ${getStatusClass(newStatus)}`;
        badge.textContent = newStatus;
        
        // Show temporary change reflection success flash animation
        row.style.backgroundColor = 'rgba(25, 135, 84, 0.05)';
        setTimeout(() => row.style.backgroundColor = '', 600);
      }
      
      // Update analytic dashboard metric counts silently
      const res = await fetch(`${API_BASE}/api/leads`);
      const data = await res.json();
      if(data.leads) updateMetricsOverview(data.leads);
    }
  } catch (err) {
    console.error("Resource state adjustment execution fault:", err);
  }
}

// Bootstrap Initialization
window.onload = loadDashboardData;