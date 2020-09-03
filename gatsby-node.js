/**
 *  Copyright 2020 Adobe. All rights reserved.
 *  This file is licensed to you under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License. You may obtain a copy
 *  of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software distributed under
 *  the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 *  OF ANY KIND, either express or implied. See the License for the specific language
 *  governing permissions and limitations under the License.
 */
const elasticlunr = require(`elasticlunr`)
const { GraphQLJSONObject } = require("graphql-type-json")
const fetch = require("node-fetch")
const JSON5 = require("json5")
const converter = require("widdershins")

function getObjects(obj, key, val) {
  var objects = []
  for (var i in obj) {
    if (!obj.hasOwnProperty(i)) continue
    if (typeof obj[i] == "object") {
      objects = objects.concat(getObjects(obj[i], key, val))
    }
    //if key matches and value matches
    else if (i == key && val.endsWith(obj[i]) && obj[i] !== "/") {
      if (obj.path !== "") {
        objects.push(obj)
      }
    } else if (obj[i] == val && key == "") {
      //only add if the object is not already in the array
      if (objects.lastIndexOf(obj) == -1) {
        if (obj.path !== "") {
          objects.push(obj)
        }
      }
    }
  }
  return objects
}

function getPageInfo(siteMetadata, filePath) {
  let objs = getObjects(siteMetadata.pages, "path", filePath)
  if (objs.length <= 0) {
    objs = getObjects(siteMetadata.subPages, "path", filePath)
  }
  return objs[0] || { title: "", path: "" }
}

/**
 * Add custom field resolvers to the GraphQL schema. Allows adding new fields to types by providing field configs,
 * or adding resolver functions to existing fields.
 *
 * We are using this to save the search index as a JSON object as we create here during build time.
 *
 * [Gatsby Node API - createResolvers]{@link https://www.gatsbyjs.org/docs/node-apis/#createResolvers}
 *
 * @param {function} createResolvers
 */
exports.createResolvers = ({ createResolvers }) => {
  createResolvers({
    Query: {
      ParliamentSearchIndex: {
        type: GraphQLJSONObject,
        resolve(source, args, context) {
          const siteNodes = context.nodeModel.getAllNodes({
            type: `Mdx`,
          })
          const site = context.nodeModel.getNodeById({
            id: `Site`,
          })
          return createIndex(siteNodes, site)
        },
      },
    },
  })
}

/**
 * Creates an elasticlunr index of all the markdown and open api documents.
 *
 * [Gatsby Node API - createResolvers]{@link https://www.gatsbyjs.org/docs/node-apis/#createResolvers}
 *
 * @param {Array} nodes An array containing all the markdown documents
 * @param {Object} pages The contents of ParliamentNavigation
 */
const createIndex = async (nodes, site) => {
  const index = elasticlunr()
  index.setRef(`id`)
  index.addField(`title`)
  index.addField(`body`)
  index.addField(`path`)
  index.addField(`type`)

  for (node of nodes) {
    let filePath = node.fileAbsolutePath.endsWith("index.md")
      ? node.fileAbsolutePath.slice(0, -8)
      : node.fileAbsolutePath

    const pageInfo = getPageInfo(site.siteMetadata, filePath)

    if (node.frontmatter && node.frontmatter.openAPISpec) {
      // convert openapi to markdown
      const response = await fetch(node.frontmatter.openAPISpec)
      const text = await response.text()
      const object = JSON5.parse(text)
      const md = await converter.convert(object, {})

      const doc = {
        id: node.id,
        title: node.frontmatter.title,
        body: md,
        path: pageInfo.path,
        type: "apis",
      }
      index.addDoc(doc)
    } else {
      if (pageInfo.title) {
        const doc = {
          id: node.id,
          title: pageInfo.title,
          body: node.internal.content,
          path: pageInfo.path,
          type: "docs",
        }
        index.addDoc(doc)
      }
    }
  }

  return index.toJSON()
}
