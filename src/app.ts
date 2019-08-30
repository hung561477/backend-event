import 'reflect-metadata';
import {createExpressServer} from 'routing-controllers';
import {createConnection} from 'typeorm';
import {UserController} from './controller/UserController';
import {CustomErrorHandler} from './middleware/GlobalErrorHandler';
import {UploadFileControllerController} from './controller/UploadFileController';
import {EventController} from './controller/EventController';
import {CompanyController} from './controller/CompanyController';
import {UserEventController} from './controller/UserEventController';
import {SearchController} from './controller/SearchController';
import {InventoryController} from './controller/InventoryController';
import {HOST, PORT} from './app.config';
import {TestController} from './controller/TestController';
import {ActivationsController} from './controller/ActivationsController';
import {AmenitiesController} from './controller/AmenitiesController';
import {CareerController} from './controller/CareerController';
import {SendGridController} from './controller/SendGridController';
import {ContactController} from './controller/ContactController';
// import {UserInventoryController} from './controller/UserInventoryController';
import passport = require('passport');
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
import {NotificationController} from './controller/NotificationController';
// import {sendMailChangeStatusBy24h, sendMailChangeStatusByNow} from './jobSchedule/EmailJob';
const cron = require('node-cron');
const timeout = require('connect-timeout')

const app = createExpressServer({
    cors: true,
    defaultErrorHandler: false,
    controllers: [
        ActivationsController, AmenitiesController, CareerController, CompanyController, EventController, InventoryController, SearchController, TestController,
        UploadFileControllerController, UserController, UserEventController, SendGridController, ContactController, NotificationController
    ],
    middlewares: [CustomErrorHandler]
});

app.use(timeout('10m'));

app.listen(PORT, HOST);
