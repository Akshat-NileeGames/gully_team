import socketManager from "../socket/socketManager.js"

const SocketController = {
  // Get socket connection statistics
  async getConnectionStats(req, res, next) {
    try {
      const stats = socketManager.getConnectionStats()
      return res.json({
        success: true,
        message: "Socket connection statistics retrieved successfully",
        data: stats,
      })
    } catch (error) {
      console.error("Error getting connection stats:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to get connection statistics",
        error: error.message,
      })
    }
  },

  // Get users connected to a specific venue
  async getVenueUsers(req, res, next) {
    try {
      const { venueId } = req.params
      const users = socketManager.getVenueUsers(venueId)

      return res.json({
        success: true,
        message: "Venue users retrieved successfully",
        data: {
          venueId,
          users,
          totalUsers: users.length,
        },
      })
    } catch (error) {
      console.error("Error getting venue users:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to get venue users",
        error: error.message,
      })
    }
  },

  // Check if a user is connected
  async checkUserConnection(req, res, next) {
    try {
      const { userId } = req.params
      const isConnected = socketManager.isUserConnected(userId)
      const userSocket = socketManager.getUserSocket(userId)

      return res.json({
        success: true,
        message: "User connection status retrieved successfully",
        data: {
          userId,
          isConnected,
          socketInfo: userSocket || null,
        },
      })
    } catch (error) {
      console.error("Error checking user connection:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to check user connection",
        error: error.message,
      })
    }
  },

  // Trigger a slot availability check via HTTP (for testing)
  async triggerSlotCheck(req, res, next) {
    try {
      const { venueId, sport, date, playableArea } = req.body

      // Notify all users in the venue room to refresh their slot data
      socketManager.notifyVenueUsers(venueId, "refresh-slots", {
        venueId,
        sport,
        date,
        playableArea,
        triggeredBy: "admin",
        timestamp: new Date().toISOString(),
      })

      return res.json({
        success: true,
        message: "Slot check triggered successfully",
        data: {
          venueId,
          sport,
          date,
          playableArea,
        },
      })
    } catch (error) {
      console.error("Error triggering slot check:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to trigger slot check",
        error: error.message,
      })
    }
  },

  // Send a test message to all users in a venue
  async sendTestMessage(req, res, next) {
    try {
      const { venueId, message } = req.body

      socketManager.notifyVenueUsers(venueId, "test-message", {
        message,
        timestamp: new Date().toISOString(),
        from: "admin",
      })

      return res.json({
        success: true,
        message: "Test message sent successfully",
        data: {
          venueId,
          message,
        },
      })
    } catch (error) {
      console.error("Error sending test message:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to send test message",
        error: error.message,
      })
    }
  },
}

export default SocketController
