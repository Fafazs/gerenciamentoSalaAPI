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
            const reservas = await ReservaModel.listarDisponibilidade30Dias();
            return res.json({ sucesso: true, quantidade: reservas.length, dados: reservas });
        } catch (erro) {
            return res.status(500).json({ erro: "Erro ao consultar disponibilidade no Supabase." });
        }
    }

    // RF002 e RF005: Criar reserva
    static async criarReserva(req, res) {
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
            const sala = await SalaModel.buscarPorId(salaId);
            if (!sala) {
                return res.status(404).json({ erro: "Sala informada não existe." });
            }

            const conflito = await ReservaModel.verificarConflito(salaId, isoInicio, isoFim);
            if (conflito) {
                return res.status(409).json({ erro: "Conflito de horário: A sala já possui reserva ativa neste período." });
            }

            const reservaId = await ReservaModel.criar({
                salaId: Number(salaId),
                emailResponsavel,
                titulo: titulo || `Reserva: ${sala.nome}`,
                descricao: descricao || `Responsável: ${emailResponsavel}`,
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
                    await ReservaModel.deletar(reservaId);
                    return res.status(502).json({
                        erro: "Falha na API do Google Calendar. Agendamento desfeito no banco.",
                        detalhe: googleError.message
                    });
                }
            } else {
                console.warn("⚠️ [MODO SIMULAÇÃO] credentials.json não encontrado.");
                googleEventId = `mock_google_id_${Date.now()}`;
            }

            await ReservaModel.confirmarComGoogle(reservaId, googleEventId);

            return res.status(201).json({
                sucesso: true,
                mensagem: temCredenciais 
                    ? "Reserva criada e sincronizada com o Google Calendar!" 
                    : "Reserva criada no Supabase (Modo Simulação Google ativado).",
                reserva: {
                    id: reservaId,
                    salaId: Number(salaId),
                    emailResponsavel,
                    titulo: titulo || `Reserva: ${sala.nome}`,
                    inicio: isoInicio,
                    fim: isoFim,
                    googleEventId,
                    status: 'CONFIRMADO'
                }
            });

        } catch (erro) {
            console.error(erro);
            return res.status(500).json({ erro: "Erro interno no servidor." });
        }
    }

    // RF003: Atualizar reserva
    static async atualizarReserva(req, res) {
        const { id } = req.params;
        const { salaId, inicio, fim, titulo } = req.body;

        try {
            const idNumerico = Number(id);
            const reserva = await ReservaModel.buscarPorId(idNumerico);
            if (!reserva) {
                return res.status(404).json({ erro: "Reserva não encontrada." });
            }

            const novaSalaId = salaId ? Number(salaId) : reserva.salaId;
            const isoNovoInicio = inicio ? new Date(inicio).toISOString() : reserva.inicio;
            const isoNovoFim = fim ? new Date(fim).toISOString() : reserva.fim;

            if (new Date(isoNovoFim) <= new Date(isoNovoInicio)) {
                return res.status(400).json({ erro: "Horário de fim deve ser posterior ao início." });
            }

            const conflito = await ReservaModel.verificarConflito(novaSalaId, isoNovoInicio, isoNovoFim, idNumerico);
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
                            summary: titulo || reserva.titulo || `Reserva Atualizada`,
                            start: { dateTime: isoNovoInicio },
                            end: { dateTime: isoNovoFim }
                        }
                    });
                } catch (googleError) {
                    return res.status(502).json({ erro: "Erro ao atualizar no Google Calendar.", detalhe: googleError.message });
                }
            }

            await ReservaModel.atualizar(idNumerico, { salaId: novaSalaId, inicio: isoNovoInicio, fim: isoNovoFim, titulo });

            return res.json({ sucesso: true, mensagem: "Reserva e Google Calendar atualizados com sucesso!" });
        } catch (erro) {
            return res.status(500).json({ erro: "Erro ao atualizar reserva." });
        }
    }

    // RF004: Cancelar reserva (Soft-delete / Atualiza status)
    static async cancelarReserva(req, res) {
        const { id } = req.params;

        try {
            const idNumerico = Number(id);
            const reserva = await ReservaModel.buscarPorId(idNumerico);
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

            await ReservaModel.cancelar(idNumerico);
            return res.json({ sucesso: true, mensagem: "Reserva cancelada com sucesso!" });

        } catch (erro) {
            return res.status(500).json({ erro: "Erro ao cancelar reserva." });
        }
    }

    // RF004-B: Deletar reserva permanentemente (Hard-delete)
    static async deletarReserva(req, res) {
        const { id } = req.params;

        try {
            const idNumerico = Number(id);
            const reserva = await ReservaModel.buscarPorId(idNumerico);

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

            const linhasAfetadas = await ReservaModel.deletar(idNumerico);

            if (linhasAfetadas === 0) {
                return res.status(404).json({ erro: "Reserva não encontrada para remoção." });
            }

            return res.json({ sucesso: true, mensagem: "Reserva deletada permanentemente do banco e do Google Calendar!" });

        } catch (erro) {
            return res.status(500).json({ erro: "Erro ao deletar reserva no banco de dados." });
        }
    }

    static async obterCronogramaDiario(req, res) {
        try {
            const fusoHorario = process.env.TIMEZONE_OFFSET || '-03:00';
            
            // Usa a data da query (?data=2026-10-28) ou pega a data atual no fuso local
            const hojeLocal = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
            const dataConsulta = req.query.data || hojeLocal;

            if (!/^\d{4}-\d{2}-\d{2}$/.test(dataConsulta)) {
                return res.status(400).json({
                    erro: "Formato de data inválido. Use o padrão YYYY-MM-DD (ex: ?data=2026-10-28)."
                });
            }

            const inicioDia = new Date(`${dataConsulta}T00:00:00${fusoHorario}`);
            const fimDia = new Date(`${dataConsulta}T23:59:59.999${fusoHorario}`);

            if (isNaN(inicioDia.getTime())) {
                return res.status(400).json({ erro: "Data informada é inválida." });
            }

            const diaSemana = inicioDia.getUTCDay(); // 0 (Domingo) a 6 (Sábado)

            const { salas, reservas } = await ReservaModel.buscarDadosCronograma(
                inicioDia.toISOString(),
                fimDia.toISOString(),
                diaSemana
            );

            // Função auxiliar para formatar Date em "HH:mm" no fuso -03:00
            const formatarHoraLocal = (dataISO) => {
                const d = new Date(dataISO);
                return d.toLocaleTimeString('pt-BR', {
                    timeZone: 'America/Fortaleza',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            };

            const cronogramaSalas = salas.map(sala => {
                // Caso a sala não tenha expediente cadastrado para este dia da semana (ex: Domingo)
                if (!sala.expediente) {
                    return {
                        salaId: sala.id,
                        nomeSala: sala.nome,
                        capacidade: sala.capacidade,
                        abertaHoje: false,
                        expediente: null,
                        metricas: {
                            minutosTotaisExpediente: 0,
                            minutosOcupados: 0,
                            minutosLivres: 0,
                            taxaOcupacaoPercentual: 0
                        },
                        horariosOcupados: [],
                        horariosLivres: []
                    };
                }

                const { horaAbertura, horaFechamento } = sala.expediente;
                const aberturaDate = new Date(`${dataConsulta}T${horaAbertura}${fusoHorario}`);
                const fechamentoDate = new Date(`${dataConsulta}T${horaFechamento}${fusoHorario}`);

                const minutosTotaisExpediente = Math.max(
                    0,
                    Math.round((fechamentoDate - aberturaDate) / 60000)
                );

                // Filtra as reservas desta sala específica
                const reservasDaSala = reservas.filter(r => Number(r.salaId) === Number(sala.id));

                const horariosOcupados = [];
                const horariosLivres = [];
                let minutosOcupados = 0;

                // Cursor começa no horário de abertura da sala
                let cursorTempo = new Date(aberturaDate);

                for (const reserva of reservasDaSala) {
                    const resInicio = new Date(reserva.inicio);
                    const resFim = new Date(reserva.fim);

                    // Recorta o intervalo da reserva para caber dentro do expediente do dia
                    const inicioEfetivo = resInicio < aberturaDate ? aberturaDate : resInicio;
                    const fimEfetivo = resFim > fechamentoDate ? fechamentoDate : resFim;

                    // Se existe um espaço entre o cursor atual e o início da próxima reserva, é horário LIVRE
                    if (inicioEfetivo > cursorTempo) {
                        const duracaoLivreMin = Math.round((inicioEfetivo - cursorTempo) / 60000);
                        horariosLivres.push({
                            inicio: formatarHoraLocal(cursorTempo),
                            fim: formatarHoraLocal(inicioEfetivo),
                            inicioISO: cursorTempo.toISOString(),
                            fimISO: inicioEfetivo.toISOString(),
                            duracaoMinutos: duracaoLivreMin
                        });
                    }

                    // Contabiliza o bloco ocupado dentro do expediente
                    if (fimEfetivo > inicioEfetivo) {
                        const duracaoOcupadaMin = Math.round((fimEfetivo - inicioEfetivo) / 60000);
                        minutosOcupados += duracaoOcupadaMin;

                        horariosOcupados.push({
                            reservaId: reserva.id,
                            titulo: reserva.titulo,
                            emailResponsavel: reserva.emailResponsavel,
                            status: reserva.status,
                            inicio: formatarHoraLocal(inicioEfetivo),
                            fim: formatarHoraLocal(fimEfetivo),
                            inicioISO: reserva.inicio,
                            fimISO: reserva.fim,
                            duracaoMinutos: duracaoOcupadaMin
                        });
                    }

                    // Avança o cursor para o fim desta reserva
                    if (fimEfetivo > cursorTempo) {
                        cursorTempo = new Date(fimEfetivo);
                    }
                }

                // Se sobrou tempo entre o fim da última reserva e o fechamento da sala, adiciona como horário LIVRE
                if (cursorTempo < fechamentoDate) {
                    const duracaoLivreFinal = Math.round((fechamentoDate - cursorTempo) / 60000);
                    horariosLivres.push({
                        inicio: formatarHoraLocal(cursorTempo),
                        fim: formatarHoraLocal(fechamentoDate),
                        inicioISO: cursorTempo.toISOString(),
                        fimISO: fechamentoDate.toISOString(),
                        duracaoMinutos: duracaoLivreFinal
                    });
                }

                const minutosLivres = Math.max(0, minutosTotaisExpediente - minutosOcupados);
                const taxaOcupacaoPercentual = minutosTotaisExpediente > 0
                    ? Number(((minutosOcupados / minutosTotaisExpediente) * 100).toFixed(1))
                    : 0;

                return {
                    salaId: sala.id,
                    nomeSala: sala.nome,
                    capacidade: sala.capacidade,
                    abertaHoje: true,
                    expediente: {
                        abertura: horaAbertura.slice(0, 5),
                        fechamento: horaFechamento.slice(0, 5)
                    },
                    metricas: {
                        minutosTotaisExpediente,
                        minutosOcupados,
                        minutosLivres,
                        taxaOcupacaoPercentual
                    },
                    horariosOcupados,
                    horariosLivres
                };
            });

            return res.json({
                sucesso: true,
                data: dataConsulta,
                diaSemana,
                salas: cronogramaSalas
            });

        } catch (erro) {
            console.error("Erro ao gerar cronograma diário:", erro.message);
            return res.status(500).json({ erro: "Erro ao gerar o cronograma diário das salas." });
        }
    }
}



module.exports = ReservaController;