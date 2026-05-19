# Hospital App (Hastane Yönetim Sistemi)

Node.js, Express ve SQLite kullanılarak geliştirilmiş, hasta randevu, doktor yönetimi ve admin paneli içeren kapsamlı ve web tabanlı bir hastane yönetim sistemidir.

## 🚀 Özellikler

- **Rol Tabanlı Yetkilendirme:** Sistemde Admin, Doktor ve Hasta (Kullanıcı) olmak üzere üç farklı kullanıcı rolü bulunmaktadır.
- **Hasta Paneli:** Kullanıcılar sisteme kayıt olabilir, kişisel sağlık bilgilerini (TC, yaş, kan grubu) güncelleyebilir ve müsait doktorlardan randevu alabilir.
- **Doktor Paneli:** Doktorlar kendi profillerine giriş yapıp randevularını takip edebilir ve çalışma durumlarını güncelleyebilirler.
- **Admin Paneli (`/admin_gate.html`):** Özel bir giriş kapısına sahip admin portalı üzerinden doktor eklenebilir/silinebilir, maaş bilgileri düzenlenebilir ve sistem genelindeki hastalar yönetilebilir.
- **Güvenlik Önlemleri:** 
  - **MD5 Şifreleme:** Kullanıcı şifreleri veritabanında MD5 ile hashlenerek saklanmaktadır.
  - **Helmet.js:** Güvenli HTTP başlıkları (HTTP headers) için kullanılmaktadır.
  - **Rate Limiting:** Brute-force saldırılarına karşı giriş ve kayıt istekleri sınırlandırılmıştır.
  - **Express Validator:** Gelen verilerin doğrulanması sağlanmaktadır.

## 🛠 Kullanılan Teknolojiler

- **Backend:** Node.js, Express.js
- **Veritabanı:** SQLite3
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Güvenlik/Diğer Kütüphaneler:** `cors`, `helmet`, `express-rate-limit`, `md5`, `express-validator`

## ⚙️ Kurulum ve Çalıştırma

Projeyi kendi bilgisayarınızda çalıştırmak için aşağıdaki adımları izleyebilirsiniz:

1. **Gereksinimler:** Bilgisayarınızda [Node.js](https://nodejs.org/) yüklü olmalıdır.
2. **Bağımlılıkları Yükleyin:** Proje dizininde terminali açın ve aşağıdaki komutu çalıştırarak gerekli paketleri indirin:
   ```bash
   npm install
   ```
3. **Veritabanını ve Admin Kullanıcısını Oluşturun (İsteğe Bağlı):**
   Veritabanı tabloları sunucu başlatıldığında otomatik oluşur. Ancak başlangıç için bir admin hesabı (`seed`) eklemek isterseniz:
   ```bash
   node seed_admin.js
   ```
4. **Sunucuyu Başlatın:**
   ```bash
   npm start
   ```
   *(Alternatif olarak `node server.js` komutunu da kullanabilirsiniz.)*
5. **Uygulamaya Erişin:** Tarayıcınızı açın ve aşağıdaki adrese gidin:
   - **Ana Sayfa (Giriş/Kayıt):** `http://localhost:3000`
   - **Admin Girişi:** `http://localhost:3000/admin_gate.html`

## 📂 Proje Yapısı

- `server.js`: Uygulamanın ana giriş noktası ve API yönlendirmeleri.
- `database.js`: SQLite veritabanı bağlantısı ve tablo şemalarının oluşturulması.
- `public/`: Frontend dosyaları (HTML, CSS, JS).
  - `index.html`: Sistemin ana giriş/kayıt sayfası.
  - `panel.html` / `app.js`: Hasta kullanıcı paneli.
  - `appointments.html` / `appointments_script.js`: Randevu alma modülü.
  - `admin_portal_7x2.html` / `admin_portal_script.js`: Yönetici paneli.
  - `doctor_portal.html`: Doktor arayüzü.
  - `style.css`: Temel tasarım dosyası.
