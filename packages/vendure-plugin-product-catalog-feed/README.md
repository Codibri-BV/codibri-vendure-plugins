# Vendure product catalog feed plugin

This plugin generates an xml of all products to sync your catalog with Google or other tools.

When a product or variant is changed, the channel will be marked to rebuild the xml. Every night the channels with changes get rebuild. The interval for the rebuild is configurable via cron notation. For each channel the build is executed in a worker.

## Requirements

Install the Payments plugin and the Mollie client:

`yarn add @codibri/vendure-plugin-product-catalog-feed`
or
`npm install @codibri/vendure-plugin-product-catalog-feed`

## Setup

1. Add the plugin to your VendureConfig plugins array and add `ProductCatalogFeedPlugin.ui` to the AdminUi plugin

```typescript
import { ProductCatalogFeedPlugin } from "@codibri/vendure-plugin-product-catalog-feed";

// ...

plugins: [
  AdminUiPlugin.init({
    port: 3002,
    route: "admin",
    app: compileUiExtensions({
      outputPath: path.join(__dirname, "../admin-ui"),
      extensions: [ProductCatalogFeedPlugin.ui],
      devMode: true,
    }),
  }),
  ProductCatalogFeedPlugin.init({ outputInterval: "0 0 * * *" }),
];
```

2. Go to the channel config in the Admin UI and change the _Product catalog_ field to _URL_ or _SFTP_ to enable the channels product feed.

## Plugin options

| key            | required | default value | description                                                   |
| -------------- | -------- | ------------- | ------------------------------------------------------------- |
| assetUrlPrefix | yes      |               | The url to access the Vendure server                          |
| outputInterval | no       | `0 0 * * *`   | The interval for building the XML file in _cronTime_ notation |

## Config

In the Admin UI you can configure each channel individually.

| Field           | Description                                                                                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shop URL        | THe url of the shop front end.                                                                                                                                                                                                             |
| Product catalog | <ul><li>**Disabled**: No product feed will be generated for this channel</li><li></li>**URL**: The XML file will be build and availble via an url<li>**SFTP**: The XML file will be build and uploaded to configured SFTP server</li></ul> |
| SFTP server     | Only when **SFTP** is selected as output                                                                                                                                                                                                   |
| SFTP port       | Only when **SFTP** is selected as output. Must be between 1 and 65535                                                                                                                                                                      |
| SFTP user       | Only when **SFTP** is selected as output                                                                                                                                                                                                   |
| SFTP password   | Only when **SFTP** is selected as output                                                                                                                                                                                                   |

## API endpoint

When **URL** is selected in the channel config, the genrated XML is availble via the `/product-catalog`

If you only have multiple channel, you can provide the channel token in the header or as query parameter.
`/product-catalog?token=channelToken`

## Manual trigger

On the products overview page in the Admin UI you will find a new button "Rebuild product catalog" to trigger the build of the product catalog feed of the current selected channel.

An extra permission `ProductCatalogFeedRebuild` is added to control who can accees the manual trigger button on the products page.
