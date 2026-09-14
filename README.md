# 📅 Sistema de Reservas Acadêmicas & Integração Google Calendar

> API RESTful desenvolvida para gerenciar agendamentos de salas acadêmicas com sincronização bidirecional automatizada para o Google Calendar, otimizando o uso dos espaços físicos e reduzindo abstenções. Conta com validação de choque de horários e modo de simulação local.

## Como Executar o Projeto Localmente

Siga os passos abaixo para rodar a aplicação no seu ambiente de desenvolvimento.

### Pré-requisitos

- Node.js (v18 ou superior)
- Git
- Conta no Google Cloud Console (para geração do arquivo de credenciais da *Service Account*)

### Passo 1: Clonar o repositório

Abra o seu terminal e execute:

    git clone https://github.com/usuario/sistema-reservas-api.git
    cd sistema-reservas-api

### Passo 2: Configurar Variáveis e Credenciais

Instale as dependências do projeto:

    npm install

Crie um arquivo chamado `.env` na raiz do projeto contendo as seguintes variáveis:

    PORT=3000
    GOOGLE_CALENDAR_ID=seu_calendar_id@group.calendar.google.com


As variáveis de ambiente "USER\_ACCESS\_TOKEN" e "USER\_REFRESH\_TOKEN" devem ser alteradas para os tokens do usuário do seu sistema, normalmente adquirido com OAuth.

> **Nota sobre o Google Calendar (`credentials.json`):**
>
> - **Com integração real:** Baixe a chave da sua *Service Account* OAuth 2.0 no Google Cloud Platform, renomeie para `credentials.json` e coloque na pasta raiz.
> - **Sem integração (Modo Simulação):** Se o arquivo `credentials.json` não for inserido, o sistema ativará automaticamente o **Modo Simulação**, gerando IDs fictícios (`mock_google_id_...`) para que você possa testar as rotas da API localmente sem travar o servidor.

### Passo 3: Rodar o Servidor

Inicie o servidor de desenvolvimento. O SQLite criará o banco de dados `database.sqlite` automaticamente na primeira execução.

    npm run dev

A API estará rodando em `http://localhost:3000`.

## 🛠️ Tecnologias, Frameworks e Bibliotecas

| **Tecnologia / Biblioteca** | **Função no Projeto** |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| **Node.js**                 | Ambiente de execução JavaScript no lado do servidor.                                      |
| **Express.js**              | Framework web leve para estruturação de rotas, middlewares e controladores.               |
| **SQLite3**                 | Banco de dados relacional *serverless* embutido para persistência local dos agendamentos. |
| **googleapis**              | SDK oficial do Google para comunicação via HTTPS com a API do Google Calendar (v3).       |
| **dotenv**                  | Gerenciamento de variáveis de ambiente para isolamento de dados sensíveis.                |
| **morgan**                  | Middleware de logging para monitoramento de requisições e tempos de resposta no terminal. |

## 📑 Índice

- [1. Introdução](https://www.google.com/search?q=%231-introdu%C3%A7%C3%A3o)
- [2. Visão Geral do Produto](https://www.google.com/search?q=%232-vis%C3%A3o-geral-do-produto)
- [3. Requisitos Funcionais](https://www.google.com/search?q=%233-requisitos-funcionais)
- [4. Requisitos Não Funcionais](https://www.google.com/search?q=%234-requisitos-n%C3%A3o-funcionais)
- [5. Engenharia de Software e Arquitetura (Fluxos)](https://www.google.com/search?q=%235-engenharia-de-software-e-arquitetura-fluxos)
- [6. Modelagem do Banco de Dados](https://www.google.com/search?q=%236-modelagem-do-banco-de-dados)
- [7. Estratégia de Integração de Dados](https://www.google.com/search?q=%237-estrat%C3%A9gia-de-integra%C3%A7%C3%A3o-de-dados)
- [8. Gestão de Riscos e Monitoramento](https://www.google.com/search?q=%238-gest%C3%A3o-de-riscos-e-monitoramento)
- [9. Plano de Implementação](https://www.google.com/search?q=%239-plano-de-implementa%C3%A7%C3%A3o)
- [10. Testes e Coleção do Postman](https://www.google.com/search?q=%2310-testes-e-cole%C3%A7%C3%A3o-do-postman-para-avalia%C3%A7%C3%A3o)

## 1. Introdução

Este documento formaliza a especificação de requisitos e a arquitetura de integração do sistema de agendamento de espaços físicos acadêmicos. O projeto soluciona a ausência de notificações ativas e o consequente desperdício de horários ociosos, estabelecendo uma ponte arquitetural automatizada entre o sistema de controle interno da instituição e a agenda pessoal dos usuários.

## 2. Visão Geral do Produto

O projeto consiste em uma API RESTful capaz de orquestrar a disponibilidade de salas locais e comunicar-se externamente para firmar o compromisso na rotina digital do requisitante.

### 2.1 Objetivo

Automatizar a criação, atualização e gestão de compromissos gerados a partir do agendamento de salas acadêmicas, garantindo que os eventos registrados no banco de dados local (SQLite) sejam refletidos instantaneamente na agenda pessoal do usuário através da Google Calendar API.

### 2.2 Justificativa

A integração garante consistência de dados e comodidade. Ao unificar a reserva do espaço físico com o agendamento virtual na conta do responsável, elimina-se a necessidade de preenchimento duplo manual, minimizando o *no-show* (não comparecimento por esquecimento).

### 2.3 Sistemas Relacionados e Escopo Negativo

#### Sistemas Envolvidos

- **Sistema Local (API Express):** Controla a lógica de negócio, persistência (SQLite) e bloqueio de concorrência.
- **Sistema Externo (Google Calendar API v3):** Plataforma do Google que recebe os comandos HTTP para criar os eventos finais.

#### Escopo Negativo

- **Front-end Complexo:** O sistema não possuirá telas de login ou fluxos complexos de autenticação de usuários finais. A validação ocorre estritamente na API.
- **Gestão Financeira:** Não haverá cobrança pela reserva das salas.
- **Agendamento de Equipamentos:** O escopo é restrito ao bloqueio de espaço (salas), não englobando controle de inventário móvel (projetores, notebooks).

### 2.4 Premissas e Restrições

- **Comunicação:** A troca de mensagens entre o Node.js e o Google ocorrerá exclusivamente via HTTPS, com *payloads* em JSON.
- **Autenticação Externa:** A API utilizará o padrão OAuth 2.0 por meio de uma *Service Account* para acessar a infraestrutura do Google sem requerer intervenção manual no servidor.

## 3. Requisitos Funcionais

| **ID**    | **Descrição**                                                                                                                                                                  | **Prioridade** |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| **RF001** | **Consulta de Disponibilidade:** O sistema deve listar os horários de salas disponíveis para os próximos 30 dias consultando estritamente o banco de dados local.              | Essencial      |
| **RF002** | **Criação e Sincronização:** O sistema deve registrar a reserva local e enviar um *payload* via API externa criando o evento no Google Calendar (ou usar Modo Simulação).      | Essencial      |
| **RF003** | **Validação de Concorrência:** O sistema deve validar a disponibilidade da sala (evitar choque de horário) localmente antes de qualquer tentativa de comunicação com o Google. | Essencial      |
| **RF004** | **Atualização Sincronizada:** O sistema deve permitir a alteração de data/hora, disparando um `PUT/PATCH` para refletir a mudança no Google Calendar.                          | Importante     |
| **RF005** | **Cancelamento Bidirecional:** O cancelamento da reserva deve atualizar o status no SQLite (soft/hard delete) e enviar uma requisição para a API do Google.                    | Essencial      |

## 4. Requisitos Não Funcionais

| **Categoria**    | **ID**       | **Descrição**                                                                                                                                                        |
| ---------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Desempenho**   | **RNF-DE01** | **Tempo de Resposta:** A API deve orquestrar a consulta local e a requisição externa respondendo ao cliente em menos de 3 segundos.                                  |
| **Arquitetura**  | **RNF-AR01** | **Persistência Local:** O sistema utilizará SQLite para manter autonomia funcional nas buscas, não dependendo do Google para checar disponibilidade de salas.        |
| **Segurança**    | **RNF-SE01** | **Isolamento de Credenciais:** Tokens, IDs de Calendário e chaves do *Service Account* ficarão isolados no backend e no `.env`.                                      |
| **Conformidade** | **RNF-CO01** | **Privacidade (LGPD):** O e-mail do usuário será processado de forma restrita, utilizado apenas para alocação no *array* de convidados e mantido em sigilo no banco. |

## 5. Engenharia de Software e Arquitetura (Fluxos)

A API foi projetada com responsabilidades bem definidas nos Controladores. Abaixo estão listadas as funções e fluxos de rede.

### 1. `GET /api/salas` - Listagem de Salas

- **Função:** Retorna o catálogo de salas acadêmicas cadastradas.
- **Fluxo:** Recebe a requisição ➔ Consulta `SELECT * FROM salas` ➔ Retorna JSON com IDs e descrições.

### 2. `GET /api/reservas` ou `/api/reservas/disponibilidade` - Consulta de Disponibilidade

- **Função:** Lista as reservas existentes para permitir a validação de horários vagos no front-end (próximos 30 dias).
- **Parâmetros:** `?data=YYYY-MM-DD`
- **Fluxo:** Recebe requisição ➔ Filtra tabela `reservas` pela data informada ➔ Retorna array de horários bloqueados.

### 3. `POST /api/reservas` - Criação de Reserva (Sincronizada)

- **Função:** Bloqueia a sala e gera o evento na agenda.
- **Fluxo:**
  1. Valida campos obrigatórios, datas e choque de horário no SQLite (`409 Conflict` se indisponível).
  2. Insere reserva com status `PENDENTE`.
  3. Dispara requisição HTTP ao Google Calendar via SDK (ou gera Mock ID).
  4. Captura o `googleEventId` retornado e atualiza o status no SQLite para `CONFIRMADO`.
  5. Retorna `201 Created`.

### 4. `PUT /api/reservas/:id` - Atualização Bidirecional

- **Função:** Altera o horário, sala ou detalhes de uma reserva existente.
- **Fluxo:**
  1. Verifica se o novo horário está livre no SQLite.
  2. Atualiza os dados da reserva localmente.
  3. Utiliza o `googleEventId` armazenado para fazer a requisição de atualização no Google Calendar.
  4. Retorna `200 OK`.

### 5. `PATCH /api/reservas/:id/cancelar` - Soft-Delete

- **Função:** Cancela a reserva preservando o histórico no banco de dados.
- **Fluxo:**
  1. Busca a reserva no banco de dados.
  2. Envia requisição `DELETE` à API do Google usando o `googleEventId`.
  3. Atualiza o status da linha no SQLite para `CANCELADO`.
  4. Retorna `200 OK`.

### 6. `DELETE /api/reservas/:id` - Hard-Delete

- **Função:** Remove permanentemente o registro da base de dados e da agenda.
- **Fluxo:**
  1. Busca a reserva no banco de dados.
  2. Envia requisição `DELETE` à API do Google usando o `googleEventId`.
  3. Realiza a deleção física (`DELETE FROM reservas WHERE id = ?`) no SQLite.
  4. Retorna `204 No Content` / `200 OK`.

## 6. Modelagem do Banco de Dados

Para garantir agilidade sem excessos (*YAGNI*), o sistema opera com uma tabela principal gerenciada pelo SQLite.

### Tabela: `reservas`

| **Coluna**             | **Tipo de Dado** | **Restrições**      | **Descrição**                                                       |
| ---------------------- | ---------------- | ------------------- | ------------------------------------------------------------------- |
| **`id`**               | `INTEGER`        | **Primary Key**     | Identificador único autoincremental da reserva.                     |
| **`salaId`**           | `INTEGER`        | Not Null            | Identificador numérico da sala física.                              |
| **`emailResponsavel`** | `TEXT`           | Not Null            | E-mail institucional do requerente (convidado no Google).           |
| **`inicio`**           | `TEXT`           | Not Null            | Data e hora de início (Formato ISO 8601).                           |
| **`fim`**              | `TEXT`           | Not Null            | Data e hora de término (Formato ISO 8601).                          |
| **`googleEventId`**    | `TEXT`           | Nullable            | ID retornado pelo Google ou `mock_...` para atualizações/exclusões. |
| **`status`**           | `TEXT`           | Default: 'PENDENTE' | Controla o estado (`PENDENTE`, `CONFIRMADO`, `CANCELADO`, `FALHA`). |

## 7. Estratégia de Integração de Dados

- **Mapeamento Estrutural:** O modelo local armazena dados estruturais essenciais. Durante a integração, o Node.js constrói dinamicamente o recurso *Event* exigido pelo Google, montando o campo `summary` (título visual, ex: "Reunião de Projeto de TCC") e alocando o `emailResponsavel` no array estrutural de `attendees`.
- **Transformação de Fuso Horário:** As datas recebidas do cliente sofrerão intervenção do Node.js para padronização. Strings simples serão convertidas estritamente para o padrão **ISO 8601** exigido pela API v3, injetando o *timezone* correto (ex: `-03:00` para Brasília ou formato UTC `Z`) nas propriedades `start.dateTime` e `end.dateTime`.
- **Qualidade da Informação:** Antes de acionar a camada de rede externa, o sistema passa o *payload* por uma sanitização. A biblioteca `regex` validará a estrutura do e-mail, e a lógica de negócios impedirá datas de término anteriores às datas de início, prevenindo a devolução de erros `400 Bad Request` pelo Google.

## 8. Gestão de Riscos e Monitoramento

### Mapeamento e Mitigação de Riscos

- **Risco Primário (Falha de Rede Externa):** Indisponibilidade da API do Google Calendar gerar um bloqueio permanente da sala no banco local.
- **Plano de Mitigação:** Adoção da máquina de estados. Caso a API do Google retorne `504 Gateway Timeout` ou a requisição falhe após a inserção no banco local, o Node.js captura o erro (`try/catch`), altera a reserva para status `FALHA` ou a remove (liberando o horário) e retorna `503 Service Unavailable` orientando o usuário a tentar novamente mais tarde.

### Estratégia de Monitoramento

- **Logging Dinâmico:** A biblioteca `morgan` registrará todas as transações HTTP no terminal do servidor, mapeando gargalos de tempo de processamento entre o acesso ao SQLite e o retorno da chamada à API externa.
- **Manutenção Preventiva:** A durabilidade do arquivo `database.sqlite` permite auditoria direta e backup imediato via cópia de arquivo físico. O gerenciamento de quotas de *requests* gratuitos da *Service Account* ocorrerá através do painel integrado do Google Cloud Console.

## 9. Plano de Implementação

Devido ao prazo final da entrega para o dia 14/09, o desenvolvimento foi estruturado em um cronograma acelerado (Sprints Diárias):

### Fase 1: Setup e Infraestrutura (07/09 - 08/09)

- [x] Configurar repositório e inicializar projeto Node.js/Express.
- [x] Instalar dependências, configurar SQLite e ORM/Query Builder.
- [x] Gerar as credenciais da Service Account no Google Cloud e validar permissões do calendário.

### Fase 2: Regras de Negócio e Persistência (09/09 - 10/09)

- [x] Criar rotas base (`GET` e `POST` locais).
- [x] Desenvolver e testar o algoritmo de validação de choque de horários no banco local.
- [x] Implementar as rotas de deleção (Soft e Hard delete) e atualização apenas no SQLite.

### Fase 3: Camada de Integração Google (11/09 - 12/09)

- [x] Conectar o SDK `googleapis` e preparar o fallback para o Modo Simulação.
- [x] Injetar a lógica de integração no `POST /reservas` (gerar o evento e salvar o `googleEventId`).
- [x] Injetar integração no `PATCH`, `DELETE` e `PUT` utilizando a chave do evento.
- [x] Implementar a lógica de Rollback (Se Google falhar, desfazer inserção no SQLite).

### Fase 4: Refinamento, Testes e Entrega (13/09 - 14/09)

- [x] Criar coleção do Postman exportada contendo todos os cenários de teste.
- [x] Revisão de segurança (`.gitignore` do `credentials.json` e `.env`).
- [x] Testes finais de estresse e edge-cases (datas no passado, IDs falsos).
- [x] **14/09 - Submissão e Apresentação do Projeto.**
