const supabase = require('../config/database');

class ReservaModel {
    static async buscarPorId(id) {
        const { data, error } = await supabase
            .from('reservas')
            .select('*')
            .eq('id', Number(id))
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    static async verificarConflito(salaId, inicio, fim, reservaIdIgnorar = null) {
        try {
            const isoInicio = new Date(inicio).toISOString();
            const isoFim = new Date(fim).toISOString();

            let query = supabase
                .from('reservas')
                .select('id')
                .eq('salaId', Number(salaId))
                .neq('status', 'CANCELADO')
                .lt('inicio', isoFim)
                .gt('fim', isoInicio);

            if (reservaIdIgnorar) {
                query = query.neq('id', Number(reservaIdIgnorar));
            }

            const { data, error } = await query.limit(1);
            if (error) throw error;

            return data && data.length > 0;
        } catch (erro) {
            console.error("Erro ao verificar conflito no Supabase:", erro.message);
            throw erro;
        }
    }

    static async buscarDadosCronograma(inicioDiaISO, fimDiaISO, diaSemana) {
        const [salasResponse, reservasResponse] = await Promise.all([
            supabase
                .from('salas')
                .select(`
                    id,
                    nome,
                    capacidade,
                    recursos,
                    ativa,
                    horarios_funcionamento (
                        diaSemana,
                        horaAbertura,
                        horaFechamento
                    )
                `)
                .eq('ativa', true)
                .order('id', { ascending: true }),

            supabase
                .from('reservas')
                .select('id, salaId, titulo, descricao, emailResponsavel, inicio, fim, status')
                .neq('status', 'CANCELADO')
                .lt('inicio', fimDiaISO)
                .gt('fim', inicioDiaISO)
                .order('inicio', { ascending: true })
        ]);

        if (salasResponse.error) throw salasResponse.error;
        if (reservasResponse.error) throw reservasResponse.error;

        // Filtra apenas o horário correspondente ao dia da semana consultado (0 = Dom ... 6 = Sáb)
        const salasFormatadas = salasResponse.data.map(sala => {
            const expedienteHoje = (sala.horarios_funcionamento || []).find(
                h => Number(h.diaSemana) === Number(diaSemana)
            ) || null;

            return {
                id: sala.id,
                nome: sala.nome,
                capacidade: sala.capacidade,
                recursos: sala.recursos,
                expediente: expedienteHoje
            };
        });

        return {
            salas: salasFormatadas,
            reservas: reservasResponse.data || []
        };
    };

    static async criar({ salaId, emailResponsavel, inicio, fim, titulo = null, descricao = null, status = 'PENDENTE' }) {
        const { data, error } = await supabase
            .from('reservas')
            .insert([{
                salaId: Number(salaId),
                emailResponsavel,
                titulo,
                descricao,
                inicio,
                fim,
                status
            }])
            .select('id')
            .single();

        if (error) throw error;
        return data.id;
    }

    static async confirmarComGoogle(id, googleEventId) {
        const { data, error } = await supabase
            .from('reservas')
            .update({ googleEventId, status: 'CONFIRMADO' })
            .eq('id', Number(id))
            .select('id');

        if (error) throw error;
        return data ? data.length : 0;
    }

    static async atualizar(id, { salaId, inicio, fim, titulo }) {
        const camposAtualizar = { salaId: Number(salaId), inicio, fim };
        if (titulo !== undefined) camposAtualizar.titulo = titulo;

        const { data, error } = await supabase
            .from('reservas')
            .update(camposAtualizar)
            .eq('id', Number(id))
            .select('id');

        if (error) throw error;
        return data ? data.length : 0;
    }

    static async deletar(id) {
        const { data, error } = await supabase
            .from('reservas')
            .delete()
            .eq('id', Number(id))
            .select('id');

        if (error) throw error;
        return data ? data.length : 0;
    }

    static async cancelar(id) {
        const { data, error } = await supabase
            .from('reservas')
            .update({ status: 'CANCELADO' })
            .eq('id', Number(id))
            .select('id');

        if (error) throw error;
        return data ? data.length : 0;
    }

    static async listarDisponibilidade30Dias() {
        const hoje = new Date().toISOString();
        const limite = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from('reservas')
            .select('*, salas(nome)')
            .gte('inicio', hoje)
            .lte('inicio', limite)
            .neq('status', 'CANCELADO')
            .order('inicio', { ascending: true });

        if (error) throw error;

        // Mantém o mesmo formato "nomeSala" que o JOIN do SQLite retornava
        return data.map(({ salas, ...reserva }) => ({
            ...reserva,
            nomeSala: salas?.nome || null
        }));
    }
}

module.exports = ReservaModel;