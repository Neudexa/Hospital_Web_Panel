const express = require('express');
const path = require('path');
const cors = require('cors');
const md5 = require('md5');
// const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const db = require('./database');

const app = express();
const PORT = 3000;

// Siber Güvenlik ve Koruma Kuralları - Ödev projesi olduğu için basitleştirildi
// app.use(helmet()); 
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Brute-force saldırılarına karşı oran sınırlama (Rate Limiting)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 10, // 15 dakikada en fazla 10 deneme
    message: 'Bu IP adresinden çok fazla giriş denemesi yapıldı, lütfen 15 dakika sonra tekrar deneyin.'
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 saat
    max: 5, // 1 saatte en fazla 5 kayıt
    message: 'Bu IP adresinden çok fazla hesap oluşturuldu, lütfen bir saat sonra tekrar deneyin.'
});

// Kayıt Olma Endpoint'i
app.post("/api/register", [
    body("name").trim().notEmpty().withMessage("Ad Soyad gereklidir.").escape(),
    body("username").isLength({ min: 4, max: 20 }).withMessage("Kullanıcı adı 4 ile 20 karakter arasında olmalıdır.").trim().escape(),
    body("password").isLength({ min: 6 }).withMessage("Şifre en az 6 karakter olmalıdır.").trim().escape()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, username, password, role } = req.body;
    const userRole = role || "user";
    const hashedPassword = md5(password);

    const stmt = db.prepare("INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)");
    stmt.run([name, username, hashedPassword, userRole], function(err) {
        if (err) {
            if (err.message.includes("UNIQUE constraint failed")) {
                return res.status(400).json({ message: "Bu kullanıcı adı zaten alınmış." });
            }
            return res.status(500).json({ message: "Sistem hatası." });
        }
        res.status(201).json({ message: 'Kayıt başarılı!', userId: this.lastID });
    });
});

// Giriş için Ara Fonksiyon (Direct DB erişimini engeller)
function authenticateUser(username, password, callback) {
    // Gelen şifreyi MD5 ile hashliyoruz
    const hashedPassword = md5(password);

    // Parametreli sorgu ile DB erişimi
    db.get("SELECT id, username, role FROM users WHERE username = ? AND password = ?", [username, hashedPassword], (err, row) => {
        if (err) {
            return callback(err, null);
        }
        if (row) {
            return callback(null, row); // Başarılı
        } else {
            return callback(null, null); // Bulunamadı veya yanlış şifre
        }
    });
}

// Giriş Yapma Endpoint'i
app.post('/api/login', [
    // İç kısıtlamalar
    body('username').notEmpty().withMessage('Kullanıcı adı zorunludur.').trim().escape(),
    body('password').notEmpty().withMessage('Şifre zorunludur.').trim().escape()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Ara fonksiyonu kullanarak güvenliği artırıyoruz
    authenticateUser(username, password, (err, user) => {
        if (err) {
            console.error("Login DB Error:", err);
            return res.status(500).json({ message: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.' });
        }
        
        if (user) {
            res.status(200).json({ message: 'Giriş başarılı!', userId: user.id, role: user.role, username: user.username });
        } else {
            res.status(401).json({ message: 'Hatalı kullanıcı adı veya şifre.' });
        }
    });
});

// Kullanıcı Bilgilerini Getirme
app.get('/api/user/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    db.get("SELECT id, username, tc, name, surname, age, blood_group, email, email_verified FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ message: 'Veritabanı hatası.' });
        }
        if (row) {
            res.status(200).json(row);
        } else {
            res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }
    });
});

// Kullanıcı Bilgilerini Güncelleme
app.put('/api/user/:id', [
    body('tc').optional({ checkFalsy: true }).isLength({ min: 11, max: 11 }).withMessage('TC Kimlik No 11 haneli olmalıdır.').isNumeric().withMessage('TC Kimlik No sadece rakamlardan oluşmalıdır.').trim().escape(),
    body('name').optional({ checkFalsy: true }).trim().escape(),
    body('surname').optional({ checkFalsy: true }).trim().escape(),
    body('age').optional({ checkFalsy: true }).isInt({ min: 0, max: 150 }).withMessage('Geçerli bir yaş giriniz.').toInt(),
    body('blood_group').optional({ checkFalsy: true }).trim().escape(),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Geçerli bir e-posta adresi giriniz.').normalizeEmail()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const userId = parseInt(req.params.id);
    const { tc, name, surname, age, blood_group, email } = req.body;

    // Önce kullanıcının mevcut e-postasını kontrol edelim
    db.get("SELECT email FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) return res.status(500).json({ message: 'Veritabanı hatası.' });

        // Eğer e-posta değiştiyse, email_verified = 0 yap
        const currentEmail = row ? row.email : null;
        let setVerifiedToZero = false;
        if (email && email !== currentEmail) {
            setVerifiedToZero = true;
        }

        let query = "UPDATE users SET tc = ?, name = ?, surname = ?, age = ?, blood_group = ?, email = ?";
        let params = [tc, name, surname, age, blood_group, email];

        if (setVerifiedToZero) {
            query += ", email_verified = 0";
        }
        
        query += " WHERE id = ?";
        params.push(userId);

        const stmt = db.prepare(query);
        stmt.run(params, function(err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Veritabanı güncellenirken hata oluştu.' });
            }
            res.status(200).json({ message: 'Bilgiler başarıyla güncellendi.', emailChanged: setVerifiedToZero });
        });
        stmt.finalize();
    });
});


// E-Posta Doğrulama İsteği Gönderme
app.post('/api/user/:id/verify-email', (req, res) => {
    // Burada e-posta gönderme işlemi simüle ediliyor.
    res.status(200).json({ message: 'Doğrulama e-postası mail adresinize gönderilmiştir.' });
});

// E-Posta Doğrulama Tıklaması (Simülasyon için özel endpoint)
app.get('/api/user/:id/simulate-email-click', (req, res) => {
    const userId = parseInt(req.params.id);
    db.run("UPDATE users SET email_verified = 1 WHERE id = ?", [userId], function(err) {
        if (err) {
            return res.status(500).send("Hata oluştu.");
        }
        res.send("<h1>E-posta adresiniz başarıyla doğrulandı!</h1><p>Şimdi sekmeyi kapatıp kullanıcı panelinize dönebilirsiniz.</p>");
    });
});

// --- ADMIN İŞLEMLERİ ---

// Admin Giriş (Güvenlik için özel kısıtlamalı endpoint)
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    // İstediğin sabit bilgiler
    if (username === 'admin' && password === 'Kingsman') {
        // Basit bir admin token'ı dönüyoruz (Demo amaçlı)
        res.status(200).json({ message: 'Admin girişi başarılı!', adminToken: 'secret_admin_token_2024' });
    } else {
        res.status(401).json({ message: 'Yetkisiz erişim denemesi tespit edildi!' });
    }
});

// Admin yetki kontrol middleware'i
const adminAuth = (req, res, next) => {
    const token = req.headers['x-admin-token'];
    if (token === 'secret_admin_token_2024') {
        next();
    } else {
        res.status(403).json({ message: 'Bu işlem için admin yetkisi gereklidir.' });
    }
};

// Tüm doktorları getir
app.get('/api/admin/doctors', adminAuth, (req, res) => {
    db.all("SELECT * FROM doctors", [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Veritabanı hatası.' });
        res.json(rows);
    });
});

// Yeni doktor ekle
app.post('/api/admin/doctors', adminAuth, [
    body('name').notEmpty().trim().escape(),
    body('role').notEmpty().trim().escape(),
    body('status').notEmpty().trim().escape(),
    body('salary').isNumeric(),
], (req, res) => {
    const { name, role, status, salary } = req.body;
    
    // Önce doktoru ekleyelim
    db.run("INSERT INTO doctors (name, role, status, salary, appointments) VALUES (?, ?, ?, ?, ?)", 
    [name, role, status, salary, '[]'], function(err) {
        if (err) return res.status(500).json({ message: 'Doktor eklenemedi.' });
        
        const doctorId = this.lastID;
        
        // Şimdi bu doktor için bir kullanıcı hesabı oluşturalım (Giriş yapabilmesi için)
        const username = name.toLowerCase().replace(/\s/g, '') + doctorId;
        const defaultPassword = md5("Doktor123"); // Varsayılan şifre
        
        db.run("INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)", 
        [username, defaultPassword, name, 'doctor'], (userErr) => {
            if (userErr) {
                console.error("Doktor için kullanıcı hesabı oluşturulamadı:", userErr);
                // Doktoru ekledik ama kullanıcı hesabı hatası aldık, devam edebiliriz ama bilgi vermek lazım
                return res.status(201).json({ 
                    message: 'Doktor eklendi ancak kullanıcı hesabı oluşturulamadı.', 
                    id: doctorId 
                });
            }
            
            res.status(201).json({ 
                message: `Doktor başarıyla eklendi.\nKullanıcı Adı: ${username}\nŞifre: Doktor123`, 
                id: doctorId 
                // Önemli: Gerçek projede şifre böyle açık gönderilmez, bu bir ödev projesi olduğu için kolaylık sağlıyoruz.
            });
        });
    });
});

// Doktor güncelle
app.put('/api/admin/doctors/:id', adminAuth, (req, res) => {
    const { name, role, status, salary } = req.body;
    const id = req.params.id;
    db.run("UPDATE doctors SET name = ?, role = ?, status = ?, salary = ? WHERE id = ?", [name, role, status, salary, id], function(err) {
        if (err) return res.status(500).json({ message: 'Güncelleme hatası.' });
        res.json({ message: 'Doktor bilgileri güncellendi.' });
    });
});

// Doktor sil
app.delete('/api/admin/doctors/:id', adminAuth, (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM doctors WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ message: 'Silme hatası.' });
        res.json({ message: 'Doktor kaydı silindi.' });
    });
});

// Doktor randevularını getir
app.get('/api/admin/doctors/:id/appointments', adminAuth, (req, res) => {
    const id = req.params.id;
    db.get("SELECT appointments FROM doctors WHERE id = ?", [id], (err, row) => {
        if (err || !row) return res.status(500).json({ message: 'Hata oluştu.' });
        res.json(JSON.parse(row.appointments || '[]'));
    });
});

// Doktor randevusu/müsaitliği ekle
app.post('/api/admin/doctors/:id/appointments', adminAuth, (req, res) => {
    const id = req.params.id;
    const { date, time, status } = req.body; 
    db.get("SELECT appointments FROM doctors WHERE id = ?", [id], (err, row) => {
        if (err || !row) return res.status(500).json({ message: 'Hata oluştu.' });
        
        let appointments = [];
        try {
            appointments = JSON.parse(row.appointments || '[]');
        } catch(e) {}
        
        appointments.push({ date, time, status: status || 'Müsait' });
        
        db.run("UPDATE doctors SET appointments = ? WHERE id = ?", [JSON.stringify(appointments), id], (err) => {
            if (err) return res.status(500).json({ message: 'Randevu kaydedilemedi.' });
            res.json({ message: 'Randevu / Müsaitlik başarıyla eklendi.', appointments });
        });
    });
});

// Doktor randevusu sil
app.delete('/api/admin/doctors/:id/appointments/:index', adminAuth, (req, res) => {
    const { id, index } = req.params;
    db.get("SELECT appointments FROM doctors WHERE id = ?", [id], (err, row) => {
        if (err || !row) return res.status(500).json({ message: 'Hata oluştu.' });
        
        let appointments = JSON.parse(row.appointments || '[]');
        appointments.splice(index, 1);
        
        db.run("UPDATE doctors SET appointments = ? WHERE id = ?", [JSON.stringify(appointments), id], (err) => {
            if (err) return res.status(500).json({ message: 'Randevu silinemedi.' });
            res.json({ message: 'Randevu silindi.' });
        });
    });
});

// Şifre Değiştirme (Simülasyon)
app.post('/api/user/:id/change-password', (req, res) => {
    res.status(200).json({ message: 'Şifre sıfırlama bağlantısı kayıtlı e-posta adresinize gönderilmiştir.' });
});

// --- KULLANICI RANDEVU İŞLEMLERİ ---

// Aktif Doktorları ve Müsait Randevularını Getirme
app.get('/api/doctors/available', (req, res) => {
    db.all("SELECT id, name, role, appointments FROM doctors WHERE status = 'Aktif'", [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Veritabanı hatası.' });
        
        const doctors = rows.map(doc => {
            let appts = [];
            try { appts = JSON.parse(doc.appointments || '[]'); } catch(e) {}
            // Sadece müsait olanları göster
            const availableAppts = appts.filter(a => a.status === 'Müsait');
            // En yakın tarihe göre sırala
            availableAppts.sort((a,b) => new Date(a.date+"T"+a.time) - new Date(b.date+"T"+b.time));
            
            return {
                id: doc.id,
                name: doc.name,
                role: doc.role,
                availableAppointments: availableAppts
            };
        });
        
        res.json(doctors);
    });
});

// Randevu Al
app.post('/api/appointments/book', [
    body('doctorId').isInt(),
    body('date').notEmpty().trim().escape(),
    body('time').notEmpty().trim().escape(),
    body('userId').isInt()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { doctorId, date, time, userId } = req.body;

    // Randevuyu alacak kişinin bilgilerini çekiyoruz
    db.get("SELECT name, surname FROM users WHERE id = ?", [userId], (err, user) => {
        if (err || !user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        
        const patientName = user.name || user.username || 'İsimsiz Kullanıcı';

        // Doktoru bul ve randevu müsaitse 'Dolu' yap
        db.get("SELECT appointments FROM doctors WHERE id = ?", [doctorId], (err, doc) => {
            if (err || !doc) return res.status(404).json({ message: 'Doktor bulunamadı.' });

            let appts = [];
            try { appts = JSON.parse(doc.appointments || '[]'); } catch(e) {}

            // Aynı doktordan zaten randevusu var mı kontrol et
            const alreadyHas = appts.some(a => (a.patient_id === userId || a.patientId === userId) && a.status === 'Dolu');
            if (alreadyHas) {
                return res.status(400).json({ message: 'Bu doktordan zaten aktif bir randevunuz bulunuyor. Yeni bir randevu almak için önce mevcut randevunuzu iptal etmelisiniz.' });
            }

            let found = false;
            for (let i = 0; i < appts.length; i++) {
                if (appts[i].date === date && appts[i].time === time && appts[i].status === 'Müsait') {
                    appts[i].status = 'Dolu';
                    appts[i].patient_id = userId;
                    appts[i].patient_name = patientName;
                    found = true;
                    break;
                }
            }

            if (!found) {
                return res.status(400).json({ message: 'Bu randevu saati artık müsait değil. Lütfen başka bir saat seçin.' });
            }

            db.run("UPDATE doctors SET appointments = ? WHERE id = ?", [JSON.stringify(appts), doctorId], (err) => {
                if (err) return res.status(500).json({ message: 'Randevu kaydedilirken veritabanı hatası.' });
                res.json({ message: 'Randevunuz başarıyla oluşturuldu! Geçmiş olsun.' });
            });
        });
    });
});

// --- DOKTOR PORTAL API ---
app.get('/api/doctor/appointments/:userId', (req, res) => {
    const userId = req.params.userId;
    // Kullanıcıyı bulup ismini alalım
    db.get("SELECT name FROM users WHERE id = ?", [userId], (err, user) => {
        if (err || !user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });
        
        // Doktor tablosunda bu isme sahip doktoru bulalım
        db.get("SELECT appointments FROM doctors WHERE name = ?", [user.name], (err, doctor) => {
            if (err || !doctor) return res.status(404).json({ error: "Doktor kaydı bulunamadı" });
            res.json(JSON.parse(doctor.appointments || '[]'));
        });
    });
});

// Tüm doktorların tüm randevularını getir (Admin için)
app.get('/api/admin/all-appointments', (req, res) => {
    const token = req.headers['x-admin-token'];
    if (token !== 'secret_admin_token_2024') return res.status(403).json({ message: 'Yetkisiz erişim.' });

    db.all("SELECT id, name, role, appointments FROM doctors", [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Veritabanı hatası.' });
        let allAppts = [];
        rows.forEach(doc => {
            let appts = [];
            try {
                appts = JSON.parse(doc.appointments || '[]');
            } catch(e) { console.error(e); }
            
            appts.forEach(a => {
                allAppts.push({
                    doctor_id: doc.id,
                    doctor_name: doc.name,
                    doctor_role: doc.role,
                    date: a.date,
                    time: a.time,
                    status: a.status,
                    patient_name: a.patient_name || '-'
                });
            });
        });
        // Tarihe göre sırala
        allAppts.sort((a,b) => new Date(a.date+"T"+a.time) - new Date(b.date+"T"+b.time));
        res.json(allAppts);
    });
});

// --- HASTA (USER) PORTAL API ---
app.get('/api/user/appointments/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    db.all("SELECT id, name, appointments FROM doctors", [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Veritabanı hatası.' });
        let userAppts = [];
        rows.forEach(doc => {
            let appts = [];
            try {
                appts = JSON.parse(doc.appointments || '[]');
            } catch(e) {
                console.error("JSON parse error for doctor:", doc.id);
            }
            appts.forEach(a => {
                const pId = a.patient_id || a.patientId;
                if (pId && parseInt(pId) === userId) {
                    userAppts.push({
                        doctor_id: doc.id,
                        doctor_name: doc.name,
                        date: a.date,
                        time: a.time,
                        status: a.status
                    });
                }
            });
        });
        res.json(userAppts);
    });
});

// Doktorun kendi randevularını güncellemesi
app.post('/api/doctor/appointments/save/:userId', (req, res) => {
    const userId = req.params.userId;
    const { appointments } = req.body;
    
    // Önce doktorun ismini bulalım
    db.get("SELECT name FROM users WHERE id = ?", [userId], (err, user) => {
        if (err || !user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });
        
        // Doktor tablosunda bu isme sahip doktoru güncelleyelim
        db.run("UPDATE doctors SET appointments = ? WHERE name = ?", [JSON.stringify(appointments), user.name], (updateErr) => {
            if (updateErr) return res.status(500).json({ error: "Güncelleme hatası" });
            res.json({ message: "Randevu takviminiz başarıyla güncellendi." });
        });
    });
});

// Doktor Tarafından Hasta Ekleme
app.post('/api/doctor/add-patient', (req, res) => {
    const { name, username, password, tc } = req.body;
    const hashedPassword = md5(password);
    const role = 'user';

    db.run("INSERT INTO users (username, password, role, name, tc) VALUES (?, ?, ?, ?, ?)",
        [username, hashedPassword, role, name, tc],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: "Bu kullanıcı adı zaten alınmış!" });
                }
                return res.status(500).json({ error: "Hasta kaydı sırasında hata oluştu." });
            }
            res.json({ message: "Hasta başarıyla kaydedildi.", id: this.lastID });
        }
    );
});

// Kayıtlı Hastaları Listele
app.get('/api/doctor/patients', (req, res) => {
    db.all("SELECT id, name, username, tc FROM users WHERE role = 'user' ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: "Listeleme hatası" });
        res.json(rows);
    });
});

// Randevu İptal Etme (Hasta Tarafından)
app.post('/api/user/appointments/cancel', (req, res) => {
    const { userId, doctorId, date, time } = req.body;
    
    db.get("SELECT appointments FROM doctors WHERE id = ?", [doctorId], (err, doc) => {
        if (err || !doc) return res.status(404).json({ error: "Doktor bulunamadı" });
        
        let appts = [];
        try { appts = JSON.parse(doc.appointments || '[]'); } catch(e) {}
        
        let found = false;
        for (let i = 0; i < appts.length; i++) {
            const pId = appts[i].patient_id || appts[i].patientId;
            if (appts[i].date === date && appts[i].time === time && parseInt(pId) === parseInt(userId)) {
                appts[i].status = 'Müsait';
                appts[i].patient_id = null;
                appts[i].patient_name = null;
                appts[i].patientId = null;
                appts[i].patientName = null;
                found = true;
                break;
            }
        }
        
        if (!found) return res.status(400).json({ error: "İptal edilecek randevu bulunamadı" });
        
        db.run("UPDATE doctors SET appointments = ? WHERE id = ?", [JSON.stringify(appts), doctorId], (updateErr) => {
            if (updateErr) return res.status(500).json({ error: "İptal işlemi başarısız" });
            res.json({ message: "Randevunuz başarıyla iptal edildi." });
        });
    });
});

// Profil Güncelleme
app.post('/api/user/update/:userId', (req, res) => {
    const userId = req.params.userId;
    const { name, tc, age, blood_group, email } = req.body;
    db.run("UPDATE users SET name = ?, tc = ?, age = ?, blood_group = ?, email = ? WHERE id = ?", 
    [name, tc, age, blood_group, email, userId], (err) => {
        if (err) return res.status(500).json({ error: "Güncelleme hatası" });
        res.json({ message: "Profil bilgileriniz başarıyla güncellendi." });
    });
});

// Şifre Değiştirme
app.post('/api/user/change-password/:userId', (req, res) => {
    const userId = req.params.userId;
    const { oldPassword, newPassword } = req.body;
    
    // Önce eski şifreyi kontrol edelim
    db.get("SELECT password FROM users WHERE id = ?", [userId], (err, user) => {
        if (err || !user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });
        
        if (user.password !== md5(oldPassword)) {
            return res.status(400).json({ error: "Eski şifre hatalı!" });
        }
        
        // Şifre doğruysa yenisiyle güncelleyelim
        const hashedPass = md5(newPassword);
        db.run("UPDATE users SET password = ? WHERE id = ?", [hashedPass, userId], (updateErr) => {
            if (updateErr) return res.status(500).json({ error: "Şifre değiştirilemedi" });
            res.json({ message: "Şifre başarıyla güncellendi." });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor.`);
});

// Bilinmeyen route'lar için index.html döndür (SPA mantığı)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
