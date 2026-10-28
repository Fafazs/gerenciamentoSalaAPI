# 🛣️ Documentação de Rotas da API (`/api`)

URL Base Local: `http://localhost:3000/api`

---

## 🔐 1. Autenticação de Usuários (`/api/auth`)

### 1.1 Cadastrar Usuário (Sign Up)
- **Método:** `POST`
- **URL:** `http://localhost:3000/api/auth/signup`
- **Header:** `Content-Type: application/json`
- **Body (JSON):**
```json
{
  "email": "usuario@exemplo.com",
  "password": "senhaSegura123"
}
```
- **Descrição:** Registra um novo usuário no Supabase Auth e aciona a *trigger* para criação do perfil na tabela `public.profiles`. Retorna `201 Created`.

### 1.2 Realizar Login
- **Método:** `POST`
- **URL:** `http://localhost:3000/api/auth/login`
- **Header:** `Content-Type: application/json`
- **Body (JSON):**
```json
{
  "email": "usuario@exemplo.com",
  "password": "senhaSegura123"
}
```
- **Descrição:** Autentica as credenciais no Supabase e retorna `200 OK` contendo o `token` JWT (`access_token`) e os dados do usuário (`user`).

---

## 🏛️ 2. Gerenciamento de Salas (`/api/salas`)

### 2.1 Listar Salas
- **Método:** `GET`
- **URL:** `http://localhost:3000/api/salas`
- **Descrição:** Retorna a lista de todas as salas cadastradas no Supabase ordenadas por `id`.

### 2.2 Criar Sala
- **Método:** `POST`
- **URL:** `http://localhost:3000/api/salas`
- **Header:** `Content-Type: application/json`
- **Body (JSON):**
```json
{
  "nome": "Auditório B - Bloco Central",
  "capacidade": 120
}
```
- **Descrição:** Cadastra uma nova sala física no Supabase validando se o nome foi preenchido e se a capacidade é maior que zero. Retorna `201 Created`.

### 2.3 Deletar Sala
- **Método:** `DELETE`
- **URL:** `http://localhost:3000/api/salas/:id` *(Exemplo: `http://localhost:3000/api/salas/4`)*
- **Descrição:** Remove uma sala cadastrada pelo ID. Caso existam reservas vinculadas à sala no banco, a requisição é bloqueada pela restrição de *Foreign Key* e retorna `400 Bad Request` informando que as reservas devem ser removidas primeiro.

---

## 📅 3. Gerenciamento de Reservas, Cronograma e Google Calendar (`/api/reservas`)

### 3.1 Consultar Cronograma Diário e Taxa de Ocupação
- **Método:** `GET`
- **URL:** `http://localhost:3000/api/reservas/cronograma?data=2026-10-28`
- **Parâmetro de Query (Opcional):** `data` no formato `YYYY-MM-DD` (caso omitido, assume a data atual no fuso `-03:00`).
- **Descrição:** Cruza a tabela `horarios_funcionamento` com as reservas ativas do dia informado. Retorna para cada sala o expediente de abertura/fechamento, minutos totais, minutos ocupados, minutos livres, a **taxa de ocupação percentual (`taxaOcupacaoPercentual`)**, a lista de `horariosOcupados` e as janelas de `horariosLivres`.

### 3.2 Listar Reservas / Disponibilidade (Próximos 30 Dias)
- **Método:** `GET`
- **URL:** `http://localhost:3000/api/reservas/disponibilidade`
- **Descrição:** Lista todas as reservas ativas (`status != 'CANCELADO'`) agendadas para os próximos 30 dias no Supabase, incluindo o `nomeSala` e o `googleEventId`.

### 3.3 Criar Reserva (Sincronizada com Google Calendar)
- **Método:** `POST`
- **URL:** `http://localhost:3000/api/reservas`
- **Header:** `Content-Type: application/json`
- **Body (JSON):**
```json
{
  "salaId": 1,
  "emailResponsavel": "namikyotails@gmail.com",
  "inicio": "2026-10-28T14:00:00-03:00",
  "fim": "2026-10-28T16:00:00-03:00",
  "titulo": "Reunião de Alinhamento de Sprint",
  "descricao": "Revisão da arquitetura e entrega da API"
}
```
- **Comportamento Esperado:** Valida se a sala existe e se não há conflito de horário no Supabase (`409 Conflict`). Grava a reserva, cria o evento na agenda do Google Calendar configurada no `.env`, salva o `googleEventId` gerado e confirma o status como `CONFIRMADO` (`201 Created`). Se a API do Google falhar, desfaz o registro no banco local e retorna `502 Bad Gateway`.

### 3.4 Atualizar / Remarcar Reserva
- **Método:** `PUT`
- **URL:** `http://localhost:3000/api/reservas/:id` *(Exemplo: `http://localhost:3000/api/reservas/1`)*
- **Header:** `Content-Type: application/json`
- **Body (JSON):**
```json
{
  "salaId": 1,
  "inicio": "2026-10-28T16:00:00-03:00",
  "fim": "2026-10-28T17:30:00-03:00",
  "titulo": "Reunião Remarcada para 16h"
}
```
- **Comportamento Esperado:** Verifica conflitos no novo horário (ignorando a própria reserva), atualiza o evento correspondente no Google Calendar via `PATCH` usando o `googleEventId` e atualiza os dados no Supabase (`200 OK`).

### 3.5 Cancelar Reserva (Soft-Delete)
- **Método:** `PATCH`
- **URL:** `http://localhost:3000/api/reservas/:id/cancelar` *(Exemplo: `http://localhost:3000/api/reservas/1/cancelar`)*
- **Comportamento Esperado:** Remove o evento da agenda do Google Calendar e atualiza a coluna `status` da reserva no Supabase para `'CANCELADO'`, mantendo o registro histórico no banco (`200 OK`).

### 3.6 Deletar Reserva Permanentemente (Hard-Delete)
- **Método:** `DELETE`
- **URL:** `http://localhost:3000/api/reservas/:id` *(Exemplo: `http://localhost:3000/api/reservas/1`)*
- **Comportamento Esperado:** Remove o evento do Google Calendar e apaga definitivamente a linha da tabela `reservas` no Supabase (`200 OK`).