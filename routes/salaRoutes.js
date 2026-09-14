const express = require('express');
const router = express.Router();
const SalaController = require('../controllers/salaController');

router.get('/', SalaController.listarSalas);
router.post('/', SalaController.criarSala);
router.delete('/:id', SalaController.deletarSala);

module.exports = router;