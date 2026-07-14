export async function sendWhatsAppOTP(
  mobile: string,
  otp: string
) {
  try {

    // Clean mobile number
    mobile = mobile.replace(/\D/g, "");

    if (mobile.length === 10) {
      mobile = "91" + mobile;
    }

    const payload = {
      messaging_product: "whatsapp",

      to: mobile,

      type: "template",

      template: {
        name: "crm_verification",

        language: {
          code: "en",
        },

        components: [

          // BODY VARIABLE
          {
            type: "body",

            parameters: [
              {
                type: "text",
                text: otp,
              },
            ],
          },

          // URL BUTTON VARIABLE
          {
            type: "button",

            sub_type: "url",

            index: "0",

            parameters: [
              {
                type: "text",
                text: otp,
              },
            ],
          },

        ],
      },
    };

    console.log("========== WHATSAPP REQUEST ==========");
    console.log(JSON.stringify(payload, null, 2));

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    console.log("========== WHATSAPP RESPONSE ==========");
    console.log(JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(
        data?.error?.message || "WhatsApp API Error"
      );
    }

    return data;

  } catch (err: any) {

    console.error("WhatsApp Send Error:", err);

    throw err;

  }
}