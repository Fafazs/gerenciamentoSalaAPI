# 📅 Sistema de Reservas Acadêmicas & Integração Google Calendar

> API RESTful desenvolvida para gerenciar agendamentos de salas acadêmicas com sincronização bidirecional automatizada para o Google Calendar, otimizando o uso dos espaços físicos e reduzindo abstenções.

## Como Executar o Projeto Localmente

Siga os passos abaixo para rodar a aplicação no seu ambiente de desenvolvimento.

### Pré-requisitos

- Node.js (v18 ou superior)
- Git
- Conta no Google Cloud Console (para geração do arquivo de credenciais da *Service Account*)

### Passo 1: Clonar o repositório

Abra o seu terminal e execute:


```
git clone https://github.com/usuario/sistema-reservas-api.git
cd sistema-reservas-api

```

### Passo 2: Configurar Variáveis e Credenciais

Instale as dependências do projeto:


```
npm install

```

Crie um arquivo chamado `.env` na raiz do projeto contendo as seguintes variáveis:


```
PORT=3000
GOOGLE_CALENDAR_ID=seu_calendar_id@group.calendar.google.com

```

Adicione o arquivo `credentials.json` (baixado do Google Cloud Platform contendo as chaves da sua Service Account OAuth 2.0) na pasta raiz do projeto.

### Passo 3: Rodar o Servidor

Inicie o servidor de desenvolvimento. O SQLite criará o banco de dados `database.sqlite` automaticamente na primeira execução.


```
npm run dev

```

A API estará rodando em `http://localhost:3000`.

## 🛠️ Tecnologias, Frameworks e Bibliotecas

| **Tecnologia / Biblioteca** | **Função no Projeto**                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| **Node.js**                 | Ambiente de execução JavaScript no lado do servidor.                                      |
| **Express.js**              | Framework web leve para estruturação de rotas, middlewares e controladores.               |
| **SQLite3**                 | Banco de dados relacional *serverless* embutido para persistência local dos agendamentos. |
| **googleapis**              | SDK oficial do Google para comunicação via HTTPS com a API do Google Calendar (v3).       |
| **dotenv**                  | Gerenciamento de variáveis de ambiente para isolamento de dados sensíveis.                |
| **morgan**                  | Middleware de logging para monitoramento de requisições e tempos de resposta no terminal. |

## 📑 Índice

- [1. Introdução](#1-introdução)
- [2. Visão Geral do Produto](#2-visão-geral-do-produto)
- [3. Requisitos Funcionais](#3-requisitos-funcionais)
- [4. Requisitos Não Funcionais](#4-requisitos-não-funcionais)
- [5. Engenharia de Software e Arquitetura (Fluxos)](#5-engenharia-de-software-e-arquitetura-fluxos)
- [6. Modelagem do Banco de Dados](#6-modelagem-do-banco-de-dados)
- [7. Estratégia de Integração de Dados](#7-estratégia-de-integração-de-dados)
- [8. Gestão de Riscos e Monitoramento](#8-gestão-de-riscos-e-monitoramento)
- [9. Plano de Implementação](#9-plano-de-implementação)

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
| **RF002** | **Criação e Sincronização:** O sistema deve registrar a reserva local e enviar um *payload* via API externa criando o evento no Google Calendar.                               | Essencial      |
| **RF003** | **Validação de Concorrência:** O sistema deve validar a disponibilidade da sala (evitar choque de horário) localmente antes de qualquer tentativa de comunicação com o Google. | Essencial      |
| **RF004** | **Atualização Sincronizada:** O sistema deve permitir a alteração de data/hora, disparando um `PUT/PATCH` para refletir a mudança no Google Calendar.                          | Importante     |
| **RF005** | **Cancelamento Bidirecional:** O cancelamento da reserva deve remover o registro no SQLite e enviar um `DELETE` para a API do Google.                                          | Essencial      |

## 4. Requisitos Não Funcionais

| **Categoria**    | **ID**       | **Descrição**                                                                                                                                                        |
| ---------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Desempenho**   | **RNF-DE01** | **Tempo de Resposta:** A API deve orquestrar a consulta local e a requisição externa respondendo ao cliente em menos de 3 segundos.                                  |
| **Arquitetura**  | **RNF-AR01** | **Persistência Local:** O sistema utilizará SQLite para manter autonomia funcional nas buscas, não dependendo do Google para checar disponibilidade de salas.        |
| **Segurança**    | **RNF-SE01** | **Isolamento de Credenciais:** Tokens, IDs de Calendário e chaves do *Service Account* ficarão isolados no backend e no `.env`.                                      |
| **Conformidade** | **RNF-CO01** | **Privacidade (LGPD):** O e-mail do usuário será processado de forma restrita, utilizado apenas para alocação no *array* de convidados e mantido em sigilo no banco. |

## 5. Engenharia de Software e Arquitetura (Fluxos)

Abaixo encontra-se a descrição arquitetural mapeando o comportamento do sistema sem a necessidade de diagramas visuais gráficos.

### 5.1 Fluxo de Consulta de Disponibilidade (GET /salas)

1. O cliente requisita os horários disponíveis enviando um parâmetro de data.
2. A API Express intercepta a chamada e consulta o banco de dados SQLite.
3. O sistema calcula a diferença entre os horários totais da sala e os horários que possuem o status `CONFIRMADO` ou `PENDENTE`.
4. A API retorna um objeto JSON com os horários livres. Nenhuma chamada externa ao Google é realizada nesta etapa para preservar limites de quota de API.

### 5.2 Fluxo de Agendamento e Integração (POST /reservas) - Padrão Two-Phase Commit

1. O cliente envia o JSON com `salaId`, `emailResponsavel`, `inicio` e `fim`.
2. A API valida o choque de horários no SQLite.
   - *Se ocupado:* Retorna `409 Conflict`.
   - *Se livre:* Avança para o Passo 3.
3. A API insere a reserva no banco de dados com o status `PENDENTE` (bloqueando a sala para outras requisições concorrentes).
4. A API atua como *Client HTTP* e dispara a requisição POST utilizando o SDK `googleapis`.
5. O Google Calendar processa a requisição e devolve um `200 OK` contendo o ID exclusivo do evento.
6. A API local captura esse ID, atualiza a reserva no SQLite para o status `CONFIRMADO` inserindo o `googleEventId`.
7. O cliente recebe a confirmação `201 Created`. Se houver falha no passo 5, ocorre um *rollback* no banco local.

## 6. Modelagem do Banco de Dados

Para garantir agilidade sem excessos (*YAGNI*), o sistema opera com uma tabela principal gerenciada pelo SQLite.

### Tabela: `reservas`

| **Coluna**             | **Tipo de Dado** | **Restrições**      | **Descrição**                                                          |
| ---------------------- | ---------------- | ------------------- | ---------------------------------------------------------------------- |
| **`id`**               | `INTEGER`        | **Primary Key**     | Identificador único autoincremental.                                   |
| **`salaId`**           | `INTEGER`        | Not Null            | Identificador numérico da sala física.                                 |
| **`emailResponsavel`** | `TEXT`           | Not Null            | E-mail institucional do requerente (convidado no Google).              |
| **`inicio`**           | `TEXT`           | Not Null            | Data e hora de início (Formato ISO 8601).                              |
| **`fim`**              | `TEXT`           | Not Null            | Data e hora de término (Formato ISO 8601).                             |
| **`googleEventId`**    | `TEXT`           | Nullable            | ID retornado pelo Google para futuras atualizações/exclusões.          |
| **`status`**           | `TEXT`           | Default: 'PENDENTE' | Controla o estado de consistência (`PENDENTE`, `CONFIRMADO`, `FALHA`). |

## 7. Estratégia de Integração de Dados

- **Mapeamento Estrutural:** O modelo local armazena dados estruturais essenciais. Durante a integração, o Node.js constrói dinamicamente o recurso *Event* exigido pelo Google, montando o campo `summary` (título visual, ex: "Reserva Sala X - Reunião") e alocando o `emailResponsavel` no array estrutural de `attendees`.
- **Transformação de Fuso Horário:** As datas recebidas do cliente sofrerão intervenção do Node.js para padronização. Strings simples serão convertidas estritamente para o padrão **ISO 8601** exigido pela API v3, injetando o *timezone* correto (ex: `-03:00` para Brasília) nas propriedades `start.dateTime` e `end.dateTime`.
- **Qualidade da Informação:** Antes de acionar a camada de rede externa, o sistema passa o *payload* por uma sanitização. A biblioteca `regex` validará a estrutura do e-mail, e a lógica de negócios impedirá datas de término anteriores às datas de início, prevenindo a devolução de erros `400 Bad Request` pelo Google.

## 8. Gestão de Riscos e Monitoramento

### Mapeamento e Mitigação de Riscos

- **Risco Primário (Falha de Rede Externa):** Indisponibilidade da API do Google Calendar gerar um bloqueio permanente da sala no banco local.
- **Plano de Mitigação:** Adoção da máquina de estados. Caso a API do Google retorne `504 Gateway Timeout` ou a requisição falhe após a inserção no banco local, o Node.js captura o erro (`try/catch`), remove a reserva com status `PENDENTE` (liberando o horário) e retorna `503 Service Unavailable` orientando o usuário a tentar novamente mais tarde.

### Estratégia de Monitoramento

- **Logging Dinâmico:** A biblioteca `morgan` registrará todas as transações HTTP no terminal do servidor, mapeando gargalos de tempo de processamento entre o acesso ao SQLite e o retorno da chamada à API externa.
- **Manutenção Preventiva:** A durabilidade do arquivo `database.sqlite` permite auditoria direta e backup imediato via cópia de arquivo físico. O gerenciamento de quotas de *requests* gratuitos da *Service Account* ocorrerá através do painel integrado do Google Cloud Console.

## 9. Plano de Implementação

A execução do projeto está estruturada em ciclos semanais para validação gradativa das camadas de sistema.

- **Semana 1 (Setup e Infraestrutura):** Inicialização do ambiente Node.js, configuração do Google Cloud Console, geração do arquivo JSON da *Service Account* e estruturação da tabela no SQLite.
- **Semana 2 (Core Business Logic):** Desenvolvimento das rotas GET e lógica de bloqueio de concorrência. Testes rigorosos de sobreposição de horários consultando o banco local.
- **Semana 3 (Camada de Integração):** Acoplamento do SDK `googleapis`. Implementação das rotas POST (Criação) e DELETE (Cancelamento) comunicando-se com a agenda, incluindo a conversão obrigatória para o padrão ISO 8601.
- **Semana 4 (Polimento e Testes Finais):** Tratamento das falhas de rede simulando a queda de internet, exportação da coleção no Postman para testes do avaliador e redação final da documentação técnica.
