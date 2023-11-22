import { createApi, fetchBaseQuery, FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
import { Protocol } from '@uniswap/router-sdk'
import ms from 'ms'
import { logSwapQuoteRequest } from 'tracing/swapFlowLoggers'
import { trace } from 'tracing/trace'

import {
  GetQuoteArgs,
  INTERNAL_ROUTER_PREFERENCE_PRICE,
  QuoteMethod,
  QuoteState,
  RouterPreference,
  TradeResult,
} from './types'
import { transformRoutesToTrade } from './utils'

const UNISWAP_API_URL = process.env.REACT_APP_UNISWAP_API_URL
if (UNISWAP_API_URL === undefined) {
  throw new Error(`UNISWAP_API_URL must be a defined environment variable`)
}

const CLIENT_PARAMS = {
  protocols: [Protocol.V2, Protocol.V3, Protocol.MIXED],
}

function getQuoteLatencyMeasure(mark: PerformanceMark): PerformanceMeasure {
  performance.mark('quote-fetch-end')
  return performance.measure('quote-fetch-latency', mark.name, 'quote-fetch-end')
}

export const routingApi = createApi({
  reducerPath: 'routingApi',
  baseQuery: fetchBaseQuery({
    baseUrl: UNISWAP_API_URL,
  }),
  endpoints: (build) => ({
    getQuote: build.query<TradeResult, GetQuoteArgs>({
      async onQueryStarted(args: GetQuoteArgs, { queryFulfilled }) {
        trace(
          'quote',
          async ({ setTraceError, setTraceStatus }) => {
            try {
              await queryFulfilled
            } catch (error: unknown) {
              if (error && typeof error === 'object' && 'error' in error) {
                const queryError = (error as Record<'error', FetchBaseQueryError>).error
                if (typeof queryError.status === 'number') {
                  setTraceStatus(queryError.status)
                }
                setTraceError(queryError)
              } else {
                throw error
              }
            }
          },
          {
            data: {
              ...args,
              isPrice: args.routerPreference === INTERNAL_ROUTER_PREFERENCE_PRICE,
              isAutoRouter: args.routerPreference === RouterPreference.API,
            },
          }
        )
      },
      async queryFn(args) {
        logSwapQuoteRequest(args.tokenInChainId, args.routerPreference, false)
        const quoteStartMark = performance.mark(`quote-fetch-start-${Date.now()}`)

        try {
          const { getRouter, getClientSideQuote } = await import('lib/hooks/routing/clientSideSmartOrderRouter')
          const router = getRouter(args.tokenInChainId)
          const quoteResult = await getClientSideQuote(args, router, CLIENT_PARAMS)
          if (quoteResult.state === QuoteState.SUCCESS) {
            const trade = await transformRoutesToTrade(args, quoteResult.data, QuoteMethod.CLIENT_SIDE_FALLBACK)
            return {
              data: { ...trade, latencyMs: getQuoteLatencyMeasure(quoteStartMark).duration },
            }
          } else {
            return { data: { ...quoteResult, latencyMs: getQuoteLatencyMeasure(quoteStartMark).duration } }
          }
        } catch (error: any) {
          console.warn(`GetQuote failed on client: ${error}`)
          return {
            error: { status: 'CUSTOM_ERROR', error: error?.detail ?? error?.message ?? error },
          }
        }
      },
      keepUnusedDataFor: ms(`10s`),
      extraOptions: {
        maxRetries: 0,
      },
    }),
  }),
})

export const { useGetQuoteQuery } = routingApi
export const useGetQuoteQueryState = routingApi.endpoints.getQuote.useQueryState
