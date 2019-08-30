// import {Entity, PrimaryGeneratedColumn, Column} from 'typeorm';

// @Entity()
// export class NotificationEmailQueued {

//     @PrimaryGeneratedColumn()
//     id: number;
//     @Column('int')
//     user_id: number;
//     @Column({nullable: false, type: 'varchar'})
//     template_name: string;
//     @Column({nullable: false, default: true})
//     status: boolean;
//     @Column('int')
//     should_send_on: number;
//     @Column({nullable: true, type: 'varchar'})
//     send_to: string;
//     @Column({nullable: true, type: 'varchar'})
//     first_name: string;
//     @Column({nullable: false, type: 'varchar'})
//     last_name: string;
//     @Column({nullable: true, type: 'varchar'})
//     company_name: string;
//     @Column({nullable: true, type: 'varchar'})
//     inventory_name: string;
//     @Column({nullable: true, type: 'varchar'})
//     event_name: string;
//     @Column({nullable: false, type: 'datetime'})
//     created: Date;
//     @Column({nullable: false, type: 'datetime'})
//     updated: Date;
// }
