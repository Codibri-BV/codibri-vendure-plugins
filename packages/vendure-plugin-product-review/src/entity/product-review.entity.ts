import { DeepPartial } from '@vendure/common/lib/shared-types';
import { VendureEntity, Product, EntityId, ID, Customer } from '@vendure/core';
import { Column, Entity, ManyToOne } from 'typeorm';

@Entity()
export class ProductReview extends VendureEntity {
    constructor(input?: DeepPartial<ProductReview>) {
        super(input);
    }

    @ManyToOne(type => Product)
    product: Product;
    
    @EntityId()
    productId: ID;

    @Column()
    text: string;

    @Column()
    rating: number;

    @ManyToOne(type => Customer, { nullable: true })
    customer: Customer;
    
    @EntityId({ nullable: true })
    customerId: ID;
}