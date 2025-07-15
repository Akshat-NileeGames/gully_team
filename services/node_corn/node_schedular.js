import cron from "node-cron"
import { Venue, Shop, Individual, Payout } from "../../models/index.js"

import EmailReminderService from "./reminder.js"
import axios from "axios"
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_ACCOUNT_NUMBER } from "../../config/index.js"
import { randomUUID } from "crypto"

class EmailReminderScheduler {
    constructor() {
        this.emailService = new EmailReminderService()
        this.batchSize = 100
        this.payoutBatchSize = 100
        this.batchDelay = 10000
        this.reminderDays = [6, 5, 4, 3, 2, 1]
        this.isProcessingReminders = false
        this.isProcessingPayouts = false
        this.isProcessingPayoutSync = false

        // Razorpay API configuration
        this.razorpayAuth = {
            username: RAZORPAY_KEY_ID,
            password: RAZORPAY_KEY_SECRET,
        }
        this.razorpayBaseURL = "https://api.razorpay.com/v1"

        this.healthStatus = {
            lastReminderRun: null,
            reminderStatus: "idle",
            reminderProcessedCount: 0,
            reminderErrorCount: 0,
            lastPayoutRun: null,
            payoutStatus: "idle",
            payoutProcessedCount: 0,
            payoutErrorCount: 0,
            payoutBatchesProcessed: 0,
            lastPayoutSyncRun: null,
            payoutSyncStatus: "idle",
            payoutSyncProcessedCount: 0,
            payoutSyncUpdatedCount: 0,
            payoutSyncErrorCount: 0,
        }
    }

    /**
     * Fetches payout details from Razorpay API with retry mechanism
     * @param {string} razorpayPayoutId - The Razorpay payout ID
     * @param {number} maxRetries - Maximum number of retry attempts
     * @returns {Promise<object>} Razorpay payout response
     */
    async fetchPayoutFromRazorpay(razorpayPayoutId, maxRetries = 3) {
        let currentRetry = 0

        while (currentRetry <= maxRetries) {
            try {
                console.log(
                    `[${new Date().toISOString()}] Fetching payout ${razorpayPayoutId} from Razorpay (attempt ${currentRetry + 1}/${maxRetries + 1})`,
                )

                const response = await axios.get(`${this.razorpayBaseURL}/payouts/${razorpayPayoutId}`, {
                    auth: this.razorpayAuth,
                    timeout: 30000,
                    headers: {
                        "Content-Type": "application/json",
                    },
                })

                console.log(
                    `[${new Date().toISOString()}] Successfully fetched payout ${razorpayPayoutId} with status: ${response.data.status}`,
                )

                return response.data
            } catch (error) {
                currentRetry++
                const errorMessage = error.response?.data?.error?.description || error.message
                const errorCode = error.response?.status || "UNKNOWN"

                console.error(
                    `[${new Date().toISOString()}] Failed to fetch payout ${razorpayPayoutId} (attempt ${currentRetry}/${maxRetries + 1}). Error ${errorCode}: ${errorMessage}`,
                )

                // Check if it's a rate limit error (429) or server error (5xx)
                const isRetryableError =
                    error.response?.status === 429 ||
                    (error.response?.status >= 500 && error.response?.status < 600) ||
                    error.code === "ECONNRESET" ||
                    error.code === "ETIMEDOUT"

                if (currentRetry <= maxRetries && isRetryableError) {
                    const delay = Math.min(Math.pow(2, currentRetry) * 1000 + Math.random() * 1000, 30000)
                    console.log(
                        `[${new Date().toISOString()}] Retrying payout fetch ${razorpayPayoutId} in ${delay / 1000} seconds...`,
                    )
                    await this.delay(delay)
                } else {
                    console.error(
                        `[${new Date().toISOString()}] Permanently failed to fetch payout ${razorpayPayoutId} after ${maxRetries + 1} attempts`,
                    )
                    throw new Error(`Razorpay API Error: ${errorMessage}`)
                }
            }
        }
    }

    /**
     * Updates payout record in database with latest Razorpay data
     * @param {string} payoutId - Local payout record ID
     * @param {object} razorpayData - Latest data from Razorpay API
     * @param {string} previousStatus - Previous status for comparison
     * @returns {Promise<object>} Updated payout record
     */
    async updatePayoutWithRazorpayData(payoutId, razorpayData, previousStatus) {
        const updateData = {
            status: razorpayData.status,
            fees: razorpayData.fees || 0,
            tax: razorpayData.tax || 0,
            utr: razorpayData.utr,
            batchId: razorpayData.batch_id,
            feeType: razorpayData.fee_type,
            razorpayResponse: razorpayData,
            lastSyncAt: new Date(),
        }

        // Update processedAt timestamp for final states
        if (
            ["processed", "failed", "cancelled", "reversed"].includes(razorpayData.status) &&
            !["processed", "failed", "cancelled", "reversed"].includes(previousStatus)
        ) {
            updateData.processedAt = new Date()
        }

        // Handle status details
        if (razorpayData.status_details) {
            updateData.statusDetails = {
                description: razorpayData.status_details.description,
                source: razorpayData.status_details.source,
                reason: razorpayData.status_details.reason,
            }
        }

        const updatedPayout = await Payout.findByIdAndUpdate(payoutId, updateData, { new: true })

        console.log(
            `[${new Date().toISOString()}] Updated payout ${payoutId} status: ${previousStatus} -> ${razorpayData.status}`,
        )

        // Log additional details for important status changes
        if (razorpayData.status === "processed") {
            console.log(
                `[${new Date().toISOString()}] Payout ${payoutId} successfully processed. UTR: ${razorpayData.utr || "N/A"}, Fees: ₹${(razorpayData.fees || 0) / 100}`,
            )
        } else if (razorpayData.status === "failed") {
            console.error(
                `[${new Date().toISOString()}] Payout ${payoutId} failed. Reason: ${razorpayData.status_details?.description || "Unknown"}`,
            )
        }

        return updatedPayout
    }

    /**
     * Syncs status for a single payout with Razorpay
     * @param {object} payout - Local payout record
     * @returns {Promise<boolean>} True if status was updated, false otherwise
     */
    async syncSinglePayoutStatus(payout) {
        if (!payout.razorpayPayoutId) {
            console.warn(`[${new Date().toISOString()}] Payout ${payout._id} has no Razorpay payout ID, skipping sync`)
            return false
        }

        try {
            const razorpayData = await this.fetchPayoutFromRazorpay(payout.razorpayPayoutId)

            // Check if status has changed
            if (razorpayData.status !== payout.status) {
                console.log(
                    `[${new Date().toISOString()}] Status change detected for payout ${payout._id}: ${payout.status} -> ${razorpayData.status}`,
                )

                await this.updatePayoutWithRazorpayData(payout._id, razorpayData, payout.status)
                return true
            } else {
                // Even if status hasn't changed, update other fields that might have changed
                const hasOtherChanges =
                    razorpayData.fees !== payout.fees ||
                    razorpayData.tax !== payout.tax ||
                    razorpayData.utr !== payout.utr ||
                    razorpayData.batch_id !== payout.batchId

                if (hasOtherChanges) {
                    console.log(
                        `[${new Date().toISOString()}] Updating other fields for payout ${payout._id} (status unchanged: ${payout.status})`,
                    )
                    await this.updatePayoutWithRazorpayData(payout._id, razorpayData, payout.status)
                    return true
                }

                console.log(`[${new Date().toISOString()}] No changes detected for payout ${payout._id} (${payout.status})`)

                // Update lastSyncAt even if no changes
                await Payout.findByIdAndUpdate(payout._id, { lastSyncAt: new Date() })
                return false
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Failed to sync payout ${payout._id} status: ${error.message}`)

            // Update error count but don't throw to continue with other payouts
            this.healthStatus.payoutSyncErrorCount++
            return false
        }
    }

    /**
     * Finds payouts that need status synchronization
     * @param {number} limit - Maximum number of payouts to fetch
     * @returns {Promise<Array>} Array of payout records
     */
    async getPayoutsForStatusSync(limit = 100) {
        // Get payouts that are not in final states and have Razorpay payout IDs
        const pendingStatuses = ["queued", "pending", "processing"]

        // Also include payouts that haven't been synced recently (older than 1 hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

        const query = {
            $and: [
                { razorpayPayoutId: { $exists: true, $ne: null } },
                {
                    $or: [
                        { status: { $in: pendingStatuses } },
                        {
                            lastSyncAt: { $lt: oneHourAgo },
                            status: { $nin: ["processed", "failed", "cancelled", "reversed"] },
                        },
                        { lastSyncAt: { $exists: false } },
                    ],
                },
            ],
        }

        return await Payout.find(query)
            .sort({ updatedAt: 1 }) // Oldest first
            .limit(limit)
            .lean()
    }

    /**
     * Processes payout status synchronization with Razorpay
     */
    async processPayoutStatusSync() {
        if (this.isProcessingPayoutSync) {
            console.log(`[${new Date().toISOString()}] Payout sync process already running, skipping...`)
            return
        }

        this.isProcessingPayoutSync = true
        this.healthStatus.payoutSyncStatus = "processing"
        this.healthStatus.lastPayoutSyncRun = new Date()
        this.healthStatus.payoutSyncProcessedCount = 0
        this.healthStatus.payoutSyncUpdatedCount = 0
        this.healthStatus.payoutSyncErrorCount = 0

        console.log(`[${new Date().toISOString()}] Starting payout status synchronization...`)

        try {
            const payoutsToSync = await this.getPayoutsForStatusSync(this.batchSize)

            if (payoutsToSync.length === 0) {
                console.log(`[${new Date().toISOString()}] No payouts require status synchronization`)
                this.healthStatus.payoutSyncStatus = "completed"
                return
            }

            console.log(`[${new Date().toISOString()}] Found ${payoutsToSync.length} payouts for status sync`)

            // Process payouts with controlled concurrency to avoid overwhelming Razorpay API
            const concurrencyLimit = 5
            const batches = this.createBatches(payoutsToSync, concurrencyLimit)

            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i]
                console.log(
                    `[${new Date().toISOString()}] Processing sync batch ${i + 1}/${batches.length} (${batch.length} payouts)`,
                )

                // Process batch concurrently
                const syncPromises = batch.map((payout) => this.syncSinglePayoutStatus(payout))
                const results = await Promise.allSettled(syncPromises)

                // Count results
                results.forEach((result, index) => {
                    this.healthStatus.payoutSyncProcessedCount++
                    if (result.status === "fulfilled" && result.value === true) {
                        this.healthStatus.payoutSyncUpdatedCount++
                    } else if (result.status === "rejected") {
                        this.healthStatus.payoutSyncErrorCount++
                        console.error(
                            `[${new Date().toISOString()}] Sync failed for payout ${batch[index]._id}: ${result.reason?.message}`,
                        )
                    }
                })

                // Add delay between batches to respect API rate limits
                if (i < batches.length - 1) {
                    console.log(`[${new Date().toISOString()}] Waiting 2 seconds before next sync batch...`)
                    await this.delay(2000)
                }
            }

            console.log(
                `[${new Date().toISOString()}] Payout sync completed. Total: ${this.healthStatus.payoutSyncProcessedCount}, Updated: ${this.healthStatus.payoutSyncUpdatedCount}, Errors: ${this.healthStatus.payoutSyncErrorCount}`,
            )

            this.healthStatus.payoutSyncStatus = "completed"
        } catch (error) {
            this.healthStatus.payoutSyncStatus = "error"
            console.error(`[${new Date().toISOString()}] Critical error in payout sync process:`, error.message)
        } finally {
            this.isProcessingPayoutSync = false
        }
    }

    async processVenuePayouts() {
        if (this.isProcessingPayouts) {
            console.log(`[${new Date().toISOString()}] Payout process already running, skipping...`)
            return
        }

        this.isProcessingPayouts = true
        this.healthStatus.payoutStatus = "processing"
        this.healthStatus.lastPayoutRun = new Date()
        this.healthStatus.payoutProcessedCount = 0
        this.healthStatus.payoutErrorCount = 0
        this.healthStatus.payoutBatchesProcessed = 0

        console.log(`[${new Date().toISOString()}] Starting venue payout processing...`)

        try {
            const venuesToPay = await Venue.find({
                amountNeedToPay: { $gt: 0 },
                razorpay_fund_account_id: { $exists: true, $ne: "" },
            })
                .populate("userId", "fullName email")
                .lean()

            if (venuesToPay.length === 0) {
                console.log(`[${new Date().toISOString()}] No venues with pending payouts found`)
                this.healthStatus.payoutStatus = "completed"
                return
            }

            console.log(`[${new Date().toISOString()}] Found ${venuesToPay.length} venues with pending payouts`)

            const batches = this.createBatches(venuesToPay, this.payoutBatchSize)
            console.log(`[${new Date().toISOString()}] Processing ${batches.length} batches of payouts`)

            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i]
                console.log(
                    `[${new Date().toISOString()}] Processing batch ${i + 1}/${batches.length} with ${batch.length} venues`,
                )

                await this.processBatch(batch, i + 1)
                this.healthStatus.payoutBatchesProcessed++

                if (i < batches.length - 1) {
                    console.log(`[${new Date().toISOString()}] Waiting ${this.batchDelay / 1000} seconds before next batch...`)
                    await this.delay(this.batchDelay)
                }
            }

            this.healthStatus.payoutStatus = "completed"
            console.log(
                `[${new Date().toISOString()}] Venue payout processing completed. Processed: ${this.healthStatus.payoutProcessedCount}, Errors: ${this.healthStatus.payoutErrorCount}`,
            )
        } catch (error) {
            this.healthStatus.payoutStatus = "error"
            console.error(`[${new Date().toISOString()}] Critical error in venue payout process:`, error.message)
        } finally {
            this.isProcessingPayouts = false
        }
    }

    async processBatch(venues, batchNumber) {
        const batchStartTime = new Date()
        console.log(`[${batchStartTime.toISOString()}] Starting batch ${batchNumber} processing`)

        for (const venue of venues) {
            try {
                await this.processVenuePayout(venue)
            } catch (error) {
                console.error(`[${new Date().toISOString()}] Failed to process venue ${venue._id}:`, error.message)
                this.healthStatus.payoutErrorCount++
            }
        }

        const batchEndTime = new Date()
        const batchDuration = batchEndTime - batchStartTime
        console.log(`[${batchEndTime.toISOString()}] Completed batch ${batchNumber} in ${batchDuration}ms`)
    }

    async processVenuePayout(venue) {
        const payoutAmount = Math.round(venue.amountNeedToPay * 100)

        if (payoutAmount < 100) {
            console.warn(
                `[${new Date().toISOString()}] Skipping venue ${venue._id}: amount below minimum (${payoutAmount} paise)`,
            )
            return
        }

        const existingPayout = await Payout.findOne({
            venueId: venue._id,
            status: { $in: ["queued", "pending", "processing"] },
        })

        if (existingPayout) {
            console.log(
                `[${new Date().toISOString()}] Skipping venue ${venue._id}: existing pending payout ${existingPayout._id}`,
            )
            return
        }

        const referenceId = `gully_payout_${venue._id.toString().slice(-8)}_${Date.now()}`
        const idempotencyKey = randomUUID()

        const payoutRecord = new Payout({
            fundAccountId: venue.razorpay_fund_account_id,
            userId: venue.userId._id,
            venueId: venue._id,
            amount: payoutAmount,
            purpose: "payout",
            referenceId,
            narration: `Payout to ${venue.venue_name}`,
            notes: {
                venueId: venue._id.toString(),
                venueName: venue.venue_name,
                originalAmount: venue.amountNeedToPay,
            },
            idempotencyKey,
        })

        await payoutRecord.save()
        console.log(`[${new Date().toISOString()}] Created payout record ${payoutRecord._id} for venue ${venue._id}`)

        await this.executePayoutWithRetry(payoutRecord, venue)
    }

    async executePayoutWithRetry(payoutRecord, venue) {
        const MAX_RETRIES = payoutRecord.maxRetries
        let currentRetry = 0

        while (currentRetry <= MAX_RETRIES) {
            try {
                const payoutPayload = {
                    account_number: RAZORPAY_ACCOUNT_NUMBER,
                    fund_account_id: payoutRecord.fundAccountId,
                    amount: payoutRecord.amount,
                    currency: payoutRecord.currency,
                    mode: payoutRecord.mode,
                    purpose: payoutRecord.purpose,
                    queue_if_low_balance: true,
                    reference_id: payoutRecord.referenceId,
                    narration: payoutRecord.narration,
                    notes: payoutRecord.notes,
                }

                console.log(
                    `[${new Date().toISOString()}] Initiating payout ${payoutRecord._id} for venue ${venue._id} (attempt ${currentRetry + 1}/${MAX_RETRIES + 1})`,
                )
                console.log(
                    `[${new Date().toISOString()}] Payout payload:`,
                    JSON.stringify({ ...payoutPayload, account_number: "[REDACTED]" }, null, 2),
                )

                const response = await axios.post(`${this.razorpayBaseURL}/payouts`, payoutPayload, {
                    auth: this.razorpayAuth,
                    headers: {
                        "Content-Type": "application/json",
                        "X-Payout-Idempotency": payoutRecord.idempotencyKey,
                    },
                    timeout: 30000,
                })

                await this.updatePayoutRecord(payoutRecord._id, response.data, "success")

                await Venue.findByIdAndUpdate(venue._id, { amountNeedToPay: 0 })

                console.log(`[${new Date().toISOString()}] Payout successful: ${response.data.id} for venue ${venue._id}`)
                this.healthStatus.payoutProcessedCount++
                return
            } catch (error) {
                currentRetry++
                payoutRecord.retryCount = currentRetry
                payoutRecord.lastRetryAt = new Date()

                const errorMessage = error.response?.data?.error?.description || error.message
                console.error(
                    `[${new Date().toISOString()}] Payout attempt ${currentRetry} failed for venue ${venue._id}. Razorpay Error Response:`,
                    JSON.stringify(error.response?.data, null, 2) || error.message,
                )

                if (currentRetry <= MAX_RETRIES) {
                    const delay = Math.min(Math.pow(2, currentRetry) * 1000 + Math.random() * 1000, 30000)
                    console.log(`[${new Date().toISOString()}] Retrying payout ${payoutRecord._id} in ${delay / 1000} seconds...`)
                    await this.delay(delay)
                } else {
                    await this.updatePayoutRecord(payoutRecord._id, error.response?.data, "failed", errorMessage)
                    console.error(
                        `[${new Date().toISOString()}] Payout ${payoutRecord._id} failed permanently after ${MAX_RETRIES} retries`,
                    )
                    this.healthStatus.payoutErrorCount++
                }
            }
        }
    }

    async updatePayoutRecord(payoutId, razorpayResponse, status, failureReason = null) {
        const updateData = {
            razorpayResponse,
            retryCount: razorpayResponse?.retry_count || 0,
        }

        if (status === "success" && razorpayResponse) {
            updateData.razorpayPayoutId = razorpayResponse.id
            updateData.status = razorpayResponse.status
            updateData.fees = razorpayResponse.fees || 0
            updateData.tax = razorpayResponse.tax || 0
            updateData.utr = razorpayResponse.utr
            updateData.batchId = razorpayResponse.batch_id
            updateData.feeType = razorpayResponse.fee_type
            updateData.processedAt = new Date()

            if (razorpayResponse.status_details) {
                updateData.statusDetails = {
                    description: razorpayResponse.status_details.description,
                    source: razorpayResponse.status_details.source,
                    reason: razorpayResponse.status_details.reason,
                }
            }
        } else if (status === "failed") {
            updateData.status = "failed"
            updateData.failureReason = failureReason
        }

        await Payout.findByIdAndUpdate(payoutId, updateData)
    }

    createBatches(array, batchSize) {
        const batches = []
        for (let i = 0; i < array.length; i += batchSize) {
            batches.push(array.slice(i, i + batchSize))
        }
        return batches
    }

    initializeCronJobs() {
        cron.schedule("30 9 * * *", async () => {
            console.log(`[${new Date().toISOString()}] Running payout cron job...`)
            await this.processVenuePayouts()
        })

        // Payout status sync cron job - runs every 10 minutes by default
        cron.schedule("30 9 * * *", async () => {
            console.log(`[${new Date().toISOString()}] Running payout status sync cron job...`)
            await this.processPayoutStatusSync()
        })

        cron.schedule("30 9 * * *", async () => {
            await this.processExpirationReminders()
        })

        cron.schedule("30 9 * * *", async () => {
            await this.processExpiredPackages()
        })

        console.log(`[${new Date().toISOString()}] Email reminder cron jobs initialized`)
    }

    async processExpirationReminders() {
        if (this.isProcessingReminders) {
            console.log(`[${new Date().toISOString()}] Email reminder process already running, skipping...`)
            return
        }

        this.isProcessingReminders = true
        this.healthStatus.reminderStatus = "processing"
        this.healthStatus.lastReminderRun = new Date()
        this.healthStatus.reminderProcessedCount = 0
        this.healthStatus.reminderErrorCount = 0

        try {
            console.log(`[${new Date().toISOString()}] Starting package expiration check...`)

            await this.processBatchReminders("shop")
            await this.processBatchReminders("individual")
            await this.processBatchReminders("venue")

            this.healthStatus.reminderStatus = "completed"
            console.log(`[${new Date().toISOString()}] Expiration reminder process completed`)
        } catch (error) {
            this.healthStatus.reminderStatus = "error"
            this.healthStatus.reminderErrorCount++
            console.error(`[${new Date().toISOString()}] Error in expiration reminder process:`, error.message)
        } finally {
            this.isProcessingReminders = false
        }
    }

    async processBatchReminders(entityType) {
        let skip = 0
        let hasMore = true

        while (hasMore) {
            try {
                const batch = await this.getExpiringEntities(entityType, this.batchSize, skip)

                if (batch.length === 0) {
                    hasMore = false
                    console.log(`[${new Date().toISOString()}] No more ${entityType} entities to process`)
                    break
                }

                console.log(
                    `[${new Date().toISOString()}] Processing batch of ${batch.length} ${entityType} reminders (skip: ${skip})`,
                )

                await this.sendBatchReminders(entityType, batch)

                skip += this.batchSize
                this.healthStatus.reminderProcessedCount += batch.length

                await this.delay(2000)
            } catch (error) {
                console.error(`[${new Date().toISOString()}] Error processing ${entityType} batch:`, error.message)
                this.healthStatus.reminderErrorCount++
                skip += this.batchSize
            }
        }
    }

    async getExpiringEntities(entityType, limit = 100, skip = 0) {
        const currentDate = new Date()

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
                model = Venue
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

    async sendBatchReminders(entityType, entities) {
        const promises = entities.map((entity) => this.sendReminderEmail(entityType, entity))

        const results = await Promise.allSettled(promises)

        let successCount = 0
        let failureCount = 0

        results.forEach((result, index) => {
            if (result.status === "fulfilled") {
                successCount++
            } else {
                failureCount++
                console.error(
                    `[${new Date().toISOString()}] Failed to send reminder for ${entityType} ${entities[index]._id}:`,
                    result.reason?.message,
                )
            }
        })

        console.log(
            `[${new Date().toISOString()}] Batch results for ${entityType}: ${successCount} sent, ${failureCount} failed`,
        )
    }

    async sendReminderEmail(entityType, entity) {
        if (!entity.userId || !entity.userId.email) {
            throw new Error("User email not found")
        }

        const packageInfo = this.getPackageInfo(entityType, entity)
        const expirationDate = this.getExpirationDate(entityType, entity)
        const daysUntilExpiration = this.calculateDaysUntilExpiration(expirationDate)

        if (daysUntilExpiration < 0) {
            console.log(
                `[${new Date().toISOString()}] Package already expired for ${entityType} ${entity._id}, skipping reminder`,
            )
            return
        }

        await this.emailService.sendReminderEmail(entityType, entity)
    }

    async processExpiredPackages() {
        if (this.isProcessingReminders) {
            console.log(`[${new Date().toISOString()}] Expired package process already running, skipping...`)
            return
        }

        this.isProcessingReminders = true

        try {
            console.log(`[${new Date().toISOString()}] Processing expired packages...`)

            const currentDate = new Date()

            await this.processExpiredEntities("shop", currentDate)
            await this.processExpiredEntities("individual", currentDate)
            await this.processExpiredEntities("venue", currentDate)

            console.log(`[${new Date().toISOString()}] Expired package process completed`)
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error in expired package process:`, error.message)
        } finally {
            this.isProcessingReminders = false
        }
    }

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
                model = Venue
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

        console.log(`[${new Date().toISOString()}] Updated ${result.modifiedCount} expired ${entityType} subscriptions`)

        if (result.modifiedCount > 0) {
            await this.sendExpiredNotifications(entityType, currentDate)
        }
    }

    async sendExpiredNotifications(entityType, currentDate) {
        const expiredEntities = await this.getRecentlyExpiredEntities(entityType, currentDate)

        for (const entity of expiredEntities) {
            try {
                await this.emailService.sendExpiredEmail(entityType, entity)
            } catch (error) {
                console.error(
                    `[${new Date().toISOString()}] Failed to send expired notification for ${entityType} ${entity._id}:`,
                    error.message,
                )
            }
        }
    }

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
                model = Venue
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

    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    getHealthStatus() {
        return {
            ...this.healthStatus,
            isProcessingReminders: this.isProcessingReminders,
            isProcessingPayouts: this.isProcessingPayouts,
            isProcessingPayoutSync: this.isProcessingPayoutSync,
            batchSize: this.batchSize,
            payoutBatchSize: this.payoutBatchSize,
            reminderDays: this.reminderDays,
        }
    }

    async triggerManualReminders() {
        console.log(`[${new Date().toISOString()}] Manual reminder trigger initiated...`)
        await this.processExpirationReminders()
    }

    async triggerManualPayouts() {
        console.log(`[${new Date().toISOString()}] Manual payout trigger initiated...`)
        await this.processVenuePayouts()
    }

    async triggerManualPayoutSync() {
        console.log(`[${new Date().toISOString()}] Manual payout sync trigger initiated...`)
        await this.processPayoutStatusSync()
    }
}

const emailScheduler = new EmailReminderScheduler()

emailScheduler.initializeCronJobs()

export default emailScheduler
