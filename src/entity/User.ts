import {Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn} from 'typeorm';
import {Account} from './Account';
import {Role} from './Role';
import {Company} from './Company';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('varchar')
    first_name: string;

    @Column('varchar')
    last_name: string;

    @Column('varchar')
    category: string;

    @Column('varchar')
    phone: string;

    @Column('datetime')
    create_date: Date;

    @OneToOne(type => Account)
    @JoinColumn()
    account: Account;

    @ManyToOne(type => Role, role => role.id)
    @JoinColumn()
    role: Role;

    @ManyToOne(type => Company, company => company.id)
    @JoinColumn()
    company: Company;

    @Column({type: 'varchar', nullable: true})
    company_name: string;
}
