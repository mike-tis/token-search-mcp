export type ChainType = 'bnb' | 'solana' | 'ton';

const TOKEN_LIST_CONFIG: Array<{ chain: ChainType; path: string; }> = [
  { chain: 'bnb', path: 'src/bnb1000.csv' },
  { chain: 'solana', path: 'src/solana1000.csv' },
  { chain: 'ton', path: 'src/ton1000.csv' }
];

export interface Token {
  address: string;
  chain: ChainType;
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
 * Get a token by its address and chain
 */
export function getTokenByAddress(address: string, chain: ChainType): Token | undefined {
  const normalizedAddress = address.toLowerCase();
  return mergedTokenList.find(
    token => token.address.toLowerCase() === normalizedAddress && token.chain === chain
  );
}

/**
 * Get the merged token list
 */
export function getTokenList(): Token[] {
  return mergedTokenList;
}

/**
 * Get all tokens for a specific chain
 */
export function getTokensByChain(chain: ChainType): Token[] {
  return mergedTokenList.filter(token => token.chain === chain);
}

/**
 * Initialize the token list by loading and parsing from CSV files
 */
export async function initializeTokenList(): Promise<void> {
  if (typeof process !== 'undefined' && process.stdout) {
    process.stdout.write('Initializing token list...\n');
  }
  mergedTokenList = [];
  for (const config of TOKEN_LIST_CONFIG) {
    if (typeof process !== 'undefined' && process.stdout) {
      process.stdout.write(`Loading token list from file: ${config.path} (chain: ${config.chain})\n`);
    }
    const tokenList = await loadTokenListFromCSV(config.path, config.chain);
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
export function searchTokens(query: string, chain?: ChainType): Token[] {
  const normalizedQuery = query.toLowerCase();
  let filteredTokens = mergedTokenList;
  
  // If a chain is specified, filter by chain
  if (chain) {
    filteredTokens = filteredTokens.filter(token => token.chain === chain);
  }
  
  return filteredTokens.filter(token => 
    token.symbol.toLowerCase().includes(normalizedQuery) ||
    token.name.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Load token list from a CSV file
 */
async function loadTokenListFromCSV(filepath: string, chain: ChainType): Promise<null | TokenList> {
  try {
    const response = await fetch(filepath.startsWith('http') ? filepath : `file://${filepath}`);
    if (!response.ok) {
      throw new Error(`Error loading file! Status: ${response.status}`);
    }
    const csvContent = await response.text();
    
    return parseCSVToTokenList(csvContent, filepath, chain);
  } catch (error) {
    if (typeof process !== 'undefined' && process.stderr) {
      process.stderr.write(`Error loading token list from ${filepath}: ${error instanceof Error ? error.message : String(error)}\n`);
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
      t => t.address.toLowerCase() === normalizedAddress && t.chain === token.chain
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

/**
 * Parse CSV content to TokenList format
 */
function parseCSVToTokenList(csvContent: string, filename: string, chain: ChainType): TokenList {
  // Parse CSV content into rows
  const rows = csvContent.split('\n');
  const headers = rows[0].split(',').map(header => header.replace(/"/g, '').trim());
  
  const tokens: Token[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i].trim()) continue; // Skip empty rows
    
    // Handle CSV properly, including values with commas inside quotes
    const values: string[] = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (const char of rows[i]) {
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue); // Add the last value
    
    // Map CSV columns to token properties
    const addressIndex = headers.indexOf('token_address');
    const nameIndex = headers.indexOf('name');
    const symbolIndex = headers.indexOf('symbol');
    const decimalsIndex = headers.indexOf('decimals');
    const logoUriIndex = headers.indexOf('logo_uri');
    
    if (addressIndex >= 0 && nameIndex >= 0 && symbolIndex >= 0 && decimalsIndex >= 0) {
      const address = values[addressIndex].replace(/"/g, '');
      const name = values[nameIndex].replace(/"/g, '');
      const symbol = values[symbolIndex].replace(/"/g, '');
      const decimalsStr = values[decimalsIndex].replace(/"/g, '');
      const logoURI = logoUriIndex >= 0 ? values[logoUriIndex].replace(/"/g, '') : undefined;
      
      // Parse decimals to number and use fallback of 18 if invalid
      const decimals = parseInt(decimalsStr, 10);
      
      // Add token to list with the specified chain
      tokens.push({
        address,
        chain,
        decimals: isNaN(decimals) ? 18 : decimals,
        logoURI: logoURI === 'NULL' ? undefined : logoURI,
        name,
        symbol
      });
    }
  }
  
  // Create a TokenList object
  const tokenList: TokenList = {
    name: filename,
    timestamp: new Date().toISOString(),
    tokens,
    version: {
      major: 1,
      minor: 0,
      patch: 0
    }
  };
  
  return tokenList;
}