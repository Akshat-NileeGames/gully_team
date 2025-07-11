import cron from "node-cron"
import { Ground, Shop, Individual } from "../../models/index.js"
import EmailReminderService from "./reminder.js"

class EmailReminderScheduler {
    constructor() {
        this.emailService = new EmailReminderService()
        this.batchSize = 100
        this.reminderDays = [6, 5, 4, 3, 2, 1]
        this.isProcessing = false
        this.healthStatus = {
            lastRun: null,
            status: "idle",
            processedCount: 0,
            errorCount: 0,
        }
    }

    // Initialize all cron jobs
    initializeCronJobs() {
        // Run every hour to check for expiring packages
        cron.schedule("30 9 * * *", async () => {
            await this.processExpirationReminders()
        })

        // Run daily at midnight to update expired subscriptions
        cron.schedule("30 9 * * *", async () => {
            await this.processExpiredPackages()
        })

        console.log("📧 Email reminder cron jobs initialized")
    }

    // Health check mechanism
    async processExpirationReminders() {
        // if (this.isProcessing) {
        //     console.log("⚠️ Email reminder process already running, skipping...")
        //     return
        // }

        this.isProcessing = true
        this.healthStatus.status = "processing"
        this.healthStatus.lastRun = new Date()
        this.healthStatus.processedCount = 0
        this.healthStatus.errorCount = 0

        try {
            console.log(`[${new Date().toISOString()}] Starting package expiration check...`)

            // Process each entity type in batches
            await this.processBatchReminders("shop")
            await this.processBatchReminders("individual")
            await this.processBatchReminders("venue")

            this.healthStatus.status = "completed"
            console.log("✅ Expiration reminder process completed")
        } catch (error) {
            this.healthStatus.status = "error"
            this.healthStatus.errorCount++
            console.error("❌ Error in expiration reminder process:", error)
        } finally {
            this.isProcessing = false
        }
    }

    // Process reminders in batches for specific entity type
    async processBatchReminders(entityType) {
        let skip = 0
        let hasMore = true

        while (hasMore) {
            try {
                const batch = await this.getExpiringEntities(entityType, this.batchSize, skip)

                if (batch.length === 0) {
                    hasMore = false
                    console.log(`✅ No more ${entityType} entities to process`)
                    break
                }

                console.log(`📨 Processing batch of ${batch.length} ${entityType} reminders (skip: ${skip})`)

                // Send reminders for this batch
                await this.sendBatchReminders(entityType, batch)

                skip += this.batchSize
                this.healthStatus.processedCount += batch.length

                // Small delay to prevent overwhelming the email service
                await this.delay(2000)
            } catch (error) {
                console.error(`❌ Error processing ${entityType} batch:`, error)
                this.healthStatus.errorCount++
                // Continue with next batch even if current batch fails
                skip += this.batchSize
            }
        }
    }

    // Get expiring entities based on type
    async getExpiringEntities(entityType, limit = 100, skip = 0) {
        const currentDate = new Date()

        // Check for entities expiring in the next 6 days
        const reminderDates = this.reminderDays.map((days) => {
            const date = new Date(currentDate)
            date.setDate(date.getDate() + days)
            return {
                start: new Date(date.setHours(0, 0, 0, 0)),
                end: new Date(date.setHours(23, 59, 59, 999)),
            }
        })

        let query = {}
        let model
        let populateFields

        switch (entityType) {
            case "shop":
                model = Shop
                populateFields = [
                    { path: "userId", select: "fullName email phoneNumber" },
                    { path: "packageId", select: "name description price duration" },
                ]
                query = {
                    isSubscriptionPurchased: true,
                    packageEndDate: {
                        $gte: reminderDates[reminderDates.length - 1].start,
                        $lte: reminderDates[0].end,
                    },
                }
                break

            case "individual":
                model = Individual
                populateFields = [
                    { path: "userId", select: "fullName email phoneNumber" },
                    { path: "packageRef", select: "name description price duration" },
                ]
                query = {
                    hasActiveSubscription: true,
                    subscriptionExpiry: {
                        $gte: reminderDates[reminderDates.length - 1].start,
                        $lte: reminderDates[0].end,
                    },
                }
                break

            case "venue":
                model = Ground
                populateFields = [
                    { path: "userId", select: "fullName email phoneNumber" },
                    { path: "packageRef", select: "name description price duration" },
                ]
                query = {
                    isSubscriptionPurchased: true,
                    subscriptionExpiry: {
                        $gte: reminderDates[reminderDates.length - 1].start,
                        $lte: reminderDates[0].end,
                    },
                }
                break

            default:
                throw new Error(`Unknown entity type: ${entityType}`)
        }

        return await model.find(query).populate(populateFields).limit(limit).skip(skip).lean()
    }

    // Send batch reminders using the new template system
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

        console.log(`📊 Batch results for ${entityType}: ${successCount} sent, ${failureCount} failed`)
    }

    // Send individual reminder email using the template service
    async sendReminderEmail(entityType, entity) {
        if (!entity.userId || !entity.userId.email) {
            throw new Error("User email not found")
        }

        const packageInfo = this.getPackageInfo(entityType, entity)
        const expirationDate = this.getExpirationDate(entityType, entity)
        const daysUntilExpiration = this.calculateDaysUntilExpiration(expirationDate)

        // Verify package hasn't already expired
        if (daysUntilExpiration < 0) {
            console.log(`⚠️ Package already expired for ${entityType} ${entity._id}, skipping reminder`)
            return
        }

        // Use the email reminder service to send the email
        await this.emailService.sendReminderEmail(entityType, entity)
    }

    // Process expired packages and update subscription status
    async processExpiredPackages() {
        if (this.isProcessing) {
            console.log("⚠️ Expired package process already running, skipping...")
            return
        }

        this.isProcessing = true

        try {
            console.log(`[${new Date().toISOString()}] Processing expired packages...`)

            const currentDate = new Date()

            // Process each entity type
            await this.processExpiredEntities("shop", currentDate)
            await this.processExpiredEntities("individual", currentDate)
            await this.processExpiredEntities("venue", currentDate)

            console.log("✅ Expired package process completed")
        } catch (error) {
            console.error("❌ Error in expired package process:", error)
        } finally {
            this.isProcessing = false
        }
    }

    // Process expired entities for specific type
    async processExpiredEntities(entityType, currentDate) {
        let model
        let updateFields
        let expirationField

        switch (entityType) {
            case "shop":
                model = Shop
                updateFields = { isSubscriptionPurchased: false }
                expirationField = "packageEndDate"
                break
            case "individual":
                model = Individual
                updateFields = { hasActiveSubscription: false }
                expirationField = "subscriptionExpiry"
                break
            case "venue":
                model = Ground
                updateFields = { isSubscriptionPurchased: false }
                expirationField = "subscriptionExpiry"
                break
            default:
                throw new Error(`Unknown entity type: ${entityType}`)
        }

        const query = {}
        query[expirationField] = { $lt: currentDate }

        if (entityType === "individual") {
            query.hasActiveSubscription = true
        } else {
            query.isSubscriptionPurchased = true
        }

        const result = await model.updateMany(query, updateFields)

        console.log(`🔄 Updated ${result.modifiedCount} expired ${entityType} subscriptions`)

        // Send expiration notification emails
        if (result.modifiedCount > 0) {
            await this.sendExpiredNotifications(entityType, currentDate)
        }
    }

    // Send notifications for expired packages
    async sendExpiredNotifications(entityType, currentDate) {
        const expiredEntities = await this.getRecentlyExpiredEntities(entityType, currentDate)

        for (const entity of expiredEntities) {
            try {
                await this.emailService.sendExpiredEmail(entityType, entity)
            } catch (error) {
                console.error(`❌ Failed to send expired notification for ${entityType} ${entity._id}:`, error)
            }
        }
    }

    // Get recently expired entities (expired within last 24 hours)
    async getRecentlyExpiredEntities(entityType, currentDate) {
        const yesterday = new Date(currentDate)
        yesterday.setDate(yesterday.getDate() - 1)

        let model
        let populateFields
        let expirationField

        switch (entityType) {
            case "shop":
                model = Shop
                populateFields = [
                    { path: "userId", select: "fullName email phoneNumber" },
                    { path: "packageId", select: "name description price duration" },
                ]
                expirationField = "packageEndDate"
                break
            case "individual":
                model = Individual
                populateFields = [
                    { path: "userId", select: "fullName email phoneNumber" },
                    { path: "packageRef", select: "name description price duration" },
                ]
                expirationField = "subscriptionExpiry"
                break
            case "venue":
                model = Ground
                populateFields = [
                    { path: "userId", select: "fullName email phoneNumber" },
                    { path: "packageRef", select: "name description price duration" },
                ]
                expirationField = "subscriptionExpiry"
                break
        }

        const query = {}
        query[expirationField] = {
            $gte: yesterday,
            $lt: currentDate,
        }

        return await model.find(query).populate(populateFields).lean()
    }

    // Helper methods
    getPackageInfo(entityType, entity) {
        switch (entityType) {
            case "shop":
                return entity.packageId
            case "individual":
                return entity.packageRef
            case "venue":
                return entity.packageRef
            default:
                return null
        }
    }

    getExpirationDate(entityType, entity) {
        switch (entityType) {
            case "shop":
                return entity.packageEndDate
            case "individual":
                return entity.subscriptionExpiry
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

    // Utility function for delays
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    // Get health status
    getHealthStatus() {
        return {
            ...this.healthStatus,
            isProcessing: this.isProcessing,
            batchSize: this.batchSize,
            reminderDays: this.reminderDays,
        }
    }

    // Manual trigger for testing
    async triggerManualReminders() {
        console.log("🔧 Manual trigger initiated...")
        await this.processExpirationReminders()
    }
}

// Create and export the scheduler instance
const emailScheduler = new EmailReminderScheduler()

// Initialize cron jobs
emailScheduler.initializeCronJobs()

export default emailScheduler
