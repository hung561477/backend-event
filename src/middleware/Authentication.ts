import {createParamDecorator} from 'routing-controllers';
import formatDateTime from '../util/formatDateTime';
import {EXPIRE_TIME, EXPIRE_VERIFY} from '../app.config';
import {getConnection, MoreThan} from 'typeorm';
import {Account} from '../entity/Account';
import {environment} from '../../environments/environment';

export function checkUserToken(option?: { role?: string[] }) {
    return createParamDecorator({
        required: true,
        value: async action => {
            const connection = getConnection();
            const token = action.request.headers['token'];
            const date = new Date();
            const expire_time = formatDateTime(new Date(date.getTime()));
            const token_expire = formatDateTime(new Date(date.getTime() + (EXPIRE_TIME * 60000)));
            const accountRespo = await connection.manager.findOne(Account, {
                where: {token, token_expire: (MoreThan(expire_time))}
            });
            // todo: check token and user role here
            if (accountRespo) {
                accountRespo.token_expire = token_expire;
                connection.manager.save(Account, accountRespo);
            }
            return !!accountRespo;
        }
    });
}

export function checkActiveVarify(option?: { role?: string[] }) {
    return createParamDecorator({
        required: true,
        value: async action => {
            const connection = getConnection();
            const verify = action.request.headers['verify'];
            const date = new Date();
            const verify_expire = formatDateTime(new Date(date.getTime()));
            let result;
            if (environment.verifyByTeam) {
                result = await connection.manager.findOne(Account, {where: {verify}});
            } else {
                result = await connection.manager.findOne(Account, {where: {verify, verify_expire: MoreThan(verify_expire)}});
            }
            // todo: check verify and set active true here
            if (result) {
                result.active = true;
                connection.manager.save(Account, result);
            }
            return !!result;
        }
    });
}
