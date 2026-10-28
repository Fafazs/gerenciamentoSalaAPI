const express = require('express');
const router = express.Router();

const authRoutes = require('./rotaAuth'); // Nome do seu arquivo de rotas de auth
const salaRoutes = require('./salaRoutes');
const reservaRoutes = require('./reservaRoutes');
// const authMiddleware = require('../middlewares/authMiddleware'); // Descomente se quiser proteger as rotas

router.use('/auth', authRoutes);
router.use('/salas', salaRoutes);
router.use('/reservas', reservaRoutes);

module.exports = router;