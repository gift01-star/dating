import nodemailer from 'nodemailer';
const cors = require('cors');

app.use(cors({
  origin: 'https://edu-love.onrender.com',
  method: ['GET','POST'],
  credentials: true
}));
// Configure email transporter - Gmail only with App Password
let transporter;

if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  // Use Gmail SMTP with App Password
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  console.info('Using Gmail SMTP for emails (with App Password)');
} else {
  console.warn('No Gmail credentials configured. Emails will not be sent.');
  console.warn('Configure EMAIL_USER and EMAIL_PASSWORD environment variables.');
  // Create a dummy transporter that doesn't send emails
  transporter = {
    sendMail: async () => {
      console.warn('Email service not configured - skipping email send');
      return true;
    }
  };
}

export const sendEmail = async (to, subject, html) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('[Email] Gmail credentials not configured. Skipping email:', { to, subject });
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@edulove.com',
      to,
      subject,
      html
    };

    await transporter.sendMail(mailOptions);
    console.info(`[Email] Sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error('[Email] Error sending email:', error.message);
    return false;
  }
};

export const sendLikeNotification = async (recipientEmail, recipientName, senderName, senderPhoto) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0;">❤️ You Got a Like!</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; text-align: center;">
        <p style="font-size: 18px; color: #333;">Hi ${recipientName},</p>
        <p style="font-size: 16px; color: #666; margin: 20px 0;">
          <strong>${senderName}</strong> just liked your profile on EduLove!
        </p>
        ${senderPhoto ? `<img src="${senderPhoto}" alt="${senderName}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin: 20px 0;">` : ''}
        <p style="margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL}/likes" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Check Your Likes →
          </a>
        </p>
        <p style="font-size: 12px; color: #999; margin-top: 30px;">
          If you don't want these emails, update your notification preferences in your account settings.
        </p>
      </div>
      <div style="background: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px;">
        <p>© 2026 EduLove - University Dating Platform</p>
      </div>
    </div>
  `;

  return sendEmail(recipientEmail, `🎉 ${senderName} liked your profile!`, html);
};

export const sendMatchNotification = async (recipientEmail, recipientName, matchName) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0;">💕 It's a Match!</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; text-align: center;">
        <p style="font-size: 18px; color: #333;">Congratulations ${recipientName}!</p>
        <p style="font-size: 16px; color: #666; margin: 20px 0;">
          You and <strong>${matchName}</strong> have matched! You can now start chatting.
        </p>
        <p style="margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL}/messages" style="background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Start Chatting Now →
          </a>
        </p>
        <p style="font-size: 12px; color: #999; margin-top: 30px;">
          Be respectful and have fun! Check our community guidelines.
        </p>
      </div>
      <div style="background: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px;">
        <p>© 2026 EduLove - University Dating Platform</p>
      </div>
    </div>
  `;

  return sendEmail(recipientEmail, `💕 You matched with ${matchName}!`, html);
};

export const sendMessageNotification = async (recipientEmail, recipientName, senderName, messagePreview) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #00d4ff 0%, #0099ff 100%); padding: 20px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0;">💬 New Message</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px;">
        <p style="font-size: 18px; color: #333;">Hi ${recipientName},</p>
        <p style="font-size: 16px; color: #666; margin: 20px 0;">
          <strong>${senderName}</strong> sent you a message:
        </p>
        <div style="background: white; border-left: 4px solid #0099ff; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #333; font-style: italic;">
            "${messagePreview}"
          </p>
        </div>
        <p style="margin: 20px 0; text-align: center;">
          <a href="${process.env.FRONTEND_URL}/messages" style="background: #0099ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Reply Now →
          </a>
        </p>
        <p style="font-size: 12px; color: #999;">
          Update your notification preferences in your account settings.
        </p>
      </div>
      <div style="background: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px;">
        <p>© 2026 EduLove - University Dating Platform</p>
      </div>
    </div>
  `;

  return sendEmail(recipientEmail, `💬 New message from ${senderName}`, html);
};

export default { sendEmail, sendLikeNotification, sendMatchNotification, sendMessageNotification };
