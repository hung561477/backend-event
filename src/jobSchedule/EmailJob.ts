// import {getConnection} from 'typeorm';
// import {NotificationEmailQueued} from '../entity/Notification-email-queued';
// import {sendEmail} from '../emailServer/SendEmail';

// const request = require('request');

// export async function sendMailChangeStatusByNow() {
//     const connection = getConnection();
//     const listNotificationEmail = await connection.manager.find(NotificationEmailQueued, {where: {status: true, should_send_on: 1}});
//     for (let i = 0; i < listNotificationEmail.length; i++) {
//         request('https://storage.googleapis.com/staging.meta-yen-216402.appspot.com/mail/body/' + listNotificationEmail[i].template_name, async function (error, response, body) {
//             request('https://storage.googleapis.com/staging.meta-yen-216402.appspot.com/mail/subject/' + listNotificationEmail[i].template_name, async function (errorSubject, responseSubject, bodySubject) {
//                 let subject = bodySubject;
//                 subject = subject.replace('${inventory_name}', listNotificationEmail[i].inventory_name);
//                 subject = subject.replace('${event_name}', listNotificationEmail[i].event_name);
//                 let content = body;
//                 content = content.replace('${first_name}', listNotificationEmail[i].first_name);
//                 content = content.replace('${last_name}', listNotificationEmail[i].last_name);
//                 content = content.replace('${company_name}', listNotificationEmail[i].company_name);
//                 content = content.replace('${inventory_name}', listNotificationEmail[i].inventory_name);
//                 content = content.replace('${event_name}', listNotificationEmail[i].event_name);
//                 content = content.replace('${inventory}', listNotificationEmail[i].inventory_name);
//                 content = content.replace('${event}', listNotificationEmail[i].event_name);
//                 const mail = {
//                     'email': listNotificationEmail[i].send_to,
//                     'subject': subject,
//                     'content': content
//                 };
//                 await sendEmail(mail);
//                 await connection.manager.update(NotificationEmailQueued, {id: listNotificationEmail[i].id}, {status: false});
//             });
//         });
//     }
// }

// export async function sendMailChangeStatusBy24h() {
//     const connection = getConnection();
//     const listNotificationEmail = await connection.manager.find(NotificationEmailQueued, {where: {status: true, should_send_on: 24}});
//     for (let i = 0; i < listNotificationEmail.length; i++) {
//         let diff = (listNotificationEmail[i].created.getTime() - new Date().getTime()) / 1000;
//         diff /= (60 * 60);
//         if (Math.abs(Math.round(diff)) === 24) {
//             request('https://storage.googleapis.com/staging.meta-yen-216402.appspot.com/mail/body/' + listNotificationEmail[i].template_name, async function (error, response, body) {
//                 request('https://storage.googleapis.com/staging.meta-yen-216402.appspot.com/mail/subject/' + listNotificationEmail[i].template_name, async function (errorSubject, responseSubject, bodySubject) {
//                     let subject = bodySubject;
//                     subject = subject.replace('${inventory_name}', listNotificationEmail[i].inventory_name);
//                     subject = subject.replace('${event_name}', listNotificationEmail[i].event_name);
//                     console.log(subject);
//                     let content = body;
//                     console.log(content);
//                     content = content.replace('${first_name}', listNotificationEmail[i].first_name);
//                     content = content.replace('${last_name}', listNotificationEmail[i].last_name);
//                     content = content.replace('${company_name}', listNotificationEmail[i].company_name);
//                     content = content.replace('${inventory_name}', listNotificationEmail[i].inventory_name);
//                     content = content.replace('${event_name}', listNotificationEmail[i].event_name);
//                     content = content.replace('${inventory}', listNotificationEmail[i].inventory_name);
//                     content = content.replace('${event}', listNotificationEmail[i].event_name);
//                     const mail = {
//                         'email': listNotificationEmail[i].send_to,
//                         'subject': subject,
//                         'content': content
//                     };
//                     await sendEmail(mail);
//                     await connection.manager.update(NotificationEmailQueued, {id: listNotificationEmail[i].id}, {status: false});
//                 });
//             });
//         }
//     }
// }
