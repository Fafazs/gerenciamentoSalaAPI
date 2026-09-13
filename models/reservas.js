require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

class Reservas {

    //------------------------------- Credenciais do usuário da API;



        #credentials = require(__dirname + '/../credentials.json');



    //------------------------------- Dados para a criação da reserva;



        //ID da sala da reserva;
        #sala_id;

        //Nome da reserva;
        #name_event;

        //Localização do lugar da reserva;
        #localization_event;

        //Descrição da reserva;
        #description_event;

        //Quando que a reserva começa;
        #start_date_time_event;

        //Quando a reserva termina;
        #end_date_time_event;

        //Timezone dos horários;
        #timezone_event;

        //Lista com todos os emails envolvendo a reserva, o primeiro e-mail deve ser o do cliente que solicitou a reserva;
        #array_emails_event;



    //------------------------------- Constructor;



    constructor(sala_id, name_event, localization_event, description_event, start_date_time_event, end_date_time_event, timezone_event, arrays_emails_event){

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        //Validação de dados;

        if (sala_id !== undefined && sala_id !== null && sala_id !== '') {

            this.#sala_id = sala_id;
        
        } else {
        
            const erro = new Error("O ID da sala da reserva deve ser informado.");
            erro.statusCode = 400;
            throw erro;
        
        }

        if(name_event && name_event.trim() !== ""){

            this.#name_event = name_event;

        } else {

            const erro = new Error("O nome do evento deve ser preenchido.");
            erro.statusCode = 400;
            throw erro;

        }

        if(localization_event && localization_event.trim() !== ""){

            this.#localization_event = localization_event;

        } else {

            const erro = new Error("A localização do evento deve ser preenchida.");
            erro.statusCode = 400;
            throw erro;

        }

        if(!start_date_time_event || start_date_time_event.trim() == ""){

            const erro = new Error("Horário de início não foi definido.");
            erro.statusCode = 400;
            throw erro;

        }

        if(!end_date_time_event || end_date_time_event.trim() == ""){

            const erro = new Error("Horário de fim não foi definido.");
            erro.statusCode = 400;
            throw erro;

        }

        const dataInicio = new Date(start_date_time_event);
        const dataFim = new Date(end_date_time_event);

        if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) {
            const erro = new Error("Os horários não podem estar vazios.");
            erro.statusCode = 400;
            throw erro;
        }

        if(dataInicio < dataFim){

            this.#start_date_time_event = start_date_time_event;

            this.#end_date_time_event = end_date_time_event;

        } else {

            const erro = new Error("O horário de término deve ser posterior ao início.");
            erro.statusCode = 400;
            throw erro;

        }

        if(timezone_event && timezone_event.trim() !== ""){

            this.#timezone_event = timezone_event;

        } else {

            const erro = new Error("A timezone do evento deve ser preenchida.");
            erro.statusCode = 400;
            throw erro;

        }

        if (!arrays_emails_event || !Array.isArray(arrays_emails_event) || arrays_emails_event.length === 0) {
            const erro = new Error("É necessário fornecer pelo menos um e-mail válido.");
            erro.statusCode = 400;
            throw erro;
        }

        for(let i = 0; i < arrays_emails_event.length; i++){

            if(!emailRegex.test(arrays_emails_event[i])){

                const erro = new Error((i + 1) + "º e-mail não é válido.");
                erro.statusCode = 400;
                throw erro;

            }

        }

        this.#array_emails_event = arrays_emails_event.map(email => ({ email }));

        this.#description_event = description_event;

    }



    //------------------------------- Setters;



    setSalaID(sala_id){

        this.#sala_id = this.validacaoErroIsEmpty(sala_id, 400, "O ID da sala da reserva deve ser informado.");

    }

    setNameEvent(name_event){

        this.#name_event = this.validacaoErroIsEmpty(name_event, 400, "O nome do evento deve ser preenchido.");

    }

    setLocalizationEvent(localization_event){

        this.#localization_event = this.validacaoErroIsEmpty(localization_event, 400, "A localização deve ser preenchida");
        
    }

    setDescriptionEvent(description_event){

        this.#description_event = description_event;

    }

    setStartDateTimeEvent(start_date_time_event){

        this.#start_date_time_event = this.validacaoErroTime(start_date_time_event, "i");

    }

    setEndDateTimeEvent(end_date_time_event){

        this.#end_date_time_event = this.validacaoErroTime(end_date_time_event, "f");

    }

    setTimezoneEvent(timezone_event){
    
        this.#timezone_event = this.validacaoErroIsEmpty(timezone_event, 400, "O fuso horário deve ser preenchido.");

    }

    setArraysEmailsEvent(arrays_emails_event){

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        if (!arrays_emails_event || !Array.isArray(arrays_emails_event) || arrays_emails_event.length === 0) {
            const erro = new Error("É necessário fornecer pelo menos um e-mail válido.");
            erro.statusCode = 400;
            throw erro;
        }

        for(let i = 0; i < arrays_emails_event.length; i++){

            if(!emailRegex.test(arrays_emails_event[i])){

                const erro = new Error((i + 1) + "º e-mail não é válido.");
                erro.statusCode = 400;
                throw erro;

            }

        }

        this.#array_emails_event = arrays_emails_event.map(email => ({ email }));

    }



    //------------------------------- Getters;



    getSalaID(){

        return this.#sala_id;

    }

    getNameEvent(){

        return this.#name_event;

    }

    getLocalizationEvent(){

        return this.#localization_event;
        
    }

    getDescriptionEvent(){

        return this.#description_event;

    }

    getStartDateTimeEvent(){

        return this.#start_date_time_event;

    }

    getEndDateTimeEvent(){

        return this.#end_date_time_event;

    }

    getTimezoneEvent(){

        return this.#timezone_event;

    }

    getArraysEmailsEvent(){

        return this.#array_emails_event;

    }



    //------------------------------- Métodos;

    validacaoErroIsEmpty(dado, codigo, mensagem_erro){

        if(dado && dado.trim() !== ""){

            return dado;

        } else {

            const erro = new Error(mensagem_erro);
            erro.statusCode = codigo;
            throw erro;

        }

    }

    validacaoErroTime(dado, tempo_a_definir){

        let dataInicio;
        let dataFim;

        if(tempo_a_definir === "i"){

            dataInicio = new Date(dado);
            dataFim = new Date(this.#end_date_time_event);

        } else if(tempo_a_definir === "f"){

            dataInicio = new Date(this.#start_date_time_event);
            dataFim = new Date(dado);

        } else {

            const erro = new Error("Erro na validação de horários.");
            erro.statusCode = 400;
            throw erro;

        }

        if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) {
            const erro = new Error("Os horários estão inválidos.");
            erro.statusCode = 400;
            throw erro;
        }

        if(dataInicio < dataFim){

            return dado;

        } else {

            const erro = new Error("O horário de término deve ser posterior ao início.");
            erro.statusCode = 400;
            throw erro;

        }

    }

    criarArrayLog(reserva, local, descricao, inicio, fim, timezone, participantes, status){

        return [
            `Reserva: ${reserva}`,
            `Local: ${local}`,
            `Descrição: ${descricao}`,
            `Início: ${inicio} (${timezone})`,
            `Fim: ${fim} (${timezone})`,
            `Participantes: ${participantes}`,
            `Status: ${status}`
        ];

    }

    async criarReserva(db){

        //GERAÇÃO DE NOME DOS LOGS, MEXER SÓ SE NECESSÁRIO;

        const date = new Date();

        const log_archive_name = path.join(
            __dirname, '..', 'logs', 'models', 'reservas.js',
            `RESERVAS_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.log`
        );

        //COMUNICAÇÃO COM O GOOGLEAPIS;

        const oauth2Client = new google.auth.OAuth2(
            this.#credentials.client_id,
            this.#credentials.client_secret,
            this.#credentials.redirect_uris + ":" + process.env.PORT
        );

        oauth2Client.setCredentials({
            access_token: process.env.USER_ACCESS_TOKEN,
            refresh_token: process.env.USER_REFRESH_TOKEN
        });

        //COMUNICAÇÃO COM O GOOGLE CALENDAR API;

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        //CRIACAO DO JSON DAS INFORMAÇÕES DA RESERVA;

        const event = {
            summary: this.#name_event,
            location: this.#localization_event,
            description: this.#description_event,
            start: {
                dateTime: this.#start_date_time_event,
                timeZone: this.#timezone_event,
            },
            end: {
                dateTime: this.#end_date_time_event,
                timeZone: this.#timezone_event,
            },
            attendees: this.#array_emails_event,
            reminders: {
                useDefault: true
            },
        };

        //VERIFICAÇÃO DE CHOQUE DE HORÁRIOS NO MYSQLITE;
        
        const sql_verificacao = `
            SELECT id FROM reservas 
            WHERE salaId = ? 
            AND status != 'CANCELADO'
            AND inicio < ? 
            AND fim > ?
        `;

        const conflito = await db.get(sql_verificacao, [this.#sala_id, event.end.dateTime, event.start.dateTime]);
        let status = "PENDENTE";

        if (!conflito) {

            //CRIACAO DA RESERVA NO MYSQLITE;

            const response_db = await db.run(`
                INSERT INTO reservas (salaId, emailResponsavel, inicio, fim, googleEventId, status)
                VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    this.#sala_id, 
                    event.attendees[0].email, 
                    event.start.dateTime, 
                    event.end.dateTime, 
                    null,
                    status
            ]);

            try {

                //CRIACAO DO EVENTO NO GOOGLE CALENDAR DO USUARIO
                
                const response_google = await calendar.events.insert({
                    calendarId: 'primary',
                    resource: event,
                    conferenceDataVersion: 1,
                    sendUpdates: 'all',
                });

                status = "CONFIRMADO";

                const log = this.criarArrayLog(event.summary, event.location, event.description, event.start.dateTime, event.end.dateTime, event.start.timeZone, event.attendees.map(a => a.email).join(', '), status);

                await fs.promises.appendFile(
                    log_archive_name,
                    log.join('\n') + '\n\n',
                    'utf8'
                );

                //ATUALIZAÇÃO DA RESERVA NO MYSQLITE;

                await db.run(`
                    UPDATE reservas SET googleEventID = ?, status = ? WHERE id = ?;
                    `, [
                        response_google.data.id,
                        status,
                        response_db.lastID
                    ]);
                
            } catch (erro) {

                await db.run(`
                    DELETE FROM reservas WHERE id = ? AND status = "PENDENTE";
                    `, [
                        response_db.lastID
                    ]);

                status = "CANCELADO";

                const log = this.criarArrayLog(event.summary, event.location, event.description, event.start.dateTime, event.end.dateTime, event.start.timeZone, event.attendees.map(a => a.email).join(', '), status);

                await fs.promises.appendFile(
                    log_archive_name,
                    log.join('\n') + '\n\n',
                    'utf8'
                );

                throw erro;

            }

        } else {

            const erro = new Error("Há um agendamento neste horário.");

            erro.statusCode = 400;
            status = "CANCELADO";

            const log = this.criarArrayLog(event.summary, event.location, event.description, event.start.dateTime, event.end.dateTime, event.start.timeZone, event.attendees.map(a => a.email).join(', '), status);

            await fs.promises.appendFile(
                log_archive_name,
                log.join('\n') + '\n\n',
                'utf8'
            );

            throw erro;

        }

    }

}