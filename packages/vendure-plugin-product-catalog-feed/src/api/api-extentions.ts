import gql from 'graphql-tag';

export const adminApiExtensions = gql`
    extend type Mutation {
        rebuildProductCatalog: Job
    }
`;