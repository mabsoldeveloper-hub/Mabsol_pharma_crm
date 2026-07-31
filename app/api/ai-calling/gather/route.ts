import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      params.forEach((val, key) => {
        body[key] = val;
      });
    } else {
      body = await req.json();
    }

    const speechResult = body.SpeechResult || "";
    const callSid = body.CallSid || "";

    console.log(`2-Way AI Call Speech Input [CallSid: ${callSid}]: "${speechResult}"`);

    let responseText = "";

    if (!speechResult) {
      responseText = "I didn't catch that. Could you please repeat?";
    } else {
      const inputLower = speechResult.toLowerCase();
      if (inputLower.includes("order") || inputLower.includes("stock") || inputLower.includes("price")) {
        responseText = "Thank you for asking about inventory and orders. I have noted this in your Mabsol CRM record. Is there anything else I can assist you with today?";
      } else if (inputLower.includes("sample") || inputLower.includes("doctor") || inputLower.includes("visit")) {
        responseText = "I have logged your request for physician samples and field manager visit. Our sales manager will contact you shortly.";
      } else if (inputLower.includes("bye") || inputLower.includes("thank") || inputLower.includes("no")) {
        responseText = "Thank you for your time. Have a wonderful day!";
        const goodbyeTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">${responseText}</Say>
  <Hangup/>
</Response>`;
        return new NextResponse(goodbyeTwiml, {
          headers: { "Content-Type": "text/xml" },
        });
      } else {
        responseText = `Thank you. I have recorded your message: "${speechResult}". Is there anything specific you would like to follow up on?`;
      }
    }

    // Interactive 2-Way Speech Gather Loop
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">${responseText}</Say>
  <Gather input="speech" action="/api/ai-calling/gather" speechTimeout="auto" timeout="6">
    <Say voice="Polly.Aditi" language="en-IN">Please go ahead, I am listening.</Say>
  </Gather>
  <Say voice="Polly.Aditi" language="en-IN">Thank you for calling Mabsol CRM. Goodbye!</Say>
  <Hangup/>
</Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: any) {
    console.error("Gather Route Error:", error);
    const errTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">Thank you for your time. Goodbye.</Say>
  <Hangup/>
</Response>`;
    return new NextResponse(errTwiml, {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
