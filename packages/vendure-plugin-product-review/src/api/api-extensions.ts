import { gql } from "graphql-tag";

export const shopSchema = gql`
  type ProductReview {
    id: ID!
    text: String!
    rating: Int!
    createdAt: DateTime!
    customer: Customer
  }

  extend type Product {
    reviews: [ProductReview]!
  }

  extend type Mutation {
    createProductReview(prouctId: ID!, text: String!, rating: Int!, customerId: ID): ProductReview
  }
`;
