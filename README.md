# 📅 Sistema de Reservas Acadêmicas, Supabase & Google Calendar

> API RESTful desenvolvida para gerenciar o agendamento de salas acadêmicas com persistência em nuvem via **Supabase (PostgreSQL)**, autenticação de usuários via **JWT (Supabase Auth)**, cálculo de cronograma/taxa de ocupação diária e sincronização automatizada com o **Google Calendar API (v3)**. Conta com validação de choque de horários, rollback transacional em caso de falha externa e modo de simulação local.

---

## 🚀 Como Executar o Projeto Localmente

Siga os passos abaixo para rodar a aplicação no seu ambiente de desenvolvimento.

### Pré-requisitos

- **Node.js** (v18 ou superior)
- **Git**
- **Projeto no Supabase** (Banco PostgreSQL e Authentication)
- **Conta no Google Cloud Console** (com a *Google Calendar API* ativada e chave JSON de *Service Account*)

### Passo 1: Clonar o repositório e atualizar a branch

Abra o seu terminal e execute:

```bash
git clone [https://github.com/usuario/sistema-reservas-api.git](https://github.com/usuario/sistema-reservas-api.git)
cd sistema-reservas-api
```

### Passo 2: Instalar Dependências e Configurar o `.env`

Instale os pacotes necessários:

```bash
npm install
```

Crie um arquivo chamado `.env` na raiz do projeto contendo as seguintes variáveis:

```env
PORT=3000
GOOGLE_CALENDAR_ID=seu_email_ou_id_da_agenda@gmail.com
URL_PROJ=[https://seu-projeto.supabase.co](https://seu-projeto.supabase.co)
API_KEY=sua_chave_service_role_ou_anon_do_supabase
TIMEZONE_OFFSET=-03:00
```

> **Nota sobre o Google Calendar (`credentials.json`):**
>
> - **Com integração real:** No Google Cloud Console, ative a **Google Calendar API**, crie uma *Service Account*, baixe a chave JSON, renomeie para `credentials.json` e posicione na pasta esperada pelo projeto. No Google Agenda, compartilhe sua agenda com o `client_email` da Service Account com a permissão **"Fazer alterações nos eventos"**.
> - **Sem integração (Modo Simulação):** Caso o arquivo `credentials.json` não seja encontrado, a API ativa automaticamente o **Modo Simulação**, gerando identificadores fictícios (`mock_google_id_...`) para permitir testes completos das rotas e do banco de dados sem travar a aplicação.

### Passo 3: Configurar as Tabelas no Supabase

No painel do Supabase, acesse o **SQL Editor** e execute o script de criação das tabelas (`salas`, `horarios_funcionamento`, `reservas` e `profiles`), conforme detalhado na [Seção 6 (Modelagem do Banco de Dados)](#6-modelagem-do-banco-de-dados).

### Passo 4: Rodar o Servidor

Inicie o servidor de desenvolvimento:

```bash
npm run dev
# ou
npx nodemon index.js
```

A API estará disponível em `http://localhost:3000`.

---

## 🛠️ Tecnologias, Frameworks e Bibliotecas

| Tecnologia / Biblioteca | Função no Projeto |
| :--- | :--- |
| **Node.js** | Ambiente de execução JavaScript assíncrono no lado do servidor. |
| **Express.js** | Framework web para estruturação de rotas REST, middlewares e controllers. |
| **@supabase/supabase-js** | SDK cliente oficial para integração com o banco PostgreSQL em nuvem e autenticação JWT via Supabase Auth. |
| **googleapis** | SDK oficial do Google para comunicação via HTTPS/OAuth2 com a API do Google Calendar (v3). |
| **dotenv** | Gerenciamento de variáveis de ambiente para isolamento de chaves sensíveis (`URL_PROJ`, `API_KEY`, `GOOGLE_CALENDAR_ID`). |
| **morgan** | Middleware de logging HTTP para monitoramento de requisições, status codes e tempo de resposta no terminal. |

---

## 📑 Índice

1. [Introdução](#1-introdução)
2. [Visão Geral do Produto](#2-visão-geral-do-produto)
3. [Requisitos Funcionais](#3-requisitos-funcionais)
4. [Requisitos Não Funcionais](#4-requisitos-não-funcionais)
5. [Engenharia de Software e Arquitetura (Fluxos)](#5-engenharia-de-software-e-arquitetura-fluxos)
6. [Modelagem do Banco de Dados (Supabase / PostgreSQL)](#6-modelagem-do-banco-de-dados)
7. [Estratégia de Integração de Dados](#7-estratégia-de-integração-de-dados)
8. [Gestão de Riscos e Monitoramento](#8-gestão-de-riscos-e-monitoramento)
9. [Plano de Implementação e Evolução Arquitetural](#9-plano-de-implementação-evolução-arquitetural)

---

## 1. Introdução

Este documento formaliza a especificação de requisitos, a modelagem de dados em nuvem e a arquitetura de integração do sistema de gerenciamento e agendamento de espaços físicos acadêmicos. O projeto soluciona conflitos de ocupação de salas, ausência de visibilidade sobre janelas de horários ociosos e falhas de notificação, estabelecendo uma ponte automatizada entre o banco de dados relacional no **Supabase** e o **Google Calendar**.

---

## 2. Visão Geral do Produto

O projeto consiste em uma API RESTful capaz de autenticar usuários, gerenciar o catálogo de salas e seus expedientes de funcionamento, calcular métricas de ocupação diária e sincronizar reservas diretamente na agenda digital do responsável.

### 2.1 Objetivo

Automatizar a criação, atualização, cancelamento e consulta de agendamentos de salas acadêmicas, garantindo que os registros persistidos no **Supabase (PostgreSQL)** sejam refletidos de forma síncrona e confiável no **Google Calendar**.

### 2.2 Justificativa

A arquitetura unifica a governança do espaço físico com o compromisso virtual do requisitante. O cálculo automatizado de janelas livres e ocupadas evita sobreposições (*double-booking*), impede a exclusão acidental de salas com reservas ativas (integridade referencial) e reduz a taxa de *no-show*.

### 2.3 Sistemas Relacionados e Escopo

#### Sistemas Envolvidos

- **API Central (Node.js + Express):** Orquestra as regras de negócio, validações de horário, cálculo de ocupação e comunicação entre serviços.
- **Supabase (PostgreSQL + GoTrue Auth):** Plataforma BaaS responsável pela persistência relacional em nuvem, integridade de chaves estrangeiras, políticas de segurança (RLS) e autenticação de usuários via JWT.
- **Google Calendar API (v3):** Serviço externo acionado via *Service Account* (OAuth 2.0) para criação, atualização (`PATCH`) e remoção (`DELETE`) dos eventos na agenda.

#### Escopo Negativo

- **Gestão Financeira:** Não há tarifação ou cobrança financeira pelo uso das salas.
- **Controle de Patrimônio Móvel Individual:** O foco é o agendamento do espaço físico e seus recursos fixos agregados.

---

## 3. Requisitos Funcionais

| ID | Descrição | Prioridade |
| :--- | :--- | :--- |
| **RF001** | **Consulta de Disponibilidade (30 Dias):** Listar todas as reservas ativas agendadas para os próximos 30 dias relacionando com o nome da sala no Supabase. | Essencial |
| **RF002** | **Criação de Reserva e Sincronização:** Validar dados, persistir a reserva como `PENDENTE` no Supabase, criar o evento no Google Calendar e confirmar o status como `CONFIRMADO` (com rollback automático em caso de falha externa). | Essencial |
| **RF003** | **Atualização de Reserva:** Permitir alterar sala, título, início e fim de uma reserva existente, validando conflitos e atualizando o evento via `PATCH` no Google Calendar. | Importante |
| **RF004** | **Cancelamento e Exclusão (Soft e Hard Delete):** Permitir o cancelamento lógico (`PATCH /:id/cancelar` mudando status para `CANCELADO`) ou a exclusão física (`DELETE /:id`), removendo o evento correspondente do Google Calendar em ambos os casos. | Essencial |
| **RF005** | **Validação de Conflito de Horário (Overlap):** Impedir que uma mesma sala receba agendamentos com interseção de horário (`inicio < novoFim` e `fim > novoInicio`) para reservas não canceladas. | Essencial |
| **RF006** | **Listagem de Salas:** Retornar todas as salas cadastradas no banco ordenadas por ID. | Essencial |
| **RF007** | **Cadastro de Salas:** Permitir a criação de novas salas validando nome e capacidade numérica maior que zero. | Essencial |
| **RF008** | **Exclusão Segura de Salas:** Remover salas pelo ID, bloqueando a exclusão caso existam reservas vinculadas (tratamento de *Foreign Key Constraint* `23503`). | Importante |
| **RF009** | **Cronograma Diário e Taxa de Ocupação:** Cruzar a grade de `horarios_funcionamento` da sala com as reservas do dia para retornar os intervalos livres, intervalos ocupados e a porcentagem exata de ocupação. | Importante |
| **RF010** | **Autenticação de Usuários (Signup / Login):** Permitir o registro e login de usuários via Supabase Auth, emitindo token JWT (`access_token`) e validando rotas protegidas via `authMiddleware`. | Essencial |

---

## 4. Requisitos Não Funcionais

| Categoria | ID | Descrição |
| :--- | :--- | :--- |
| **Desempenho** | **RNF-DE01** | **Tempo de Resposta e Paralelismo:** Consultas compostas (como o cronograma diário) utilizam `Promise.all` no Supabase para responder em menos de 3 segundos. |
| **Arquitetura** | **RNF-AR01** | **Persistência Relacional em Nuvem:** O sistema utiliza PostgreSQL gerenciado pelo Supabase com índices otimizados para busca de intervalos temporais. |
| **Segurança** | **RNF-SE01** | **Isolamento de Credenciais e RLS:** Chaves do Supabase (`API_KEY`), credenciais do Google (`credentials.json`) e tokens JWT são processados estritamente no backend. |
| **Confiabilidade** | **RNF-CF01** | **Consistência Transacional:** Caso a API do Google Calendar falhe durante a criação (`502 Bad Gateway`), a API desfaz o agendamento recém-criado no Supabase automaticamente. |

---

## 5. Engenharia de Software e Arquitetura (Fluxos)

### 1. `POST /api/auth/signup` e `POST /api/auth/login` — Autenticação
- **Função:** Registra usuários no Supabase Auth (sincronizando com a tabela `public.profiles` via Trigger) e realiza login retornando o token JWT de sessão.

### 2. `GET /api/salas`, `POST /api/salas` e `DELETE /api/salas/:id` — Gestão de Salas
- **Função:** Gerencia o catálogo físico de salas no Supabase. Na exclusão (`DELETE`), intercepta erros de integridade referencial (`code: 23503`) caso a sala possua reservas vinculadas, retornando `400 Bad Request` amigável.

### 3. `GET /api/reservas/disponibilidade` — Reservas dos Próximos 30 Dias
- **Função:** Consulta no Supabase todas as reservas com status diferente de `CANCELADO` nos próximos 30 dias, fazendo `JOIN` automático (`select('*, salas(nome)')`) para retornar o `nomeSala`.

### 4. `GET /api/reservas/cronograma?data=YYYY-MM-DD` — Cronograma e Taxa de Ocupação
- **Função:** Cruza o expediente da sala no dia da semana consultado (`horarios_funcionamento`) com as reservas ativas do dia.
- **Fluxo:** Calcula os minutos totais de expediente, percorre a linha do tempo identificando lacunas (`horariosLivres`) e blocos reservados (`horariosOcupados`), e retorna a `taxaOcupacaoPercentual` de cada sala.

### 5. `POST /api/reservas` — Criação Sincronizada com Rollback
- **Fluxo:**
  1. Valida presença dos campos, formato de e-mail via Regex e coerência cronológica (`fim > inicio`).
  2. Verifica existência da sala (`404 Not Found` se inexistente) e checa conflitos de horário no Supabase (`409 Conflict` se houver sobreposição).
  3. Insere a reserva no Supabase com status `PENDENTE`.
  4. Aciona `calendar.events.insert` na API do Google Calendar (ou gera ID mockado se em Modo Simulação).
  5. **Se o Google falhar:** Executa `ReservaModel.deletar(reservaId)` para desfazer o registro local e retorna `502 Bad Gateway`.
  6. **Se o Google confirmar:** Atualiza o registro no Supabase com o `googleEventId` e muda o status para `CONFIRMADO`, retornando `201 Created`.

### 6. `PUT /api/reservas/:id` — Atualização Bidirecional
- **Fluxo:** Verifica existência da reserva, valida se o novo horário não conflita com reservas de terceiros (ignorando o próprio ID), envia um `calendar.events.patch` ao Google Calendar e atualiza os dados no Supabase.

### 7. `PATCH /api/reservas/:id/cancelar` (Soft-Delete) e `DELETE /api/reservas/:id` (Hard-Delete)
- **Fluxo:** Localiza a reserva pelo ID, remove o evento correspondente na agenda do Google Calendar (`calendar.events.delete`) e executa a baixa no Supabase (alterando o status para `CANCELADO` no `PATCH`, ou removendo a linha definitivamente no `DELETE`).

---

## 6. Modelagem do Banco de Dados

O banco de dados utiliza **PostgreSQL** no **Supabase**, estruturado em quatro entidades relacionais para garantir controle de acesso, cadastro de salas, grade de horários de expediente e reservas:

### 6.1 Tabela: `public.salas`
| Coluna | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| **`id`** | `BIGINT` | **PK**, Identity | Identificador único da sala. |
| **`nome`** | `TEXT` | `NOT NULL` | Nome ou identificação da sala (ex: "Sala de Reunião Alpha"). |
| **`capacidade`** | `INTEGER` | `NOT NULL`, `> 0` | Lotação máxima permitida na sala. |
| **`recursos`** | `TEXT[]` | Default `{}` | Lista de equipamentos disponíveis (ex: Projetor, TV). |
| **`ativa`** | `BOOLEAN` | Default `TRUE` | Indica se a sala está operacional para agendamentos. |
| **`criadoEm`** | `TIMESTAMPTZ` | Default `NOW()` | Data/hora de criação do registro. |

### 6.2 Tabela: `public.horarios_funcionamento`
| Coluna | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| **`id`** | `BIGINT` | **PK**, Identity | Identificador único da regra de horário. |
| **`salaId`** | `BIGINT` | **FK** (`salas.id`) `CASCADE` | Sala à qual o horário pertence. |
| **`diaSemana`** | `SMALLINT` | `BETWEEN 0 AND 6` | Dia da semana (`0` = Domingo, `1` = Segunda ... `6` = Sábado). |
| **`horaAbertura`** | `TIME` | Default `'08:00:00'` | Horário de abertura da sala no respectivo dia. |
| **`horaFechamento`** | `TIME` | Default `'18:00:00'` | Horário de fechamento da sala no respectivo dia. |

### 6.3 Tabela: `public.reservas`
| Coluna | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| **`id`** | `BIGINT` | **PK**, Identity | Identificador único da reserva. |
| **`salaId`** | `BIGINT` | **FK** (`salas.id`) `RESTRICT` | Sala reservada (impede exclusão da sala se houver reserva). |
| **`userId`** | `UUID` | **FK** (`auth.users.id`) | Referência opcional ao usuário autenticado criador da reserva. |
| **`emailResponsavel`** | `TEXT` | `NOT NULL` | E-mail do responsável pelo agendamento. |
| **`titulo`** | `TEXT` | Nullable | Título do evento/reunião sincronizado com o Google Calendar. |
| **`descricao`** | `TEXT` | Nullable | Descrição ou pauta da reserva. |
| **`inicio`** | `TIMESTAMPTZ` | `NOT NULL` | Data e hora de início em formato ISO 8601. |
| **`fim`** | `TIMESTAMPTZ` | `NOT NULL`, `fim > inicio` | Data e hora de término em formato ISO 8601. |
| **`status`** | `TEXT` | `PENDENTE`, `CONFIRMADO`, `CANCELADO` | Estado atual do ciclo de vida da reserva. |
| **`googleEventId`** | `TEXT` | Nullable | ID oficial gerado pelo Google Calendar ou `mock_google_id_...`. |
| **`criadoEm`** | `TIMESTAMPTZ` | Default `NOW()` | Timestamp de registro da reserva. |

### 6.4 Tabela: `public.profiles`
| Coluna | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| **`id`** | `UUID` | **PK**, **FK** (`auth.users.id`) | ID espelhado automaticamente via Trigger do Supabase Auth. |
| **`email`** | `TEXT` | `UNIQUE NOT NULL` | E-mail do usuário cadastrado. |
| **`nome`** | `TEXT` | Nullable | Nome do usuário. |
| **`cargo`** | `TEXT` | Nullable | Função ou vínculo acadêmico. |

---

## 7. Estratégia de Integração de Dados

- **Sincronização Transacional (Two-Step Verification):** A reserva nasce no Supabase com status `PENDENTE`. Somente após o retorno `200 OK` da API do Google Calendar contendo o `data.id` é que o registro local recebe o `googleEventId` e transita para `CONFIRMADO`.
- **Padronização Temporal (ISO 8601 & Fuso Horário):** Todas as entradas de data/hora são convertidas e validadas em UTC/ISO 8601 (`.toISOString()`) antes da persistência e da checagem de conflitos, enquanto a exibição de relatórios de cronograma formata os horários para o fuso local (`America/Fortaleza` / `-03:00`).
- **Sanitização e Validação Prévia:** Antes de abrir conexão com o banco ou com a API externa do Google, os Controllers validam tipos numéricos, formato de e-mail via expressão regular e integridade de intervalos (`dataFim > dataInicio`).

---

## 8. Gestão de Riscos e Monitoramento

- **Mitigação de Falha Externa (Rollback Automático):** Caso a API do Google Calendar esteja indisponível, sem permissão na agenda ou com a chave inválida, o bloco `catch (googleError)` aciona imediatamente `await ReservaModel.deletar(reservaId)`, evitando que a sala fique travada indevidamente no banco de dados e retornando `502 Bad Gateway` com o detalhe técnico.
- **Governança de Acesso no Banco (RLS vs. Service Role):** O backend opera como *API Gateway* confiável autenticando-se no Supabase ou aplicando políticas explícitas de *Row Level Security (RLS)* para as roles `anon` e `authenticated`.
- **Observabilidade:** Todas as rotas são monitoradas em tempo real pelo middleware `morgan('dev')`, exibindo método, rota, status HTTP e latência em milissegundos.

---

## 9. Plano de Implementação (Evolução Arquitetural)

### Entregas Concluídas nesta Versão:
- [x] Migração completa do banco local SQLite para **Supabase (PostgreSQL em nuvem)**.
- [x] Implementação de autenticação de usuários (`signup` e `login`) via **Supabase Auth** e `authMiddleware` JWT.
- [x] Criação da entidade relacional `horarios_funcionamento` e do algoritmo de **Cronograma Diário (`GET /api/reservas/cronograma`)** com cálculo de minutos livres, ocupados e taxa percentual de ocupação.
- [x] Integração real com **Google Calendar API v3** via *Service Account* com suporte a criação (`insert`), atualização (`patch`) e exclusão (`delete`).

### Próximos Passos (Roadmap Futuro):
- [ ] **Webhooks Bidirecionais:** Receber notificações *push* do Google Calendar quando um evento for alterado diretamente pelo aplicativo do Google.
- [ ] **Front-end Interativo:** Dashboard visual consumindo o endpoint `/api/reservas/cronograma` para exibição gráfica das barras de ocupação por sala.
- [ ] **Containerização (Docker):** Empacotamento da API em containers para deploy contínuo em nuvem (Render/Railway/AWS).