require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const iniciarBanco = require('./database');
const routes = require('./routes'); // Importa o index.js das rotas

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(morgan('dev'));

iniciarBanco().then((db) => {
    app.locals.db = db;

    // Registra o prefixo /api para as rotas
    app.use('/api', routes);

    app.get('/', (req, res) => {
        res.send('API de Reservas e Google Calendar funcionando!');
    });

    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
        console.log(`🗄️  Banco SQLite conectado com sucesso!`);
    });
}).catch(erro => {
    console.error("Erro fatal ao iniciar o banco de dados:", erro);
    process.exit(1);
});