# swap交易流程
1、根据输入的代币对，从routeAPI、本地客户端以及UniswapX获取相应撮合路径。  
2、获取到相应撮合路径后，构建交易获取报价。  
3、通过钱包进行签名并发送到区块链上。  
4、通过一系列合约操作完成交易。

## 问题：
#### 1、第一步中，在Polygon上通过routeAPI获取报价报错，通过本地客户端时与生产环境获取的报价严重不符。
#### 原因：从github上down下来的Uniswap/interface的源代码中，为了让ETH链上的ETH等币种与其他代币中区分开，将每个币都用独有的类来表示，代币都统一使用Token类表示。在交换过程中，会将撮合路径的开始结算两种币种与输入的代币对进行对比，如果其中一个不符报错。通过分析代码，猜测是将Polygon网路上对MATIC币当作普通代币表示，导致在通过API（猜测在相应网路中，主币省略，用其代币表示，比如MATIC---WMATIC）获取撮合路径后进行对比时报错、通过本地获取路径时将其视为普通代币。
#### 解决：构建一个Polygon独有币类并在切换网络时构建。（独有币类比Token类多一个ChainID、少一个address、isWrapped指向不同[一个指向1：1的代币（MATIC---WMATIC），一个指向自己（WMATIC---WMATIC）]）

## 将CCDAO加入到BASES_TO_CHECK_TRADES_AGAINST  
#### 在smart-order-router库先通过url（https://cloudflare-ipfs.com/ipns/api.uniswap.org/v1/pools/v3/${chainName}.json） 获取json文件内容（交易对组合数组）。获取不到最佳路径，则从设置中BASES_TO_CHECK_TRADES_AGAINST的币进行组合获取最佳路径。  
#### 在URL获取的组合中包含CCDAO交易对，所以将CCDAO添加到BASES_TO_CHECK_TRADES_AGAINST（V2、V3协议）中

##  修改如下：
    1、向UniswapAPI获取路径的相关代码删除，采用客户端（本地）计算路径。（进行大量币种兑换与官网有差异）
    2、将infura_KEY替换成新注册的key
    3、将CCDAO添加到smart-order-route库里的BASES_TO_CHECK_TRADES_AGAINST。
    4、将配置文件中https://api.uniswap.org替换成https://whuniswapfee.jccdex.cn:8440，通过代理访问https://api.uniswap.org（被拒）。
    5、构建一个Polygon独有币类并在切换网络时构建。


# Uniswap Labs Interface

[![codecov](https://codecov.io/gh/Uniswap/interface/branch/main/graph/badge.svg?token=YVT2Y86O82)](https://codecov.io/gh/Uniswap/interface)

[![Unit Tests](https://github.com/Uniswap/interface/actions/workflows/unit-tests.yaml/badge.svg)](https://github.com/Uniswap/interface/actions/workflows/unit-tests.yaml)
[![Integration Tests](https://github.com/Uniswap/interface/actions/workflows/integration-tests.yaml/badge.svg)](https://github.com/Uniswap/interface/actions/workflows/integration-tests.yaml)
[![Lint](https://github.com/Uniswap/interface/actions/workflows/lint.yml/badge.svg)](https://github.com/Uniswap/interface/actions/workflows/lint.yml)
[![Release](https://github.com/Uniswap/interface/actions/workflows/release.yaml/badge.svg)](https://github.com/Uniswap/interface/actions/workflows/release.yaml)
[![Crowdin](https://badges.crowdin.net/uniswap-interface/localized.svg)](https://crowdin.com/project/uniswap-interface)

An open source interface for Uniswap -- a protocol for decentralized exchange of Ethereum tokens.

- Website: [uniswap.org](https://uniswap.org/)
- Interface: [app.uniswap.org](https://app.uniswap.org)
- Docs: [uniswap.org/docs/](https://docs.uniswap.org/)
- Twitter: [@Uniswap](https://twitter.com/Uniswap)
- Reddit: [/r/Uniswap](https://www.reddit.com/r/Uniswap/)
- Email: [contact@uniswap.org](mailto:contact@uniswap.org)
- Discord: [Uniswap](https://discord.gg/FCfyBSbCU5)
- Whitepapers:
  - [V1](https://hackmd.io/C-DvwDSfSxuh-Gd4WKE_ig)
  - [V2](https://uniswap.org/whitepaper.pdf)
  - [V3](https://uniswap.org/whitepaper-v3.pdf)

## Accessing the Uniswap Interface

To access the Uniswap Interface, use an IPFS gateway link from the
[latest release](https://github.com/Uniswap/uniswap-interface/releases/latest),
or visit [app.uniswap.org](https://app.uniswap.org).

## Unsupported tokens

Check out `useUnsupportedTokenList()` in [src/state/lists/hooks.ts](./src/state/lists/hooks.ts) for blocking tokens in your instance of the interface.

You can block an entire list of tokens by passing in a tokenlist like [here](./src/constants/lists.ts)

## Contributions

For steps on local deployment, development, and code contribution, please see [CONTRIBUTING](./CONTRIBUTING.md).

#### PR Title
Your PR title must follow [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/#summary), and should start with one of the following [types](https://github.com/angular/angular/blob/22b96b9/CONTRIBUTING.md#type):

- build: Changes that affect the build system or external dependencies (example scopes: yarn, eslint, typescript)
- ci: Changes to our CI configuration files and scripts (example scopes: vercel, github, cypress)
- docs: Documentation only changes
- feat: A new feature
- fix: A bug fix
- perf: A code change that improves performance
- refactor: A code change that neither fixes a bug nor adds a feature
- style: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- test: Adding missing tests or correcting existing tests

Example commit messages:

- feat: adds support for gnosis safe wallet
- fix: removes a polling memory leak
- chore: bumps redux version

Other things to note:

- Please describe the change using verb statements (ex: Removes X from Y)
- PRs with multiple changes should use a list of verb statements
- Add any relevant unit / integration tests
- Changes will be previewable via vercel. Non-obvious changes should include instructions for how to reproduce them


## Accessing Uniswap V2

The Uniswap Interface supports swapping, adding liquidity, removing liquidity and migrating liquidity for Uniswap protocol V2.

- Swap on Uniswap V2: <https://app.uniswap.org/swap?use=v2>
- View V2 liquidity: <https://app.uniswap.org/pools/v2>
- Add V2 liquidity: <https://app.uniswap.org/add/v2>
- Migrate V2 liquidity to V3: <https://app.uniswap.org/migrate/v2>

## Accessing Uniswap V1

The Uniswap V1 interface for mainnet and testnets is accessible via IPFS gateways
linked from the [v1.0.0 release](https://github.com/Uniswap/uniswap-interface/releases/tag/v1.0.0).
