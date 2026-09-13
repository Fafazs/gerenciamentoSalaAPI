require('dotenv').config();
const fs = require('fs');

class Reservas {

    //Credenciais do usuário da API;

    #credentials = require(__dirname + '/../credentials.json');

    //Dados para a criação da reserva;

        //Nome da reserva;
        #name_event;

        //Localização do lugar da reserva;
        #localization_event;
        
        //Descrição da reserva;
        #description_event;

        //Quando que a reserva começa;
        #start_date_time_event;
        
        //Timezone do começo da reserva;
        #start_timezone_event;
        
        //Quando a reserva termina;
        #end_date_time_event;
        
        //Timezone do fim da reserva;
        #end_timezone_event;
        
        //Lista com todos os emails envolvendo a reserva;
        #array_emails_event;

    //Variáveis para log;

    #date = new Date();
    #log_archive_name = path.join(
        __dirname,
        '..',
        'logs',
        'models',
        'reservas.js',
        `RESERVAS_${this.#date.getFullYear()}-${String(this.#date.getMonth() + 1).padStart(2, '0')}-${String(this.#date.getDate()).padStart(2, '0')}.log`
    );

    //Constructor;

    constructor(name_event, localization_event, description_event, start_date_time_event, start_timezone_event, end_date_time_event, end_timezone_event, arrays_emails_event){

        this.#name_event = name_event;

        this.#localization_event = localization_event;

        this.#description_event = description_event;

        this.#start_date_time_event = start_date_time_event;

        this.#start_timezone_event = start_timezone_event;

        this.#end_date_time_event = end_date_time_event;
        
        this.#end_timezone_event = end_timezone_event;

        this.#array_emails_event = arrays_emails_event.map(email => ({ email }));

    }

    //Setters;

    setNameEvent(name_event){

        this.#name_event = name_event;

    }

    setLocalizationEvent(localization_event){

        this.#localization_event = localization_event;
        
    }

    setDescriptionEvent(description_event){

        this.#description_event = description_event;

    }

    setStartDateTimeEvent(start_date_time_event){

        this.#start_date_time_event = start_date_time_event;

    }

    setStartTimezoneEvent(start_timezone_event){

        this.#start_timezone_event = start_timezone_event;

    }

    setEndDateTimeEvent(end_date_time_event){

        this.#end_date_time_event = end_date_time_event;

    }

    setEndTimezoneEvent(end_timezone_event){

        this.#end_timezone_event = end_timezone_event;

    }

    setArraysEmailsEvent(arrays_emails_event){

        this.#array_emails_event = arrays_emails_event.map(email => ({ email }));

    }

    setLogArchiveName(log_archive_name){

        this.#log_archive_name = log_archive_name;

    }

    //Getters;

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

    getStartTimezoneEvent(){

        return this.#start_timezone_event;

    }

    getEndDateTimeEvent(){

        return this.#end_date_time_event;

    }

    getEndTimezoneEvent(){

        return this.#end_timezone_event;

    }

    getArraysEmailsEvent(){

        return this.#array_emails_event;

    }

    getLogArchiveName(){

        return this.#log_archive_name;

    }

    //Métodos;

    criarReserva(){

        const { google } = require('googleapis');

        const oauth2Client = new google.auth.OAuth2(
            this.#credentials.client_id,
            this.#credentials.client_secret,
            this.#credentials.redirect_uris + ":" + process.env.PORT
        );

        oauth2Client.setCredentials({
            access_token: process.env.USER_ACCESS_TOKEN,
            refresh_token: process.env.USER_REFRESH_TOKEN
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        async function createCalendarEvent() {
            const event = {
                summary: this.#name_event,
                location: this.#localization_event,
                description: this.#description_event,
                start: {
                    dateTime: this.#start_date_time_event,
                    timeZone: this.#start_timezone_event,
                },
                end: {
                    dateTime: this.#end_date_time_event,
                    timeZone: this.#end_timezone_event,
                },
                attendees: this.#array_emails_event,
                reminders: {
                    useDefault: true
                },
            };

            const logLines = [
                `Reserva: ${event.summary}`,
                `Local: ${event.location}`,
                `Descrição: ${event.description}`,
                `Início: ${event.start.dateTime} (${event.start.timeZone})`,
                `Fim: ${event.end.dateTime} (${event.end.timeZone})`,
                `Participantes: ${event.attendees.map(a => a.email).join(', ')}`
            ];

            fs.appendFile(this.#log_archive_name, logLines.join('\n') + '\n\n', 'utf8', (err) => {
                if (err) throw err;
            })

            try {
                const response = await calendar.events.insert({
                calendarId: 'primary',
                resource: event,
                conferenceDataVersion: 1,
                sendUpdates: 'all',
                });

                //validação para mostrar que evento foi criado, pode ser incluido no response da nossa API

            } catch (error) {

                console.error('Error creating calendar event:', error);

            }
            
        }

        createCalendarEvent();

    }

}