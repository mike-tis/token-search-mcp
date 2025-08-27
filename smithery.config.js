export default {
  build: {
    skipSmitheryBuild: true
  },
  esbuild: {
    external: [
      "@valibot/to-json-schema",
      "effect", 
      "sury",
      "arktype",
      "valibot"
    ],
    platform: "node",
    target: "node18",
    format: "cjs"
  }
};