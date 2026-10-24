   import assert from "node:assert/strict";
   import { createModelCall } from "../lib/assistant/model.ts";

   // No network calls here. This only checks the null / function decision.
   delete process.env.ANTHROPIC_API_KEY;
   delete process.env.ANTHROPIC_MODEL;
   assert.equal(createModelCall(), null);

   process.env.ANTHROPIC_API_KEY = "fake-key-for-test";
   assert.equal(createModelCall(), null); // model missing

   delete process.env.ANTHROPIC_API_KEY;
   process.env.ANTHROPIC_MODEL = "fake-model-for-test";
   assert.equal(createModelCall(), null); // key missing

   process.env.ANTHROPIC_API_KEY = "fake-key-for-test";
   assert.equal(typeof createModelCall(), "function");

   console.log("model: all checks passed");