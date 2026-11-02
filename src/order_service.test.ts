import test from "node:test";
import assert from "node:assert/strict";
import { chooseAspects } from "./order_service.ts";

test("landscape product photos receive portrait first, then square", () => {
  assert.deepEqual(chooseAspects(1200, 900), ["4:5", "1:1"]);
  assert.deepEqual(chooseAspects(900, 1200), ["1:1", "4:5"]);
});
