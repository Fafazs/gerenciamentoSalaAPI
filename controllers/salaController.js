const SalaModel = require('../models/salas');

class SalaController {
    // RF006: Listar todas as salas
    static async listarSalas(req, res) {
        try {
            const db = req.app.locals.db;
            const salas = await SalaModel.listarTodas(db);
            return res.json({
                sucesso: true,
                dados: salas
            });
        } catch (erro) {
            return res.status(500).json({ erro: "Erro ao buscar salas no banco de dados." });
        }
    }

    // RF007: Criar uma nova sala
    static async criarSala(req, res) {
        const db = req.app.locals.db;
        const { nome, capacidade } = req.body;

        if (!nome || capacidade === undefined || capacidade === null) {
            return res.status(400).json({ erro: "Campos obrigatórios: nome e capacidade." });
        }

        const capacidadeNum = Number(capacidade);
        if (isNaN(capacidadeNum) || capacidadeNum <= 0) {
            return res.status(400).json({ erro: "A capacidade deve ser um número maior que zero." });
        }

        try {
            const id = await SalaModel.criar(db, { nome: nome.trim(), capacidade: capacidadeNum });
            return res.status(201).json({
                sucesso: true,
                mensagem: "Sala criada com sucesso!",
                sala: { id, nome: nome.trim(), capacidade: capacidadeNum }
            });
        } catch (erro) {
            return res.status(500).json({ erro: "Erro ao cadastrar sala no banco de dados." });
        }
    }

    // RF008: Deletar uma sala por ID
    static async deletarSala(req, res) {
        const db = req.app.locals.db;
        const { id } = req.params;

        try {
            const idNumerico = Number(id);
            if (isNaN(idNumerico)) {
                return res.status(400).json({ erro: "ID de sala inválido." });
            }

            const linhasAfetadas = await SalaModel.deletar(db, idNumerico);

            if (!linhasAfetadas || linhasAfetadas === 0) {
                return res.status(404).json({ erro: `Sala com ID ${id} não foi encontrada.` });
            }

            return res.json({
                sucesso: true,
                mensagem: "Sala deletada com sucesso!"
            });
        } catch (erro) {
            console.error("Erro ao deletar sala:", erro.message);

            // Captura restrição de Foreign Key se houver reservas vinculadas
            if (erro.message.includes('FOREIGN KEY') || erro.message.includes('CONSTRAINT')) {
                return res.status(400).json({
                    erro: "Não é possível deletar esta sala pois existem reservas vinculadas a ela. Cancele as reservas primeiro."
                });
            }

            return res.status(500).json({ erro: "Erro ao deletar sala no banco de dados." });
        }
    }
}

module.exports = SalaController;