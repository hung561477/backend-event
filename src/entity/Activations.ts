import {Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class Activations {
    @PrimaryGeneratedColumn()
    id: number;
    @Column('varchar')
    name: string;
    @Column('varchar')
    icon: string;
    @Column({type: 'varchar', nullable: true})
    description: string;
}
