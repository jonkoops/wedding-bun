import { Liquid } from "liquidjs";
import path from "node:path";
import stringifyObject from "stringify-object";

import { environment } from "../environment";

// Configure view engine
export const liquid = new Liquid({
  root: path.resolve(import.meta.dirname, "../views"),
  extname: ".liquid",
  outputEscape: "escape",
  cache: environment.isProduction,
});


liquid.registerFilter("stringifyObject", (value) => stringifyObject(value));
