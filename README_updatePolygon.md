# update polygon
1、uniswap的大更新导致旧版的大部分的url不能使用（被拒绝），所以将这些被拒绝的url去除。  
2、因为graphql和graphql的hooks牵扯有点大，所以将旧版生成的__generated__/types-and-hooks.ts
复制使用，并将package.json里的prepar脚本命令中的\"npm:graphql\"删除。在apolloClient中使用
apolloLink直接返回不访问uniswap的graphql url。  
3、更新polygon原生币。  
4、从新版的uniswap获取pupularTokens,在SearchModal里进行静态存储，并在CurrencySearch.tsx中获取使用。