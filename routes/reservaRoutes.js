const express = require('express');
const router = express.Router();
const ReservaController = require('../controllers/reservaController');

router.get('/disponibilidade', ReservaController.listarDisponibilidade);
router.post('/', ReservaController.criarReserva);
router.put('/:id', ReservaController.atualizarReserva);
router.patch('/:id/cancelar', ReservaController.cancelarReserva); // Soft-delete (muda status)
router.delete('/:id', ReservaController.deletarReserva);         // Hard-delete (apaga da tabela)

module.exports = router;