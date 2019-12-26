import fetch from 'axios';

export enum EMethods {
    POST = 'POST',
    GET = 'GET',
    OPTIONS = 'OPTIONS'
}

export interface IEvent {
    httpMethod: keyof typeof EMethods,
    body: string,
}

interface ILogin {
    userKey: string;
    sessionKey: string;
}

interface ISms {
    number: string;
    message: string;
}

const MESSAGE_HIGH_QUALITY = "GP";
const MESSAGE_MEDIUM_QUALITY = "TI";
const MESSAGE_LOW_QUALITY = "SI";

const BASEURL = process.env.URL;
const username = process.env.USER;
const password = process.env.PASSWORD;

/*
 * State management.
 * Checks whether there is a token available and if there isn't one logs in
 * again and sets it.
*/
class Driver {
    private userData: ILogin;
    public error: string | null;

    constructor() {
        this.userData = {
            userKey: '',
            sessionKey: '',
        };
    }

    /**
     * Authenticates the user given it's username and password.  Callback
     * is called when completed. If error is false, then an authentication
     * object is passed to the callback as second parameter.
     */
    private login: () => Promise<void> = async () => {
        try {
            const loginData = await fetch(`${BASEURL}/login?username=${username}&password=${password}`);

            this.userData = {
                userKey: loginData.data.split(';')[0],
                sessionKey: loginData.data.split(';')[1],
            };
        } catch (e) {
            this.error = e.message;

            console.log('error login', this.error);
        }
    }


    /**
     * Sends an SMS message
     */
    public sendSMS: (smsData: ISms) => Promise<void> = async (smsData) => {
        const body = {
            message_type: MESSAGE_HIGH_QUALITY,
            recipient: [
                `+${smsData.number}`
            ],
            message: smsData.message,
        }

        try {

            if (!this.userData.userKey) {
                await this.login();
            }

            const sentSms = await fetch(`${BASEURL}/sms`, {
                method: 'POST',
                headers: {
                    'user_key': this.userData.userKey,
                    'session_key': this.userData.sessionKey,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(body),
            });

            return sentSms.data;
        } catch (e) {
            this.error = e.message;

            console.log('Error sending', this.error);

            throw new Error(this.error);
        }
    };
}



class Sms {
    instance: Driver;

    constructor() {
        if (!this.instance) {
            this.instance = new Driver();
        }
    }

    public getInstance() {
        return this.instance;
    }
}

exports.handler = async (event: IEvent) => {

    if (event.httpMethod !== 'POST') {
        // To enable CORS
        return {
            statusCode: 200, // <-- Important!
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
            }
        };
    }

    const params = JSON.parse(event.body) || {};

    if (!params.number || !params.message) {
        return {
            statusCode: 400,
            body: "Sembra che i dati inviati non siano corretti"
        };
    }


    const service = new Sms();
    const skebby = service.getInstance();

    try {
        const result = await skebby.sendSMS(params);

        return {
            statusCode: 200,
            body: JSON.stringify(result),
        }
    } catch (e) {
        return {
            statusCode: 400,
            body: JSON.stringify(skebby.error),
        }
    }
};