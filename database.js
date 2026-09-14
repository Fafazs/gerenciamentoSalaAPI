const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function iniciarBanco() {
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    // Tabela de Salas
    await db.exec(`
        CREATE TABLE IF NOT EXISTS salas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            capacidade INTEGER
        )
    `);

    // Tabela de Reservas
    await db.exec(`
        CREATE TABLE IF NOT EXISTS reservas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            salaId INTEGER NOT NULL,
            emailResponsavel TEXT NOT NULL,
            inicio DATETIME NOT NULL,
            fim DATETIME NOT NULL,
            googleEventId TEXT,
            status TEXT DEFAULT 'PENDENTE',
            FOREIGN KEY(salaId) REFERENCES salas(id)
        )
    `);

    // Inserção rápida de salas para testes (Mock)
    const count = await db.get('SELECT COUNT(*) as total FROM salas');
    if (count.total === 0) {
        await db.exec(`
            INSERT INTO salas (nome, capacidade) VALUES 
            ('Sala 101 - Laboratório', 30),
            ('Sala 102 - Reunião', 10)
        `);
        console.log('📦 Salas de teste criadas no banco.');
    }

    return db;
}

module.exports = iniciarBanco;