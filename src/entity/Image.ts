import {Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn} from 'typeorm';
import {Photo} from './Photos';

@Entity()
export class Image {
    @PrimaryGeneratedColumn()
    id: number;
    @Column('varchar')
    type: string;
    @Column('int')
    typeId: number;
    @OneToOne(type => Photo, photo => photo.id)
    @JoinColumn()
    photo: Photo;
}
