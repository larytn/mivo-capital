import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

export async function sendVerificationEmail({
  email,
  name,
  token,
}: {
  email: string;
  name: string;
  token: string;
}) {
  const verificationUrl =
    `${appUrl}/verify-email?token=${encodeURIComponent(
      token
    )}`;

  const { data, error } =
    await resend.emails.send({
      // Temporary Resend testing sender.
      // We'll replace this with the Mivo Capital
      // domain email after the domain is purchased.
      from: "Mivo Capital <onboarding@resend.dev>",

      to: email,

      subject:
        "Verify your Mivo Capital email",

      html: `
        <div style="background:#050505;padding:40px 20px;font-family:Arial,sans-serif;color:#ffffff;">
          <div style="max-width:560px;margin:0 auto;background:#111111;border:1px solid #27272a;border-radius:16px;padding:32px;">

            <h1 style="margin:0;color:#22c55e;font-size:28px;">
              Mivo Capital
            </h1>

            <h2 style="margin:28px 0 12px;font-size:22px;">
              Verify your email
            </h2>

            <p style="color:#a1a1aa;line-height:1.7;">
              Hi ${escapeHtml(name)},
            </p>

            <p style="color:#a1a1aa;line-height:1.7;">
              Thanks for creating your Mivo Capital account.
              Verify your email address to activate your account.
            </p>

            <div style="margin:30px 0;">
              <a
                href="${verificationUrl}"
                style="display:inline-block;background:#22c55e;color:#000000;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:10px;"
              >
                Verify Email
              </a>
            </div>

            <p style="color:#71717a;font-size:13px;line-height:1.6;">
              This verification link expires in 24 hours.
            </p>

            <p style="color:#71717a;font-size:13px;line-height:1.6;">
              If you did not create a Mivo Capital account,
              you can ignore this email.
            </p>

          </div>
        </div>
      `,
    });

  if (error) {
    console.error(
      "VERIFICATION EMAIL ERROR:",
      error
    );

    throw new Error(
      "Unable to send verification email."
    );
  }

  return data;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}