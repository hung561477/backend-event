import {Entity, PrimaryGeneratedColumn, Column} from 'typeorm';

@Entity()
export class Account {

    @PrimaryGeneratedColumn()
    id: number;
    @Column('varchar')
    username: string;
    @Column('text')
    password: any;
    @Column({nullable: true, type: 'varchar'})
    token: any;
    @Column({nullable: true, type: 'datetime'})
    token_expire: Date;
    @Column({nullable: true, type: 'datetime'})
    verify_expire: Date;
    @Column({nullable: true, type: 'varchar'})
    verify: any;
    @Column({nullable: true, default: false})
    active: boolean;

}
