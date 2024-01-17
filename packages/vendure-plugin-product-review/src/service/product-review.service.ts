import { Injectable } from "@nestjs/common";
import {
  ID,
  RequestContext,
  TransactionalConnection,
  TranslatorService,
} from "@vendure/core";
import { ProductReview } from "../entity/product-review.entity";

@Injectable()
export class ProductReviewService {
  constructor(
    private connection: TransactionalConnection,
    private translator: TranslatorService
  ) {}

  /**
   * @description
   * Returns all reviews for a given product
   */
  async findAll(ctx: RequestContext, productId: ID): Promise<ProductReview[]> {
    const reviews = await this.connection
      .getRepository(ctx, ProductReview)
      .find({
        where: {
          product: {
            id: productId,
          },
        },
        relations: ["customer"],
      });

    return reviews;
  }

  createReview(
    ctx: RequestContext,
    productId: ID,
    review: {
      text: string;
      rating: number;
      customerId?: ID;
    }
  ) {
    const repository = this.connection.getRepository(ctx, ProductReview)
    const entity = repository.create({
      product: {
        id: productId,
      },
      text: review.text,
      rating: review.rating,
      customer: {
        id: review.customerId,
      },
    });

    return repository.save(entity)
  }
}
