const userId = localStorage.getItem('userId');

if (!userId) {
    window.location.href = '/';
}

function showAlert(message, type = 'error') {
    const alertBox = document.getElementById('alert-box');
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.className = `alert ${type}`;
    alertBox.classList.remove('hidden');
    setTimeout(() => alertBox.classList.add('hidden'), 5000);
}

function showModal(title, message) {
    const modalTitle = document.getElementById('modal-title');
    const modalMsg = document.getElementById('modal-message');
    const modal = document.getElementById('notification-modal');
    
    if (modalTitle) modalTitle.textContent = title;
    if (modalMsg) modalMsg.textContent = message;
    if (modal) modal.classList.remove('hidden');
}

function closeModal() {
    const modal = document.getElementById('notification-modal');
    if (modal) modal.classList.add('hidden');
}

function logout() {
    localStorage.removeItem('userId');
    window.location.href = '/';
}

async function loadDoctors() {
    try {
        const res = await fetch('/api/doctors/available');
        const doctors = await res.json();
        const container = document.getElementById('doctors-container');
        
        if (!container) return;

        if (doctors.length === 0) {
            container.innerHTML = '<p>Şu an aktif doktor bulunmamaktadır.</p>';
            return;
        }

        container.innerHTML = '';
        doctors.forEach(doc => {
            const card = document.createElement('div');
            card.className = 'doctor-card';
            
            let slotsHTML = '';
            if (doc.availableAppointments.length > 0) {
                const slotsContainer = document.createElement('div');
                slotsContainer.className = 'doc-slots';
                slotsContainer.innerHTML = '<h4 style="font-size: 0.9rem; margin-bottom: 8px;">Müsait Saatler:</h4>';
                
                doc.availableAppointments.forEach(slot => {
                    const btn = document.createElement('button');
                    btn.className = 'slot-btn';
                    btn.textContent = `${slot.date.split('-').reverse().join('/')} - ${slot.time}`;
                    btn.addEventListener('click', () => bookAppointment(doc.id, slot.date, slot.time));
                    slotsContainer.appendChild(btn);
                });
                slotsHTML = slotsContainer.outerHTML;
            } else {
                slotsHTML = '<p class="no-slots">Şu an uygun randevu saati bulunmamaktadır.</p>';
            }

            card.innerHTML = `
                <div class="doc-name">Dr. ${doc.name}</div>
                <div class="doc-role">${doc.role}</div>
                <div class="doc-slots">
                    <h4 style="font-size: 0.9rem; margin-bottom: 8px;">Müsait Saatler:</h4>
                    ${slotsHTML}
                </div>
            `;
            
            // Re-rendering slots correctly with listeners
            const slotsDiv = card.querySelector('.doc-slots');
            slotsDiv.innerHTML = '<h4 style="font-size: 0.9rem; margin-bottom: 8px;">Müsait Saatler:</h4>';
            if (doc.availableAppointments.length > 0) {
                doc.availableAppointments.forEach(slot => {
                    const btn = document.createElement('button');
                    btn.className = 'slot-btn';
                    btn.textContent = `${slot.date.split('-').reverse().join('/')} - ${slot.time}`;
                    btn.addEventListener('click', () => bookAppointment(doc.id, slot.date, slot.time));
                    slotsDiv.appendChild(btn);
                });
            } else {
                slotsDiv.innerHTML += '<p class="no-slots">Şu an uygun randevu saati bulunmamaktadır.</p>';
            }

            container.appendChild(card);
        });
    } catch (err) {
        showAlert('Doktorlar yüklenirken bir hata oluştu.');
    }
}

async function bookAppointment(doctorId, date, time) {
    if (!confirm(`Dr. randevunuzu ${date} tarihi ve ${time} saati için onaylıyor musunuz?`)) {
        return;
    }

    try {
        const res = await fetch('/api/appointments/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ doctorId, date, time, userId: parseInt(userId) })
        });

        const data = await res.json();

        if (res.ok) {
            showModal('Randevu Başarılı!', data.message);
            loadDoctors();
        } else {
            let msg = data.message;
            if (data.errors) msg = data.errors[0].msg;
            showAlert(msg, 'error');
        }
    } catch (err) {
        showAlert('Sunucu ile iletişim kurulamadı.');
    }
}

// Initializers
document.addEventListener('DOMContentLoaded', () => {
    const btnPanel = document.querySelector('.nav-content .outline-btn:first-child');
    const btnLogout = document.querySelector('.nav-content .outline-btn:last-child');
    const btnCloseModal = document.querySelector('#notification-modal .primary-btn');

    if (btnPanel) btnPanel.addEventListener('click', () => window.location.href = 'panel.html');
    if (btnLogout) btnLogout.addEventListener('click', logout);
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);

    loadDoctors();
});
