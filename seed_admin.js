const db = require('./database');
const md5 = require('md5');

const username = 'admin';
const password = 'Kingsman';
const hashedPassword = md5(password);

db.serialize(() => {
    // Önce kullanıcıyı eklemeyi deneyelim (Normal kullanıcı olarak da sisteme girebilsin diye)
    db.run("INSERT OR IGNORE INTO users (username, password, name, role) VALUES (?, ?, ?, ?)", [username, hashedPassword, 'Sistem Yöneticisi', 'admin'], function(err) {
        if (err) {
            console.error('Hata:', err.message);
        } else {
            console.log(`Kullanıcı '${username}' veritabanına eklendi (Admin yetkisiyle).`);
        }
    });

    console.log("\n--- Admin Bilgileri ---");
    console.log(`Kullanıcı Adı: ${username}`);
    console.log(`Şifre: ${password}`);
    console.log("-----------------------\n");
});
