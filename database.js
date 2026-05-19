const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user', -- 'admin', 'user', 'doctor'
            tc TEXT,
            name TEXT,
            surname TEXT,
            age INTEGER,
            blood_group TEXT,
            email TEXT,
            email_verified INTEGER DEFAULT 0
        )`, (err) => {
            if (err) {
                console.error('Error creating table', err.message);
            } else {
                // Eğer tablo önceden oluşturulmuşsa kolonları eklemeyi dene
                db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`, () => {});
                db.run(`ALTER TABLE users ADD COLUMN email TEXT`, () => {});
                db.run(`ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0`, () => {});
            }
        });

        // Doktorlar tablosu
        db.run(`CREATE TABLE IF NOT EXISTS doctors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            status TEXT NOT NULL,
            salary REAL NOT NULL,
            appointments TEXT DEFAULT '[]'
        )`, (err) => {
            if (err) {
                console.error('Error creating doctors table', err.message);
            }
        });
    }
});

module.exports = db;
