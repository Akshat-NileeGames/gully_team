import { Server } from "socket.io"
import { Booking } from "../models/index.js"
import mongoose from "mongoose"

class SocketManager {
  constructor() {
    this.io = null
    this.connectedUsers = new Map() // userId -> socketId
    this.venueRooms = new Map() // venueId -> Set of socketIds
    this.userSockets = new Map() // socketId -> user info
    this.connectionStats = {
      totalConnections: 0,
      activeConnections: 0,
      reconnections: 0,
      errors: 0,
    }
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: ["http://localhost:3000", "http://127.0.0.1:3000", "http://10.0.2.2:3000"],
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"],
      },
      transports: ["websocket", "polling"],
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000,
    })

    this.io.on("connection", (socket) => {
      this.connectionStats.totalConnections++
      this.connectionStats.activeConnections++

      console.log(`✅ Socket connected: ${socket.id}`)
      console.log(`📊 Active connections: ${this.connectionStats.activeConnections}`)

      // Send connection confirmation
      socket.emit("connection-confirmed", {
        socketId: socket.id,
        timestamp: new Date().toISOString(),
        message: "Socket connection established successfully",
      })

      // Handle user authentication and venue joining
      socket.on("join-venue", (data) => {
        try {
          const { venueId, userId, userName } = data
          console.log(`👤 User ${userName} (${userId}) joining venue ${venueId}`)

          // Store user info
          this.userSockets.set(socket.id, { userId, userName, venueId })

          // Join venue room
          socket.join(`venue-${venueId}`)

          // Track user connection
          this.connectedUsers.set(userId, {
            socketId: socket.id,
            venueId,
            userName,
            joinedAt: new Date(),
          })

          // Track venue room
          if (!this.venueRooms.has(venueId)) {
            this.venueRooms.set(venueId, new Set())
          }
          this.venueRooms.get(venueId).add(socket.id)

          // Confirm venue join
          socket.emit("venue-joined", {
            venueId,
            userId,
            roomSize: this.venueRooms.get(venueId).size,
            timestamp: new Date().toISOString(),
          })

          // Notify other users in the venue
          socket.to(`venue-${venueId}`).emit("user-joined-venue", {
            userId,
            userName,
            timestamp: new Date().toISOString(),
          })

          console.log(`✅ User ${userName} successfully joined venue ${venueId}`)
          console.log(`📊 Venue ${venueId} now has ${this.venueRooms.get(venueId).size} users`)
        } catch (error) {
          console.error(`❌ Error in join-venue:`, error)
          socket.emit("error", {
            event: "join-venue",
            message: error.message,
            timestamp: new Date().toISOString(),
          })
        }
      })

      // Handle slot availability check
      socket.on("check-slot-availability", async (data) => {
        try {
          console.log(`🔍 Checking slot availability:`, data)
          const result = await this.checkSlotAvailability(data)
          socket.emit("slot-availability-result", {
            ...result,
            requestId: data.requestId,
            timestamp: new Date().toISOString(),
          })
          console.log(`✅ Slot availability check completed for ${data.venueId}`)
        } catch (error) {
          console.error(`❌ Error checking slot availability:`, error)
          socket.emit("slot-availability-error", {
            error: error.message,
            requestId: data.requestId,
            timestamp: new Date().toISOString(),
          })
        }
      })

      // Handle multi-day availability check
      socket.on("check-multi-day-availability", async (data) => {
        try {
          console.log(`📅 Checking multi-day availability:`, data)
          const result = await this.checkMultiDayAvailability(data)
          socket.emit("multi-day-availability-result", {
            ...result,
            requestId: data.requestId,
            timestamp: new Date().toISOString(),
          })
          console.log(`✅ Multi-day availability check completed`)
        } catch (error) {
          console.error(`❌ Error checking multi-day availability:`, error)
          socket.emit("multi-day-availability-error", {
            error: error.message,
            requestId: data.requestId,
            timestamp: new Date().toISOString(),
          })
        }
      })

      // Handle booking confirmation
      socket.on("confirm-booking", async (data) => {
        try {
          console.log(`💳 Processing booking confirmation:`, data)
          const result = await this.handleBookingConfirmation(data, socket)
          socket.emit("booking-confirmed", {
            ...result,
            requestId: data.requestId,
            timestamp: new Date().toISOString(),
          })
          console.log(`✅ Booking confirmation processed`)
        } catch (error) {
          console.error(`❌ Error confirming booking:`, error)
          socket.emit("booking-error", {
            error: error.message,
            requestId: data.requestId,
            timestamp: new Date().toISOString(),
          })
        }
      })

      // Handle ping/pong for connection health
      socket.on("ping", (data) => {
        socket.emit("pong", {
          ...data,
          serverTime: new Date().toISOString(),
        })
      })

      // Handle connection health check
      socket.on("health-check", () => {
        const userInfo = this.userSockets.get(socket.id)
        socket.emit("health-response", {
          status: "healthy",
          socketId: socket.id,
          userInfo,
          serverTime: new Date().toISOString(),
          uptime: process.uptime(),
        })
      })

      // Handle disconnection
      socket.on("disconnect", (reason) => {
        this.connectionStats.activeConnections--
        console.log(`❌ Socket disconnected: ${socket.id}, reason: ${reason}`)
        console.log(`📊 Active connections: ${this.connectionStats.activeConnections}`)
        this.handleDisconnection(socket, reason)
      })

      // Handle connection errors
      socket.on("error", (error) => {
        this.connectionStats.errors++
        console.error(`🚨 Socket error for ${socket.id}:`, error)
      })

      // Handle reconnection
      socket.on("reconnect", () => {
        this.connectionStats.reconnections++
        console.log(`🔄 Socket reconnected: ${socket.id}`)
      })
    })

    // Log server startup
    console.log(`🚀 Socket.IO server initialized`)
    console.log(`🌐 CORS origins: http://localhost:3000, http://127.0.0.1:3000, http://10.0.2.2:3000`)
    console.log(`🔧 Transports: websocket, polling`)
  }

  async checkSlotAvailability(data) {
    const { venueId, sport, date, playableArea, excludeUserId } = data

    console.log(`🔍 Checking slots for venue ${venueId}, sport ${sport}, date ${date}, area ${playableArea}`)

    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const bookings = await Booking.find({
      venueId: new mongoose.Types.ObjectId(venueId),
      sport: new RegExp(`^${sport}$`, "i"),
      bookingStatus: { $in: ["confirmed", "pending", "completed"] },
      "scheduledDates.date": { $gte: startOfDay, $lte: endOfDay },
    })
      .populate("userId", "name email")
      .lean()

    const bookedSlots = []
    const conflictingUsers = new Map()

    bookings.forEach((booking) => {
      booking.scheduledDates.forEach((dateSlot) => {
        const slotDate = new Date(dateSlot.date)
        if (slotDate >= startOfDay && slotDate <= endOfDay) {
          dateSlot.timeSlots.forEach((slot) => {
            if (slot.playableArea === playableArea) {
              const slotKey = `${slot.startTime}-${slot.endTime}`
              bookedSlots.push({
                startTime: slot.startTime,
                endTime: slot.endTime,
                playableArea: slot.playableArea,
                bookedBy: booking.userId,
                bookingId: booking._id,
                status: booking.bookingStatus,
              })

              conflictingUsers.set(slotKey, {
                userId: booking.userId._id,
                userName: booking.userId.name,
                userEmail: booking.userId.email,
                bookingId: booking._id,
              })
            }
          })
        }
      })
    })

    console.log(`📊 Found ${bookedSlots.length} booked slots for area ${playableArea}`)

    return {
      venueId,
      sport,
      date,
      playableArea,
      bookedSlots,
      conflictingUsers: Object.fromEntries(conflictingUsers),
      timestamp: new Date().toISOString(),
    }
  }

  async checkMultiDayAvailability(data) {
    const { venueId, sport, startDate, endDate, timeSlots, playableArea } = data

    console.log(`📅 Checking multi-day availability from ${startDate} to ${endDate}`)

    const conflicts = []
    const availableDates = []

    const currentDate = new Date(startDate)
    const lastDate = new Date(endDate)

    while (currentDate <= lastDate) {
      const dateStr = currentDate.toISOString().split("T")[0]
      const dayAvailability = await this.checkSlotAvailability({
        venueId,
        sport,
        date: dateStr,
        playableArea,
      })

      const dateConflicts = []
      timeSlots.forEach((slot) => {
        const isBooked = dayAvailability.bookedSlots.some(
          (bookedSlot) =>
            bookedSlot.startTime === slot.startTime &&
            bookedSlot.endTime === slot.endTime &&
            bookedSlot.playableArea === playableArea,
        )

        if (isBooked) {
          const conflictKey = `${slot.startTime}-${slot.endTime}`
          const conflictingUser = dayAvailability.conflictingUsers[conflictKey]
          dateConflicts.push({
            ...slot,
            date: currentDate.toISOString(),
            conflictingUser,
          })
        }
      })

      if (dateConflicts.length > 0) {
        conflicts.push({
          date: currentDate.toISOString(),
          conflicts: dateConflicts,
        })
      } else {
        availableDates.push(currentDate.toISOString())
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    console.log(
      `📊 Multi-day check: ${conflicts.length} dates with conflicts, ${availableDates.length} available dates`,
    )

    return {
      venueId,
      sport,
      startDate,
      endDate,
      playableArea,
      conflicts,
      availableDates,
      hasConflicts: conflicts.length > 0,
      timestamp: new Date().toISOString(),
    }
  }

  async handleBookingConfirmation(data, socket) {
    const { venueId, sport, scheduledDates, userId } = data

    console.log(`💳 Processing booking for user ${userId} at venue ${venueId}`)

    // Final availability check before booking
    const finalCheck = await this.performFinalAvailabilityCheck(data)

    if (finalCheck.hasConflicts) {
      console.log(`❌ Booking conflicts detected, notifying user`)
      socket.emit("booking-conflict", finalCheck)
      return { success: false, conflicts: finalCheck.conflicts }
    }

    // Notify other users in the venue room about the booking
    this.notifyVenueUsers(
      venueId,
      "slot-booked",
      {
        venueId,
        sport,
        scheduledDates,
        bookedBy: userId,
        timestamp: new Date().toISOString(),
      },
      socket.id,
    )

    console.log(`✅ Booking confirmed and users notified`)

    return { success: true, message: "Booking confirmed successfully" }
  }

  async performFinalAvailabilityCheck(bookingData) {
    const { venueId, sport, scheduledDates, playableArea } = bookingData
    const conflicts = []

    console.log(`🔍 Performing final availability check for ${scheduledDates.length} dates`)

    for (const dateSlot of scheduledDates) {
      const availability = await this.checkSlotAvailability({
        venueId,
        sport,
        date: dateSlot.date,
        playableArea,
      })

      const dateConflicts = []
      dateSlot.timeSlots.forEach((slot) => {
        const isBooked = availability.bookedSlots.some(
          (bookedSlot) =>
            bookedSlot.startTime === slot.startTime &&
            bookedSlot.endTime === slot.endTime &&
            bookedSlot.playableArea === slot.playableArea,
        )

        if (isBooked) {
          const conflictKey = `${slot.startTime}-${slot.endTime}`
          const conflictingUser = availability.conflictingUsers[conflictKey]
          dateConflicts.push({
            ...slot,
            date: dateSlot.date,
            conflictingUser,
          })
        }
      })

      if (dateConflicts.length > 0) {
        conflicts.push({
          date: dateSlot.date,
          conflicts: dateConflicts,
        })
      }
    }

    console.log(`📊 Final check: ${conflicts.length} conflicts found`)

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    }
  }

  notifyVenueUsers(venueId, event, data, excludeSocketId = null) {
    const venueRoom = `venue-${venueId}`
    const roomSize = this.venueRooms.get(venueId)?.size || 0

    console.log(`📢 Notifying ${roomSize} users in venue ${venueId} about ${event}`)

    if (excludeSocketId) {
      this.io.to(venueRoom).except(excludeSocketId).emit(event, data)
    } else {
      this.io.to(venueRoom).emit(event, data)
    }
  }

  handleDisconnection(socket, reason) {
    const userInfo = this.userSockets.get(socket.id)

    if (userInfo) {
      console.log(`👋 User ${userInfo.userName} (${userInfo.userId}) disconnected from venue ${userInfo.venueId}`)

      // Remove from connected users
      this.connectedUsers.delete(userInfo.userId)

      // Remove from venue rooms
      if (this.venueRooms.has(userInfo.venueId)) {
        this.venueRooms.get(userInfo.venueId).delete(socket.id)
        if (this.venueRooms.get(userInfo.venueId).size === 0) {
          this.venueRooms.delete(userInfo.venueId)
        }
      }

      // Notify other users in the venue
      socket.to(`venue-${userInfo.venueId}`).emit("user-left-venue", {
        userId: userInfo.userId,
        userName: userInfo.userName,
        reason,
        timestamp: new Date().toISOString(),
      })
    }

    // Remove from user sockets
    this.userSockets.delete(socket.id)
  }

  // Utility methods
  getConnectionStats() {
    return {
      ...this.connectionStats,
      connectedUsers: this.connectedUsers.size,
      activeVenues: this.venueRooms.size,
      timestamp: new Date().toISOString(),
    }
  }

  getVenueUsers(venueId) {
    const venueUsers = []
    for (const [userId, userInfo] of this.connectedUsers.entries()) {
      if (userInfo.venueId === venueId) {
        venueUsers.push({
          userId,
          userName: userInfo.userName,
          socketId: userInfo.socketId,
          joinedAt: userInfo.joinedAt,
        })
      }
    }
    return venueUsers
  }

  isUserConnected(userId) {
    return this.connectedUsers.has(userId)
  }

  getUserSocket(userId) {
    return this.connectedUsers.get(userId)
  }
}

export default new SocketManager()
