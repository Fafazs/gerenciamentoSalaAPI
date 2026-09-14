class SalaModel {
    static async listarTodas(db) {
        return await db.all('SELECT * FROM salas ORDER BY id ASC');
    }

    static async buscarPorId(db, id) {
        return await db.get('SELECT * FROM salas WHERE id = ?', [Number(id)]);
    }

    static async criar(db, { nome, capacidade }) {
        const resultado = await db.run(
            'INSERT INTO salas (nome, capacidade) VALUES (?, ?)',
            [nome, Number(capacidade)]
        );
        return resultado.lastID;
    }

    static async deletar(db, id) {
        const resultado = await db.run('DELETE FROM salas WHERE id = ?', [Number(id)]);
        return resultado.changes; // Retorna o número de linhas removidas instantaneamente
    }
}

module.exports = SalaModel;