import { IsEmail, MinLength, MaxLength } from 'class-validator';

export class AccountModel {

    username: string;
    password: string;
    token: string;
    token_expire: Date;
}
