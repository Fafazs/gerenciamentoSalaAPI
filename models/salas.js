const supabase = require('../config/database');

class SalaModel {
    static async listarTodas() {
        const { data, error } = await supabase
            .from('salas')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        return data;
    }

    static async buscarPorId(id) {
        const { data, error } = await supabase
            .from('salas')
            .select('*')
            .eq('id', Number(id))
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    static async criar({ nome, capacidade }) {
        const { data, error } = await supabase
            .from('salas')
            .insert([{ nome, capacidade: Number(capacidade) }])
            .select('id')
            .single();

        if (error) throw error;
        return data.id;
    }

    static async deletar(id) {
        const { data, error } = await supabase
            .from('salas')
            .delete()
            .eq('id', Number(id))
            .select('id');

        if (error) throw error;
        return data ? data.length : 0; // Retorna quantas linhas foram deletadas
    }
}

module.exports = SalaModel;