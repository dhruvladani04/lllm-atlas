import next from "eslint-config-next";

const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...next,
  {
    // specs/05-delivery/definition-of-done.md: no `any` in lib/ or scripts/.
    files: ["lib/**/*.ts", "scripts/**/*.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
];

export default config;
