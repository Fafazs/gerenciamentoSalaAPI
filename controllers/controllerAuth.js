const supabase = require('../config/database');

const signup = async (req, res) => {

    const { email, password } = req.body;

    try {

        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) return res.status(400).json({ error: error.message });
        return res.status(201).json({ message: "Usuário criado com sucesso", user: data.user});

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }

};

const login = async (req, res) => {

    const { email, password } = req.body;

    try {

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) return res.status(401).json({ error: error.message });

        return res.json({
            message: "Login realizado com sucesso",
            token: data.session.access_token,
            user: data.user
        });

    } catch (error) {

        return res.status(500).json({ error: error.message });

    }

};

module.exports = { signup, login };