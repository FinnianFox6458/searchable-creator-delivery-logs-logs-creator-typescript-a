import { InfraiClient } from "./infrai_client.ts";
import { z } from "zod";

export type DeliveryJob = {
  jobId: string;
  creatorId: string;
  assetId: string;
  subscriberId: string;
};

const DeliveryJobBody = z.object({
  jobId: z.string().min(1),
  creatorId: z.string().min(1),
  assetId: z.string().min(1),
  subscriberId: z.string().min(1),
});

export function deliveryDecision(job: DeliveryJob): "deliver" | "reject" {
  return job.jobId && job.creatorId && job.assetId && job.subscriberId ? "deliver" : "reject";
}

export async function shipDelivery(job: DeliveryJob, client = new InfraiClient()): Promise<unknown> {
  const parsed = DeliveryJobBody.safeParse(job);
  const decision = parsed.success ? deliveryDecision(parsed.data) : "reject";
  if (decision === "reject") throw new Error("job identifiers are required");
  const identity = await client.whoami();
  await client.ingestLog({
    message: "creator asset delivered",
    level: "info",
    source: "creator-commerce",
    context: { jobId: job.jobId, creatorId: job.creatorId, assetId: job.assetId, subscriberId: job.subscriberId },
  });
  return { identity, logs: await client.searchLogs(job.jobId) };
}

if (process.argv[1]?.endsWith("creator_delivery.ts")) {
  const job: DeliveryJob = { jobId: "job-demo-1", creatorId: "creator-7", assetId: "asset-3", subscriberId: "subscriber-9" };
  console.log(deliveryDecision(job));
  if (process.env.INFRAI_API_KEY) void shipDelivery(job).then((result) => console.log(JSON.stringify(result)));
}
