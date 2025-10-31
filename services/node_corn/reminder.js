import nodemailer from "nodemailer"
import EmailTemplateService from "./email-templates.js"

class EmailReminderService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: "gullyteam33@gmail.com",
        pass: "iaur qnaj ocsq jyvq",
      },
    })
    this.templateService = new EmailTemplateService()
  }

  // Send individual reminder email using the new template system
  async sendReminderEmail(entityType, entity) {
    if (!entity.userId || !entity.userId.email) {
      throw new Error("User email not found")
    }

    const packageInfo = this.getPackageInfo(entityType, entity)
    const expirationDate = this.getExpirationDate(entityType, entity)
    const daysUntilExpiration = this.calculateDaysUntilExpiration(expirationDate)

    // Verify package hasn't already expired
    if (daysUntilExpiration < 0) {
      console.log(`Package already expired for ${entityType} ${entity._id}, skipping reminder`)
      return
    }

    // Prepare template data
    const templateData = this.templateService.prepareTemplateData(
      entityType,
      entity,
      packageInfo,
      expirationDate,
      entity.transactionId || null,
    )

    // Generate email template
    const emailTemplate = await this.templateService.renderTemplate("reminder", entityType, templateData, false)

    const mailOptions = {
      from: "gullyteam33@gmail.com",
      to: entity.userId.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    }

    await this.transporter.sendMail(mailOptions)
    console.log(`Reminder email sent to ${entity.userId.email} for ${entityType} ${entity._id}`)
  }

  // Send expired package notification using the new template system
  async sendExpiredEmail(entityType, entity) {
    if (!entity.userId || !entity.userId.email) {
      return
    }

    const packageInfo = this.getPackageInfo(entityType, entity)
    const expirationDate = this.getExpirationDate(entityType, entity)

    // Prepare template data
    const templateData = this.templateService.prepareTemplateData(
      entityType,
      entity,
      packageInfo,
      expirationDate,
      entity.transactionId || null,
    )

    // Generate expired email template
    const emailTemplate = await this.templateService.renderTemplate("expired", entityType, templateData, true)

    const mailOptions = {
      from: "gullyteam33@gmail.com",
      to: entity.userId.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    }

    await this.transporter.sendMail(mailOptions)
    console.log(`Expired notification sent to ${entity.userId.email} for ${entityType} ${entity._id}`)
  }

  // Helper methods
  getPackageInfo(entityType, entity) {
    switch (entityType) {
      case "individual":
        return entity.packageRef
      case "shop":
        return entity.packageId
      case "venue":
        return entity.packageRef
      default:
        return null
    }
  }

  getExpirationDate(entityType, entity) {
    switch (entityType) {
      case "individual":
        return entity.subscriptionExpiry
      case "shop":
        return entity.packageEndDate
      case "venue":
        return entity.subscriptionExpiry
      default:
        return null
    }
  }

  calculateDaysUntilExpiration(expirationDate) {
    const currentDate = new Date()
    const expDate = new Date(expirationDate)
    const timeDiff = expDate.getTime() - currentDate.getTime()
    return Math.ceil(timeDiff / (1000 * 3600 * 24))
  }

  // Batch processing method
  async sendBatchReminders(entityType, entities) {
    const promises = entities.map((entity) => this.sendReminderEmail(entityType, entity))

    // Process all emails in parallel but handle failures gracefully
    const results = await Promise.allSettled(promises)

    let successCount = 0
    let failureCount = 0

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        successCount++
      } else {
        failureCount++
        console.error(`❌ Failed to send reminder for ${entityType} ${entities[index]._id}:`, result.reason)
      }
    })

    console.log(`Batch results for ${entityType}: ${successCount} sent, ${failureCount} failed`)
    return { successCount, failureCount }
  }
}

export default EmailReminderService
