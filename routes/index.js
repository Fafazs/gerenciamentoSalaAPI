const express = require('express');
const router = express.Router();

const salaRoutes = require('./salaRoutes');
const reservaRoutes = require('./reservaRoutes');

router.use('/salas', salaRoutes);
router.use('/reservas', reservaRoutes);

module.exports = router;