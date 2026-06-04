import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeText } from "../src/lib/sanitize.js";

test("sanitizeText removes html tags", () => {
  assert.equal(sanitizeText("<script>alert(1)</script> hola"), "alert(1) hola");
});

test("sanitizeText trims and limits content", () => {
  assert.equal(sanitizeText("  hola   mundo  ", 50), "hola mundo");
  assert.equal(sanitizeText("abcdef", 3), "abc");
});
