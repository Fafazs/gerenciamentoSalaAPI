Este documento estabelece o protocolo sequencial de validação dos endpoints da API, cobrindo o ciclo de vida dos recursos locais (Salas), a gestão de agendamentos (Reservas), o tratamento de regras de negócio (Conflito de Horário) e a sincronização bidirecional com a API do Google Calendar.

### **Caso de Teste 01: Inclusão de Recurso (Criar Sala)**

* **Objetivo:** Validar a persistência de novos recursos físicos na tabela `salas` do SQLite.
* **Requisição:** `POST http://localhost:3000/api/salas`
* **Header:** `Content-Type: application/json`
* **Payload (JSON):**

```json
{
  "nome": "Laboratório de Inteligência Artificial - LIA",
  "capacidade": 45
}
```

* **Resultado Esperado (Sucesso - 201 Created):**

```json
{
  "sucesso": true,
  "mensagem": "Sala criada com sucesso!",
  "sala": {
    "id": 3,
    "nome": "Laboratório de Inteligência Artificial - LIA",
    "capacidade": 45
  }
}
```

* **Resultado Esperado (Falha - 400 Bad Request):**

```json
{
  "erro": "Campos obrigatórios: nome e capacidade."
}
```

### **Caso de Teste 02: Consulta de Recursos (Listar Salas)**

* **Objetivo:** Mapear os recursos cadastrados e capturar a chave primária (`id`) para associação nas reservas.
* **Requisição:** `GET http://localhost:3000/api/salas`
* **Payload:** Nenhum.
* **Resultado Esperado (Sucesso - 200 OK):**

```json
{
  "sucesso": true,
  "dados": [
    { "id": 1, "nome": "Sala 101 - Laboratório", "capacidade": 30 },
    { "id": 2, "nome": "Sala 102 - Reunião", "capacidade": 10 },
    { "id": 3, "nome": "Laboratório de Inteligência Artificial - LIA", "capacidade": 45 }
  ]
}
```

* **Resultado Esperado (Falha - 500 Internal Server Error):**

```json
{
  "erro": "Erro ao buscar salas no banco de dados."
}
```

### **Caso de Teste 03: Remoção de Recurso sem Dependência (Deletar Sala)**

* **Objetivo:** Confirmar o ciclo CRUD do recurso Sala eliminando a entidade recém-criada.
* **Requisição:** `DELETE http://localhost:3000/api/salas/3`
* **Payload:** Nenhum.
* **Resultado Esperado (Sucesso - 200 OK):**

```json
{
  "sucesso": true,
  "mensagem": "Sala deletada com sucesso!"
}
```

* **Resultado Esperado (Falha - 404 Not Found):**

```json
{
  "erro": "Sala não encontrada."
}
```

### **Caso de Teste 04: Transação Distribuída de Agendamento (Criar Reserva + Google Calendar)**

* **Objetivo:** Processar o agendamento local e a criação do evento correspondente via API do Google Calendar (*Two-Phase Commit*).
* **Requisição:** `POST http://localhost:3000/api/reservas`
* **Header:** `Content-Type: application/json`
* **Payload (JSON):**

```json
{
  "salaId": 1,
  "emailResponsavel": "coordenacao.computacao@faculdade.edu.br",
  "inicio": "2026-09-17T08:30:00-03:00",
  "fim": "2026-09-17T10:30:00-03:00",
  "titulo": "Seminário de Arquitetura de Software",
  "descricao": "Apresentação dos projetos práticos de integração de sistemas."
}
```

* **Resultado Esperado (Sucesso - 201 Created):**

```json
{
  "sucesso": true,
  "mensagem": "Reserva criada e sincronizada com o Google Calendar!",
  "reserva": {
    "id": 12,
    "salaId": 1,
    "emailResponsavel": "coordenacao.computacao@faculdade.edu.br",
    "inicio": "2026-09-17T08:30:00-03:00",
    "fim": "2026-09-17T10:30:00-03:00",
    "googleEventId": "a1b2c3d4e5f6g7h8i9j0k1l2m3",
    "status": "CONFIRMADO"
  }
}
```

* **Resultado Esperado (Falha - 400 Bad Request / 500 External Error):**

```json
{
  "erro": "Formato de data/hora inválido ou falha na integração com o Google Calendar."
}
```

### **Caso de Teste 05: Atualização de Agendamento (PUT / Remarcação)**

* **Objetivo:** Alterar horário e título da reserva no SQLite e refletir a modificação na API do Google via `googleEventId`.
* **Requisição:** `PUT http://localhost:3000/api/reservas/12`
* **Header:** `Content-Type: application/json`
* **Payload (JSON):**

```json
{
  "salaId": 1,
  "inicio": "2026-09-17T14:00:00-03:00",
  "fim": "2026-09-17T16:00:00-03:00",
  "titulo": "Seminário de Arquitetura - Turno Tarde"
}
```

* **Resultado Esperado (Sucesso - 200 OK):**

```json
{
  "sucesso": true,
  "mensagem": "Reserva e evento do Google Calendar atualizados com sucesso!",
  "reserva": {
    "id": 12,
    "salaId": 1,
    "inicio": "2026-09-17T14:00:00-03:00",
    "fim": "2026-09-17T16:00:00-03:00",
    "status": "CONFIRMADO"
  }
}
```

* **Resultado Esperado (Falha - 404 Not Found):**

```json
{
  "erro": "Reserva não encontrada para atualização."
}
```

### **Caso de Teste 06: Validação da Regra de Negócio (Bloqueio de Overlap / Conflito)**

* **Objetivo:** Tentar agendar um evento para o mesmo recurso (`salaId: 1`) em horário sobreposto ao cadastrado no Caso 05 (`14:00` às `16:00`).
* **Requisição:** `POST http://localhost:3000/api/reservas`
* **Header:** `Content-Type: application/json`
* **Payload (JSON):**

```json
{
  "salaId": 1,
  "emailResponsavel": "pesquisa@faculdade.edu.br",
  "inicio": "2026-09-17T15:00:00-03:00",
  "fim": "2026-09-17T17:00:00-03:00",
  "titulo": "Reunião do Grupo de Pesquisa"
}
```

* **Resultado Esperado (Rejeição Controlada - 409 Conflict):**

```json
{
  "erro": "Conflito de agendamento: A sala informada já possui uma reserva ativa para o intervalo selecionado."
}
```

* **Resultado Incorreto (Falha do Sistema - 201 Created):** Ocorrerá se a validação de sobreposição temporal falhar, permitindo agendamento duplo.

### **Caso de Teste 07: Cancelamento de Reserva (DELETE)**

* **Objetivo:** Processar o cancelamento do agendamento, alterando o status local e removendo o evento do Google Calendar.
* **Requisição:** `DELETE http://localhost:3000/api/reservas/12`
* **Payload:** Nenhum.
* **Resultado Esperado (Sucesso - 200 OK):**

```json
{
  "sucesso": true,
  "mensagem": "Reserva cancelada e removida do Google Calendar com sucesso!"
}
```

* **Resultado Esperado (Falha - 404 Not Found):**

```json
{
  "erro": "Reserva não encontrada ou já cancelada."
}
```

### **Caso de Teste 08: Auditoria de Disponibilidade (GET /reservas/disponibilidade)**

* **Objetivo:** Verificar se a lista de reservas ativas no banco reflete o expurgo do evento cancelado no Caso 07.
* **Requisição:** `GET http://localhost:3000/api/reservas/disponibilidade`
* **Payload:** Nenhum.
* **Resultado Esperado (Sucesso - 200 OK):**

```json
{
  "sucesso": true,
  "quantidade": 0,
  "dados": []
}
```

### **Caso de Teste 09: Auditoria Final de Recursos (GET /salas)**

* **Objetivo:** Checar o estado de integridade do cadastro de salas ao término do ciclo de testes.
* **Requisição:** `GET http://localhost:3000/api/salas`
* **Payload:** Nenhum.
* **Resultado Esperado (Sucesso - 200 OK):**

```json
{
  "sucesso": true,
  "dados": [
    { "id": 1, "nome": "Sala 101 - Laboratório", "capacidade": 30 },
    { "id": 2, "nome": "Sala 102 - Reunião", "capacidade": 10 }
  ]
}
```
