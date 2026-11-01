import assert from "node:assert/strict";
import { deliveryDecision } from "./creator_delivery.ts";

assert.equal(deliveryDecision({ jobId: "j1", creatorId: "c1", assetId: "a1", subscriberId: "s1" }), "deliver");
assert.equal(deliveryDecision({ jobId: "", creatorId: "c1", assetId: "a1", subscriberId: "s1" }), "reject");
console.log("delivery decision test passed");
