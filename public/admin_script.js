document.addEventListener('DOMContentLoaded', () => {
    const adminForm = document.getElementById('admin-login-form');
    if (adminForm) {
        adminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('admin-user').value;
            const password = document.getElementById('admin-pass').value;
            const alertBox = document.getElementById('admin-alert');

            try {
                const res = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();

                if (res.ok) {
                    localStorage.setItem('adminToken', data.adminToken);
                    window.location.href = 'admin_portal_7x2.html';
                } else {
                    alertBox.textContent = data.message;
                    alertBox.className = 'alert error';
                    alertBox.classList.remove('hidden');
                }
            } catch (err) {
                alertBox.textContent = 'Sunucu hatası!';
                alertBox.className = 'alert error';
                alertBox.classList.remove('hidden');
            }
        });
    }
});
