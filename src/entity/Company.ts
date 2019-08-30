import {Entity, PrimaryGeneratedColumn, Column} from 'typeorm';

@Entity()
export class Company {

    @PrimaryGeneratedColumn()
    id: number;
    @Column('varchar')
    name: string;
    @Column('text')
    description: string;
    @Column({type: 'varchar', nullable: true})
    email: string;
    @Column('varchar')
    website: string;
    @Column('varchar')
    address: string;
    @Column('varchar')
    industry: string;
}
