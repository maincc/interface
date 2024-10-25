/* eslint-disable */
import EthereumList from './Ethereum.json'
import PolygonList from './Polygon.json'
import ArbitrumList from './Arbitrum.json'
import OptimismList from './Optimism.json'
import AvalancheList from './Avalanche.json'
import BaseList from './Base.json'
import BNBList from './BNB.json'
import CeloList from './Celo.json'
import { Token } from '@uniswap/sdk-core'
import { ChainId } from '@uniswap/sdk-core'

export const getPopularTokens = (chainId: number | undefined) => {
  if (!chainId) {
    return []
  }
  let data
  switch (chainId) {
    case ChainId.MAINNET:
      data = EthereumList
      break
    case ChainId.POLYGON:
      data = PolygonList
      break
    case ChainId.ARBITRUM_ONE:
      data = ArbitrumList
      break
    case ChainId.OPTIMISM:
      data = OptimismList
      break
    case ChainId.AVALANCHE:
      data = AvalancheList
      break
    case ChainId.BASE:
      data = BaseList
      break
    case ChainId.BNB:
      data = BNBList
      break
    case ChainId.CELO:
      data = CeloList
      break
    default:
      return []
  }

  return data.data.map((item) => {
    const i = item.currencyInfo.currency
    return new Token(i.chainId, i.address, i.decimals, i.symbol, i.name)
  })
}
