// Since the frontend is now served by the same Worker as our API (via Workers Assets), 
// we can use relative paths entirely. This naturally works for both local dev AND prod!
const API_BASE = '';


let users = [];
let equipment = [];
let kits = [];
let loans = { active: [], returned: [] };

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initForms();
    refreshAllData();
    
    // Equipment Filters
    document.querySelectorAll('input[name="eqFilter"]').forEach(radio => {
        radio.addEventListener('change', renderEquipment);
    });
    
    // Kit Auto-select for Loans
    document.getElementById('loanKitSelect').addEventListener('change', (e) => {
        const kitId = e.target.value;
        const equipSelect = document.getElementById('loanEquipSelect');
        
        if (!kitId) {
            Array.from(equipSelect.options).forEach(opt => opt.selected = false);
            return;
        }

        const kit = kits.find(k => k.id === kitId);
        if (kit) {
            Array.from(equipSelect.options).forEach(opt => {
                opt.selected = kit.items.some(item => item.id === opt.value);
            });
        }
    });
});

function initTabs() {
    const tabs = document.querySelectorAll('.nav-btn');
    const contents = document.querySelectorAll('.tab-content');
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
        });
    });
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.2s';
        setTimeout(() => toast.remove(), 200);
    }, 3000);
}

// ----------------------------------------------------
// API ORCHESTRATION
// ----------------------------------------------------

async function apiCall(method, path, body = null) {
    try {
        const url = API_BASE ? `${API_BASE}${path}` : path;
        const options = { method, headers: {} };
        if (body) {
            options.body = JSON.stringify(body);
            options.headers['Content-Type'] = 'application/json';
        }
        const res = await fetch(url, options);
        let data;
        try { data = await res.json(); } catch(e) { data = { error: 'Unknown response' }; }
        
        if(!res.ok) throw new Error(data.error || 'Server Error');
        if(method !== 'GET') showToast('Success');
        return data;
    } catch(err) {
        showToast(err.message, 'error');
        return null;
    }
}

async function refreshAllData() {
    const [u, e, k, lActive, lRet] = await Promise.all([
        apiCall('GET', '/users'),
        apiCall('GET', '/equipment'),
        apiCall('GET', '/kits'),
        apiCall('GET', '/loans?status=active'),
        apiCall('GET', '/loans?status=returned')
    ]);

    if (u) users = u.results || [];
    if (e) equipment = e.results || [];
    
    // Stitch items into kits for UI display based on equipment's kit_id
    if (k) {
        kits = (k.results || []).map(kit => ({
            ...kit,
            items: equipment.filter(eq => eq.kit_id === kit.id)
        }));
    }

    if (lActive) loans.active = lActive.results || [];
    if (lRet) loans.returned = lRet.results || [];

    renderAll();
}

function renderAll() {
    renderUsers();
    renderEquipment();
    renderKits();
    renderLoans();
    populateSelects();
}

// ----------------------------------------------------
// UI RENDERING
// ----------------------------------------------------

function renderUsers() {
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = users.map(u => `<tr><td><strong>${u.name}</strong></td><td>${u.role}</td><td><small>${u.id.substring(0,8)}...</small></td></tr>`).join('');
}

function renderEquipment() {
    const filter = document.querySelector('input[name="eqFilter"]:checked').value;
    const tbody = document.querySelector('#equipmentTable tbody');
    
    let filtered = equipment;
    if (filter !== 'all') {
        filtered = equipment.filter(e => e.status === filter);
    }
    
    tbody.innerHTML = filtered.map(e => {
        const ownerName = users.find(u => u.id === e.owner_id)?.name || 'Unknown';
        const kitName = e.kit_id ? (kits.find(k => k.id === e.kit_id)?.name || 'Yes') : '-';
        return `
            <tr>
                <td><strong>${e.name}</strong></td>
                <td><span class="status ${e.status}">${e.status.replace('_', ' ')}</span></td>
                <td>${ownerName}</td>
                <td><small>${kitName}</small></td>
            </tr>
        `;
    }).join('');
}

function renderKits() {
    const list = document.getElementById('kitsList');
    list.innerHTML = kits.map(k => `
        <div class="kit-card">
            <h3>${k.name}</h3>
            <div class="loan-meta">Owner: ${users.find(u => u.id === k.owner_id)?.name || 'Unknown'}</div>
            <ul class="items-list">
                ${k.items.map(i => `<li>${i.name} <span class="status ${i.status}" style="font-size:0.6rem; padding: 1px 4px;">${i.status.replace('_', ' ')}</span></li>`).join('')}
                ${k.items.length === 0 ? '<li><em style="color:#94a3b8">No equipment assigned</em></li>' : ''}
            </ul>
        </div>
    `).join('');
}

function renderLoans() {
    const activeList = document.getElementById('activeLoansList');
    const returnedList = document.getElementById('returnedLoansList');

    activeList.innerHTML = loans.active.length === 0 ? '<p class="hint">No active loans right now.</p>' : loans.active.map(l => `
        <div class="loan-card border-warning">
            <h3>Active Loan <button class="btn-danger" onclick="returnLoan('${l.id}')">Return Items</button></h3>
            <div class="loan-meta">Borrower: <strong>${l.borrower_name}</strong></div>
            <div class="loan-meta">Authorizer: ${l.lender_name}</div>
            <div class="loan-meta">Date: ${new Date(l.created_at).toLocaleString()}</div>
            <ul class="items-list">
                ${l.items.map(i => `<li>${i.equipment_name}</li>`).join('')}
            </ul>
        </div>
    `).join('');

    returnedList.innerHTML = loans.returned.length === 0 ? '<p class="hint">No returned loans history.</p>' : loans.returned.map(l => `
        <div class="loan-card returned">
            <h3>Returned Loan</h3>
            <div class="loan-meta">Borrower: <strong>${l.borrower_name}</strong></div>
            <div class="loan-meta">Returned: ${new Date(l.returned_at).toLocaleString()}</div>
            <ul class="items-list">
                ${l.items.map(i => `<li>${i.equipment_name}</li>`).join('')}
            </ul>
        </div>
    `).join('');
}

function populateSelects() {
    // Users
    const userOpts = users.map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join('');
    document.getElementById('equipOwner').innerHTML = '<option value="">Select Owner...</option>' + userOpts;
    document.getElementById('kitOwner').innerHTML = '<option value="">Select Owner...</option>' + userOpts;
    document.getElementById('loanBorrower').innerHTML = '<option value="">Select Borrower...</option>' + userOpts;
    document.getElementById('loanLender').innerHTML = '<option value="">Select Lender (Authorizer)...</option>' + userOpts;

    // Kits
    const kitOpts = kits.map(k => `<option value="${k.id}">${k.name}</option>`).join('');
    document.getElementById('kitSelect').innerHTML = '<option value="">Select Kit...</option>' + kitOpts;
    document.getElementById('loanKitSelect').innerHTML = '<option value="">-- Choose Kit to Auto-Select --</option>' + kitOpts;

    // Equipment Selection (Kits: only unassigned)
    const eqForKit = equipment.filter(e => !e.kit_id).map(e => `<option value="${e.id}">${e.name} (${e.status}) - Owned by ${users.find(u=>u.id===e.owner_id)?.name}</option>`).join('');
    document.getElementById('kitEquipSelect').innerHTML = eqForKit;

    // Equipment Selection (Loans: only available)
    const eqForLoan = equipment.filter(e => e.status === 'available').map(e => {
        const kitName = e.kit_id ? kits.find(k=>k.id===e.kit_id)?.name : 'None';
        return `<option value="${e.id}">${e.name} [Kit: ${kitName}]</option>`;
    }).join('');
    document.getElementById('loanEquipSelect').innerHTML = eqForLoan;
}

// ----------------------------------------------------
// FORM SUBMISSIONS
// ----------------------------------------------------

function initForms() {
    document.getElementById('userForm').onsubmit = async (e) => {
        e.preventDefault();
        const res = await apiCall('POST', '/users', { 
            name: document.getElementById('userName').value, 
            role: document.getElementById('userRole').value 
        });
        if(res) { e.target.reset(); refreshAllData(); }
    };

    document.getElementById('equipmentForm').onsubmit = async (e) => {
        e.preventDefault();
        const res = await apiCall('POST', '/equipment', { 
            name: document.getElementById('equipName').value, 
            owner_id: document.getElementById('equipOwner').value 
        });
        if(res) { e.target.reset(); refreshAllData(); }
    };

    document.getElementById('kitForm').onsubmit = async (e) => {
        e.preventDefault();
        const res = await apiCall('POST', '/kits', { 
            name: document.getElementById('kitName').value, 
            owner_id: document.getElementById('kitOwner').value 
        });
        if(res) { e.target.reset(); refreshAllData(); }
    };

    document.getElementById('kitItemsForm').onsubmit = async (e) => {
        e.preventDefault();
        const kitId = document.getElementById('kitSelect').value;
        const opts = document.getElementById('kitEquipSelect').selectedOptions;
        const equipment_ids = Array.from(opts).map(o => o.value);
        
        if(equipment_ids.length === 0) return showToast('Select items to add', 'error');
        
        const res = await apiCall('POST', `/kits/${kitId}/items`, { equipment_ids });
        if(res) { e.target.reset(); refreshAllData(); }
    };

    document.getElementById('loanForm').onsubmit = async (e) => {
        e.preventDefault();
        const borrower_id = document.getElementById('loanBorrower').value;
        const lender_id = document.getElementById('loanLender').value;
        const opts = document.getElementById('loanEquipSelect').selectedOptions;
        const equipment_ids = Array.from(opts).map(o => o.value);
        
        if(equipment_ids.length === 0) return showToast('Select items to checkout', 'error');
        
        const res = await apiCall('POST', '/loans', { borrower_id, lender_id, equipment_ids });
        if(res) { 
            e.target.reset(); 
            document.getElementById('loanKitSelect').value = ""; // clear combo
            refreshAllData(); 
        }
    };
}

// Global scope for onclick
window.returnLoan = async (loanId) => {
    // In a real app we'd ask who is processing the return (authenticated context). 
    // For MVP operations tool, grab the first admin to act as the return processor.
    const admin = users.find(u => u.role === 'admin');
    if(!admin) return showToast('Need an admin user in system to process returns', 'error');
    
    const res = await apiCall('POST', `/loans/${loanId}/return`, { lender_id: admin.id });
    if(res) refreshAllData();
};
