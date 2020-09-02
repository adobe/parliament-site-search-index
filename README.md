# @adobe/parliament-site-search-index

A Gatsby plugin for creating an ElasticLunr search index of markdown and Open API specs.

## Install

`npm install --save @adobe/parliament-site-search-index`

## How to use

```javascript
// In your gatsby-config.js
module.exports = {
  plugins: [`@adobe/parliament-site-search-index`],
}
```

## How to query

You can query file nodes like the following:

```graphql
{
  ParliamentSearchIndex
}
```

## Contributing

Contributions are welcomed! Read the [Contributing Guide](./.github/CONTRIBUTING.md) for more information.

## Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
