const nodemailer = require("nodemailer");

// Create transporter (configure with your email service)
const createTransporter = () => {
  // For development, use a test account or configure with your SMTP
  // For production, use services like SendGrid, AWS SES, etc.
  
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // If no email config, return null (email functions will handle gracefully)
  console.log("⚠️  Email service not configured. Email notifications will be disabled.");
  console.log("   To enable email, set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env");
  return null;
};

const transporter = createTransporter();

const sendEmail = async ({ to, subject, html, text }) => {
  // If transporter is not configured, skip sending but don't fail
  if (!transporter) {
    console.log(`📧 Email not sent (service not configured): ${subject} to ${to}`);
    return { success: false, error: "Email service not configured" };
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || "noreply@simtodec.com",
      to,
      subject,
      html,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("📧 Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    return { success: false, error: error.message };
  }
};

const sendShipmentNotification = async (userEmail, shipment) => {
  const subject = `New Shipment Created: ${shipment.origin} → ${shipment.destination}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">New Shipment Created</h2>
      <p>A new shipment has been created and requires your attention.</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Route:</strong> ${shipment.origin} → ${shipment.destination}</p>
        <p><strong>AI Recommendation:</strong> ${shipment.aiRecommendation?.mode || "N/A"}</p>
        <p><strong>Expected Profit:</strong> ₹${Math.round(shipment.aiRecommendation?.profit || 0)}</p>
        <p><strong>CO₂ Emissions:</strong> ${Math.round(shipment.aiRecommendation?.co2 || 0)} kg</p>
        <p><strong>Status:</strong> ${shipment.status}</p>
      </div>
      <p><a href="${process.env.CLIENT_URL || "http://localhost:5173"}/shipments/${shipment._id}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Shipment</a></p>
    </div>
  `;
  
  return await sendEmail({
    to: userEmail,
    subject,
    html,
    text: `New Shipment: ${shipment.origin} → ${shipment.destination}. AI Recommendation: ${shipment.aiRecommendation?.mode || "N/A"}`,
  });
};

const sendApprovalNotification = async (userEmail, shipment) => {
  const subject = `Shipment Approved: ${shipment.origin} → ${shipment.destination}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">Shipment Approved</h2>
      <p>Your shipment has been approved by a manager.</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Route:</strong> ${shipment.origin} → ${shipment.destination}</p>
        <p><strong>Final Mode:</strong> ${shipment.finalMode || shipment.aiRecommendation?.mode || "N/A"}</p>
        ${shipment.managerOverride ? `<p><strong>Override Reason:</strong> ${shipment.managerOverride.overrideReason}</p>` : ""}
      </div>
      <p><a href="${process.env.CLIENT_URL || "http://localhost:5173"}/shipments/${shipment._id}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Shipment</a></p>
    </div>
  `;
  
  return await sendEmail({
    to: userEmail,
    subject,
    html,
    text: `Shipment Approved: ${shipment.origin} → ${shipment.destination}`,
  });
};

const sendWeeklyReport = async (userEmail, reportData) => {
  const subject = `Weekly Logistics Report - ${new Date().toLocaleDateString()}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Weekly Logistics Report</h2>
      <p>Here's your weekly summary of logistics operations.</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Key Metrics</h3>
        <p><strong>Total Shipments:</strong> ${reportData.totalShipments}</p>
        <p><strong>Total Profit:</strong> ₹${Math.round(reportData.totalProfit || 0)}</p>
        <p><strong>Total CO₂ Emissions:</strong> ${Math.round(reportData.totalCO2 || 0)} kg</p>
        <p><strong>Average Delay:</strong> ${Math.round((reportData.avgDelay || 0) * 10) / 10} days</p>
        <p><strong>Pending Approvals:</strong> ${reportData.pendingShipments}</p>
      </div>
      <p><a href="${process.env.CLIENT_URL || "http://localhost:5173"}/analytics" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Full Analytics</a></p>
    </div>
  `;
  
  return await sendEmail({
    to: userEmail,
    subject,
    html,
    text: `Weekly Report: ${reportData.totalShipments} shipments, ₹${Math.round(reportData.totalProfit || 0)} profit, ${Math.round(reportData.totalCO2 || 0)} kg CO₂`,
  });
};

const sendFuelSurgeAlert = async (userEmails, surgePercentage) => {
  const subject = `⚠️ Fuel Price Surge Alert: ${surgePercentage}% Increase`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ef4444;">⚠️ Fuel Price Surge Alert</h2>
      <p>Fuel prices have increased by <strong>${surgePercentage}%</strong>. This may affect shipping costs and recommendations.</p>
      <p><a href="${process.env.CLIENT_URL || "http://localhost:5173"}/analytics" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Impact</a></p>
    </div>
  `;
  
  const results = await Promise.all(
    userEmails.map(email =>
      sendEmail({
        to: email,
        subject,
        html,
        text: `Fuel Price Surge: ${surgePercentage}% increase detected.`,
      })
    )
  );
  
  return results;
};

module.exports = {
  sendEmail,
  sendShipmentNotification,
  sendApprovalNotification,
  sendWeeklyReport,
  sendFuelSurgeAlert,
};


