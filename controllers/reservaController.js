const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const ReservaModel = require('../models/reservas');
const SalaModel = require('../models/salas');

const keyPath = path.join(__dirname, '../credentials.json');
const temCredenciais = fs.existsSync(keyPath);

function getGoogleCalendarClient() {
    if (!temCredenciais) return null;
    const auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/calendar']
    });
    return google.calendar({ version: 'v3', auth });
}

class ReservaController {
    // RF001: Listar disponibilidade dos próximos 30 dias
    static async listarDisponibilidade(req, res) {
        try {
            const db = req.app.locals.db;
            const reservas = await ReservaModel.listarDisponibilidade30Dias(db);
            return res.json({ sucesso: true, quantidade: reservas.length, dados: reservas });
        } catch (erro) {
            return res.status(500).json({ erro: "Erro ao consultar disponibilidade no banco local." });
        }
    }

    // RF002 e RF005: Criar reserva
    static async criarReserva(req, res) {
        const db = req.app.locals.db;
        const { salaId, emailResponsavel, inicio, fim, titulo, descricao } = req.body;

        if (!salaId || !emailResponsavel || !inicio || !fim) {
            return res.status(400).json({ erro: "Campos obrigatórios: salaId, emailResponsavel, inicio, fim." });
        }

        const dataInicio = new Date(inicio);
        const dataFim = new Date(fim);

        if (isNaN(dataInicio) || isNaN(dataFim) || dataFim <= dataInicio) {
            return res.status(400).json({ erro: "Datas inválidas ou horário de fim anterior/igual ao início." });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailResponsavel)) {
            return res.status(400).json({ erro: "Formato do e-mail do responsável é inválido." });
        }

        const isoInicio = dataInicio.toISOString();
        const isoFim = dataFim.toISOString();

        try {
            const sala = await SalaModel.buscarPorId(db, salaId);
            if (!sala) {
                return res.status(404).json({ erro: "Sala informada não existe." });
            }

            const conflito = await ReservaModel.verificarConflito(db, salaId, isoInicio, isoFim);
            if (conflito) {
                return res.status(409).json({ erro: "Conflito de horário: A sala já possui reserva ativa neste período." });
            }

            const reservaId = await ReservaModel.criar(db, {
                salaId: Number(salaId),
                emailResponsavel,
                inicio: isoInicio,
                fim: isoFim,
                status: 'PENDENTE'
            });

            let googleEventId;

            if (temCredenciais) {
                try {
                    const calendar = getGoogleCalendarClient();
                    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

                    const googleResponse = await calendar.events.insert({
                        calendarId,
                        resource: {
                            summary: titulo || `Reserva: ${sala.nome}`,
                            description: descricao || `Responsável: ${emailResponsavel}`,
                            start: { dateTime: isoInicio },
                            end: { dateTime: isoFim }
                        }
                    });
                    googleEventId = googleResponse.data.id;
                } catch (googleError) {
                    await ReservaModel.deletar(db, reservaId);
                    return res.status(502).json({
                        erro: "Falha na API do Google Calendar. Agendamento desfeito no banco local.",
                        detalhe: googleError.message
                    });
                }
            } else {
                console.warn("⚠️ [MODO SIMULAÇÃO] credentials.json não encontrado.");
                googleEventId = `mock_google_id_${Date.now()}`;
            }

            await ReservaModel.confirmarComGoogle(db, reservaId, googleEventId);

            return res.status(201).json({
                sucesso: true,
                mensagem: temCredenciais 
                    ? "Reserva criada e sincronizada com o Google Calendar!" 
                    : "Reserva criada localmente (Modo Simulação Google ativado).",
                reserva: {
                    id: reservaId,
                    salaId: Number(salaId),
                    emailResponsavel,
                    inicio: isoInicio,
                    fim: isoFim,
                    googleEventId,
                    status: 'CONFIRMADO'
                }
            });

        } catch (erro) {
            return res.status(500).json({ erro: "Erro interno no servidor." });
        }
    }

    // RF003: Atualizar reserva
    static async atualizarReserva(req, res) {
        const db = req.app.locals.db;
        const { id } = req.params;
        const { salaId, inicio, fim, titulo } = req.body;

        try {
            const idNumerico = Number(id);
            const reserva = await ReservaModel.buscarPorId(db, idNumerico);
            if (!reserva) {
                return res.status(404).json({ erro: "Reserva não encontrada." });
            }

            const novaSalaId = salaId ? Number(salaId) : reserva.salaId;
            const isoNovoInicio = inicio ? new Date(inicio).toISOString() : reserva.inicio;
            const isoNovoFim = fim ? new Date(fim).toISOString() : reserva.fim;

            if (new Date(isoNovoFim) <= new Date(isoNovoInicio)) {
                return res.status(400).json({ erro: "Horário de fim deve ser posterior ao início." });
            }

            const conflito = await ReservaModel.verificarConflito(db, novaSalaId, isoNovoInicio, isoNovoFim, idNumerico);
            if (conflito) {
                return res.status(409).json({ erro: "Novo horário em conflito com outra reserva existente." });
            }

            if (temCredenciais && reserva.googleEventId && !reserva.googleEventId.startsWith('mock_')) {
                try {
                    const calendar = getGoogleCalendarClient();
                    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

                    await calendar.events.patch({
                        calendarId,
                        eventId: reserva.googleEventId,
                        resource: {
                            summary: titulo || `Reserva Atualizada`,
                            start: { dateTime: isoNovoInicio },
                            end: { dateTime: isoNovoFim }
                        }
                    });
                } catch (googleError) {
                    return res.status(502).json({ erro: "Erro ao atualizar no Google Calendar.", detalhe: googleError.message });
                }
            }

            await ReservaModel.atualizar(db, idNumerico, { salaId: novaSalaId, inicio: isoNovoInicio, fim: isoNovoFim });

            return res.json({ sucesso: true, mensagem: "Reserva e Google Calendar atualizados com sucesso!" });
        } catch (erro) {
            return res.status(500).json({ erro: "Erro ao atualizar reserva." });
        }
    }

    // RF004: Cancelar reserva (Soft-delete / Atualiza status)
    static async cancelarReserva(req, res) {
        const db = req.app.locals.db;
        const { id } = req.params;

        try {
            const idNumerico = Number(id);
            const reserva = await ReservaModel.buscarPorId(db, idNumerico);
            if (!reserva) {
                return res.status(404).json({ erro: "Reserva não encontrada." });
            }

            if (temCredenciais && reserva.googleEventId && !reserva.googleEventId.startsWith('mock_')) {
                try {
                    const calendar = getGoogleCalendarClient();
                    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

                    await calendar.events.delete({
                        calendarId,
                        eventId: reserva.googleEventId
                    });
                } catch (googleError) {
                    console.warn("Aviso: Não foi possível remover do Google Calendar:", googleError.message);
                }
            }

            await ReservaModel.cancelar(db, idNumerico);
            return res.json({ sucesso: true, mensagem: "Reserva cancelada com sucesso!" });

        } catch (erro) {
            return res.status(500).json({ erro: "Erro ao cancelar reserva." });
        }
    }

    // RF004-B: Deletar reserva permanentemente (Hard-delete / Remove do banco)
    static async deletarReserva(req, res) {
        const db = req.app.locals.db;
        const { id } = req.params;

        try {
            const idNumerico = Number(id);
            const reserva = await ReservaModel.buscarPorId(db, idNumerico);

            if (!reserva) {
                return res.status(404).json({ erro: "Reserva não encontrada." });
            }

            if (temCredenciais && reserva.googleEventId && !reserva.googleEventId.startsWith('mock_')) {
                try {
                    const calendar = getGoogleCalendarClient();
                    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

                    await calendar.events.delete({
                        calendarId,
                        eventId: reserva.googleEventId
                    });
                } catch (googleError) {
                    console.warn("Aviso: Não foi possível remover do Google Calendar:", googleError.message);
                }
            }

            const linhasAfetadas = await ReservaModel.deletar(db, idNumerico);

            if (linhasAfetadas === 0) {
                return res.status(404).json({ erro: "Reserva não encontrada para remoção." });
            }

            return res.json({ sucesso: true, mensagem: "Reserva deletada permanentemente do banco e do Google Calendar!" });

        } catch (erro) {
            return res.status(500).json({ erro: "Erro ao deletar reserva no banco de dados." });
        }
    }
}

module.exports = ReservaController;