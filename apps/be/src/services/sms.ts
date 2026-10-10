const SMS_PROVIDER = process.env.SMS_PROVIDER ?? "console";

// Single choke point for outbound SMS. Every provider is reached over HTTPS
// from here — nothing else in the app knows how an SMS is actually sent.
export async function sendSms(toPhone: string, body: string): Promise<void> {
  if (SMS_PROVIDER === "console") {
    // Dev default: no account, no cost. The "SMS" is printed to the server log.
    console.log(`[sms:console] to=+91${toPhone} "${body}"`);
    return;
  }

  if (SMS_PROVIDER === "twilio") {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;

    if (!sid || !token || !from) {
      throw new Error("Twilio is not configured: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM");
    }

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: `+91${toPhone}`,
        From: from,
        Body: body,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Twilio SMS failed (${res.status}): ${detail}`);
    }
    return;
  }

  throw new Error(`Unknown SMS_PROVIDER: ${SMS_PROVIDER}`);
}

export async function sendOtp(toPhone: string, code: string): Promise<void> {
  await sendSms(toPhone, `Your flood-relief login code is ${code}. Valid for 5 minutes.`);
}
