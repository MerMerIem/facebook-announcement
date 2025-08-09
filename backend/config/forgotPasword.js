import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});

// Function to send an email with HTML and styling
const sendEmail = async (to, subject, text, htmlContent = null) => {
  // Default HTML template with blue styling if no custom HTML is provided
  const defaultHtml = `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #e0e0e0;
            border-radius: 5px;
          }
          .header {
            background-color: #1e88e5;
            color: white;
            padding: 15px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            padding: 20px;
            background-color: #ffffff;
          }
          .main-text {
            font-size: 18px;
            line-height: 1.8;
            margin: 15px 0;
            color: #333333;
            text-align: center;
            font-weight: 500;
          }
          .verification-code {
            font-size: 28px;
            font-weight: bold;
            text-align: center;
            color: #1e88e5;
            padding: 15px;
            margin: 20px 0;
            letter-spacing: 3px;
            background-color: #f0f7ff;
            border: 2px dashed #1e88e5;
            border-radius: 8px;
          }
          .footer {
            text-align: center;
            padding: 10px;
            font-size: 12px;
            color: #757575;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h2>Réinitialisation du mot de passe</h2>
          </div>
          <div class="content">
            <p class="main-text">${text}</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to,
    subject,
    text, // Plain text version for email clients that don't support HTML
    html: htmlContent || defaultHtml // HTML version
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, message: "Email sent", info };
  } catch (error) {
    return { success: false, message: "Email sending failed", error };
  }
};

export default sendEmail;