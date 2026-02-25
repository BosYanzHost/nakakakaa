// API Base URL untuk Vercel
const API_URL = '/api';

// Panel Specifications
const panelSpecs = {
    '1gb':  { memo: '1024', cpu: '30', disk: '1024' },
    '2gb':  { memo: '2048', cpu: '60', disk: '2048' },
    '3gb':  { memo: '3072', cpu: '90', disk: '3072' },
    '4gb':  { memo: '4048', cpu: '110', disk: '4048' },
    '5gb':  { memo: '5048', cpu: '140', disk: '5048' },
    '6gb':  { memo: '6048', cpu: '170', disk: '6048' },
    '7gb':  { memo: '7048', cpu: '200', disk: '7048' },
    '8gb':  { memo: '8048', cpu: '230', disk: '8048' },
    '9gb':  { memo: '9048', cpu: '260', disk: '9048' },
    '10gb': { memo: '10000', cpu: '500', disk: '15000' },
    'unli': { memo: '0', cpu: '0', disk: '0' }
};

// Current user session
let currentUser = null;
let selectedSpec = '';

// CEK SESSION DI LOCALSTORAGE
function checkSavedSession() {
    const savedUser = localStorage.getItem('zyura_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            
            updateProfileInfo();
            loadStats();
            loadServers();
            
            document.getElementById('loginPage').classList.remove('active');
            document.getElementById('dashboardPage').classList.add('active');
            
            if (currentUser.role === 'OWNER UTAMA') {
                document.getElementById('ownerMenuSection').style.display = 'block';
            }
            
            startClock();
        } catch (e) {
            console.error('Error loading session:', e);
            localStorage.removeItem('zyura_user');
        }
    }
}

// LOGIN FUNCTION
async function handleLogin(event) {
    event.preventDefault();
    
    const telegramId = document.getElementById('telegramId').value.trim();
    const loginBtn = document.getElementById('loginBtn');
    
    if (!telegramId) {
        showAlert('Error', 'Masukkan Telegram ID Anda!');
        return;
    }
    
    loginBtn.innerHTML = '<span>Loading...</span>';
    loginBtn.disabled = true;
    showModal('loadingModal');
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            
            localStorage.setItem('zyura_user', JSON.stringify(currentUser));
            
            updateProfileInfo();
            await loadStats();
            await loadServers();
            
            document.getElementById('loginPage').classList.remove('active');
            document.getElementById('dashboardPage').classList.add('active');
            
            if (currentUser.role === 'OWNER UTAMA') {
                document.getElementById('ownerMenuSection').style.display = 'block';
            } else {
                document.getElementById('ownerMenuSection').style.display = 'none';
            }
            
            hideModal('loadingModal');
            startClock();
        } else {
            hideModal('loadingModal');
            showAlert('Akses Ditolak', data.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        hideModal('loadingModal');
        showAlert('Error', 'Gagal connect ke server!');
    }
    
    loginBtn.innerHTML = '<span>Login ke Dashboard</span><i class="fas fa-arrow-right"></i>';
    loginBtn.disabled = false;
}

// UPDATE PROFILE
function updateProfileInfo() {
    document.getElementById('profileAvatar').textContent = currentUser.username.charAt(0).toUpperCase();
    document.getElementById('profileName').textContent = '@' + currentUser.username;
    document.getElementById('profileRole').textContent = currentUser.role;
    document.getElementById('profileId').textContent = 'ID: ' + currentUser.id;
    
    document.getElementById('welcomeUsername').textContent = '@' + currentUser.username;
    document.getElementById('welcomeRole').textContent = currentUser.role;
    
    document.getElementById('headerProfileName').textContent = '@' + currentUser.username;
    
    document.getElementById('dropdownAvatar').textContent = currentUser.username.charAt(0).toUpperCase();
    document.getElementById('dropdownName').textContent = '@' + currentUser.username;
    document.getElementById('dropdownRole').textContent = currentUser.role;
    document.getElementById('dropdownId').textContent = currentUser.id;
    document.getElementById('dropdownTime').textContent = new Date().toLocaleString('id-ID');
}

// LOAD SERVERS
async function loadServers() {
    try {
        const response = await fetch(`${API_URL}/servers`);
        const servers = await response.json();
        
        loadServersDropdown(servers);
        loadServersList(servers);
        
        return servers;
    } catch (error) {
        console.error('Error loading servers:', error);
        return [];
    }
}

// LOAD STATS
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        const stats = await response.json();
        
        document.getElementById('totalServers').textContent = stats.totalServers;
        document.getElementById('totalUsers').textContent = stats.totalUsers;
        document.getElementById('activePanels').textContent = stats.activePanels;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// LOAD SERVERS DROPDOWN
function loadServersDropdown(servers) {
    const serverSelect = document.getElementById('serverSelect');
    const adminServerSelect = document.getElementById('adminServerSelect');
    
    let options = '<option value="">-- Pilih Server --</option>';
    servers.forEach(server => {
        if (server.status === 'online') {
            options += `<option value="${server.id}">${server.name}</option>`;
        }
    });
    
    if (serverSelect) serverSelect.innerHTML = options;
    if (adminServerSelect) adminServerSelect.innerHTML = options;
}

// LOAD SERVERS LIST
function loadServersList(servers) {
    const serversList = document.getElementById('serversList');
    if (!serversList) return;
    
    let html = '';
    servers.forEach(server => {
        const statusClass = server.status === 'online' ? 'status-online' : 'status-offline';
        const statusText = server.status === 'online' ? 'Online' : 'Offline';
        
        html += `
            <div class="server-card glass-effect">
                <div class="server-info">
                    <h4>${server.name}</h4>
                    <p><i class="fas fa-globe"></i> ${server.domain}</p>
                    <p><i class="fas fa-server"></i> Servers: ${server.serverCount} | Users: ${server.userCount}</p>
                    <p><small>ID: ${server.id} | Added by: ${server.added_by}</small></p>
                </div>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
        `;
    });
    
    serversList.innerHTML = html;
}

// CREATE PANEL
async function createPanel(event) {
    event.preventDefault();
    
    if (!selectedSpec) {
        showAlert('Error', 'Pilih spesifikasi panel!');
        return;
    }
    
    const panelName = document.getElementById('panelName').value;
    const serverId = document.getElementById('serverSelect').value;
    
    if (!serverId) {
        showAlert('Error', 'Pilih server!');
        return;
    }
    
    showModal('loadingModal');
    
    try {
        const response = await fetch(`${API_URL}/create-panel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                panelName,
                targetId: currentUser.id,
                serverId,
                spec: selectedSpec,
                createdBy: currentUser.id
            })
        });
        
        const result = await response.json();
        
        hideModal('loadingModal');
        
        if (result.success) {
            showResult('✅ PANEL BERHASIL DIBUAT!', formatPanelResult(result.data));
            
            document.getElementById('createPanelForm').reset();
            document.querySelectorAll('.spec-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            selectedSpec = '';
            
            await loadServers();
        } else {
            showAlert('Gagal!', result.message);
        }
    } catch (error) {
        console.error('Create panel error:', error);
        hideModal('loadingModal');
        showAlert('Error', 'Gagal connect ke server panel!');
    }
}

// CREATE ADMIN PANEL
async function createAdminPanel(event) {
    event.preventDefault();
    
    const username = document.getElementById('adminUsername').value;
    const serverId = document.getElementById('adminServerSelect').value;
    
    if (!serverId) {
        showAlert('Error', 'Pilih server!');
        return;
    }
    
    showModal('loadingModal');
    
    try {
        const response = await fetch(`${API_URL}/create-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                targetId: currentUser.id,
                serverId,
                createdBy: currentUser.id
            })
        });
        
        const result = await response.json();
        
        hideModal('loadingModal');
        
        if (result.success) {
            showResult('✅ ADMIN PANEL BERHASIL!', formatAdminResult(result.data));
            document.getElementById('adminPanelForm').reset();
            await loadServers();
        } else {
            showAlert('Gagal!', result.message);
        }
    } catch (error) {
        console.error('Create admin error:', error);
        hideModal('loadingModal');
        showAlert('Error', 'Gagal connect ke server panel!');
    }
}

// ADD SERVER
async function addServer(event) {
    event.preventDefault();
    
    if (currentUser.role !== 'OWNER UTAMA') {
        showAlert('Akses Ditolak', 'Fitur ini hanya untuk OWNER UTAMA!');
        closeModal('addServerModal');
        return;
    }
    
    const domain = document.getElementById('serverDomain').value;
    const plta = document.getElementById('serverPlta').value;
    const pltc = document.getElementById('serverPltc').value;
    const name = document.getElementById('serverName').value || domain.replace('https://', '').replace('http://', '');
    
    showModal('loadingModal');
    
    try {
        const response = await fetch(`${API_URL}/servers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                domain,
                plta,
                pltc,
                status: 'online',
                serverCount: 0,
                userCount: 0,
                added_by: currentUser.id
            })
        });
        
        const result = await response.json();
        
        hideModal('loadingModal');
        closeModal('addServerModal');
        
        if (result.success) {
            showResult('✅ SERVER DITAMBAHKAN!', formatServerResult(result.server));
            
            const servers = await loadServers();
            loadServersDropdown(servers);
            loadServersList(servers);
            await loadStats();
            
            document.getElementById('addServerForm').reset();
        } else {
            showAlert('Gagal!', result.message);
        }
    } catch (error) {
        console.error('Add server error:', error);
        hideModal('loadingModal');
        showAlert('Error', 'Gagal connect ke server!');
    }
}

// DELETE SERVER
async function deleteServer(event) {
    event.preventDefault();
    
    if (currentUser.role !== 'OWNER UTAMA') {
        showAlert('Akses Ditolak', 'Fitur ini hanya untuk OWNER UTAMA!');
        closeModal('deleteServerModal');
        return;
    }
    
    const serverId = document.getElementById('deleteServerId').value;
    
    showModal('loadingModal');
    
    try {
        const response = await fetch(`${API_URL}/servers?id=${serverId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        hideModal('loadingModal');
        closeModal('deleteServerModal');
        
        if (result.success) {
            showResult('✅ SERVER DIHAPUS!', `Server ${result.server.name} berhasil dihapus`);
            
            const servers = await loadServers();
            loadServersDropdown(servers);
            loadServersList(servers);
            await loadStats();
        } else {
            showAlert('Error', result.message);
        }
        
        document.getElementById('deleteServerForm').reset();
    } catch (error) {
        console.error('Delete server error:', error);
        hideModal('loadingModal');
        showAlert('Error', 'Gagal connect ke server!');
    }
}

// DELETE ALL SERVERS
async function deleteAllServers() {
    if (currentUser.role !== 'OWNER UTAMA') {
        showAlert('Akses Ditolak', 'Fitur ini hanya untuk OWNER UTAMA!');
        return;
    }
    
    if (confirm('⚠️ Yakin ingin menghapus SEMUA server?')) {
        showModal('loadingModal');
        
        try {
            const response = await fetch(`${API_URL}/servers?all=true`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            hideModal('loadingModal');
            showResult('✅ SEMUA SERVER DIHAPUS!', `${result.count} server berhasil dihapus`);
            
            const servers = await loadServers();
            loadServersDropdown(servers);
            loadServersList(servers);
            await loadStats();
        } catch (error) {
            console.error('Delete all servers error:', error);
            hideModal('loadingModal');
            showAlert('Error', 'Gagal connect ke server!');
        }
    }
}

// DEL SRV OFF
async function delSrvOff() {
    if (currentUser.role !== 'OWNER UTAMA') {
        showAlert('Akses Ditolak', 'Fitur ini hanya untuk OWNER UTAMA!');
        return;
    }
    
    showModal('loadingModal');
    
    try {
        const response = await fetch(`${API_URL}/servers?offline=true`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        hideModal('loadingModal');
        showResult('✅ SERVER OFFLINE DIHAPUS!', `${result.count} server offline berhasil dihapus`);
        
        const servers = await loadServers();
        loadServersDropdown(servers);
        loadServersList(servers);
        await loadStats();
    } catch (error) {
        console.error('Delete offline servers error:', error);
        hideModal('loadingModal');
        showAlert('Error', 'Gagal connect ke server!');
    }
}

// TOTAL SERVER
async function totalServer() {
    try {
        const response = await fetch(`${API_URL}/servers`);
        const servers = await response.json();
        
        const total = servers.length;
        const online = servers.filter(s => s.status === 'online').length;
        const offline = servers.filter(s => s.status === 'offline').length;
        
        showResult('📊 TOTAL SERVER', 
            `Total Server: ${total}\n` +
            `Online: ${online}\n` +
            `Offline: ${offline}`
        );
    } catch (error) {
        console.error('Total server error:', error);
        showAlert('Error', 'Gagal load server!');
    }
}

// ADD ROLE
async function addRole(event) {
    event.preventDefault();
    
    if (currentUser.role !== 'OWNER UTAMA') {
        showAlert('Akses Ditolak', 'Fitur ini hanya untuk OWNER UTAMA!');
        closeModal('addRoleModal');
        return;
    }
    
    const roleType = document.getElementById('roleType').value;
    const telegramId = document.getElementById('roleTelegramId').value;
    const username = document.getElementById('roleUsername').value || 'user' + telegramId.slice(-4);
    
    let roleName = '';
    switch(roleType) {
        case 'ceo': roleName = 'CEO PANEL'; break;
        case 'tk': roleName = 'TANGAN KANAN'; break;
        case 'pt': roleName = 'PT PANEL'; break;
        case 'ress': roleName = 'RESELLER'; break;
        case 'own': roleName = 'OWN PANEL'; break;
        case 'pemilik': roleName = 'PEMILIK PANEL'; break;
    }
    
    showModal('loadingModal');
    
    try {
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: telegramId,
                username: username,
                role: roleName
            })
        });
        
        const result = await response.json();
        
        hideModal('loadingModal');
        closeModal('addRoleModal');
        
        if (result.success) {
            showResult('✅ ROLE DITAMBAHKAN!', 
                `Berhasil menambahkan ${roleName}\n\n` +
                `ID: ${telegramId}\n` +
                `Username: @${username}`
            );
            
            document.getElementById('addRoleForm').reset();
            await loadStats();
        } else {
            showAlert('Gagal!', result.message);
        }
    } catch (error) {
        console.error('Add role error:', error);
        hideModal('loadingModal');
        showAlert('Error', 'Gagal connect ke server!');
    }
}

// FORMAT RESULTS
function formatPanelResult(data) {
    return `
╔══════════════════════════════╗
║   PANEL BERHASIL DIBUAT!     ║
╚══════════════════════════════╝

📋 DETAIL PANEL:
━━━━━━━━━━━━━━━━━━
👤 Username: ${data.username}
🔑 Password: ${data.password}
🌐 Domain: ${data.domain}
🖥️ Server: ${data.serverName}
📊 Spesifikasi: ${data.spec}
👤 Dibuat untuk: @${currentUser.username} (ID: ${currentUser.id})
━━━━━━━━━━━━━━━━━━
📌 Simpan data ini dengan aman!
    `;
}

function formatAdminResult(data) {
    return `
╔══════════════════════════════╗
║     ADMIN PANEL BERHASIL!    ║
╚══════════════════════════════╝

📋 DETAIL ADMIN:
━━━━━━━━━━━━━━━━━━
👤 Username: ${data.username}
🔑 Password: ${data.password}
🌐 Domain: ${data.domain}
🖥️ Server: ${data.serverName}
👑 Role: ADMIN PANEL
👤 Dibuat untuk: @${currentUser.username} (ID: ${currentUser.id})
━━━━━━━━━━━━━━━━━━
📌 Simpan data ini dengan aman!
    `;
}

function formatServerResult(data) {
    return `
╔══════════════════════════════╗
║     SERVER DITAMBAHKAN!      ║
╚══════════════════════════════╝

📋 DETAIL SERVER:
━━━━━━━━━━━━━━━━━━
🆔 ID: ${data.id}
📛 Nama: ${data.name}
🌐 Domain: ${data.domain}
🔑 PLTA: ${data.plta}
🔑 PLTC: ${data.pltc}
👤 Added by: ${data.added_by}
📅 Tanggal: ${data.added_at}
━━━━━━━━━━━━━━━━━━
    `;
}

// SHOW MODALS
function showAddRoleModal(type) {
    if (currentUser.role !== 'OWNER UTAMA') {
        showAlert('Akses Ditolak', 'Fitur ini hanya untuk OWNER UTAMA!');
        return;
    }
    
    const titles = {
        'ceo': 'Tambah CEO Panel',
        'tk': 'Tambah Tangan Kanan',
        'pt': 'Tambah PT Panel',
        'ress': 'Tambah Reseller',
        'own': 'Tambah Owner Panel',
        'pemilik': 'Tambah Pemilik Panel'
    };
    
    document.getElementById('addRoleModalTitle').textContent = titles[type];
    document.getElementById('roleType').value = type;
    showModal('addRoleModal');
}

function showAddServerModal() {
    if (currentUser.role !== 'OWNER UTAMA') {
        showAlert('Akses Ditolak', 'Fitur ini hanya untuk OWNER UTAMA!');
        return;
    }
    showModal('addServerModal');
}

function showDeleteServerModal() {
    if (currentUser.role !== 'OWNER UTAMA') {
        showAlert('Akses Ditolak', 'Fitur ini hanya untuk OWNER UTAMA!');
        return;
    }
    showModal('deleteServerModal');
}

function showResult(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('resultBox').innerHTML = content.replace(/\n/g, '<br>');
    showModal('resultModal');
}

function showAlert(title, message) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('resultBox').innerHTML = `❌ ${message}`;
    showModal('resultModal');
}

function copyResult() {
    const resultText = document.getElementById('resultBox').innerText;
    navigator.clipboard.writeText(resultText).then(() => {
        alert('✅ Berhasil disalin!');
    }).catch(() => {
        alert('✅ Berhasil disalin!');
    });
}

// TOGGLE FUNCTIONS
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

function toggleMobileSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

function toggleProfileDropdown() {
    document.getElementById('profileDropdown').classList.toggle('show');
}

// Close dropdown
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('profileDropdown');
    const profile = document.querySelector('.profile-dropdown');
    
    if (profile && !profile.contains(event.target) && dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
    }
});

// SHOW PAGE
function showPage(page, event) {
    if (event) {
        event.preventDefault();
    }
    
    if (page === 'serverMenu' && currentUser.role !== 'OWNER UTAMA') {
        totalServer();
        return;
    }
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    if (event) {
        event.target.closest('.nav-item').classList.add('active');
    }
    
    const titles = {
        'dashboard': 'Dashboard',
        'createPanel': 'Create Panel',
        'adminPanel': 'Admin Panel',
        'serverMenu': 'Server Menu',
        'ownerMenu': 'Owner Menu'
    };
    document.getElementById('pageTitle').textContent = titles[page];
    
    document.querySelectorAll('.page-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.getElementById(page + 'Content').classList.add('active');
    
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('active');
    }
}

// CLOCK
function startClock() {
    function updateClock() {
        const now = new Date();
        const options = {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        document.getElementById('currentDateTime').textContent = 
            now.toLocaleDateString('id-ID', options);
    }
    updateClock();
    setInterval(updateClock, 60000);
}

// MODAL FUNCTIONS
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    if (modalId) {
        document.getElementById(modalId).classList.remove('active');
    } else {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// LOGOUT
function logout() {
    showModal('loadingModal');
    
    setTimeout(() => {
        localStorage.removeItem('zyura_user');
        currentUser = null;
        document.getElementById('loginPage').classList.add('active');
        document.getElementById('dashboardPage').classList.remove('active');
        document.getElementById('loginForm').reset();
        hideModal('loadingModal');
    }, 1000);
}

// SPEC BUTTON HANDLER
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('spec-btn')) {
        document.querySelectorAll('.spec-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        e.target.classList.add('selected');
        selectedSpec = e.target.dataset.spec;
        document.getElementById('selectedSpec').value = selectedSpec;
    }
});

// INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
    checkSavedSession();
    
    if (!currentUser) {
        document.getElementById('telegramId').focus();
    }
});