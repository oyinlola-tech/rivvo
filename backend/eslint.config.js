import js from "@eslint/js";

export default [
  {
    ignores: ["node_modules", "coverage"]
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": "off",
      "no-undef": "off"
    }
  }
];
