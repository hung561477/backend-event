import {SENDGRID_API_KEY, SENDGRID_SENDER} from '../../environments/environment';
const Sendgrid = require('sendgrid')(SENDGRID_API_KEY);


const sendMailFunction = (sgReq) => {
    return new Promise((resolve, reject) => {
        Sendgrid.API(sgReq, (err) => {
            if (err) {
                console.log(err.response.body);
                reject();
            }
            // Render the index route on success
            resolve();
        });
    });
};


export const sendEmail = async (body: any) => {
    const sgReq = Sendgrid.emptyRequest({
        method: 'POST',
        path: '/v3/mail/send',
        body: {
            personalizations: [{
                to: [{'email': body.email}],
                subject: body.subject
            }],
            from: {'email': SENDGRID_SENDER},
            content: [{
                type: 'text/html',
                value: body.content
            }]
        }
    });
    return await sendMailFunction(sgReq)
        .then(() => {
            return true;
        })
        .catch(() => {
            return false;
        });
};
