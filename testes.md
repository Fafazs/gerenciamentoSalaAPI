# 🧪 Protocolo de Testes da API (Postman)

Este documento estabelece o roteiro sequencial de validação dos endpoints da API, cobrindo a autenticação de usuários no **Supabase Auth**, o ciclo de vida das **Salas**, a gestão de **Reservas**, o bloqueio de **Conflito de Horário (Overlap)**, o cálculo do **Cronograma Diário e Ocupação**, e a sincronização com a **API do Google Calendar**.

---

### **Caso de Teste 01: Registro e Login de Usuário (Supabase Auth)**

- **Objetivo:** Validar a criação de conta e a emissão de token JWT pelo Supabase Auth.
- **Requisição 1 (Cadastro):** `POST http://localhost:3000/api/auth/signup`
- **Requisição 2 (Login):** `POST http://localhost:3000/api/auth/login`
- **Header:** `Content-Type: application/json`
- **Payload (JSON):**

```json
{
  "email": "namikyotails@gmail.com",
  "password": "senhaSegura123"
}
```

- **Resultado Esperado no Signup (Sucesso - 201 Created):**

```json
{
  "message": "Usuário criado com sucesso",
  "user": {
    "id": "d8f3b2a1-...",
    "email": "namikyotails@gmail.com"
  }
}
```

- **Resultado Esperado no Login (Sucesso - 200 OK):**

```json
{
  "message": "Login realizado com sucesso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "d8f3b2a1-...",
    "email": "namikyotails@gmail.com"
  }
}
```

---

### **Caso de Teste 02: Inclusão de Recurso (Criar Sala no Supabase)**

- **Objetivo:** Validar a persistência de novas salas físicas na tabela `public.salas` do Supabase.
- **Requisição:** `POST http://localhost:3000/api/salas`
- **Header:** `Content-Type: application/json`
- **Payload (JSON):**

```json
{
  "nome": "Laboratório de Inteligência Artificial - LIA",
  "capacidade": 45
}
```

- **Resultado Esperado (Sucesso - 201 Created):**

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

- **Resultado Esperado (Falha - 400 Bad Request):**

```json
{
  "erro": "Campos obrigatórios: nome e capacidade."
}
```

---

### **Caso de Teste 03: Consulta de Recursos (Listar Salas)**

- **Objetivo:** Listar todas as salas cadastradas no Supabase e verificar os IDs disponíveis para agendamento.
- **Requisição:** `GET http://localhost:3000/api/salas`
- **Payload:** Nenhum.
- **Resultado Esperado (Sucesso - 200 OK):**

```json
{
  "sucesso": true,
  "dados": [
    {
      "id": 1,
      "nome": "Sala de Reunião Alpha",
      "capacidade": 12,
      "recursos": [],
      "ativa": true,
      "criadoEm": "2026-10-28T03:00:00.000Z"
    },
    {
      "id": 3,
      "nome": "Laboratório de Inteligência Artificial - LIA",
      "capacidade": 45,
      "recursos": [],
      "ativa": true,
      "criadoEm": "2026-10-28T03:05:00.000Z"
    }
  ]
}
```

---

### **Caso de Teste 04: Remoção de Sala sem Dependências (Deletar Sala)**

- **Objetivo:** Confirmar a exclusão de uma sala que não possui reservas atreladas.
- **Requisição:** `DELETE http://localhost:3000/api/salas/3`
- **Payload:** Nenhum.
- **Resultado Esperado (Sucesso - 200 OK):**

```json
{
  "sucesso": true,
  "mensagem": "Sala deletada com sucesso!"
}
```

- **Resultado Esperado (Falha - 404 Not Found):**

```json
{
  "erro": "Sala com ID 3 não foi encontrada."
}
```

---

### **Caso de Teste 05: Agendamento Sincronizado (Criar Reserva + Google Calendar)**

- **Objetivo:** Persistir o agendamento no Supabase e criar o evento correspondente na agenda do Google Calendar.
- **Requisição:** `POST http://localhost:3000/api/reservas`
- **Header:** `Content-Type: application/json`
- **Payload (JSON):**

```json
{
  "salaId": 1,
  "emailResponsavel": "namikyotails@gmail.com",
  "inicio": "2026-10-28T09:00:00-03:00",
  "fim": "2026-10-28T11:00:00-03:00",
  "titulo": "Seminário de Arquitetura de Software",
  "descricao": "Apresentação da integração Supabase + Google Calendar."
}
```

- **Resultado Esperado (Sucesso - 201 Created):**

```json
{
  "sucesso": true,
  "mensagem": "Reserva criada e sincronizada com o Google Calendar!",
  "reserva": {
    "id": 1,
    "salaId": 1,
    "emailResponsavel": "namikyotails@gmail.com",
    "titulo": "Seminário de Arquitetura de Software",
    "inicio": "2026-10-28T12:00:00.000Z",
    "fim": "2026-10-28T14:00:00.000Z",
    "googleEventId": "q9r8s7t6u5v4w3x2y1z0",
    "status": "CONFIRMADO"
  }
}
```

- **Resultado Esperado em caso de falha na API externa (Rollback Automático - 502 Bad Gateway):**

```json
{
  "erro": "Falha na API do Google Calendar. Agendamento desfeito no banco.",
  "detalhe": "Descrição técnica do erro retornado pelo Google"
}
```

---

### **Caso de Teste 06: Atualização de Agendamento (PUT / Remarcação)**

- **Objetivo:** Alterar horário e título da reserva no Supabase e atualizar o evento no Google Calendar via `googleEventId`.
- **Requisição:** `PUT http://localhost:3000/api/reservas/1`
- **Header:** `Content-Type: application/json`
- **Payload (JSON):**

```json
{
  "salaId": 1,
  "inicio": "2026-10-28T14:00:00-03:00",
  "fim": "2026-10-28T16:00:00-03:00",
  "titulo": "Seminário de Arquitetura - Turno Tarde"
}
```

- **Resultado Esperado (Sucesso - 200 OK):**

```json
{
  "sucesso": true,
  "mensagem": "Reserva e Google Calendar atualizados com sucesso!"
}
```

- **Resultado Esperado (Falha - 404 Not Found):**

```json
{
  "erro": "Reserva não encontrada."
}
```

---

### **Caso de Teste 07: Validação da Regra de Negócio (Bloqueio de Conflito / Overlap)**

- **Objetivo:** Tentar agendar um novo evento para a mesma sala (`salaId: 1`) em horário parcialmente sobreposto ao Caso 06 (`14:00` às `16:00`).
- **Requisição:** `POST http://localhost:3000/api/reservas`
- **Header:** `Content-Type: application/json`
- **Payload (JSON):**

```json
{
  "salaId": 1,
  "emailResponsavel": "pesquisa@faculdade.edu.br",
  "inicio": "2026-10-28T15:00:00-03:00",
  "fim": "2026-10-28T17:00:00-03:00",
  "titulo": "Reunião do Grupo de Pesquisa"
}
```

- **Resultado Esperado (Rejeição Controlada - 409 Conflict):**

```json
{
  "erro": "Conflito de horário: A sala já possui reserva ativa neste período."
}
```

---

### **Caso de Teste 08: Consulta de Cronograma Diário e Taxa de Ocupação**

- **Objetivo:** Verificar o cruzamento entre a tabela `horarios_funcionamento` (08:00 às 18:00 = 600 min) e a reserva ativa das 14:00 às 16:00 (120 min), validando os blocos livres e a taxa de ocupação de 20%.
- **Requisição:** `GET http://localhost:3000/api/reservas/cronograma?data=2026-10-28`
- **Payload:** Nenhum.
- **Resultado Esperado (Sucesso - 200 OK):**

```json
{
  "sucesso": true,
  "data": "2026-10-28",
  "diaSemana": 3,
  "salas": [
    {
      "salaId": 1,
      "nomeSala": "Sala de Reunião Alpha",
      "capacidade": 12,
      "abertaHoje": true,
      "expediente": {
        "abertura": "08:00",
        "fechamento": "18:00"
      },
      "metricas": {
        "minutosTotaisExpediente": 600,
        "minutosOcupados": 120,
        "minutosLivres": 480,
        "taxaOcupacaoPercentual": 20
      },
      "horariosOcupados": [
        {
          "reservaId": 1,
          "titulo": "Seminário de Arquitetura - Turno Tarde",
          "emailResponsavel": "namikyotails@gmail.com",
          "status": "CONFIRMADO",
          "inicio": "14:00",
          "fim": "16:00",
          "inicioISO": "2026-10-28T17:00:00.000Z",
          "fimISO": "2026-10-28T19:00:00.000Z",
          "duracaoMinutos": 120
        }
      ],
      "horariosLivres": [
        {
          "inicio": "08:00",
          "fim": "14:00",
          "inicioISO": "2026-10-28T11:00:00.000Z",
          "fimISO": "2026-10-28T17:00:00.000Z",
          "duracaoMinutos": 360
        },
        {
          "inicio": "16:00",
          "fim": "18:00",
          "inicioISO": "2026-10-28T19:00:00.000Z",
          "fimISO": "2026-10-28T21:00:00.000Z",
          "duracaoMinutos": 120
        }
      ]
    }
  ]
}
```

---

### **Caso de Teste 09: Cancelamento Lógico (PATCH / Soft-Delete) e Exclusão Física (DELETE / Hard-Delete)**

- **Objetivo:** Validar tanto o cancelamento preservando histórico quanto a remoção definitiva do registro no Supabase e no Google Calendar.

#### 9.1 Cancelamento Lógico (Soft-Delete):
- **Requisição:** `PATCH http://localhost:3000/api/reservas/1/cancelar`
- **Resultado Esperado (200 OK):**
```json
{
  "sucesso": true,
  "mensagem": "Reserva cancelada com sucesso!"
}
```

#### 9.2 Exclusão Permanente (Hard-Delete):
- **Requisição:** `DELETE http://localhost:3000/api/reservas/1`
- **Resultado Esperado (200 OK):**
```json
{
  "sucesso": true,
  "mensagem": "Reserva deletada permanentemente do banco e do Google Calendar!"
}
```

---

### **Caso de Teste 10: Auditoria Final de Disponibilidade (Próximos 30 Dias)**

- **Objetivo:** Verificar se a listagem de disponibilidade (`GET /api/reservas/disponibilidade`) reflete o cancelamento/exclusão realizados no Caso 09.
- **Requisição:** `GET http://localhost:3000/api/reservas/disponibilidade`
- **Resultado Esperado (Sucesso - 200 OK):**

```json
{
  "sucesso": true,
  "quantidade": 0,
  "dados": []
}
```