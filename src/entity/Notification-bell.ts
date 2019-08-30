import {Entity, PrimaryGeneratedColumn, Column} from 'typeorm';

@Entity()
export class NotificationBell {

    @PrimaryGeneratedColumn()
    id: number;
    @Column('int')
    user_id: number;
    @Column({nullable: true, default: true})
    status: boolean;
    @Column({nullable: true, type: 'varchar'})
    subject: string;
    @Column({nullable: true, type: 'varchar'})
    content: string;
    @Column({nullable: false, type: 'datetime'})
    created: Date;
    @Column({nullable: false, type: 'datetime'})
    updated: Date;

}
