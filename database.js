const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function iniciarBanco() {

    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS reservas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            salaId INTEGER,
            emailResponsavel TEXT,
            inicio DATETIME,
            fim DATETIME,
            googleEventId TEXT,
            status TEXT
        )
    `);

    return db;
}

module.exports = iniciarBanco;