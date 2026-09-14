class ReservaModel {
    static async buscarPorId(db, id) {
        return await db.get('SELECT * FROM reservas WHERE id = ?', [Number(id)]);
    }

    static async verificarConflito(db, salaId, inicio, fim, reservaIdIgnorar = null) {
        try {
            const isoInicio = new Date(inicio).toISOString();
            const isoFim = new Date(fim).toISOString();

            let query = `
                SELECT id FROM reservas 
                WHERE salaId = ? 
                  AND status != 'CANCELADO'
                  AND inicio < ? 
                  AND fim > ?
            `;
            
            const params = [Number(salaId), isoFim, isoInicio];

            if (reservaIdIgnorar) {
                query += ` AND id != ?`;
                params.push(Number(reservaIdIgnorar));
            }

            query += ` LIMIT 1`;

            const resultado = await db.get(query, params);
            return !!resultado;
        } catch (erro) {
            console.error("Erro ao verificar conflito no banco:", erro.message);
            throw erro;
        }
    }

    static async criar(db, { salaId, emailResponsavel, inicio, fim, status = 'PENDENTE' }) {
        const resultado = await db.run(`
            INSERT INTO reservas (salaId, emailResponsavel, inicio, fim, status)
            VALUES (?, ?, ?, ?, ?)
        `, [Number(salaId), emailResponsavel, inicio, fim, status]);
        return resultado.lastID;
    }

    static async confirmarComGoogle(db, id, googleEventId) {
        const resultado = await db.run(`
            UPDATE reservas 
            SET googleEventId = ?, status = 'CONFIRMADO' 
            WHERE id = ?
        `, [googleEventId, Number(id)]);
        return resultado.changes;
    }

    static async atualizar(db, id, { salaId, inicio, fim }) {
        const resultado = await db.run(`
            UPDATE reservas 
            SET salaId = ?, inicio = ?, fim = ? 
            WHERE id = ?
        `, [Number(salaId), inicio, fim, Number(id)]);
        return resultado.changes;
    }

    static async deletar(db, id) {
        const resultado = await db.run(`DELETE FROM reservas WHERE id = ?`, [Number(id)]);
        return resultado.changes; // Retorna a quantidade de linhas removidas instantaneamente
    }

    static async cancelar(db, id) {
        const resultado = await db.run(`UPDATE reservas SET status = 'CANCELADO' WHERE id = ?`, [Number(id)]);
        return resultado.changes; // Retorna a quantidade de linhas atualizadas
    }

    static async listarDisponibilidade30Dias(db) {
        const hoje = new Date().toISOString();
        const limite = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        return await db.all(`
            SELECT r.*, s.nome as nomeSala 
            FROM reservas r
            JOIN salas s ON r.salaId = s.id
            WHERE r.inicio >= ? AND r.inicio <= ? AND r.status != 'CANCELADO'
            ORDER BY r.inicio ASC
        `, [hoje, limite]);
    }
}

module.exports = ReservaModel;