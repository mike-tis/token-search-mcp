import { FastMCP } from "fastmcp";
import { z } from "zod";

import { ChainType, getTokenByAddress, getTokenList, getTokensByChain, initializeTokenList, searchTokens } from "./tokenList.js";

const server = new FastMCP({
  instructions: "This server provides tools to search for tokens by name, symbol, or address, and to retrieve token details.",
  name: "TokenSearch",
  version: "1.0.0"
},
);

initializeTokenList().catch((error: Error) => {
  console.error('Failed to initialize token list:', error);
  process.exit(1);
});

server.addTool({
  description: "Get a token by its address and blockchain",
  execute: async (args) => {
    const chain = args.chain || 'solana';
    const token = getTokenByAddress(args.address, chain as ChainType);
    
    if (!token) {
      return {
        content: [{
          text: `Token not found with address ${args.address} on chain ${chain}`,
          type: "text"
        }],
        isError: true
      };
    }
    
    return {
      content: [{
        text: JSON.stringify(token, null, 2),
        type: "text"
      }]
    };
  },
  name: "get-token-by-address",
  parameters: z.object({
    address: z.string().describe("The token address"),
    chain: z.enum(['solana', 'bnb', 'ton']).optional().describe("The blockchain (solana, bnb, or ton)")
  })
});

server.addTool({
  description: "Search for tokens by name or symbol",
  execute: async (args) => {
    const searchType = args.searchType || "full-match";
    const limit = args.limit || 1000;
    const chain = args.chain as ChainType | undefined;
    
    let matchedTokens = searchTokens(args.query, chain);
    
    if (searchType === "full-match") {
      const normalizedQuery = args.query.toLowerCase();
      matchedTokens = matchedTokens.filter(token => 
        token.symbol.toLowerCase() === normalizedQuery ||
        token.name.toLowerCase() === normalizedQuery
      );
    }
    
    matchedTokens.sort((a, b) => {
      const aCount = a.tokenLists?.length || 0;
      const bCount = b.tokenLists?.length || 0;
      return bCount - aCount;
    });
    
    const limitedResults = matchedTokens.slice(0, limit);
    
    const cleanedResults = limitedResults.map(token => ({
      address: token.address,
      chain: token.chain,
      decimals: token.decimals,
      logoURI: token.logoURI,
      name: token.name,
      symbol: token.symbol,
      tokenLists: token.tokenLists
    }));
    
    return {
      content: [{
        text: JSON.stringify({
          count: cleanedResults.length,
          tokens: cleanedResults
        }, null, 2),
        type: "text"
      }]
    };
  },
  name: "search-tokens",
  parameters: z.object({
    chain: z.enum(['solana', 'bnb', 'ton']).optional().describe("The blockchain to filter tokens by (solana, bnb, or ton)"),
    limit: z.number().optional().describe("Maximum number of tokens to return"),
    query: z.string().describe("Search query for token name or symbol"),
    searchType: z.enum(["full-match", "partial-match"]).optional().describe("Type of match: full-match (exact) or partial-match (contains)")
  })
});

// Add a new tool to get all tokens for a specific chain
server.addTool({
  description: "Get all tokens for a specific blockchain",
  execute: async (args) => {
    const chain = args.chain as ChainType;
    const limit = args.limit || 1000;
    
    const tokens = getTokensByChain(chain);
    const limitedResults = tokens.slice(0, limit);
    
    const cleanedResults = limitedResults.map(token => ({
      address: token.address,
      chain: token.chain,
      decimals: token.decimals,
      logoURI: token.logoURI,
      name: token.name,
      symbol: token.symbol,
      tokenLists: token.tokenLists
    }));
    
    return {
      content: [{
        text: JSON.stringify({
          chain: chain,
          count: cleanedResults.length,
          tokens: cleanedResults
        }, null, 2),
        type: "text"
      }]
    };
  },
  name: "get-tokens-by-chain",
  parameters: z.object({
    chain: z.enum(['solana', 'bnb', 'ton']).describe("The blockchain to get tokens for"),
    limit: z.number().optional().describe("Maximum number of tokens to return")
  })
});

server.addTool({
  description: "General search for tokens by address, name, or symbol",
  execute: async (args) => {
    const searchType = args.searchType || "full-match";
    const limit = args.limit || 1000;
    const chain = args.chain as ChainType | undefined;
    const query = args.query;
    
    const allTokens = chain ? getTokensByChain(chain) : getTokenList();
    
    const addressTokens = allTokens.filter(token => 
      token.address.toLowerCase().includes(query.toLowerCase())
    );
    
    const nameOrSymbolTokens = allTokens.filter(token => 
      token.name.toLowerCase().includes(query.toLowerCase()) || 
      token.symbol.toLowerCase().includes(query.toLowerCase())
    );
    
    let combinedTokens = [...addressTokens];
    for (const token of nameOrSymbolTokens) {
      if (!combinedTokens.some(t => t.address === token.address && t.chain === token.chain)) {
        combinedTokens.push(token);
      }
    }
    
    if (searchType === "full-match") {
      const normalizedQuery = query.toLowerCase();
      combinedTokens = combinedTokens.filter(token => 
        token.address.toLowerCase() === normalizedQuery ||
        token.symbol.toLowerCase() === normalizedQuery ||
        token.name.toLowerCase() === normalizedQuery
      );
    }
    
    combinedTokens.sort((a, b) => {
      const aCount = a.tokenLists?.length || 0;
      const bCount = b.tokenLists?.length || 0;
      return bCount - aCount;
    });
    
    const limitedResults = combinedTokens.slice(0, limit);
    
    const cleanedResults = limitedResults.map(token => ({
      address: token.address,
      chain: token.chain,
      decimals: token.decimals,
      logoURI: token.logoURI,
      name: token.name,
      symbol: token.symbol,
      tokenLists: token.tokenLists
    }));
    
    return {
      content: [{
        text: JSON.stringify({
          count: cleanedResults.length,
          tokens: cleanedResults
        }, null, 2),
        type: "text"
      }]
    };
  },
  name: "general-search",
  parameters: z.object({
    chain: z.enum(['solana', 'bnb', 'ton']).optional().describe("The blockchain to filter tokens by (solana, bnb, or ton)"),
    limit: z.number().optional().describe("Maximum number of tokens to return"),
    query: z.string().describe("Search query for token address, name, or symbol"),
    searchType: z.enum(["full-match", "partial-match"]).optional().describe("Type of match: full-match (exact) or partial-match (contains)")
  })
});

server.start({
  transportType: "stdio",
});