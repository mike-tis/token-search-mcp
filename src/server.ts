import { FastMCP } from "fastmcp";
import { z } from "zod";

import { getTokenByAddress, initializeTokenList, searchTokens } from "./tokenList.js";

const server = new FastMCP({
  name: "TokenSearch",
  version: "1.0.0",
});

initializeTokenList().catch((error: Error) => {
  console.error('Failed to initialize token list:', error);
  process.exit(1);
});
server.addTool({
  description: "Get a token by its address and optional chain ID",
  execute: async (args) => {
    const token = getTokenByAddress(args.address, args.chainId || 1);
    if (!token) {
      return {
        content: [{
          text: `Token not found with address ${args.address} on chain ${args.chainId || 1}`,
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
    chainId: z.number().optional().describe("The chain ID (optional)")
  })
});

// Add tool to search for tokens
server.addTool({
  description: "Search for tokens by name or symbol",
  execute: async (args) => {
    const searchType = args.searchType || "full-match";
    const limit = args.limit || 100;
    
    let matchedTokens = searchTokens(args.query);
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
    
    return {
      content: [{
        text: JSON.stringify({
          count: limitedResults.length,
          tokens: limitedResults
        }, null, 2),
        type: "text"
      }]
    };
  },
  name: "search-tokens",
  parameters: z.object({
    limit: z.number().optional().describe("Maximum number of tokens to return"),
    query: z.string().describe("Search query for token name or symbol"),
    searchType: z.enum(["full-match", "partial-match"]).optional().describe("Type of match: full-match (exact) or partial-match (contains)")
  })
});

server.start({
  transportType: "stdio",
});