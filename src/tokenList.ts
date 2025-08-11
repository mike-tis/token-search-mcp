const TOKEN_LIST_ENDPOINTS = [
  'http://defi.cmc.eth',
  'http://erc20.cmc.eth',
  'http://stablecoin.cmc.eth',
  'https://ipfs.io/ipns/tokens.uniswap.org',
  'https://www.gemini.com/uniswap/manifest.json',
];

export interface Token {
  address: string;
  chainId: number;
  decimals: number;
  logoURI?: string;
  name: string;
  symbol: string;
  tokenLists?: string[];
}

interface TokenList {
  keywords?: string[];
  logoURI?: string;
  name: string;
  timestamp: string;
  tokens: Token[];
  version: TokenListVersion;
}

interface TokenListVersion {
  major: number;
  minor: number;
  patch: number;
}


let mergedTokenList: Token[] = [];

/**
 * Get a token by its address and chain ID
 */
export function getTokenByAddress(address: string, chainId: number): Token | undefined {
  const normalizedAddress = address.toLowerCase();
  return mergedTokenList.find(
    token => token.address.toLowerCase() === normalizedAddress && token.chainId === chainId
  );
}

/**
 * Get the merged token list
 */
export function getTokenList(): Token[] {
  return mergedTokenList;
}

/**
 * Initialize the token list by fetching and merging from all sources
 */
export async function initializeTokenList(): Promise<void> {
  if (typeof process !== 'undefined' && process.stdout) {
    process.stdout.write('Initializing token list...\n');
  }
  mergedTokenList = [];
  for (const endpoint of TOKEN_LIST_ENDPOINTS) {
    if (typeof process !== 'undefined' && process.stdout) {
      process.stdout.write(`Fetching token list from: ${endpoint}\n`);
    }
    const tokenList = await fetchTokenList(endpoint);
    if (tokenList) {
      if (typeof process !== 'undefined' && process.stdout) {
      process.stdout.write(`Merging token list: ${tokenList.name}\n`);
    }
      mergeTokenList(tokenList);
    }
  }
  if (typeof process !== 'undefined' && process.stdout) {
    process.stdout.write(`Token list initialized with ${mergedTokenList.length} tokens\n`);
  }
}

/**
 * Search for tokens by symbol or name
 */
export function searchTokens(query: string): Token[] {
  const normalizedQuery = query.toLowerCase();
  
  return mergedTokenList.filter(token => 
    token.symbol.toLowerCase().includes(normalizedQuery) ||
    token.name.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Fetch token list from a given URL
 */
async function fetchTokenList(url: string): Promise<null | TokenList> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json() as TokenList;
  } catch (error) {
    if (typeof process !== 'undefined' && process.stderr) {
      process.stderr.write(`Error fetching token list from ${url}: ${error instanceof Error ? error.message : String(error)}\n`);
    }
    return null;
  }
}

/**
 * Merge a new token list into the existing merged list
 */
function mergeTokenList(newList: TokenList): void {
  const listName = newList.name;
  
  for (const token of newList.tokens) {
    const normalizedAddress = token.address.toLowerCase();
    const existingTokenIndex = mergedTokenList.findIndex(
      t => t.address.toLowerCase() === normalizedAddress && t.chainId === token.chainId
    );
    
    if (existingTokenIndex === -1) {
      mergedTokenList.push({
        ...token,
        tokenLists: [listName]
      });
    } else {
      const existingToken = mergedTokenList[existingTokenIndex];
      if (!existingToken.name && token.name) existingToken.name = token.name;
      if (!existingToken.symbol && token.symbol) existingToken.symbol = token.symbol;
      if (!existingToken.decimals && token.decimals) existingToken.decimals = token.decimals;
      if (!existingToken.logoURI && token.logoURI) existingToken.logoURI = token.logoURI;
      if (!existingToken.tokenLists) {
        existingToken.tokenLists = [listName];
      } else if (!existingToken.tokenLists.includes(listName)) {
        existingToken.tokenLists.push(listName);
      }
    }
  }
}