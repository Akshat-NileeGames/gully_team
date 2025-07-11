import moment from "moment"

class EmailTemplateService {
  constructor() {
    this.brandColors = {
      primary: "#2563eb",
      secondary: "#06b6d4",
      success: "#16a34a",
      warning: "#eab308",
      danger: "#dc2626",
      gray: "#6b7280",
    }

    this.companyInfo = {
      name: "Nilee Games and Future Technologies Pvt. Ltd.",
      email: "gullyteam33@gmail.com",
      supportEmail: "gullyteam33@gmail.com",
    }
  }

  // Main method to render any template
  async renderTemplate(templateType, entityType, data, isExpired = false) {
    const templateKey = `${entityType}_${isExpired ? "expired" : "reminder"}`

    switch (templateKey) {
      case "shop_reminder":
        return this.renderShopReminderTemplate(data)
      case "shop_expired":
        return this.renderShopExpiredTemplate(data)
      case "individual_reminder":
        return this.renderIndividualReminderTemplate(data)
      case "individual_expired":
        return this.renderIndividualExpiredTemplate(data)
      case "venue_reminder":
        return this.renderVenueReminderTemplate(data)
      case "venue_expired":
        return this.renderVenueExpiredTemplate(data)
      default:
        throw new Error(`Unknown template type: ${templateKey}`)
    }
  }

  // Shop Reminder Template
  renderShopReminderTemplate(data) {
    const { shop, user, packageDetails, expirationDate, daysUntilExpiration, transactionId } = data

    const urgencyLevel = this.getUrgencyLevel(daysUntilExpiration)
    const formattedDate = moment(expirationDate).format("MMMM DD, YYYY")

    const subject = this.generateSubject("shop", daysUntilExpiration, false)
    const html = this.generateShopReminderHTML({
      shop,
      user,
      packageDetails,
      formattedDate,
      daysUntilExpiration,
      urgencyLevel,
      transactionId,
    })

    return { subject, html }
  }

  // Shop Expired Template
  renderShopExpiredTemplate(data) {
    const { shop, user, packageDetails, expirationDate, transactionId } = data

    const formattedDate = moment(expirationDate).format("MMMM DD, YYYY")
    const subject = this.generateSubject("shop", 0, true)
    const html = this.generateShopExpiredHTML({
      shop,
      user,
      packageDetails,
      formattedDate,
      transactionId,
    })

    return { subject, html }
  }

  // Individual Reminder Template
  renderIndividualReminderTemplate(data) {
    const { individual, user, packageDetails, expirationDate, daysUntilExpiration, transactionId } = data

    const urgencyLevel = this.getUrgencyLevel(daysUntilExpiration)
    const formattedDate = moment(expirationDate).format("MMMM DD, YYYY")

    const subject = this.generateSubject("individual", daysUntilExpiration, false)
    const html = this.generateIndividualReminderHTML({
      individual,
      user,
      packageDetails,
      formattedDate,
      daysUntilExpiration,
      urgencyLevel,
      transactionId,
    })

    return { subject, html }
  }

  // Individual Expired Template
  renderIndividualExpiredTemplate(data) {
    const { individual, user, packageDetails, expirationDate, transactionId } = data

    const formattedDate = moment(expirationDate).format("MMMM DD, YYYY")
    const subject = this.generateSubject("individual", 0, true)
    const html = this.generateIndividualExpiredHTML({
      individual,
      user,
      packageDetails,
      formattedDate,
      transactionId,
    })

    return { subject, html }
  }

  // Venue Reminder Template
  renderVenueReminderTemplate(data) {
    const { venue, user, packageDetails, expirationDate, daysUntilExpiration, transactionId } = data

    const urgencyLevel = this.getUrgencyLevel(daysUntilExpiration)
    const formattedDate = moment(expirationDate).format("MMMM DD, YYYY")

    const subject = this.generateSubject("venue", daysUntilExpiration, false)
    const html = this.generateVenueReminderHTML({
      venue,
      user,
      packageDetails,
      formattedDate,
      daysUntilExpiration,
      urgencyLevel,
      transactionId,
    })

    return { subject, html }
  }

  // Venue Expired Template
  renderVenueExpiredTemplate(data) {
    const { venue, user, packageDetails, expirationDate, transactionId } = data

    const formattedDate = moment(expirationDate).format("MMMM DD, YYYY")
    const subject = this.generateSubject("venue", 0, true)
    const html = this.generateVenueExpiredHTML({
      venue,
      user,
      packageDetails,
      formattedDate,
      transactionId,
    })

    return { subject, html }
  }

  // Helper Methods
  getUrgencyLevel(daysUntilExpiration) {
    if (daysUntilExpiration <= 1) return "critical"
    if (daysUntilExpiration <= 3) return "high"
    if (daysUntilExpiration <= 7) return "medium"
    return "low"
  }

  generateSubject(entityType, daysUntilExpiration, isExpired) {
    const entityNames = {
      shop: "Shop",
      individual: "Service Provider",
      venue: "Venue",
    }

    if (isExpired) {
      return `🚫 ${entityNames[entityType]} Package Expired - Immediate Action Required`
    }

    if (daysUntilExpiration <= 1) {
      return `🚨 URGENT: Your ${entityNames[entityType]} Package Expires Tomorrow!`
    } else if (daysUntilExpiration <= 3) {
      return `⚠️ CRITICAL: Your ${entityNames[entityType]} Package Expires in ${daysUntilExpiration} Days`
    } else {
      return `⏰ Reminder: Your ${entityNames[entityType]} Package Expires in ${daysUntilExpiration} Days`
    }
  }

  getUrgencyColors(urgencyLevel) {
    const colors = {
      critical: {
        header: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
        badge: "#fee2e2",
        border: "#f87171",
        text: "#b91c1c",
      },
      high: {
        header: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
        badge: "#fed7aa",
        border: "#fdba74",
        text: "#c2410c",
      },
      medium: {
        header: "linear-gradient(135deg, #eab308 0%, #facc15 100%)",
        badge: "#fef3c7",
        border: "#fbbf24",
        text: "#92400e",
      },
      low: {
        header: "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)",
        badge: "#dbeafe",
        border: "#93c5fd",
        text: "#1e40af",
      },
    }
    return colors[urgencyLevel] || colors.low
  }

  // Base HTML Template Structure
  getBaseTemplate() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>{{TITLE}}</title>
  <style>
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      margin: 0;
      padding: 0;
    }
    
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
      border-collapse: collapse;
    }
    
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
      max-width: 100%;
    }

    body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #f4f6f8 !important;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      line-height: 1.6;
    }

    .email-wrapper {
      width: 100% !important;
      background-color: #f4f6f8;
      padding: 20px 0;
      min-height: 100vh;
    }

    .email-container {
      max-width: 650px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .header {
      padding: 40px 30px;
      text-align: center;
      background: {{HEADER_GRADIENT}};
    }

    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 28px;
      font-weight: bold;
      line-height: 1.2;
    }

    .header p {
      margin: 8px 0 0 0;
      color: rgba(255, 255, 255, 0.8);
      font-size: 16px;
    }

    .content {
      padding: 40px 30px;
    }

    .welcome-text {
      font-size: 20px;
      font-weight: bold;
      color: #1f2937;
      margin: 0 0 20px 0;
      line-height: 1.3;
    }

    .intro-text {
      font-size: 16px;
      color: #6b7280;
      margin: 0 0 30px 0;
      line-height: 1.6;
    }

    .urgency-alert {
      background-color: {{BADGE_COLOR}};
      border: 2px solid {{BORDER_COLOR}};
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
      text-align: center;
    }

    .urgency-title {
      font-size: 18px;
      font-weight: bold;
      color: {{TEXT_COLOR}};
      margin: 0 0 10px 0;
    }

    .urgency-text {
      color: {{TEXT_COLOR}};
      font-size: 14px;
      margin: 0;
      line-height: 1.5;
    }

    .package-summary {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 2px solid #0ea5e9;
      border-radius: 12px;
      padding: 25px;
      margin: 30px 0;
    }

    .package-title {
      font-size: 20px;
      font-weight: bold;
      color: #0c4a6e;
      margin: 0 0 20px 0;
      text-align: center;
    }

    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .details-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: top;
    }

    .details-table tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .details-table tr:nth-child(odd) {
      background-color: #ffffff;
    }

    .details-table tr:last-child td {
      border-bottom: none;
    }

    .details-table td.label {
      font-weight: 600;
      color: #374151;
      width: 35%;
      font-size: 14px;
    }

    .details-table td.value {
      color: #6b7280;
      font-size: 14px;
      word-break: break-word;
    }

    .consequences-section {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
    }

    .consequences-title {
      font-size: 16px;
      font-weight: bold;
      color: #dc2626;
      margin: 0 0 10px 0;
    }

    .consequences-text {
      color: #dc2626;
      font-size: 14px;
      line-height: 1.5;
      margin: 0;
    }

    .benefits-section {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
    }

    .benefits-title {
      font-size: 16px;
      font-weight: bold;
      color: #166534;
      margin: 0 0 15px 0;
    }

    .benefits-list {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .benefit-item {
      margin: 8px 0;
      color: #166534;
      font-size: 14px;
      line-height: 1.5;
      padding-left: 20px;
      position: relative;
    }

    .benefit-item:before {
      content: "✓";
      color: #16a34a;
      font-weight: bold;
      position: absolute;
      left: 0;
    }

    .cta-section {
      text-align: center;
      margin: 35px 0;
    }

    .cta-text {
      font-size: 16px;
      color: #6b7280;
      margin: 0 0 25px 0;
      line-height: 1.6;
    }

    .cta-button {
      display: inline-block;
      padding: 16px 32px;
      background-color: {{CTA_COLOR}};
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      font-size: 16px;
      line-height: 1;
      transition: all 0.3s ease;
      border: none;
      cursor: pointer;
    }

    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .cta-button.urgent {
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }

    .transaction-info {
      background-color: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 20px 0;
      text-align: center;
    }

    .transaction-label {
      font-size: 12px;
      color: #92400e;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .transaction-value {
      font-size: 14px;
      color: #92400e;
      font-weight: bold;
      font-family: 'Courier New', monospace;
    }

    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }

    .footer-text {
      font-size: 13px;
      color: #6b7280;
      margin: 0 0 8px 0;
      line-height: 1.5;
    }

    .footer-link {
      color: #2563eb;
      text-decoration: none;
    }

    .footer-link:hover {
      color: #1d4ed8;
      text-decoration: underline;
    }

    /* Mobile responsiveness */
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        padding: 10px 0;
      }
      
      .email-container {
        margin: 0 10px;
        border-radius: 8px;
      }
      
      .header {
        padding: 30px 20px;
      }
      
      .header h1 {
        font-size: 24px;
      }
      
      .content {
        padding: 30px 20px;
      }
      
      .details-table td.label {
        width: 40%;
        font-size: 13px;
      }
      
      .details-table td.value {
        font-size: 13px;
      }
      
      .package-summary,
      .urgency-alert,
      .consequences-section,
      .benefits-section {
        padding: 20px;
      }
      
      .cta-button {
        display: block;
        margin: 15px 0;
        padding: 14px 24px;
      }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .email-container {
        background-color: #ffffff !important;
      }
    }

    /* High contrast mode */
    @media (prefers-contrast: high) {
      .cta-button {
        border: 2px solid #000000;
      }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .cta-button.urgent {
        animation: none;
      }
      
      .cta-button:hover {
        transform: none;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <div class="email-container">
            {{CONTENT}}
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`
  }

  // Shop Reminder HTML
  generateShopReminderHTML(data) {
    const { shop, user, packageDetails, formattedDate, daysUntilExpiration, urgencyLevel, transactionId } = data
    const colors = this.getUrgencyColors(urgencyLevel)

    const content = `
            <!-- Header -->
            <div class="header">
              <h1>${daysUntilExpiration <= 1 ? "🚨 Urgent Action Required" : "⏰ Package Expiration Reminder"}</h1>
              <p>Gully Team Shop Subscription</p>
            </div>

            <!-- Content -->
            <div class="content">
              <p class="welcome-text">Hello ${user.fullName || shop.ownerName}! 🏪</p>
              <p class="intro-text">
                We hope your shop "<strong>${shop.shopName}</strong>" has been thriving on our platform. 
                We're writing to remind you that your subscription package is ${daysUntilExpiration <= 1 ? "expiring tomorrow" : `expiring in ${daysUntilExpiration} days`}.
              </p>

              <!-- Urgency Alert -->
              <div class="urgency-alert">
                <div class="urgency-title">
                  ${urgencyLevel === "critical" ? "🚨 Critical Alert" : urgencyLevel === "high" ? "⚠️ High Priority" : urgencyLevel === "medium" ? "⏰ Important Notice" : "📅 Friendly Reminder"}
                </div>
                <p class="urgency-text">
                  Your shop subscription ${daysUntilExpiration <= 1 ? "expires tomorrow" : `expires in ${daysUntilExpiration} day${daysUntilExpiration === 1 ? "" : "s"}`}. 
                  ${daysUntilExpiration <= 3 ? "Immediate action is required to prevent service interruption." : "Please plan to renew your subscription to avoid any service disruption."}
                </p>
              </div>

              <!-- Package Summary -->
              <div class="package-summary">
                <h3 class="package-title">Current Package: ${packageDetails?.name || "Shop Subscription"}</h3>
                <table class="details-table" role="presentation">
                  <tr>
                    <td class="label">Package Name:</td>
                    <td class="value">${packageDetails?.name || "Standard Shop Package"}</td>
                  </tr>
                  <tr>
                    <td class="label">Expiration Date:</td>
                    <td class="value">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td class="label">Days Remaining:</td>
                    <td class="value" style="color: ${colors.text}; font-weight: bold;">${daysUntilExpiration} day${daysUntilExpiration === 1 ? "" : "s"}</td>
                  </tr>
                  ${
                    packageDetails?.price
                      ? `
                  <tr>
                    <td class="label">Package Value:</td>
                    <td class="value">₹${packageDetails.price}</td>
                  </tr>
                  `
                      : ""
                  }
                </table>
              </div>

              <!-- Shop Information -->
              <div class="package-summary">
                <h3 class="package-title">Shop Details</h3>
                <table class="details-table" role="presentation">
                  <tr>
                    <td class="label">Shop Name:</td>
                    <td class="value">${shop.shopName}</td>
                  </tr>
                  <tr>
                    <td class="label">Owner:</td>
                    <td class="value">${shop.ownerName}</td>
                  </tr>
                  <tr>
                    <td class="label">Contact:</td>
                    <td class="value">${shop.shopContact}</td>
                  </tr>
                  <tr>
                    <td class="label">Address:</td>
                    <td class="value">${shop.shopAddress}</td>
                  </tr>
                </table>
              </div>

              <!-- Consequences Section -->
              <div class="consequences-section">
                <h3 class="consequences-title">⚠️ What Happens If You Don't Renew?</h3>
                <p class="consequences-text">
                  <strong>Your shop will be immediately removed from our platform</strong>, which means:
                  <br>• Customers won't be able to find your shop
                  <br>• You'll lose all visibility and potential sales
                  <br>• Your shop listing will be deactivated
                  <br>• You'll stop receiving customer inquiries
                </p>
              </div>

              <!-- Benefits Section -->
              <div class="benefits-section">
                <h3 class="benefits-title">✨ Renew Now and Continue Enjoying:</h3>
                <ul class="benefits-list">
                  <li class="benefit-item">Prime visibility on Gully Team platform</li>
                  <li class="benefit-item">Direct customer connections and inquiries</li>
                  <li class="benefit-item">Professional shop profile management</li>
                  <li class="benefit-item">Customer review and rating system</li>
                  <li class="benefit-item">Business analytics and insights</li>
                  <li class="benefit-item">Priority customer support</li>
                </ul>
              </div>

              ${
                transactionId
                  ? `
              <!-- Transaction Info -->
              <div class="transaction-info">
                <div class="transaction-label">Original Transaction ID:</div>
                <div class="transaction-value">${transactionId}</div>
              </div>
              `
                  : ""
              }

              <!-- Call to Action -->
              <div class="cta-section">
                <p class="cta-text">
                  ${daysUntilExpiration <= 1 ? "Don't let your shop go offline tomorrow!" : "Secure your shop's future on our platform."}
                  Renew your subscription now to maintain uninterrupted service.
                </p>
                <a href="mailto:${this.companyInfo.supportEmail}?subject=Shop Package Renewal - ${shop.shopName}&body=Hello, I would like to renew my shop package for ${shop.shopName}. My current package expires on ${formattedDate}." 
                   class="cta-button ${urgencyLevel === "critical" ? "urgent" : ""}"
                   style="background-color: ${colors.text};">
                  ${daysUntilExpiration <= 1 ? "🚨 Renew Immediately" : "🔄 Renew Package Now"}
                </a>
              </div>

              <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;">
                Need help with renewal? Contact our support team at 
                <a href="mailto:${this.companyInfo.supportEmail}" style="color: #2563eb;">${this.companyInfo.supportEmail}</a>
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p class="footer-text">
                © ${new Date().getFullYear()} ${this.companyInfo.name}
              </p>
              <p class="footer-text">
                Email: <a href="mailto:${this.companyInfo.email}" class="footer-link">${this.companyInfo.email}</a>
              </p>
              <p class="footer-text">
                Thank you for being a valued partner with Gully Team!
              </p>
            </div>`

    return this.getBaseTemplate()
      .replace("{{TITLE}}", "Shop Package Expiration Reminder")
      .replace("{{HEADER_GRADIENT}}", colors.header)
      .replace(/{{BADGE_COLOR}}/g, colors.badge)
      .replace(/{{BORDER_COLOR}}/g, colors.border)
      .replace(/{{TEXT_COLOR}}/g, colors.text)
      .replace("{{CTA_COLOR}}", colors.text)
      .replace("{{CONTENT}}", content)
  }

  // Shop Expired HTML
  generateShopExpiredHTML(data) {
    const { shop, user, packageDetails, formattedDate, transactionId } = data
    const colors = this.getUrgencyColors("critical")

    const content = `
            <!-- Header -->
            <div class="header">
              <h1>🚫 Shop Package Expired</h1>
              <p>Immediate Action Required</p>
            </div>

            <!-- Content -->
            <div class="content">
              <p class="welcome-text">Hello ${user.fullName || shop.ownerName}! 🏪</p>
              <p class="intro-text">
                We regret to inform you that your shop "<strong>${shop.shopName}</strong>" subscription package has expired 
                and your shop has been temporarily removed from our platform.
              </p>

              <!-- Expired Alert -->
              <div class="urgency-alert">
                <div class="urgency-title">🚫 Package Expired</div>
                <p class="urgency-text">
                  Your shop subscription expired on ${formattedDate}. Your shop is currently not visible to customers 
                  and you are not receiving any new inquiries or orders.
                </p>
              </div>

              <!-- Package Summary -->
              <div class="package-summary">
                <h3 class="package-title">Expired Package: ${packageDetails?.name || "Shop Subscription"}</h3>
                <table class="details-table" role="presentation">
                  <tr>
                    <td class="label">Package Name:</td>
                    <td class="value">${packageDetails?.name || "Standard Shop Package"}</td>
                  </tr>
                  <tr>
                    <td class="label">Expired On:</td>
                    <td class="value" style="color: ${colors.text}; font-weight: bold;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td class="label">Current Status:</td>
                    <td class="value" style="color: ${colors.text}; font-weight: bold;">Deactivated</td>
                  </tr>
                  ${
                    packageDetails?.price
                      ? `
                  <tr>
                    <td class="label">Renewal Price:</td>
                    <td class="value">₹${packageDetails.price}</td>
                  </tr>
                  `
                      : ""
                  }
                </table>
              </div>

              <!-- Shop Information -->
              <div class="package-summary">
                <h3 class="package-title">Affected Shop Details</h3>
                <table class="details-table" role="presentation">
                  <tr>
                    <td class="label">Shop Name:</td>
                    <td class="value">${shop.shopName}</td>
                  </tr>
                  <tr>
                    <td class="label">Owner:</td>
                    <td class="value">${shop.ownerName}</td>
                  </tr>
                  <tr>
                    <td class="label">Contact:</td>
                    <td class="value">${shop.shopContact}</td>
                  </tr>
                  <tr>
                    <td class="label">Address:</td>
                    <td class="value">${shop.shopAddress}</td>
                  </tr>
                </table>
              </div>

              <!-- Current Impact -->
              <div class="consequences-section">
                <h3 class="consequences-title">📉 Current Impact on Your Business</h3>
                <p class="consequences-text">
                  <strong>Your shop is currently offline</strong>, which means:
                  <br>• Zero visibility to potential customers
                  <br>• No new customer inquiries or orders
                  <br>• Loss of competitive advantage
                  <br>• Missed sales opportunities every day
                  <br>• Customers may choose competitors instead
                </p>
              </div>

              <!-- Restore Benefits -->
              <div class="benefits-section">
                <h3 class="benefits-title">🔄 Renew Now to Immediately Restore:</h3>
                <ul class="benefits-list">
                  <li class="benefit-item">Full shop visibility on Gully Team platform</li>
                  <li class="benefit-item">Customer inquiries and order flow</li>
                  <li class="benefit-item">Professional shop profile and gallery</li>
                  <li class="benefit-item">Customer reviews and ratings display</li>
                  <li class="benefit-item">Business performance analytics</li>
                  <li class="benefit-item">Priority placement in search results</li>
                </ul>
              </div>

              ${
                transactionId
                  ? `
              <!-- Transaction Info -->
              <div class="transaction-info">
                <div class="transaction-label">Previous Transaction ID:</div>
                <div class="transaction-value">${transactionId}</div>
              </div>
              `
                  : ""
              }

              <!-- Urgent Call to Action -->
              <div class="cta-section">
                <p class="cta-text">
                  <strong>Every day your shop remains offline, you're losing potential customers and revenue.</strong>
                  Renew your subscription immediately to get back online and start receiving orders again.
                </p>
                <a href="mailto:${this.companyInfo.supportEmail}?subject=URGENT: Shop Package Renewal - ${shop.shopName}&body=Hello, My shop package has expired and I need immediate renewal. Shop: ${shop.shopName}, Expired: ${formattedDate}" 
                   class="cta-button urgent"
                   style="background-color: ${colors.text};">
                  🚨 Renew Immediately & Go Live
                </a>
              </div>

              <p style="text-align: center; color: #dc2626; font-size: 14px; font-weight: bold; margin-top: 20px;">
                ⏰ The longer you wait, the more customers you lose to competitors.
                <br>Contact us now: <a href="mailto:${this.companyInfo.supportEmail}" style="color: #dc2626;">${this.companyInfo.supportEmail}</a>
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p class="footer-text">
                © ${new Date().getFullYear()} ${this.companyInfo.name}
              </p>
              <p class="footer-text">
                Email: <a href="mailto:${this.companyInfo.email}" class="footer-link">${this.companyInfo.email}</a>
              </p>
              <p class="footer-text">
                We're here to help you get back online quickly!
              </p>
            </div>`

    return this.getBaseTemplate()
      .replace("{{TITLE}}", "Shop Package Expired - Action Required")
      .replace("{{HEADER_GRADIENT}}", colors.header)
      .replace(/{{BADGE_COLOR}}/g, colors.badge)
      .replace(/{{BORDER_COLOR}}/g, colors.border)
      .replace(/{{TEXT_COLOR}}/g, colors.text)
      .replace("{{CTA_COLOR}}", colors.text)
      .replace("{{CONTENT}}", content)
  }

  // Individual Reminder HTML
  generateIndividualReminderHTML(data) {
    const { individual, user, packageDetails, formattedDate, daysUntilExpiration, urgencyLevel, transactionId } = data
    const colors = this.getUrgencyColors(urgencyLevel)

    const content = `
            <!-- Header -->
            <div class="header">
              <h1>${daysUntilExpiration <= 1 ? "🚨 Urgent Action Required" : "⏰ Package Expiration Reminder"}</h1>
              <p>Gully Team Service Provider</p>
            </div>

            <!-- Content -->
            <div class="content">
              <p class="welcome-text">Hello ${individual.fullName}! 🏆</p>
              <p class="intro-text">
                We hope you've been successfully connecting with sports enthusiasts and growing your coaching business. 
                Your service provider subscription is ${daysUntilExpiration <= 1 ? "expiring tomorrow" : `expiring in ${daysUntilExpiration} days`}.
              </p>

              <!-- Urgency Alert -->
              <div class="urgency-alert">
                <div class="urgency-title">
                  ${urgencyLevel === "critical" ? "🚨 Critical Alert" : urgencyLevel === "high" ? "⚠️ High Priority" : urgencyLevel === "medium" ? "⏰ Important Notice" : "📅 Friendly Reminder"}
                </div>
                <p class="urgency-text">
                  Your service provider profile ${daysUntilExpiration <= 1 ? "expires tomorrow" : `expires in ${daysUntilExpiration} day${daysUntilExpiration === 1 ? "" : "s"}`}. 
                  ${daysUntilExpiration <= 3 ? "Immediate action is required to prevent profile deactivation." : "Please plan to renew your subscription to maintain your professional presence."}
                </p>
              </div>

              <!-- Package Summary -->
              <div class="package-summary">
                <h3 class="package-title">Current Package: ${packageDetails?.name || "Service Provider Subscription"}</h3>
                <table class="details-table" role="presentation">
                  <tr>
                    <td class="label">Package Name:</td>
                    <td class="value">${packageDetails?.name || "Standard Provider Package"}</td>
                  </tr>
                  <tr>
                    <td class="label">Expiration Date:</td>
                    <td class="value">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td class="label">Days Remaining:</td>
                    <td class="value" style="color: ${colors.text}; font-weight: bold;">${daysUntilExpiration} day${daysUntilExpiration === 1 ? "" : "s"}</td>
                  </tr>
                  ${
                    packageDetails?.price
                      ? `
                  <tr>
                    <td class="label">Package Value:</td>
                    <td class="value">₹${packageDetails.price}</td>
                  </tr>
                  `
                      : ""
                  }
                </table>
              </div>

              <!-- Individual Information -->
              <div class="package-summary">
                <h3 class="package-title">Your Profile Details</h3>
                <table class="details-table" role="presentation">
                  <tr>
                    <td class="label">Full Name:</td>
                    <td class="value">${individual.fullName}</td>
                  </tr>
                  <tr>
                    <td class="label">Sports Categories:</td>
                    <td class="value">${individual.sportsCategories?.join(", ") || "Not specified"}</td>
                  </tr>
                  <tr>
                    <td class="label">Experience:</td>
                    <td class="value">${individual.yearOfExperience || 0} years</td>
                  </tr>
                  <tr>
                    <td class="label">Service Types:</td>
                    <td class="value">${individual.selectedServiceTypes?.join(", ") || "Not specified"}</td>
                  </tr>
                  <tr>
                    <td class="label">Contact:</td>
                    <td class="value">${individual.phoneNumber}</td>
                  </tr>
                </table>
              </div>

              <!-- Consequences Section -->
              <div class="consequences-section">
                <h3 class="consequences-title">⚠️ What Happens If You Don't Renew?</h3>
                <p class="consequences-text">
                  <strong>Your profile will be removed from our platform</strong>, which means:
                  <br>• Sports enthusiasts won't be able to find you
                  <br>• You'll lose all potential client bookings
                  <br>• Your professional profile will be deactivated
                  <br>• You'll stop receiving coaching inquiries
                  <br>• Your expertise won't be visible to seekers
                </p>
              </div>

              <!-- Benefits Section -->
              <div class="benefits-section">
                <h3 class="benefits-title">✨ Renew Now and Continue Enjoying:</h3>
                <ul class="benefits-list">
                  <li class="benefit-item">Professional profile showcasing your expertise</li>
                  <li class="benefit-item">Direct client connections and bookings</li>
                  <li class="benefit-item">Showcase certifications and achievements</li>
                  <li class="benefit-item">Client review and rating system</li>
                  <li class="benefit-item">Flexible service scheduling</li>
                  <li class="benefit-item">Priority support for service providers</li>
                </ul>
              </div>

              ${
                transactionId
                  ? `
              <!-- Transaction Info -->
              <div class="transaction-info">
                <div class="transaction-label">Original Transaction ID:</div>
                <div class="transaction-value">${transactionId}</div>
              </div>
              `
                  : ""
              }

              <!-- Call to Action -->
              <div class="cta-section">
                <p class="cta-text">
                  ${daysUntilExpiration <= 1 ? "Don't let your profile go offline tomorrow!" : "Continue building your coaching career with us."}
                  Renew your subscription now to maintain your professional presence.
                </p>
                <a href="mailto:${this.companyInfo.supportEmail}?subject=Service Provider Package Renewal - ${individual.fullName}&body=Hello, I would like to renew my service provider package. My current package expires on ${formattedDate}." 
                   class="cta-button ${urgencyLevel === "critical" ? "urgent" : ""}"
                   style="background-color: ${colors.text};">
                  ${daysUntilExpiration <= 1 ? "🚨 Renew Immediately" : "🔄 Renew Package Now"}
                </a>
              </div>

              <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;">
                Questions about renewal? Contact our support team at 
                <a href="mailto:${this.companyInfo.supportEmail}" style="color: #2563eb;">${this.companyInfo.supportEmail}</a>
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p class="footer-text">
                © ${new Date().getFullYear()} ${this.companyInfo.name}
              </p>
              <p class="footer-text">
                Email: <a href="mailto:${this.companyInfo.email}" class="footer-link">${this.companyInfo.email}</a>
              </p>
              <p class="footer-text">
                Thank you for being a valued service provider with Gully Team!
              </p>
            </div>`

    return this.getBaseTemplate()
      .replace("{{TITLE}}", "Service Provider Package Expiration Reminder")
      .replace("{{HEADER_GRADIENT}}", colors.header)
      .replace(/{{BADGE_COLOR}}/g, colors.badge)
      .replace(/{{BORDER_COLOR}}/g, colors.border)
      .replace(/{{TEXT_COLOR}}/g, colors.text)
      .replace("{{CTA_COLOR}}", colors.text)
      .replace("{{CONTENT}}", content)
  }

  // Individual Expired HTML
  generateIndividualExpiredHTML(data) {
    const { individual, user, packageDetails, formattedDate, transactionId } = data
    const colors = this.getUrgencyColors("critical")

    const content = `
            <!-- Header -->
            <div class="header">
              <h1>🚫 Service Provider Package Expired</h1>
              <p>Immediate Action Required</p>
            </div>

            <!-- Content -->
            <div class="content">
              <p class="welcome-text">Hello ${individual.fullName}! 🏆</p>
              <p class="intro-text">
                We regret to inform you that your service provider subscription has expired 
                and your profile has been temporarily removed from our platform.
              </p>

              <!-- Expired Alert -->
              <div class="urgency-alert">
                <div class="urgency-title">🚫 Profile Deactivated</div>
                <p class="urgency-text">
                  Your service provider subscription expired on ${formattedDate}. Your profile is currently not visible 
                  to sports enthusiasts and you are not receiving any new client inquiries.
                </p>
              </div>

              <!-- Package Summary -->
              <div class="package-summary">
                <h3 class="package-title">Expired Package: ${packageDetails?.name || "Service Provider Subscription"}</h3>
                <table class="details-table" role="presentation">
                  <tr>
                    <td class="label">Package Name:</td>
                    <td class="value">${packageDetails?.name || "Standard Provider Package"}</td>
                  </tr>
                  <tr>
                    <td class="label">Expired On:</td>
                    <td class="value" style="color: ${colors.text}; font-weight: bold;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td class="label">Current Status:</td>
                    <td class="value" style="color: ${colors.text}; font-weight: bold;">Deactivated</td>
                  </tr>
                  ${
                    packageDetails?.price
                      ? `
                  <tr>
                    <td class="label">Renewal Price:</td>
                    <td class="value">₹${packageDetails.price}</td>
                  </tr>
                  `
                      : ""
                  }
                </table>
              </div>

              <!-- Individual Information -->
              <div class="package-summary">
                <h3 class="package-title">Affected Profile Details</h3>
                <table class="details-table" role="presentation">
                  <tr>
                    <td class="label">Full Name:</td>
                    <td class="value">${individual.fullName}</td>
                  </tr>
                  <tr>
                    <td class="label">Sports Categories:</td>
                    <td class="value">${individual.sportsCategories?.join(", ") || "Not specified"}</td>
                  </tr>
                  <tr>
                    <td class="label">Experience:</td>
                    <td class="value">${individual.yearOfExperience || 0} years</td>
                  </tr>
                  <tr>
                    <td class="label">Service Types:</td>
                    <td class="value">${individual.selectedServiceTypes?.join(", ") || "Not specified"}</td>
                  </tr>
                </table>
              </div>

              <!-- Current Impact -->
              <div class="consequences-section">
                <h3 class="consequences-title">📉 Current Impact on Your Career</h3>
                <p class="consequences-text">
                  <strong>Your profile is currently offline</strong>, which means:
                  <br>• Zero visibility to potential clients
                  <br>• No new coaching inquiries or bookings
                  <br>• Loss of professional credibility
                  <br>• Missed opportunities to grow your client base
                  <br>• Clients may choose other available coaches
                </p>
              </div>

              <!-- Restore Benefits -->
              <div class="benefits-section">
                <h3 class="benefits-title">🔄 Renew Now to Immediately Restore:</h3>
                <ul class="benefits-list">
                  <li class="benefit-item">Full profile visibility to sports enthusiasts</li>
                  <li class="benefit-item">Client inquiry and booking flow</li>
                  <li class="benefit-item">Professional credentials showcase</li>
                  <li class="benefit-item">Client reviews and ratings display</li>
                  <li class="benefit-item">Service scheduling and management</li>
                  <li class="benefit-item">Priority placement in search results</li>
                </ul>
              </div>

              ${
                transactionId
                  ? `
              <!-- Transaction Info -->
              <div class="transaction-info">
                <div class="transaction-label">Previous Transaction ID:</div>
                <div class="transaction-value">${transactionId}</div>
              </div>
              `
                  : ""
              }

              <!-- Urgent Call to Action -->
              <div class="cta-section">
                <p class="cta-text">
                  <strong>Every day your profile remains offline, you're missing potential clients and coaching opportunities.</strong>
                  Renew your subscription immediately to get back online and start receiving inquiries again.
                </p>
                <a href="mailto:${this.companyInfo.supportEmail}?subject=URGENT: Service Provider Package Renewal - ${individual.fullName}&body=Hello, My service provider package has expired and I need immediate renewal. Name: ${individual.fullName}, Expired: ${formattedDate}" 
                   class="cta-button urgent"
                   style="background-color: ${colors.text};">
                  🚨 Renew Immediately & Go Live
                </a>
              </div>

              <p style="text-align: center; color: #dc2626; font-size: 14px; font-weight: bold; margin-top: 20px;">
                ⏰ The longer you wait, the more clients you lose to other coaches.
                <br>Contact us now: <a href="mailto:${this.companyInfo.supportEmail}" style="color: #dc2626;">${this.companyInfo.supportEmail}</a>
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p class="footer-text">
                © ${new Date().getFullYear()} ${this.companyInfo.name}
              </p>
              <p class="footer-text">
                Email: <a href="mailto:${this.companyInfo.email}" class="footer-link">${this.companyInfo.email}</a>
              </p>
              <p class="footer-text">
                We're here to help you get back online quickly!
              </p>
            </div>`

    return this.getBaseTemplate()
      .replace("{{TITLE}}", "Service Provider Package Expired - Action Required")
      .replace("{{HEADER_GRADIENT}}", colors.header)
      .replace(/{{BADGE_COLOR}}/g, colors.badge)
      .replace(/{{BORDER_COLOR}}/g, colors.border)
      .replace(/{{TEXT_COLOR}}/g, colors.text)
      .replace("{{CTA_COLOR}}", colors.text)
      .replace("{{CONTENT}}", content)
  }

  // Venue Reminder HTML
  generateVenueReminderHTML(data) {
    const { venue, user, packageDetails, formattedDate, daysUntilExpiration, urgencyLevel, transactionId } = data
    const colors = this.getUrgencyColors(urgencyLevel)

    const content = `
            <!-- Header -->
            <div class="header">
              <h1>${daysUntilExpiration <= 1 ? "🚨 Urgent Action Required" : "⏰ Package Expiration Reminder"}</h1>
              <p>Gully Team Venue Subscription</p>
            </div>

            <!-- Content -->
            <div class="content">
              <p class="welcome-text">Hello ${user.fullName}! 🏟️</p>
              <p class="intro-text">
                We hope your venue "<strong>${venue.venue_name}</strong>" has been successfully attracting sports enthusiasts. 
                Your venue subscription is ${daysUntilExpiration <= 1 ? "expiring tomorrow" : `expiring in ${daysUntilExpiration} days`}.
              </p>

              <!-- Urgency Alert -->
              <div class="urgency-alert">
                <div class="urgency-title">
                  ${urgencyLevel === "critical" ? "🚨 Critical Alert" : urgencyLevel === "high" ? "⚠️ High Priority" : urgencyLevel === "medium" ? "⏰ Important Notice" : "📅 Friendly Reminder"}
                </div>
                <p class="urgency-text">
                  Your venue subscription ${daysUntilExpiration <= 1 ? "expires tomorrow" : `expires in ${daysUntilExpiration} day${daysUntilExpiration === 1 ? "" : "s"}`}. 
                  ${daysUntilExpiration <= 3 ? "Immediate action is required to prevent venue delisting." : "Please plan to renew your subscription to maintain your venue visibility."}
                </p>
              </div>

              <!-- Package Summary -->
              <div class="package-summary">
                <h3 class="package-title">Current Package: ${packageDetails?.name || "Venue Subscription"}</h3>
                <table class="details-table" role="presentation">
                  <tr>
                    <td class="label">Package Name:</td>
                    <td class="value">${packageDetails?.name || "Standard Venue Package"}</td>
                  </tr>
                  <tr>
                    <td class="label">Expiration Date:</td>
                    <td class="value">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td class="label">Days Remaining:</td>
                    <td class="value" style="color: ${colors.text}; font-weight: bold;">${daysUntilExpiration} day${daysUntilExpiration === 1 ? "" : "s"}</td>
                  </tr>
                  ${
                    packageDetails?.price
                      ? `
                  <tr>
                    <td class="label">Package Value:</td>
                    <td class="value">₹${packageDetails.price}</td>
                  </tr>
                  `
                      : ""
                  }
                </table>
              </div>

              <!-- Venue Information -->
              <div class="package-summary">
                <h3 class="package-title">Venue Details</h3>
                <table class="details-table" role="presentation">
                  <tr>
                    <td class="label">Venue Name:</td>
                    <td class="value">${venue.venue_name}</td>
                  </tr>
                  <tr>
                    <td class="label">Type:</td>
                    <td class="value">${venue.venue_type || "Not specified"}</td>
                  </tr>
                  <tr>
                    <td class="label">Sports:</td>
                    <td class="value">${venue.venue_sports?.join(", ") || "Not specified"}</td>
                  </tr>
                  <tr>
                    <td class="label">Contact:</td>
                    <td class="value">${venue.venue_contact}</td>
                  </tr>
                  <tr>
                    <td class="label">Address:</td>
                    <td class="value">${venue.venue_address}</td>
                  </tr>
                  ${
                    venue.perHourCharge
                      ? `
                  <tr>
                    <td class="label">Hourly Rate:</td>
                    <td class="value">₹${venue.perHourCharge}/hour</td>
                  </tr>
                  `
                      : ""
                  }
                </table>
              </div>

              <!-- Consequences Section -->
              <div class="consequences-section">
                <h3 class="consequences-title">⚠️ What Happens If You Don't Renew?</h3>
                <p class="consequences-text">
                  <strong>Your venue will be removed from our platform</strong>, which means:
                  <br>• Sports enthusiasts won't be able to find your venue
                  <br>• You'll lose all potential bookings and revenue
                  <br>• Your venue listing will be deactivated
                  <br>• You'll stop receiving booking inquiries
                  <br>• Competitors will capture your potential customers
                </p>
              </div>

              <!-- Benefits Section -->
              <div class="benefits-section">
                <h3 class="benefits-title">✨ Renew Now and Continue Enjoying:</h3>
                <ul class="benefits-list">
                  <li class="benefit-item">Prime visibility on Gully Team platform</li>
                  <li class="benefit-item">Direct booking inquiries from sports enthusiasts</li>
                  <li class="benefit-item">Professional venue profile with gallery</li>
                  <li class="benefit-item">Customer review and rating system</li>
                  <li class="benefit-item">Booking management and calendar system</li>
                  <li class="benefit-item">Revenue tracking and analytics</li>
                </ul>
              </div>

              ${
                transactionId
                  ? `
              <!-- Transaction Info -->
              <div class="transaction-info">
                <div class="transaction-label">Original Transaction ID:</div>
                <div class="transaction-value">${transactionId}</div>
              </div>
              `
                  : ""
              }

              <!-- Call to Action -->
              <div class="cta-section">
                <p class="cta-text">
                  ${daysUntilExpiration <= 1 ? "Don't let your venue go offline tomorrow!" : "Keep your venue visible to sports enthusiasts."}
                  Renew your subscription now to maintain uninterrupted bookings.
                </p>
                <a href="mailto:${this.companyInfo.supportEmail}?subject=Venue Package Renewal - ${venue.venue_name}&body=Hello, I would like to renew my venue package for ${venue.venue_name}. My current package expires on ${formattedDate}." 
                   class="cta-button ${urgencyLevel === "critical" ? "urgent" : ""}"
                   style="background-color: ${colors.text};">
                  ${daysUntilExpiration <= 1 ? "🚨 Renew Immediately" : "🔄 Renew Package Now"}
                </a>
              </div>

              <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;">
                Need help with renewal? Contact our support team at 
                <a href="mailto:${this.companyInfo.supportEmail}" style="color: #2563eb;">${this.companyInfo.supportEmail}</a>
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p class="footer-text">
                © ${new Date().getFullYear()} ${this.companyInfo.name}
              </p>
              <p class="footer-text">
                Email: <a href="mailto:${this.companyInfo.email}" class="footer-link">${this.companyInfo.email}</a>
              </p>
              <p class="footer-text">
                Thank you for being a valued venue partner with Gully Team!
              </p>
            </div>`

    return this.getBaseTemplate()
      .replace("{{TITLE}}", "Venue Package Expiration Reminder")
      .replace("{{HEADER_GRADIENT}}", colors.header)
      .replace(/{{BADGE_COLOR}}/g, colors.badge)
      .replace(/{{BORDER_COLOR}}/g, colors.border)
      .replace(/{{TEXT_COLOR}}/g, colors.text)
      .replace("{{CTA_COLOR}}", colors.text)
      .replace("{{CONTENT}}", content)
  }

  // Venue Expired HTML
  generateVenueExpiredHTML(data) {
    const { venue, user, packageDetails, formattedDate, transactionId } = data
    const colors = this.getUrgencyColors("critical")

    const content = `
            <!-- Header -->
            <div class="header">
              <h1>🚫 Venue Package Expired</h1>
              <p>Immediate Action Required</p>
            </div>

            <!-- Content -->
            <div class="content">
              <p class="welcome-text">Hello ${user.fullName}! 🏟️</p>
              <p class="intro-text">
                We regret to inform you that your venue "<strong>${venue.venue_name}</strong>" subscription has expired 
                and your venue has been temporarily removed from our platform.
              </p>

              <!-- Expired Alert -->
              <div class="urgency-alert">
                <div class="urgency-title">🚫 Venue Delisted</div>
                <p class="urgency-text">
                  Your venue subscription expired on ${formattedDate}. Your venue is currently not visible 
                  to sports enthusiasts and you are not receiving any new booking inquiries.
                </p>
              </div>

              <!-- Package Summary -->
              <div class="package-summary">
                <h3 class="package-title">Expired Package: ${packageDetails?.name || "Venue Subscription"}</h3>
                <table class="details-table" role="presentation">
                  <tr>
                    <td class="label">Package Name:</td>
                    <td class="value">${packageDetails?.name || "Standard Venue Package"}</td>
                  </tr>
                  <tr>
                    <td class="label">Expired On:</td>
                    <td class="value" style="color: ${colors.text}; font-weight: bold;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td class="label">Current Status:</td>
                    <td class="value" style="color: ${colors.text}; font-weight: bold;">Delisted</td>
                  </tr>
                  ${
                    packageDetails?.price
                      ? `
                  <tr>
                    <td class="label">Renewal Price:</td>
                    <td class="value">₹${packageDetails.price}</td>
                  </tr>
                  `
                      : ""
                  }
                </table>
              </div>

              <!-- Venue Information -->
              <div class="package-summary">
                <h3 class="package-title">Affected Venue Details</h3>
                <table class="details-table" role="presentation">
                  <tr>
                    <td class="label">Venue Name:</td>
                    <td class="value">${venue.venue_name}</td>
                  </tr>
                  <tr>
                    <td class="label">Type:</td>
                    <td class="value">${venue.venue_type || "Not specified"}</td>
                  </tr>
                  <tr>
                    <td class="label">Sports:</td>
                    <td class="value">${venue.venue_sports?.join(", ") || "Not specified"}</td>
                  </tr>
                  <tr>
                    <td class="label">Contact:</td>
                    <td class="value">${venue.venue_contact}</td>
                  </tr>
                  <tr>
                    <td class="label">Address:</td>
                    <td class="value">${venue.venue_address}</td>
                  </tr>
                </table>
              </div>

              <!-- Current Impact -->
              <div class="consequences-section">
                <h3 class="consequences-title">📉 Current Impact on Your Business</h3>
                <p class="consequences-text">
                  <strong>Your venue is currently offline</strong>, which means:
                  <br>• Zero visibility to potential customers
                  <br>• No new booking inquiries or reservations
                  <br>• Loss of daily revenue opportunities
                  <br>• Customers booking competitor venues instead
                  <br>• Missed peak season bookings
                </p>
              </div>

              <!-- Restore Benefits -->
              <div class="benefits-section">
                <h3 class="benefits-title">🔄 Renew Now to Immediately Restore:</h3>
                <ul class="benefits-list">
                  <li class="benefit-item">Full venue visibility on Gully Team platform</li>
                  <li class="benefit-item">Booking inquiry and reservation flow</li>
                  <li class="benefit-item">Professional venue profile and image gallery</li>
                  <li class="benefit-item">Customer reviews and ratings display</li>
                  <li class="benefit-item">Booking calendar and management system</li>
                  <li class="benefit-item">Priority placement in venue searches</li>
                </ul>
              </div>

              ${
                transactionId
                  ? `
              <!-- Transaction Info -->
              <div class="transaction-info">
                <div class="transaction-label">Previous Transaction ID:</div>
                <div class="transaction-value">${transactionId}</div>
              </div>
              `
                  : ""
              }

              <!-- Urgent Call to Action -->
              <div class="cta-section">
                <p class="cta-text">
                  <strong>Every day your venue remains offline, you're losing potential bookings and revenue.</strong>
                  Renew your subscription immediately to get back online and start receiving bookings again.
                </p>
                <a href="mailto:${this.companyInfo.supportEmail}?subject=URGENT: Venue Package Renewal - ${venue.venue_name}&body=Hello, My venue package has expired and I need immediate renewal. Venue: ${venue.venue_name}, Expired: ${formattedDate}" 
                   class="cta-button urgent"
                   style="background-color: ${colors.text};">
                  🚨 Renew Immediately & Go Live
                </a>
              </div>

              <p style="text-align: center; color: #dc2626; font-size: 14px; font-weight: bold; margin-top: 20px;">
                ⏰ The longer you wait, the more bookings you lose to competitors.
                <br>Contact us now: <a href="mailto:${this.companyInfo.supportEmail}" style="color: #dc2626;">${this.companyInfo.supportEmail}</a>
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p class="footer-text">
                © ${new Date().getFullYear()} ${this.companyInfo.name}
              </p>
              <p class="footer-text">
                Email: <a href="mailto:${this.companyInfo.email}" class="footer-link">${this.companyInfo.email}</a>
              </p>
              <p class="footer-text">
                We're here to help you get back online quickly!
              </p>
            </div>`

    return this.getBaseTemplate()
      .replace("{{TITLE}}", "Venue Package Expired - Action Required")
      .replace("{{HEADER_GRADIENT}}", colors.header)
      .replace(/{{BADGE_COLOR}}/g, colors.badge)
      .replace(/{{BORDER_COLOR}}/g, colors.border)
      .replace(/{{TEXT_COLOR}}/g, colors.text)
      .replace("{{CTA_COLOR}}", colors.text)
      .replace("{{CONTENT}}", content)
  }

  // Utility method to prepare template data
  prepareTemplateData(entityType, entity, packageDetails, expirationDate, transactionId = null) {
    const daysUntilExpiration = this.calculateDaysUntilExpiration(expirationDate)

    const baseData = {
      packageDetails,
      expirationDate,
      daysUntilExpiration,
      transactionId,
    }

    switch (entityType) {
      case "shop":
        return {
          ...baseData,
          shop: entity,
          user: entity.userId || { fullName: entity.ownerName },
        }
      case "individual":
        return {
          ...baseData,
          individual: entity,
          user: entity.userId || { fullName: entity.fullName },
        }
      case "venue":
        return {
          ...baseData,
          venue: entity,
          user: entity.userId || { fullName: "Venue Owner" },
        }
      default:
        throw new Error(`Unknown entity type: ${entityType}`)
    }
  }

  calculateDaysUntilExpiration(expirationDate) {
    const currentDate = new Date()
    const expDate = new Date(expirationDate)
    const timeDiff = expDate.getTime() - currentDate.getTime()
    return Math.ceil(timeDiff / (1000 * 3600 * 24))
  }
}

export default EmailTemplateService
