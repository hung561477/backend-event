import {Entity, PrimaryGeneratedColumn, Column} from 'typeorm';

@Entity()
export class Contact {

    @PrimaryGeneratedColumn()
    id: number;
    @Column({type: 'varchar', nullable: true})
    name: string;
    @Column({type: 'varchar', nullable: true})
    first_name: string;
    @Column({type: 'varchar', nullable: true})
    last_name: string;
    @Column({type: 'text', nullable: true})
    description: string;
    @Column({type: 'varchar', nullable: true})
    email: string;

}
