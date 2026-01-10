import { sharedConfig, sharedIgnores } from './eslint.shared.mjs';

export default [
  {
    ignores: sharedIgnores,
  },
  ...sharedConfig,
];
