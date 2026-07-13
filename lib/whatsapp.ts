export async function sendWhatsAppOTP(
    mobile: string,
    otp: string
  ) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
  
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
  
          body: JSON.stringify({
            messaging_product: "whatsapp",
  
            to: `91${mobile}`,
  
            type: "template",
  
            template: {
              name: "crm_verification",
  
              language: {
                code: "en",
              },
  
              components: [
                {
                  type: "body",
  
                  parameters: [
                    {
                      type: "text",
                      text: otp,
                    },
                  ],
                },
              ],
            },
          }),
        }
      );
  
      const data = await response.json();
  
      // Meta API Error
      if (!response.ok) {
        console.error("WhatsApp API Error:", data);
  
        throw new Error(
          data?.error?.message || "WhatsApp API Error"
        );
      }
  
      console.log("WhatsApp Success:", data);
  
      return data;
  
    } catch (err: any) {
  
      console.error("WhatsApp Send Error:", err.message);
  
      throw err;
    }
  }