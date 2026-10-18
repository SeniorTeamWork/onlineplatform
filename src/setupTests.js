process.env.REACT_APP_DATA_MODE = 'demo';
import { TextEncoder, TextDecoder } from "util";
import { randomUUID } from "crypto";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.structuredClone = value => JSON.parse(JSON.stringify(value));
if (!global.crypto) global.crypto = {};
Object.defineProperty(global.crypto, "randomUUID", {
  value: randomUUID,
  configurable: true
});
global.IS_REACT_ACT_ENVIRONMENT = true;
