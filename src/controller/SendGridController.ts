import {Body, Get, JsonController, Post, Req, Res} from 'routing-controllers';
import {SENDGRID_API_KEY, SENDGRID_SENDER} from '../../environments/environment';
import {ResponseObject} from '../model/response';
import {checkActiveVarify} from '../middleware/Authentication';
import {Request, Response} from 'express';
import passport = require('passport');


const Sendgrid = require('sendgrid')(SENDGRID_API_KEY);

@JsonController()
export class SendGridController {


    sendMailFunction(sgReq) {
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
    }
    @Post('/hello')
    async sendEmail(@Body() body: any) {
        const sgReq = Sendgrid.emptyRequest({
            method: 'POST',
            path: '/v3/mail/send',
            body: {
                personalizations: [{
                    to: [{ 'email': body.email}],
                    subject: body.subject
                }],
                from: { 'email': SENDGRID_SENDER },
                content: [{
                    type: 'text/plain',
                    value: body.content
                }]
            }
        });
        return await this.sendMailFunction(sgReq)
            .then(() => {
                return new ResponseObject(200, 'Email sent!!');
            })
            .catch(() => {
                return new ResponseObject(204, 'Email send error!');
            });
    }

    @Get('/verify')
    async checkActiveVerify(@checkActiveVarify() active: boolean) {
        if (active) {
            return new ResponseObject(200, 'Verify success!');
        }
        return new ResponseObject(204, 'Verify expire!');
    }

    @Get('/test/linkedin')
    async testConcac(@Req() request: Request, @Res() response: Response) {
        passport.authenticate('linkedin', {
            successRedirect: '/',
            failureRedirect: '/login'
        });

    }
}
