// emailTemplate.ts

export interface EmailTemplateParams {
    subject: string;
    content: string;
}

export const emailTemplate = ({ subject, content }: EmailTemplateParams): string => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${subject}</title>
    </head>
    <body style="margin:0;padding:0;font-family:Arial, sans-serif;background-color:#f4f4f4;color:#333;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
              <tr>
                <td style="text-align: center; padding-bottom: 20px;">
                  <img src="https://your-logo-url.com/logo.png" alt="Logo" style="height: 50px;" />
                </td>
              </tr>
              <tr>
                <td style="text-align: center; padding-bottom: 20px;">
                  <h2 style="margin: 0; color: #1a73e8;">${subject}</h2>
                </td>
              </tr>
              <tr>
                <td style="padding-top: 10px; font-size: 16px; line-height: 1.6;">
                  ${content}
                </td>
              </tr>
              <tr>
                <td style="padding-top: 40px; font-size: 12px; text-align: center; color: #999;">
                  <p>This email was sent from your IDE platform. If you didn’t expect this, please ignore.</p>
                  <p>&copy; ${new Date().getFullYear()} Your IDE Company</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
