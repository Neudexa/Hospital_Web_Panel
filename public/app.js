const API_URL = '/api';

// --- UI Helpers ---
function showAlert(message, type = 'error') {
    const alertBox = document.getElementById('alert-box');
    if (!alertBox) return;
    
    alertBox.textContent = message;
    alertBox.className = `alert ${type}`;
    alertBox.classList.remove('hidden');

    setTimeout(() => {
        alertBox.classList.add('hidden');
    }, 5000);
}

function showModal(title, message) {
    const modal = document.getElementById('notification-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('notification-modal').classList.add('hidden');
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));

    const tabEl = document.getElementById(`tab-${tab}`);
    const formEl = document.getElementById(`${tab}-form`);
    
    if (tabEl) tabEl.classList.add('active');
    if (formEl) formEl.classList.add('active');
}

// Tab Olay Dinleyicileri
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
if (tabLogin) tabLogin.addEventListener('click', () => switchTab('login'));
if (tabRegister) tabRegister.addEventListener('click', () => switchTab('register'));

// --- Auth logic (Login/Register) ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('userRole', data.role);
                
                // Role göre yönlendirme
                if (data.role === 'admin') {
                    localStorage.setItem('adminToken', 'secret_admin_token_2024'); // Demo için
                    window.location.href = '/admin_portal_7x2.html';
                } else if (data.role === 'doctor') {
                    window.location.href = '/doctor_portal.html';
                } else {
                    window.location.href = '/panel.html';
                }
            } else {
                let msg = data.message;
                if (data.errors) msg = data.errors[0].msg;
                showAlert(msg, 'error');
            }
        } catch (error) {
            showAlert('Sunucuya bağlanılamadı.', 'error');
        }
    });
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const role = document.getElementById('register-role').value;

        try {
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: document.getElementById("register-name").value, username, password, role })
            });
            const data = await res.json();

            if (res.ok) {
                showAlert(data.message, 'success');
                setTimeout(() => switchTab('login'), 2000);
            } else {
                let msg = data.message;
                if (data.errors) msg = data.errors[0].msg;
                showAlert(msg, 'error');
            }
        } catch (error) {
            showAlert('Sunucuya bağlanılamadı.', 'error');
        }
    });
}

// --- User Panel Logic ---
async function fetchUserProfile(userId) {
    try {
        const res = await fetch(`${API_URL}/user/${userId}`);
        const data = await res.json();

        if (res.ok) {
            document.getElementById('username').value = data.username || '';
            document.getElementById('tc').value = data.tc || '';
            document.getElementById('name').value = data.name || '';
            document.getElementById('surname').value = data.surname || '';
            document.getElementById('age').value = data.age || '';
            document.getElementById('blood_group').value = data.blood_group || '';
            document.getElementById('email').value = data.email || '';
            
            updateEmailUI(data.email, data.email_verified);
        } else {
            logout(); // If user not found, logout
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
    }
}

const profileForm = document.getElementById('profile-form');
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = localStorage.getItem('userId');
        
        const payload = {
            tc: document.getElementById('tc').value,
            name: document.getElementById('name').value,
            surname: document.getElementById('surname').value,
            age: document.getElementById('age').value,
            blood_group: document.getElementById('blood_group').value,
            email: document.getElementById('email').value
        };

        try {
            const res = await fetch(`${API_URL}/user/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok) {
                showAlert(data.message, 'success');
                fetchUserProfile(userId); // Yeni bilgileri ve e-posta durumunu yansıtmak için tekrar çek
            } else {
                let msg = data.message;
                if (data.errors) msg = data.errors[0].msg;
                showAlert(msg, 'error');
            }
        } catch (error) {
            showAlert('Güncelleme sırasında bir hata oluştu.', 'error');
        }
    });
}

async function requestPasswordChange() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
        const res = await fetch(`${API_URL}/user/${userId}/change-password`, {
            method: 'POST'
        });
        const data = await res.json();

        if (res.ok) {
            showModal('Şifre Değiştirme', data.message);
        } else {
            showAlert('Şifre değiştirme talebi başarısız oldu.', 'error');
        }
    } catch (error) {
        showAlert('Sunucuya bağlanılamadı.', 'error');
    }
}

function logout() {
    localStorage.removeItem('userId');
    window.location.href = '/';
}

function updateEmailUI(email, isVerified) {
    const btnChangePwd = document.getElementById('btn-change-password');
    const btnVerify = document.getElementById('btn-verify-email');
    const statusText = document.getElementById('email-status-text');

    if (!email) {
        // No email
        btnChangePwd.disabled = true;
        btnChangePwd.style.opacity = '0.5';
        btnChangePwd.style.cursor = 'not-allowed';
        
        btnVerify.classList.add('hidden');
        statusText.textContent = '';
    } else {
        if (isVerified) {
            // Email verified
            btnChangePwd.disabled = false;
            btnChangePwd.style.opacity = '1';
            btnChangePwd.style.cursor = 'pointer';
            
            btnVerify.classList.add('hidden');
            statusText.textContent = '(Doğrulandı)';
            statusText.style.color = 'var(--success)';
        } else {
            // Email not verified
            btnChangePwd.disabled = true;
            btnChangePwd.style.opacity = '0.5';
            btnChangePwd.style.cursor = 'not-allowed';
            
            btnVerify.classList.remove('hidden');
            statusText.textContent = '(Doğrulanmadı)';
            statusText.style.color = 'var(--error)';
        }
    }
}

// Sayfa Bazlı İlkleme
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const userId = localStorage.getItem('userId');

    // Panel sayfası kontrolü
    if (path.includes('panel.html')) {
        if (!userId) {
            window.location.href = '/';
            return;
        }
        fetchUserProfile(userId);

        // Panel Olay Dinleyicileri
        const btnVerify = document.getElementById('btn-verify-email');
        const btnChangePwd = document.getElementById('btn-change-password');
        const btnCloseModal = document.querySelector('#notification-modal .primary-btn');
        const btnLogout = document.querySelector('.nav-content .outline-btn');
        const btnGoAppointments = document.querySelector('.nav-content .primary-btn');

        if (btnVerify) btnVerify.addEventListener('click', verifyEmail);
        if (btnChangePwd) btnChangePwd.addEventListener('click', requestPasswordChange);
        if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
        if (btnLogout) btnLogout.addEventListener('click', logout);
        if (btnGoAppointments) btnGoAppointments.addEventListener('click', () => window.location.href = 'appointments.html');
    }

    // Index sayfası kontrolü (Zaten listener'lar yukarıda ama DOMContentLoaded içinde olmaları daha güvenli)
    if (path === '/' || path.includes('index.html')) {
        // Listener'lar zaten global scope'ta ama burada da kontrol edilebilir
    }
});

async function loadUserAppointments() {
    const userId = localStorage.getItem('userId');
    const list = document.getElementById('user-appointments-list');
    if (!userId || !list) return;

    try {
        const res = await fetch(`${API_URL}/user/appointments/${userId}`);
        const appts = await res.json();
        
        if (appts.length === 0) {
            list.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; opacity: 0.5;">Henüz bir randevunuz bulunmamaktadır.</td></tr>';
            return;
        }

        list.innerHTML = '';
        appts.forEach(a => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            tr.innerHTML = `
                <td style="padding: 12px;">Dr. ${a.doctor_name}</td>
                <td style="padding: 12px;">${a.date}</td>
                <td style="padding: 12px;">${a.time}</td>
                <td style="padding: 12px;"><span style="color: #10b981; font-size: 0.8rem; font-weight: 600;">${a.status}</span></td>
            `;
            list.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}

// Sayfa yüklendiğinde çalıştır
if (window.location.pathname.includes('panel.html')) {
    loadUserAppointments();
}

async function verifyEmail() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
        const res = await fetch(`${API_URL}/user/${userId}/verify-email`, {
            method: 'POST'
        });
        const data = await res.json();

        if (res.ok) {
            showModal('E-Posta Doğrulama', data.message + ' (Simülasyon için backend linkini kullanabilirsiniz: /api/user/'+userId+'/simulate-email-click)');
        } else {
            showAlert('E-posta doğrulama talebi başarısız oldu.', 'error');
        }
    } catch (error) {
        showAlert('Sunucuya bağlanılamadı.', 'error');
    }
}
