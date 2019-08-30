import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {Amenities} from './Amenities';
import {Inventory} from './Inventory';

@Entity()
export class InventoryAmenities {
    @PrimaryGeneratedColumn()
    id: number;
    @ManyToOne(type => Inventory, inventory => inventory.id)
    @JoinColumn()
    inventory: Inventory;
    @ManyToOne(type => Amenities, amenities => amenities.id)
    @JoinColumn()
    amenities: Amenities;
}
