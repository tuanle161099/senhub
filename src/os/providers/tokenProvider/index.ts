import { Document } from 'flexsearch'
import { TokenListProvider, TokenInfo } from '@solana/spl-token-registry'

import { net } from 'shared/runtime'
import configs from 'os/configs'
import supplementary, { sntr, sol } from './supplementary'

const {
  sol: { chainId, sntrAddress },
} = configs
const DELIMITER = /[\W_]+/g
const PRESET = {
  tokenize: 'full',
  context: true,
  minlength: 3,
}
const DOCUMENT = {
  document: {
    id: 'address',
    index: [
      { field: 'symbol', ...PRESET },
      { field: 'name', ...PRESET },
    ],
  },
}

class TokenProvider {
  private tokenMap: Map<string, TokenInfo>
  private engine: typeof Document | undefined
  readonly chainId: typeof chainId
  readonly cluster: typeof net
  private loading: boolean
  private queue: Array<any>

  constructor() {
    this.tokenMap = new Map<string, TokenInfo>()
    this.engine = undefined
    this.chainId = chainId
    this.cluster = net
    this.loading = false
    this.queue = []
    // Init
    this._init()
  }

  private _init = async (): Promise<[Map<string, TokenInfo>, any]> => {
    if (this.tokenMap.size) return [this.tokenMap, this.engine]
    return new Promise(async (resolve) => {
      // Queue of getters to avoid race condition of multiple _init calling
      if (this.loading) return this.queue.push(resolve)
      // Start
      this.loading = true
      // Build token list
      let tokenList = await (await new TokenListProvider().resolve())
        .filterByChainId(this.chainId)
        .getList()

      // Patch for SNTR
      tokenList.forEach((token, index) => {
        if (token.address === sntrAddress) {
          const { extensions, name, symbol, ...rest } = token
          tokenList[index] = {
            ...rest,
            name: 'Sentre',
            symbol: 'SNTR',
            extensions: { ...extensions, coingeckoId: 'sentre' },
          }
        }
      })
      if (this.cluster === 'devnet') tokenList = tokenList.concat(supplementary)
      if (this.cluster === 'testnet')
        tokenList = tokenList.concat([sntr(102), sol(102)])
      else tokenList = tokenList.concat([sol(101)])
      // Build token map
      tokenList.forEach((token) => this.tokenMap.set(token.address, token))
      // Build search engine
      this.engine = new Document(DOCUMENT)
      this.tokenMap.forEach(({ address, ...doc }) =>
        this.engine.add(address, doc),
      )
      // Resolve the main getter
      resolve([this.tokenMap, this.engine])
      // Resolve the rest of getters
      while (this.queue.length) this.queue.shift()([this.tokenMap, this.engine])
      // Finish
      this.loading = false
    })
  }

  all = async (): Promise<TokenInfo[]> => {
    const [tokenMap] = await this._init()
    return Array.from(tokenMap.values())
  }

  findByAddress = async (addr: string): Promise<TokenInfo | undefined> => {
    const [tokenMap] = await this._init()
    return tokenMap.get(addr)
  }

  find = async (keyword: string, limit?: 10): Promise<TokenInfo[]> => {
    const [tokenMap, engine] = await this._init()
    let tokens: TokenInfo[] = []
    keyword.split(DELIMITER).forEach((key) => {
      const raw: Array<{ result: string[] }> = engine.search(key, limit)
      return raw.forEach(({ result }) => {
        return result.forEach((id: string) => {
          if (tokens.findIndex(({ address }) => address === id) < 0) {
            const token = tokenMap.get(id)
            if (token) tokens.push(token)
          }
        })
      })
    })
    return tokens
  }
}

export default TokenProvider
