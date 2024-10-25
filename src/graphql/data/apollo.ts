/* eslint-disable */
import { ApolloClient, InMemoryCache, HttpLink, ApolloLink, from, fromPromise } from '@apollo/client'
import { Reference, relayStylePagination } from '@apollo/client/utilities'

const GRAPHQL_URL = process.env.REACT_APP_AWS_API_ENDPOINT
if (!GRAPHQL_URL) {
  throw new Error('AWS URL MISSING FROM ENVIRONMENT')
}

// 创建一个中间件来控制请求
const controlLink = new ApolloLink((operation, forward) => {
  return fromPromise(new Promise((resolve) => {
    resolve({
      data: {
        nftBalances: [],
        nftAssets: [],
        nftActivity: [],
        token: null,
      },
    });
  }));
});

// 创建 HTTP 链接
const httpLink = new HttpLink({
  uri: GRAPHQL_URL,
  headers: {
    'Content-Type': 'application/json',
    Origin: 'https://app.uniswap.org',
  },
});

// 组合链接 
const link = from([controlLink, httpLink]);

export const apolloClient = new ApolloClient({
  connectToDevTools: true,
  link,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          nftBalances: relayStylePagination(['ownerAddress', 'filter']),
          nftAssets: relayStylePagination(),
          nftActivity: relayStylePagination(),
          // tell apollo client how to reference Token items in the cache after being fetched by queries that return Token[]
          token: {
            read(_, { args, toReference }): Reference | undefined {
              return toReference({
                __typename: 'Token',
                chain: args?.chain,
                address: args?.address,
              })
            },
          },
        },
      },
      Token: {
        // key by chain, address combination so that Token(chain, address) endpoint can read from cache
        /**
         * NOTE: In any query for `token` or `tokens`, you must include the `chain` and `address` fields
         * in order for result to normalize properly in the cache.
         */
        keyFields: ['chain', 'address'],
        fields: {
          address: {
            read(address: string | null): string | null {
              // backend endpoint sometimes returns checksummed, sometimes lowercased addresses
              // always use lowercased addresses in our app for consistency
              return address?.toLowerCase() ?? null
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
})
