🏛️ 1. Gerenciamento de Salas (/api/salas)
1.1 Ver Salas
Método: GET

URL: http://localhost:3000/api/salas

Descrição: Retorna a lista de todas as salas cadastradas no banco local SQLite.

1.2 Criar Sala
Método: POST

URL: http://localhost:3000/api/salas

Header: Content-Type: application/json

Body:

JSON
{
  "nome": "Auditório B - Bloco Central",
  "capacidade": 120
}
1.3 Deletar Sala
Método: DELETE

URL: http://localhost:3000/api/salas/:id (Exemplo: http://localhost:3000/api/salas/4)

Descrição: Remove uma sala cadastrada pelo ID.

📅 2. Gerenciamento de Reservas e Sincronização (/api/reservas)
2.1 Ver Reservas / Disponibilidade
Método: GET

URL: http://localhost:3000/api/reservas/disponibilidade

Descrição: Lista as reservas ativas, relacionando com os dados da sala e o googleEventId.

2.2 Criar Reserva
Método: POST

URL: http://localhost:3000/api/reservas

Header: Content-Type: application/json

Body:

JSON
{
  "salaId": 1,
  "emailResponsavel": "fabricionasciment77@gmail.com",
  "inicio": "2026-09-16T10:00:00-03:00",
  "fim": "2026-09-16T11:00:00-03:00",
  "titulo": "Reunião de Alinhamento"
}
Comportamento Esperado: Grava a reserva no SQLite e cria o evento de forma síncrona na agenda do Google Calendar.

2.3 Alterar Reserva
Método: PUT

URL: http://localhost:3000/api/reservas/:id (Exemplo: http://localhost:3000/api/reservas/11)

Header: Content-Type: application/json

Body:

JSON
{
  "salaId": 1,
  "inicio": "2026-09-16T14:00:00-03:00",
  "fim": "2026-09-16T15:00:00-03:00",
  "titulo": "Reunião Remarcada para 14h"
}
Comportamento Esperado: Atualiza o registro local e reposiciona o evento no Google Calendar via googleEventId.

2.4 Deletar / Cancelar Reserva
Método: DELETE

URL: http://localhost:3000/api/reservas/:id (Exemplo: http://localhost:3000/api/reservas/1)

Comportamento Esperado: Altera o status local e exclui o evento correspondente no Google Calendar.