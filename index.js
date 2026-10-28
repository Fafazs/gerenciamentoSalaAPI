require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(morgan('dev'));

// Registra o prefixo /api para as rotas
app.use('/api', routes);

app.get('/', (req, res) => {
    res.send('API de Reservas (Supabase) e Google Calendar funcionando!');
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`⚡ Conectado ao Supabase!`);
});