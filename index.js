const { ApolloServer, gql } = require("apollo-server-express");
const express = require("express");
const { ApolloEngine } = require("apollo-engine");
const { RESTDataSource } = require('apollo-datasource-rest');
const moment = require('moment-timezone');

require('dotenv').load()

class ChurchOnlineAPI extends RESTDataSource {
  constructor() {
    super();
    this.baseURL = 'http://live.mysecondchancechurch.com/api/v1/events';
  }

  async getLive() {
    const data = await this.get('/current');
    if (data.meta.status === 200) {
      const { item } = data.response;

      return {
        isLive: item.isLive,
        nextLive: moment(item.eventStartTime).tz('America/New_York').format('dddd @ h:mma')
      };
    }

    return [];
  }
}

// Type definitions define the "shape" of your data and specify
// which ways the data can be fetched from the GraphQL server.
const typeDefs = gql`
  # Comments in GraphQL are defined with the hash (#) symbol.

  type ChurchOnline {
    isLive: Boolean
    nextLive: String
  }

  # The "Query" type is the root of all GraphQL queries.
  # (A "Mutation" type will be covered later on.)
  type Query {
    churchOnline: ChurchOnline
  }
`;

// Resolvers define the technique for fetching the types in the
// schema.  We'll retrieve books from the "books" array above.

const resolvers = {
  Query: {
    churchOnline:  async (_source, args, { dataSources }) => {
      return dataSources.churchOnlineAPI.getLive()
    }
  },
};

// In the most basic sense, the ApolloServer can be started
// by passing type definitions (typeDefs) and the resolvers
// responsible for fetching the data for those types.
const server = new ApolloServer({
  typeDefs,
  resolvers,
  tracing: true,
  cacheControl: true,
  engine: false,
  dataSources: () => {
    return {
      churchOnlineAPI: new ChurchOnlineAPI(),
    };
  }
});

// Initialize your Express app like before
const app = express();

// All of your GraphQL middleware goes here
server.applyMiddleware({ app });

const engine = new ApolloEngine({
  apiKey: process.env.APOLLO_ENGINE_KEY
});

// This `listen` method launches a web-server.  Existing apps
// can utilize middleware options, which we'll discuss later.
engine.listen({
  port: process.env.PORT || 4000,
  expressApp: app,
  graphqlPaths: ["/graphql"]
});
