import {Entity, PrimaryGeneratedColumn, Column} from 'typeorm';

@Entity()
export class Photo {

    @PrimaryGeneratedColumn()
    id: number;
    @Column('varchar')
    url: string;
    @Column('text')
    description: string;
}
