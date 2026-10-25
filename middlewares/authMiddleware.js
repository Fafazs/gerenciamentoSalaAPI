const supabase = require('../config/database');

const authMiddleware = async (req, res, next) => {

    const authHeader = req.headers.authorization;

    if(!authHeader) {
        return res.status(401).json({ error: "Token não fornecido" });
    }

    const [, token] = authHeader.split(' ');

    if(!token){
        return res.status(401).json({ error: "Formato de token inválido" });
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if(error || !user){
            return res.status(401).json({ error: "Token inválido ou expirado"});
        }

        req.user = user;
        return next();
    } catch (err) {

        return res.status(500).json({ error: "Falha na autenticação do token"});

    }

};
module.exports = authMiddleware;