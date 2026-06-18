import { Resend } from "resend";

let resendInstance: Resend | null = null;

if (process.env.RESEND_API_KEY) {
  resendInstance = new Resend(process.env.RESEND_API_KEY);
}

export const sendEmail = async (to: string, subject: string, htmlContent: string) => {
  const fromEmail = process.env.EMAIL_FROM || "SettleMint <onboarding@resend.dev>";
  
  if (resendInstance) {
    try {
      const { data, error } = await resendInstance.emails.send({
        from: fromEmail,
        to,
        subject,
        html: htmlContent,
      });
      if (error) {
        console.error("Resend send error:", error);
        return { success: false, error };
      }
      return { success: true, data };
    } catch (err) {
      console.error("Resend error throwing:", err);
      return { success: false, error: err };
    }
  } else {
    // In local development without API key, mock it cleanly to console
    console.log("\n=======================================================");
    console.log("📨 MOCK EMAIL SENT (Configure RESEND_API_KEY to send real emails)");
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log("-------------------------------------------------------");
    console.log("HTML Content preview:\n", htmlContent);
    console.log("=======================================================\n");
    return { success: true, mock: true };
  }
};

export const sendWelcomeEmail = async (email: string, fullName: string) => {
  const welcomeHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; color: #1e293b;">
      <h1 style="color: #3DD68C; font-size: 24px; font-weight: 700; margin-bottom: 1rem;">Welcome to SettleMint, ${fullName}!</h1>
      <p style="font-size: 16px; line-height: 1.6; color: #475569;">
        Split expenses, not friendships. We are super excited to help you track shared expenses, calculate balances, and manage bill-splitting groups cleanly.
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #475569; margin-top: 1.5rem;">
        Log into your dashboard to start creating your groups:
      </p>
      <div style="margin: 2rem 0;">
        <a href="http://localhost:3000/login" style="background-color: #3DD68C; color: #0f1219; padding: 0.8rem 1.5rem; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Go to Dashboard</a>
      </div>
      <p style="font-size: 14px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 1.5rem; margin-top: 2rem;">
        The SettleMint Team &middot; Built with care.
      </p>
    </div>
  `;
  return sendEmail(email, "Welcome to SettleMint!", welcomeHtml);
};

export const sendOTPEmail = async (email: string, fullName: string, otp: string) => {
  const otpHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; color: #1e293b;">
      <h1 style="color: #3DD68C; font-size: 24px; font-weight: 700; margin-bottom: 1rem;">Verify your email</h1>
      <p style="font-size: 16px; line-height: 1.6; color: #475569;">
        Hi ${fullName},
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #475569;">
        Use the following one-time password (OTP) to verify your SettleMint account. This code expires in 15 minutes.
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #0f1219;">
        ${otp}
      </div>
      <p style="font-size: 14px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 1.5rem; margin-top: 2rem;">
        The SettleMint Team &middot; Built with care.
      </p>
    </div>
  `;
  return sendEmail(email, "Your SettleMint Verification Code", otpHtml);
};

export const sendPasswordResetEmail = async (email: string, fullName: string, otp: string) => {
  const otpHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; color: #1e293b;">
      <h1 style="color: #3DD68C; font-size: 24px; font-weight: 700; margin-bottom: 1rem;">Reset your password</h1>
      <p style="font-size: 16px; line-height: 1.6; color: #475569;">
        Hi ${fullName},
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #475569;">
        We received a request to reset your SettleMint password. Use the code below to securely reset it. This code expires in 15 minutes.
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #0f1219;">
        ${otp}
      </div>
      <p style="font-size: 14px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 1.5rem; margin-top: 2rem;">
        If you didn't request this, you can safely ignore this email.
        <br/><br/>
        The SettleMint Team &middot; Built with care.
      </p>
    </div>
  `;
  return sendEmail(email, "Reset your SettleMint password", otpHtml);
};

export const sendExpenseAlertEmail = async (to: string, userName: string, payerName: string, description: string, amount: string, currency: string) => {
  const symbol = currency === "USD" ? "$" : currency === "PKR" ? "Rs" : currency;
  const alertHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; color: #1e293b;">
      <h2 style="font-size: 20px; font-weight: 700; color: #0f1219; margin-bottom: 1rem;">New Expense Added</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #475569;">
        Hi ${userName},
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #475569;">
        <strong>${payerName}</strong> just added a new expense: <strong>"${description}"</strong>.
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0; text-align: center;">
        <span style="font-size: 14px; color: #64748b; display: block; margin-bottom: 0.25rem;">Total Expense Amount</span>
        <span style="font-size: 28px; font-weight: 700; color: #0f1219;">${symbol}${parseFloat(amount).toFixed(2)}</span>
      </div>
      <div style="margin: 2rem 0;">
        <a href="http://localhost:3000/dashboard/expenses" style="background-color: #3DD68C; color: #0f1219; padding: 0.8rem 1.5rem; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">View Transaction Details</a>
      </div>
      <p style="font-size: 14px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 1.5rem; margin-top: 2rem;">
        You received this because you are part of the splitting group. Turn off email alerts in SettleMint Settings.
      </p>
    </div>
  `;
  return sendEmail(to, `New expense: "${description}" added by ${payerName}`, alertHtml);
};
