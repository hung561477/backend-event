import {Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class Career {
    @PrimaryGeneratedColumn()
    id: number;
    @Column('varchar')
    name: string;
    @Column({type: 'varchar', nullable: true})
    description: string;
}
