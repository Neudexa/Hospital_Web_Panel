const adminToken = localStorage.getItem('adminToken');
if (!adminToken) window.location.href = 'admin_gate.html';

let currentDoctorId = null;

async function fetchDoctors() {
    const res = await fetch('/api/admin/doctors', {
        headers: { 'x-admin-token': adminToken }
    });
    if (res.status === 403) adminLogout();
    const doctors = await res.json();
    
    const list = document.getElementById('doctors-list');
    if (list) {
        list.innerHTML = '';
        doctors.forEach(doc => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${doc.name}</td>
                <td>${doc.role}</td>
                <td><span class="badge ${doc.status === 'Aktif' ? 'badge-active' : 'badge-leave'}">${doc.status}</span></td>
                <td>${doc.salary.toLocaleString()} TL</td>
                <td class="action-btns"></td>
            `;
            
            const actionTd = tr.querySelector('.action-btns');
            
            const btnAppts = document.createElement('button');
            btnAppts.className = 'btn-sm';
            btnAppts.style.background = 'var(--secondary)';
            btnAppts.style.color = 'white';
            btnAppts.textContent = 'Randevular';
            btnAppts.addEventListener('click', () => {
                switchToSection('appointments');
                document.getElementById('appt-doctor-select').value = doc.id;
                loadMainAppointments(doc.id);
            });
            
            const btnEdit = document.createElement('button');
            btnEdit.className = 'btn-sm btn-edit';
            btnEdit.textContent = 'Düzenle';
            btnEdit.addEventListener('click', () => editDoctor(doc));
            
            const btnDelete = document.createElement('button');
            btnDelete.className = 'btn-sm btn-delete';
            btnDelete.textContent = 'Sil';
            btnDelete.addEventListener('click', () => deleteDoctor(doc.id));
            
            actionTd.appendChild(btnAppts);
            actionTd.appendChild(btnEdit);
            actionTd.appendChild(btnDelete);
            list.appendChild(tr);
        });
    }

    const select = document.getElementById('appt-doctor-select');
    if (select) {
        select.innerHTML = '<option value="">Bir doktor seçin...</option>' + 
            doctors.map(d => `<option value="${d.id}">${d.name} (${d.role})</option>`).join('');
    }
}

async function deleteDoctor(id) {
    if (!confirm('Bu doktor kaydını silmek istediğinize emin misiniz?')) return;
    await fetch(`/api/admin/doctors/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': adminToken }
    });
    fetchDoctors();
}

function editDoctor(doc) {
    document.getElementById('modal-title').textContent = 'Doktoru Düzenle';
    document.getElementById('doctor-id').value = doc.id;
    document.getElementById('doc-name').value = doc.name;
    document.getElementById('doc-role').value = doc.role;
    document.getElementById('doc-status').value = doc.status;
    document.getElementById('doc-salary').value = doc.salary;
    document.getElementById('doctor-modal').classList.remove('hidden');
}

function showAddDoctorModal() {
    document.getElementById('modal-title').textContent = 'Yeni Doktor Ekle';
    document.getElementById('doctor-id').value = '';
    document.getElementById('doctor-form').reset();
    document.getElementById('doctor-modal').classList.remove('hidden');
}

function closeDoctorModal() { document.getElementById('doctor-modal').classList.add('hidden'); }

function adminLogout() { 
    localStorage.removeItem('adminToken'); 
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    window.location.replace('index.html'); 
}

function populateRoles(roles) {
    const select = document.getElementById('doc-role');
    if (select) {
        select.innerHTML = roles.map(role => `<option value="${role}">${role}</option>`).join('');
    }
}

function loadLocalRoles() {
    const localRoles = [
        'Dermatoloji', 'Psikiyatri', 'Kardiyoloji', 'Nöroloji', 'Dahiliye', 
        'Göz Hastalıkları', 'Ortopedi', 'Genel Cerrahi', 'Çocuk Sağlığı ve Hastalıkları'
    ];
    populateRoles(localRoles);
}

// --- Bölüm Değiştirme Mantığı ---
function switchToSection(sectionId) {
    console.log("Switching to section:", sectionId);
    const secDocs = document.getElementById('section-doctors');
    const secAppts = document.getElementById('section-appointments');
    const secPatientAppts = document.getElementById('section-patient-appointments');
    
    const menuDocs = document.getElementById('menu-docs');
    const menuAppts = document.getElementById('menu-appts');
    const menuPatientAppts = document.getElementById('menu-patient-appts');

    if (!secDocs || !secAppts || !secPatientAppts || !menuDocs || !menuAppts || !menuPatientAppts) return;

    secDocs.classList.add('hidden');
    secAppts.classList.add('hidden');
    secPatientAppts.classList.add('hidden');
    
    menuDocs.classList.remove('active');
    menuAppts.classList.remove('active');
    menuPatientAppts.classList.remove('active');

    if (sectionId === 'doctors') {
        secDocs.classList.remove('hidden');
        menuDocs.classList.add('active');
        fetchDoctors();
    } else if (sectionId === 'appointments') {
        secAppts.classList.remove('hidden');
        menuAppts.classList.add('active');
        fetchDoctors();
    } else if (sectionId === 'patient-appointments') {
        secPatientAppts.classList.remove('hidden');
        menuPatientAppts.classList.add('active');
        loadAllPatientAppointments();
    }
}

let allFetchedAppointments = [];

async function loadAllPatientAppointments() {
    const list = document.getElementById('all-patient-appts-list');
    if (!list) return;
    
    list.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 3rem; opacity: 0.5;">Yükleniyor...</td></tr>';
    
    const res = await fetch('/api/admin/all-appointments', {
        headers: { 'x-admin-token': adminToken }
    });
    allFetchedAppointments = await res.json();
    renderFilteredAppointments();
}

function renderFilteredAppointments() {
    const list = document.getElementById('all-patient-appts-list');
    const filterStatus = document.getElementById('filter-appt-status').value;
    if (!list) return;

    let filtered = allFetchedAppointments;
    if (filterStatus !== 'all') {
        filtered = allFetchedAppointments.filter(a => a.status === filterStatus);
    }

    list.innerHTML = '';
    if (filtered.length === 0) {
        list.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 3rem; opacity: 0.5;">Filtreye uygun randevu kaydı bulunamadı.</td></tr>';
        return;
    }
    
    filtered.forEach(a => {
        const tr = document.createElement('tr');
        const statusClass = a.status === 'Müsait' ? 'badge-active' : 'badge-leave';
        tr.innerHTML = `
            <td style="font-weight:600;">Dr. ${a.doctor_name}</td>
            <td>${a.doctor_role}</td>
            <td>${a.date}</td>
            <td>${a.time}</td>
            <td style="font-weight:500; color: ${a.patient_name === '-' ? 'rgba(255,255,255,0.3)' : '#fff'}">${a.patient_name}</td>
            <td><span class="badge ${statusClass}">${a.status}</span></td>
        `;
        list.appendChild(tr);
    });
}

async function loadMainAppointments(id) {
    if (!id) {
        document.getElementById('appt-management-area').classList.add('hidden');
        document.getElementById('appt-placeholder').classList.remove('hidden');
        return;
    }
    currentDoctorId = id;
    document.getElementById('appt-management-area').classList.remove('hidden');
    document.getElementById('appt-placeholder').classList.add('hidden');

    const res = await fetch(`/api/admin/doctors/${id}/appointments`, {
        headers: { 'x-admin-token': adminToken }
    });
    let appts = await res.json();
    const list = document.getElementById('main-appointments-list');
    
    if (appts.length === 0) {
        list.innerHTML = '<tr><td colspan="4" style="text-align:center;">Henüz randevu eklenmemiş.</td></tr>';
        return;
    }
    
    appts = appts.map((a, index) => ({ ...a, originalIndex: index }));
    appts.sort((a,b) => new Date(a.date+"T"+a.time) - new Date(b.date+"T"+b.time));
    
    list.innerHTML = '';
    appts.forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${a.date}</td>
            <td>${a.time}</td>
            <td><span class="badge ${a.status==='Müsait' ? 'badge-active' : 'badge-leave'}">${a.status}</span></td>
            <td style="text-align:right;"><button class="btn-sm btn-delete">Sil</button></td>
        `;
        tr.querySelector('.btn-delete').addEventListener('click', () => deleteMainAppointment(id, a.originalIndex));
        list.appendChild(tr);
    });
}

async function deleteMainAppointment(doctorId, index) {
    if (!confirm('Bu randevuyu silmek istediğinize emin misiniz?')) return;
    const res = await fetch(`/api/admin/doctors/${doctorId}/appointments/${index}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': adminToken }
    });
    if (res.ok) loadMainAppointments(doctorId);
}

async function addMainAppointment() {
    const date = document.getElementById('new-appt-date-main').value;
    const time = document.getElementById('new-appt-time-main').value;
    if (!date || !time) return alert("Lütfen tarih ve saat seçin.");

    const res = await fetch(`/api/admin/doctors/${currentDoctorId}/appointments`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-admin-token': adminToken 
        },
        body: JSON.stringify({ date, time, status: 'Müsait' })
    });

    if (res.ok) {
        document.getElementById('new-appt-date-main').value = '';
        document.getElementById('new-appt-time-main').value = '';
        loadMainAppointments(currentDoctorId);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Kullanıcı bilgisini göster
    const userId = localStorage.getItem('userId');
    if (userId) {
        fetch(`/api/user/${userId}`).then(res => res.json()).then(user => {
            const info = document.getElementById('header-user-name');
            if (info) info.textContent = `${user.name || user.username}`;
        });
    }

    // Menü geçişleri
    const menuDocs = document.getElementById('menu-docs');
    const menuAppts = document.getElementById('menu-appts');
    if (menuDocs) menuDocs.addEventListener('click', () => switchToSection('doctors'));
    if (menuAppts) menuAppts.addEventListener('click', () => switchToSection('appointments'));
    const menuPatientAppts = document.getElementById('menu-patient-appts');
    if (menuPatientAppts) menuPatientAppts.addEventListener('click', () => switchToSection('patient-appointments'));

    // Filtreleme
    const filterSelect = document.getElementById('filter-appt-status');
    if (filterSelect) filterSelect.addEventListener('change', renderFilteredAppointments);

    // Randevu doktor seçimi
    const select = document.getElementById('appt-doctor-select');
    if (select) select.addEventListener('change', (e) => loadMainAppointments(e.target.value));
    
    // Randevu ekleme (Main)
    const btnAddApptMain = document.getElementById('btn-add-appt-main');
    if (btnAddApptMain) btnAddApptMain.addEventListener('click', addMainAppointment);

    // Doktor Form Kayıt
    const doctorForm = document.getElementById('doctor-form');
    if (doctorForm) {
        doctorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('doctor-id').value;
            const payload = {
                name: document.getElementById('doc-name').value,
                role: document.getElementById('doc-role').value,
                status: document.getElementById('doc-status').value,
                salary: parseFloat(document.getElementById('doc-salary').value)
            };
            const url = id ? `/api/admin/doctors/${id}` : '/api/admin/doctors';
            const method = id ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) { 
                closeDoctorModal(); 
                fetchDoctors(); 
                alert(data.message); // Kullanıcı adı ve şifreyi göster
            } else {
                alert(data.message || 'Bir hata oluştu');
            }
        });
    }

    // Modal Kapatma Listenerları
    const addClick = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    addClick('btn-admin-logout', adminLogout);
    addClick('btn-add-doctor', showAddDoctorModal);
    addClick('btn-cancel-doctor', closeDoctorModal);
    addClick('btn-x-close-doctor', closeDoctorModal);
    addClick('btn-close-appt-modal', () => { /* Eğer gerekirse */ });
    addClick('btn-x-close-appt', () => { /* Eğer gerekirse */ });

    loadLocalRoles();
    fetchDoctors();
});
