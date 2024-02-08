import { PermissionDefinition } from '@vendure/core';

export const loggerCtx = 'ProductCatalogFeed';
export const PLUGIN_INIT_OPTIONS = Symbol('PLUGIN_INIT_OPTIONS');

export const productCatalogFeedPerm = new PermissionDefinition({
    name: 'ProductCatalogFeedRebuild',
    description: 'Allow to manually trigger a rebuild for the product catalog feed'
});