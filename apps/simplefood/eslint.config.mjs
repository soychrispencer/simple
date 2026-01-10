import nextConfig from "eslint-config-next";
import {
  appNextRelaxedConfig,
  appTypeScriptRelaxedConfig,
  sharedConfig,
  sharedIgnores,
} from "../../eslint.shared.mjs";

const eslintConfig = [
  {
    ignores: sharedIgnores,
  },
  ...nextConfig,
  ...sharedConfig,
  ...appTypeScriptRelaxedConfig,
  ...appNextRelaxedConfig,
];

export default eslintConfig;
