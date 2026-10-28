const express = require('express');
const router = express.Router();
const ReservaController = require('../controllers/reservaController');

router.get('/cronograma', ReservaController.obterCronogramaDiario); // <-- Nova rota: GET /api/reservas/cronograma?data=YYYY-MM-DD
router.get('/disponibilidade', ReservaController.listarDisponibilidade);
router.post('/', ReservaController.criarReserva);
router.put('/:id', ReservaController.atualizarReserva);
router.patch('/:id/cancelar', ReservaController.cancelarReserva);
router.delete('/:id', ReservaController.deletarReserva);

module.exports = router;