import express from "express"
import SocketController from "../controllers/socketController.js"

const router = express.Router()

// Socket management routes
router.get("/stats", SocketController.getConnectionStats)
router.get("/venue/:venueId/users", SocketController.getVenueUsers)
router.get("/user/:userId/status", SocketController.checkUserConnection)
router.post("/trigger-slot-check", SocketController.triggerSlotCheck)
router.post("/send-test-message", SocketController.sendTestMessage)

export default router
