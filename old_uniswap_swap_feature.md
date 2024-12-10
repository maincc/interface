# old uniswap swap feature
uniswap version:1.1  
去除了从Graphql获取数据；采用客户端生成trade，而不是通过访问uniswap的ABI生成trade。  
所以在学习这个功能时候，不考虑uniswapX相关代码。

### uniswap 的入口文件
/src/index.tsx => /src/pages/App.tsx  
index.tsx 是react的入口文件，在其中构建网站并将App.tsx当作root html。添加了很多必要的
provider第三方组件。  
在 App.tsx 文件中，js部分暂不考虑，对 swap 功能应该不影响；html部分中 NavBar 组件是网站的导航栏，
Routes 组件代表路由。  
  
注：下文的文件路径中的 / 代表 /src

##### 网站路由仅分析默认路由（/）或/swap
通过 /pages/RouteDefinitions.tsx 得到网站路由列表。  
当 url 的路径是 / 时：  
&nbsp;&nbsp;&nbsp;&nbsp;
根据参数引用相关组件，这里引用的是 landing 组件。在 landing 组件内，根据selectedWallet && 
!queryParams.intro 进行路由跳转至 /swap。

### swap 交换组件（/swap）
SwapPage() => Swap()  
```
注：(react相关Hook:useState、useEffect、useMemo、useCallback、useReducer)
1、useState: 函数组件中添加状态，如果记录的状态改变，组件重新渲染。
2、useEffect: 组件渲染后，执行。如果没有第二参数则每次渲染后执行;有且为空数组则在第一次渲染
时执行;有元素的话则只在数组内元素变化时执行。
3、useMemo和useCallback: useMemo和useCallback用法都差不多，会在其依赖的变量发生改变时执
行，并且这两个hooks都返回缓存的值，useMemo返回缓存的变量，useCallback返回缓存的函数。
4、useReducer: 接受两个参数：当前状态（state）和动作（action），并返回新的状态。返回一个数组，
第一个元素是当前状态，第二个元素是派发动作的函数。
```

在 Swap 中，先通过 useWeb3React()获取MetaMask中的account、chainId、connectedChainId, connector。
```ts
  // token warning stuff
  const prefilledInputCurrency = useCurrency(initialInputCurrencyId, chainId)
  const prefilledOutputCurrency = useCurrency(initialOutputCurrencyId, chainId)

  const [loadedInputCurrency, setLoadedInputCurrency] = useState(prefilledInputCurrency)
  const [loadedOutputCurrency, setLoadedOutputCurrency] = useState(prefilledOutputCurrency)

  useEffect(() => {
    setLoadedInputCurrency(prefilledInputCurrency)
    setLoadedOutputCurrency(prefilledOutputCurrency)
  }, [prefilledInputCurrency, prefilledOutputCurrency])
  
  const [dismissTokenWarning, setDismissTokenWarning] = useState<boolean>(false)
  const [showPriceImpactModal, setShowPriceImpactModal] = useState<boolean>(false)

  const urlLoadedTokens: Token[] = useMemo(
    () => [loadedInputCurrency, loadedOutputCurrency]?.filter((c): c is Token => c?.isToken ?? false) ?? [],
    [loadedInputCurrency, loadedOutputCurrency]
  )
  const handleConfirmTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
  }, [])
  
  // dismiss warning if all imported tokens are in active lists
  const defaultTokens = useDefaultActiveTokens(chainId)
  const importTokensNotInDefault = useMemo(
    () =>
      urlLoadedTokens &&
      urlLoadedTokens
        .filter((token: Token) => {
          return !(token.address in defaultTokens)
        })
        .filter((token: Token) => {
          // Any token addresses that are loaded from the shorthands map do not need to show the import URL
          const supported = asSupportedChain(chainId)
          if (!supported) return true
          return !Object.keys(TOKEN_SHORTHANDS).some((shorthand) => {
            const shorthandTokenAddress = TOKEN_SHORTHANDS[shorthand][supported]
            return shorthandTokenAddress && shorthandTokenAddress === token.address
          })
        }),
    [chainId, defaultTokens, urlLoadedTokens]
  )
```
上述代码生成 TokenSafetyModal 组件所需要的参数。TokenSafetyModal 组件用于渲染一个模态对话框
用于处理与导入不在默认列表中的代币相关的安全警告。因为是自己模拟的TokenList，所以目前从
TokenList 选择的 token 会触发这个警告模态对话框。

```ts
  // toggle wallet when disconnected
  const toggleWalletDrawer = useToggleAccountDrawer()
```
上述代码用于唤醒网站连接钱包弹窗。

```ts
  const prefilledState = useMemo(
    () => ({
      [Field.INPUT]: { currencyId: initialInputCurrencyId },
      [Field.OUTPUT]: { currencyId: initialOutputCurrencyId },
    }),
    [initialInputCurrencyId, initialOutputCurrencyId]
  )
  const [state, dispatch] = useReducer(swapReducer, { ...initialSwapState, ...prefilledState })
  const { typedValue, recipient, independentField } = state

  const previousConnectedChainId = usePrevious(connectedChainId)
  const previousPrefilledState = usePrevious(prefilledState)
  useEffect(() => {
    const combinedInitialState = { ...initialSwapState, ...prefilledState }
    const chainChanged = previousConnectedChainId && previousConnectedChainId !== connectedChainId
    const prefilledInputChanged =
      previousPrefilledState &&
      previousPrefilledState?.[Field.INPUT]?.currencyId !== prefilledState?.[Field.INPUT]?.currencyId
    const prefilledOutputChanged =
      previousPrefilledState &&
      previousPrefilledState?.[Field.OUTPUT]?.currencyId !== prefilledState?.[Field.OUTPUT]?.currencyId
    if (chainChanged || prefilledInputChanged || prefilledOutputChanged) {
      dispatch(
        replaceSwapState({
          ...initialSwapState,
          ...prefilledState,
          field: combinedInitialState.independentField ?? Field.INPUT,
          inputCurrencyId: combinedInitialState.INPUT.currencyId ?? undefined,
          outputCurrencyId: combinedInitialState.OUTPUT.currencyId ?? undefined,
        })
      )
      // reset local state
      setSwapState({
        tradeToConfirm: undefined,
        swapError: undefined,
        showConfirm: false,
        swapResult: undefined,
      })
    }
  }, [connectedChainId, prefilledState, previousConnectedChainId, previousPrefilledState])

  const swapInfo = useDerivedSwapInfo(state, chainId)
```
上述代码中，swapInfo 根据用户选择的 token 以及输入的 amount 通过 useDerivedSwapInfo 进行
处理后返回的结果。swapInfo 上面代码应该是重置画面信息。

```ts
  const { formatCurrencyAmount } = useFormatter()
  const formattedAmounts = useMemo(
    () => ({
      [independentField]: typedValue,
      [dependentField]: showWrap
        ? parsedAmounts[independentField]?.toExact() ?? ''
        : formatCurrencyAmount({
            amount: parsedAmounts[dependentField],
            type: NumberType.SwapTradeAmount,
            placeholder: '',
          }),
    }),
    [dependentField, formatCurrencyAmount, independentField, parsedAmounts, showWrap, typedValue]
  )
  
  const { onSwitchTokens, onCurrencySelection, onUserInput, onChangeRecipient } = useSwapActionHandlers(dispatch)

  const handleInputSelect = useCallback(
    (inputCurrency: Currency) => {
      onCurrencySelection(Field.INPUT, inputCurrency)
      onCurrencyChange?.({
        [Field.INPUT]: {
          currencyId: getSwapCurrencyId(inputCurrency),
        },
        [Field.OUTPUT]: state[Field.OUTPUT],
      })
      maybeLogFirstSwapAction(trace)
    },
    [onCurrencyChange, onCurrencySelection, state, trace]
  )
```
上述代码中，是存储用户的选择和输入。handleOutputSelect 和 handleInputSelect 记录用户选择
的 token; formattedAmounts 记录用户选择的 token 对的amount。

##### useDerivedSwapInfo 根据当前输入的计算出最佳交易并返回(/state/swap/hooks.tsx)
```ts
  const { account } = useWeb3React()

  const {
    independentField,
    typedValue,
    [Field.INPUT]: { currencyId: inputCurrencyId },
    [Field.OUTPUT]: { currencyId: outputCurrencyId },
    recipient,
  } = state
```
先通过 useWeb3React() 获取 MetaMask 目前的 addrress; 提取出 state 里的 independentField(兑换方向)
、typedValue(数量)、recipient(交易对手方，因为是计算最佳交易所以大概率是null)、inputCurrencyId、outputCurrencyId。

```ts
  const inputCurrency = useCurrency(inputCurrencyId, chainId)
  const outputCurrency = useCurrency(outputCurrencyId, chainId)

  const fotAdjustmentsEnabled = useFotAdjustmentsEnabled()
  const { inputTax, outputTax } = useSwapTaxes(
    inputCurrency?.isToken && fotAdjustmentsEnabled ? inputCurrency.address : undefined,
    outputCurrency?.isToken && fotAdjustmentsEnabled ? outputCurrency.address : undefined
  )

  const recipientLookup = useENS(recipient ?? undefined)
  const to: string | null = (recipient === null ? account : recipientLookup.address) ?? null

  const relevantTokenBalances = useCurrencyBalances(
    account ?? undefined,
    useMemo(() => [inputCurrency ?? undefined, outputCurrency ?? undefined], [inputCurrency, outputCurrency])
  )

  const isExactIn: boolean = independentField === Field.INPUT
  const parsedAmount = useMemo(
    () => tryParseCurrencyAmount(typedValue, (isExactIn ? inputCurrency : outputCurrency) ?? undefined),
    [inputCurrency, isExactIn, outputCurrency, typedValue]
  )

  const trade = useDebouncedTrade(
    isExactIn ? TradeType.EXACT_INPUT : TradeType.EXACT_OUTPUT,
    parsedAmount,
    (isExactIn ? outputCurrency : inputCurrency) ?? undefined,
    undefined,
    account,
    inputTax,
    outputTax
  )
```
##### useDebouncedTrade 根据提供的参数获取最佳trade
```ts
  const previewTradeResult = usePreviewTrade(
    skipPreviewTradeFetch,
    tradeType,
    amountSpecified,
    otherCurrency,
    inputTax,
    outputTax
  )
  const routingApiTradeResult = useRoutingAPITrade(
    skipRoutingFetch,
    tradeType,
    amountSpecified,
    otherCurrency,
    routerPreferenceOverride ?? routerPreference,
    account,
    inputTax,
    outputTax
  )

  return previewTradeResult.currentTrade && !routingApiTradeResult.currentTrade
    ? previewTradeResult
    : routingApiTradeResult
```
上述代码中，usePreviewTrade() 是通过访问Uniswap API 交互，快速获取最佳交易。
useRoutingAPITrade() 通过客户端的智能订单路由获取最佳交易。因为usePreviewTrade()要访问
Uniswap API 所以暂不分析。

##### useRoutingAPITrade (/state/routing/useRoutingAPITrade.ts)
```ts
  const queryArgs = useRoutingAPIArguments({
    account,
    tokenIn: currencyIn,
    tokenOut: currencyOut,
    amount: amountSpecified,
    tradeType,
    routerPreference,
    inputTax,
    outputTax,
  })

  const { isError, data: tradeResult, error, currentData } = useGetQuoteQueryState(queryArgs)
```
先通过 useRoutingAPIArguments() 根据相关信息获取相应的查询数据结构，再通过useGetQuoteQueryState()
生成最佳交易。

##### useGetQuoteQueryState (/state/routing/slice.ts)
```ts
  const { getRouter, getClientSideQuote } = await import('lib/hooks/routing/clientSideSmartOrderRouter')
  const router = getRouter(args.tokenInChainId)
  const quoteResult = await getClientSideQuote(args, router, CLIENT_PARAMS)
```
**getRouter()** 获取对应的 AlphaRouter 实例:
```ts
// getRouter
const routers = new Map<ChainId, AlphaRouter>()
export function getRouter(chainId: ChainId): AlphaRouter {
  const router = routers.get(chainId)
  if (router) return router

  const supportedChainId = asSupportedChain(chainId)
  if (supportedChainId) {
    const provider = DEPRECATED_RPC_PROVIDERS[supportedChainId]
    const router = new AlphaRouter({ chainId, provider })
    routers.set(chainId, router)
    return router
  }

  throw new Error(`Router does not support this chain (chainId: ${chainId}).`)
}
```
routers: 缓存 AlphaRouter实例(根据ChainId缓存)  
从缓存中获取 AlphaRouter实例。获取不到, 先判断是否支持这个ChainId, 支持则缓存并返回实例，
否则提示报错。  
**getClientSideQuote() => getQuote()**   
先判断tokenIn、tokenOut是否是原生代币，根据其结果生成baseCurrency、quoteCurrency。
根据amountRaw生成amount，然后通过(AlphaRouter类)router.route得到swapRoute。

##### Uniswap/smart-order-router 3.15.0版
**AlphaRouter类中的route:**
1. 先通过参数分出currencyIn、currencyOut,得到对应的wrapped。
2. 通过getGasPriceWei计算出v3GasModel、mixedRouteGasModel。  
  1. v3GasModel:v3路由的Gas模型。
  2. mixedRouteGasModel:混合路由的Gas模型。
3. 获取缓存中符合条件的cachedRoutes。
4. swapRouteFromCachePromise、swapRouteFromChainPromise分别代理getSwapRouteFromCache、getSwapRouteFromChain
异步函数;并行处理swapRouteFromCachePromise、swapRouteFromChainPromise得到swapRouteFromCache, swapRouteFromChain。
5. 根据cacheMode、swapRouteFromCache进行判断，将第四步得到的结果赋值给swapRouteRaw。
6. 如果没有swapRouteRaw,则返回null。
7. 根据相关条件，将得到的结果存到缓存中;根据swapRouteRaw里的routes(as routeAmounts)生成trade。
8. 根据swapConfig和methodParameters内容判断是否进行交易模拟，评价交易成本和风险。返回结果。

#### Swap 交换组件 —— 用户输入流程
1. handleTypeInput、handleTypeOutput、handleInputSelect、handleOutputSelect: 用户操作所触发
动作(函数)。
2. 渲染页面时候, 生成trade。  
```ts
  const swapInfo = useDerivedSwapInfo(state, chainId)
  const {
    trade: { state: tradeState, trade, swapQuoteLatency },
    allowedSlippage,
    autoSlippage,
    currencyBalances,
    parsedAmount,
    currencies,
    inputError: swapInputError,
    inputTax,
    outputTax,
    outputFeeFiatValue,
  } = swapInfo
```
其中的useDerivedSwapInfo在用户操作(选择token和输入Amount)时执行，渲染页面。

#### Swap 交换组件 —— 点击Swap交换按钮
##### 触发handleContinueToReview函数:
```ts
  const handleContinueToReview = useCallback(() => {
    setSwapState({
      tradeToConfirm: trade,
      swapError: undefined,
      showConfirm: true,
      swapResult: undefined,
    })
  }, [trade])
```
触发记录SwapState状态, 其中showConfirm和trade决定是否显示确认交易弹窗。
##### 确认交易弹窗(ConfirmSwapModal /components/swap/ConfirmSwapModel)
**点击弹窗按钮，触发startSwapFlow函数:**
```ts
  const startSwapFlow = useCallback(() => {
    const steps = generateRequiredSteps()
    setPendingModalSteps(steps)
    performStep(steps[0])
  }, [generateRequiredSteps, performStep])
```
1. 生成必要的步骤。generateRequiredSteps():主要用途是在用户进行交易时，根据交易和许可的
状态动态生成一个确认步骤列表。这个列表将指导用户完成交易前的必要步骤，例如包裹、设置许可、
许可签名等，最后确认交易。
2. 记录生成的steps状态。
3. 执行生成steps的第一个步骤。performStep(steps[0]):
  1. performStep是根据所提供的step参数执行。
  2. 可能swap过程仅仅需要PENDING_CONFIRMATION(等待确认)。  

**performStep**  
PENDING_CONFIRMATION分支中:
1. onSwap() = { clearSwapState; onConfirm() }
2. clearSwapState /pages/Swap/index.tsx 清空Swap组件里的SwapState状态。
3. onConfirm /pages/Swap/index.tsx =>handleSwap()
4. handleSwap() => swapCallback() => useSwapCallback()
5. **useSwapCallback()**:   
根据交易类型(isUniswapXTrade 或 isClassicTrade)，使用不同的 Hook 来处理交易回调(useUniswapXSwapCallback、useUniversalRouterSwapCallback)。
  1. useUniswapXSwapCallback 发送UniswapX交易, 因为修改代码原因，并不重要。
  2. useUniversalRouterSwapCallback 发送通用交易。
    1. 通过useWeb3React获取account、chainId、provider、connector。
    2. 通过trace跟踪交易对应的回调。
    3. 在trace接受的函数中:   
       通过SwapRouter.swapERC20CallParameters将trade根据相关参数生成要调用的链上方法名称
       和要作为给定交易的参数传递的十六进制编码参数;根据生成的参数、account、UNIVERSAL_ROUTER_ADDRESS(chainId)
       和value创建tx (UNIVERSAL_ROUTER_ADDRESS通过chainId获取通用路由(合约)地址);估算tx
       的燃料费;最后使用provider.getSigner().sendTransaction发送交易。在发送交易之前，
       会记录发送前的当前时间，以便计算交易签名所需的时间;如果交易成功，函数会发送分析事件，
       并检查交易数据是否被修改。如果交易数据被修改且不为空，函数会抛出一个ModifiedSwapError。
    4. 如果在交易过程中发生错误，函数会根据错误的类型设置跟踪状态，并抛出相应的错误。例如，
       如果用户拒绝交易，函数会抛出一个UserRejectedRequestError。
  3. 因为useUniversalRouterSwapCallback是通过MetaMask确认交易发送并返回结果;根据结果将其添加
     至交易列表(addTransaction)中。
  4. 返回result。
6. 在handleSwap()中根据result记录swapState状态。

