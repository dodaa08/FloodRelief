// "Updated flood region" notifications. Defaults to a console log so the
// hook is testable without AWS; set FLOOD_NOTIFY_PROVIDER=sns + SNS_TOPIC_ARN
// to fan the message out to a topic (SMS/email/HTTP subscribers).

import type { FloodStatus } from "@repo/db";

export type FloodRegionUpdate = {
  districtId: string;
  name: string;
  state: string;
  fromRisk: FloodStatus | null;
  toRisk: FloodStatus;
  signals: string[];
  riverCurrent: number;
  riverPeak: number;
  fetchedAt: string;
};

export async function publishFloodRegionUpdated(update: FloodRegionUpdate): Promise<void> {
  const provider = (process.env.FLOOD_NOTIFY_PROVIDER ?? "console").trim().toLowerCase();

  if (provider === "sns") {
    const topicArn = process.env.SNS_TOPIC_ARN?.trim();
    if (!topicArn) {
      console.warn("[notify] FLOOD_NOTIFY_PROVIDER=sns but SNS_TOPIC_ARN is not set");
      return;
    }
    const { SNSClient, PublishCommand } = await import("@aws-sdk/client-sns");
    const client = new SNSClient({ region: process.env.AWS_REGION || "ap-south-1" });
    await client.send(
      new PublishCommand({
        TopicArn: topicArn,
        Subject: `Flood status updated: ${update.name}, ${update.state} (${update.fromRisk ?? "—"} -> ${update.toRisk})`,
        Message: JSON.stringify(update),
      }),
    );
    console.log(`[notify:sns] published ${update.name} ${update.fromRisk ?? "—"} -> ${update.toRisk}`);
    return;
  }

  console.log(
    `[notify] flood region updated: ${update.name}, ${update.state} ${update.fromRisk ?? "—"} -> ${update.toRisk} ` +
      `| ${update.signals.join(", ") || "no signal"} | river ${update.riverCurrent} -> ${update.riverPeak} m³/s`,
  );
}