import eslintConfigPrettier from "eslint-config-prettier/flat";
import perfectionist from "eslint-plugin-perfectionist";
import tseslint from "typescript-eslint";

export default tseslint.config(
  tseslint.configs.recommended,
  {
    plugins: {
      perfectionist
    },
    rules: {
      ...perfectionist.configs["recommended-alphabetical"].rules
    }
  },
  eslintConfigPrettier,
  {
    ignores: ["**/*.js"],
  },
);