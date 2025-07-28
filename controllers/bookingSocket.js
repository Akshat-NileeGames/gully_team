import { Server } from "socket.io"
import jwt from "jsonwebtoken"
import { JWT_SECRET } from "../config/index.js"
import { Booking, Venue } from "../models/index.js"
import { DateTime } from "luxon"

class BookingSocketManager {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    })

    this.venueRooms = new Map() // Track users in venue rooms
    this.userSockets = new Map() // Track user socket connections
    this.userSelections = new Map() // Track user slot selections

    this.setupSocketHandlers()
  }

  setupSocketHandlers() {
    this.io.use(this.authenticateSocket.bind(this))

    this.io.on("connection", (socket) => {
      console.log(`User connected: ${socket.userId}`)
      this.userSockets.set(socket.userId, socket.id)

      // Join venue room for real-time updates
      socket.on("join-venue-room", (data) => {
        this.handleJoinVenueRoom(socket, data)
      })

      // Leave venue room
      socket.on("leave-venue-room", (data) => {
        this.handleLeaveVenueRoom(socket, data)
      })

      // Check slot availability in real-time
      socket.on("check-slot-availability", (data) => {
        this.handleSlotAvailabilityCheck(socket, data)
      })

      // Handle slot selection conflicts
      socket.on("slot-selected", (data) => {
        this.handleSlotSelection(socket, data)
      })

      // Handle multi-day availability check
      socket.on("check-multi-day-availability", (data) => {
        this.handleMultiDayAvailabilityCheck(socket, data)
      })

      // Handle booking confirmation
      socket.on("booking-confirmed", (data) => {
        this.handleBookingConfirmation(socket, data)
      })

      // Reset user selections
      socket.on("reset-selections", (data) => {
        this.handleResetSelections(socket, data)
      })

      socket.on("disconnect", () => {
        this.handleDisconnect(socket)
      })
    })
  }

  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token
      if (!token) {
        return next(new Error("Authentication error"))
      }

      const decoded = jwt.verify(token, JWT_SECRET)
      socket.userId = decoded.userId
      next()
    } catch (error) {
      next(new Error("Authentication error"))
    }
  }

  handleJoinVenueRoom(socket, data) {
    const { venueId, sport, date, playableArea } = data
    const roomId = `venue_${venueId}_${sport}_${date}_${playableArea}`

    socket.join(roomId)
    socket.currentRoom = roomId
    socket.venueData = { venueId, sport, date, playableArea }

    // Track users in venue room
    if (!this.venueRooms.has(roomId)) {
      this.venueRooms.set(roomId, new Set())
    }
    this.venueRooms.get(roomId).add(socket.userId)

    console.log(`User ${socket.userId} joined room: ${roomId}`)

    // Send current room occupancy
    socket.emit("room-joined", {
      roomId,
      activeUsers: this.venueRooms.get(roomId).size,
    })

    // Broadcast to other users in room
    socket.to(roomId).emit("user-joined-room", {
      userId: socket.userId,
      activeUsers: this.venueRooms.get(roomId).size,
    })
  }

  handleLeaveVenueRoom(socket, data) {
    if (socket.currentRoom) {
      const roomId = socket.currentRoom
      socket.leave(roomId)

      const roomUsers = this.venueRooms.get(roomId)
      if (roomUsers) {
        roomUsers.delete(socket.userId)

        // Broadcast user left to remaining users
        socket.to(roomId).emit("user-left-room", {
          userId: socket.userId,
          activeUsers: roomUsers.size,
        })

        if (roomUsers.size === 0) {
          this.venueRooms.delete(roomId)
        }
      }

      console.log(`User ${socket.userId} left room: ${roomId}`)
      socket.currentRoom = null
      socket.venueData = null
    }
  }

  async handleSlotAvailabilityCheck(socket, data) {
    try {
      const { venueId, sport, date, playableArea } = data

      // Get real-time slot availability
      const availability = await this.getSlotAvailability(venueId, sport, date, playableArea)

      socket.emit("slot-availability-update", {
        venueId,
        sport,
        date,
        playableArea,
        ...availability,
        timestamp: new Date(),
      })
    } catch (error) {
      socket.emit("slot-availability-error", {
        error: error.message,
      })
    }
  }

  async handleMultiDayAvailabilityCheck(socket, data) {
    try {
      const { venueId, sport, startDate, endDate, playableArea } = data

      const conflicts = []
      const availabilityByDate = {}

      const currentDate = new Date(startDate)
      const endDateTime = new Date(endDate)

      while (currentDate <= endDateTime) {
        const dateStr = currentDate.toISOString().split("T")[0]
        const availability = await this.getSlotAvailability(venueId, sport, dateStr, playableArea)

        availabilityByDate[dateStr] = availability

        // Check for any conflicts
        if (availability.bookedSlots.length > 0) {
          conflicts.push({
            date: dateStr,
            bookedSlots: availability.bookedSlots,
          })
        }

        currentDate.setDate(currentDate.getDate() + 1)
      }

      socket.emit("multi-day-availability-update", {
        venueId,
        sport,
        startDate,
        endDate,
        playableArea,
        availabilityByDate,
        conflicts,
        timestamp: new Date(),
      })
    } catch (error) {
      socket.emit("multi-day-availability-error", {
        error: error.message,
      })
    }
  }

  async handleSlotSelection(socket, data) {
    try {
      const { venueId, sport, date, playableArea, selectedSlots, action } = data
      const roomId = `venue_${venueId}_${sport}_${date}_${playableArea}`

      // Check if slots are still available
      const conflicts = await this.checkSlotConflicts(venueId, sport, date, playableArea, selectedSlots)

      if (conflicts.length > 0) {
        // Notify user of conflicts
        socket.emit("slot-conflict-detected", {
          conflicts,
          conflictedSlots: conflicts,
          message: "Some selected slots are no longer available",
          timestamp: new Date(),
        })
      } else {
        // Store user selections
        const userKey = `${socket.userId}_${venueId}_${sport}_${date}_${playableArea}`
        this.userSelections.set(userKey, {
          userId: socket.userId,
          venueId,
          sport,
          date,
          playableArea,
          selectedSlots,
          timestamp: new Date(),
        })

        // Broadcast slot selection to other users in the same room
        socket.to(roomId).emit("slot-selection-update", {
          userId: socket.userId,
          venueId,
          sport,
          date,
          playableArea,
          selectedSlots,
          action, // 'select' or 'deselect'
          timestamp: new Date(),
        })
      }
    } catch (error) {
      socket.emit("slot-selection-error", {
        error: error.message,
      })
    }
  }

  async handleBookingConfirmation(socket, data) {
    try {
      const { bookingId, venueId, sport, scheduledDates } = data

      // Notify all relevant rooms about the new booking
      for (const dateSlot of scheduledDates) {
        const playableAreas = [...new Set(dateSlot.timeSlots.map((slot) => slot.playableArea))]

        for (const playableArea of playableAreas) {
          const roomId = `venue_${venueId}_${sport}_${dateSlot.date}_${playableArea}`

          // Get affected slots for this playable area
          const affectedSlots = dateSlot.timeSlots.filter((slot) => slot.playableArea === playableArea)

          this.io.to(roomId).emit("booking-confirmed", {
            bookingId,
            venueId,
            sport,
            date: dateSlot.date,
            playableArea,
            bookedSlots: affectedSlots,
            bookedBy: socket.userId,
            timestamp: new Date(),
          })

          // Clear user selections for this room
          this.clearUserSelectionsForRoom(roomId)
        }
      }
    } catch (error) {
      socket.emit("booking-confirmation-error", {
        error: error.message,
      })
    }
  }

  handleResetSelections(socket, data) {
    const { venueId } = data

    // Clear all selections for this user and venue
    const keysToDelete = []
    for (const [key, selection] of this.userSelections.entries()) {
      if (selection.userId === socket.userId && selection.venueId === venueId) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach((key) => this.userSelections.delete(key))

    socket.emit("selections-reset", {
      venueId,
      timestamp: new Date(),
    })
  }

  handleDisconnect(socket) {
    console.log(`User disconnected: ${socket.userId}`)

    // Clean up user from venue rooms
    if (socket.currentRoom) {
      const roomUsers = this.venueRooms.get(socket.currentRoom)
      if (roomUsers) {
        roomUsers.delete(socket.userId)

        // Notify remaining users
        socket.to(socket.currentRoom).emit("user-left-room", {
          userId: socket.userId,
          activeUsers: roomUsers.size,
        })

        if (roomUsers.size === 0) {
          this.venueRooms.delete(socket.currentRoom)
        }
      }
    }

    // Clear user selections
    const keysToDelete = []
    for (const [key, selection] of this.userSelections.entries()) {
      if (selection.userId === socket.userId) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach((key) => this.userSelections.delete(key))

    this.userSockets.delete(socket.userId)
  }

  clearUserSelectionsForRoom(roomId) {
    const keysToDelete = []
    for (const [key, selection] of this.userSelections.entries()) {
      const selectionRoomId = `venue_${selection.venueId}_${selection.sport}_${selection.date}_${selection.playableArea}`
      if (selectionRoomId === roomId) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach((key) => this.userSelections.delete(key))
  }

  async getSlotAvailability(venueId, sport, date, playableArea) {
    // Get venue information
    const venue = await Venue.findById(venueId)
    if (!venue) {
      throw new Error("Venue not found")
    }

    // Check if venue is open
    const requestedDate = DateTime.fromJSDate(new Date(date))
    const dayName = requestedDate.toFormat("cccc")
    const dayTiming = venue.venue_timeslots[dayName]

    if (!dayTiming || !dayTiming.isOpen) {
      return {
        availableSlots: [],
        bookedSlots: [],
        totalSlots: 0,
        message: `Venue is closed on ${dayName}`,
      }
    }

    // Generate time slots
    const allSlots = this.generateTimeSlots(dayTiming.openTime, dayTiming.closeTime)

    // Apply time filtering for current date
    const currentDate = DateTime.now()
    const isToday = requestedDate.hasSame(currentDate, "day")
    let filteredSlots = allSlots

    if (isToday) {
      const currentTime = currentDate.toFormat("h:mm a")
      filteredSlots = allSlots.filter((slot) => {
        const slotStartTime = DateTime.fromFormat(slot.startTime, "h:mm a")
        const currentDateTime = DateTime.fromFormat(currentTime, "h:mm a")
        return slotStartTime >= currentDateTime
      })
    }

    // Get existing bookings
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)

    const existingBookings = await Booking.find({
      venueId: venueId,
      sport: new RegExp(`^${sport}$`, "i"),
      bookingStatus: { $in: ["confirmed", "pending", "completed"] },
      "scheduledDates.date": { $gte: start, $lte: end },
    }).lean()

    // Extract booked slots for specific playable area
    const bookedSlotsForArea = new Set()
    const bookedSlotDetails = []

    existingBookings.forEach((booking) => {
      booking.scheduledDates.forEach((dateSlot) => {
        const slotDate = new Date(dateSlot.date)
        if (slotDate >= start && slotDate <= end) {
          dateSlot.timeSlots.forEach((slot) => {
            if (slot.playableArea === playableArea) {
              const slotKey = `${slot.startTime}-${slot.endTime}`
              bookedSlotsForArea.add(slotKey)
              bookedSlotDetails.push({
                startTime: slot.startTime,
                endTime: slot.endTime,
                playableArea: slot.playableArea,
                bookingId: booking._id,
                userId: booking.userId,
                status: booking.bookingStatus,
              })
            }
          })
        }
      })
    })

    // Filter available slots
    const availableSlots = filteredSlots
      .filter((slot) => {
        const slotKey = `${slot.startTime}-${slot.endTime}`
        return !bookedSlotsForArea.has(slotKey)
      })
      .map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        playableArea: playableArea,
      }))

    return {
      availableSlots,
      bookedSlots: bookedSlotDetails,
      totalSlots: allSlots.length,
      sport,
      date,
      playableArea,
      timeFilteringApplied: isToday,
    }
  }

  async checkSlotConflicts(venueId, sport, date, playableArea, selectedSlots) {
    const conflicts = []

    for (const slot of selectedSlots) {
      const isAvailable = await this.isSlotAvailable(venueId, sport, date, playableArea, slot)
      if (!isAvailable) {
        conflicts.push({
          startTime: slot.startTime,
          endTime: slot.endTime,
          playableArea: slot.playableArea,
          date: date,
        })
      }
    }

    return conflicts
  }

  async isSlotAvailable(venueId, sport, date, playableArea, timeSlot) {
    const booking = await Booking.findOne({
      venueId,
      sport: new RegExp(`^${sport}$`, "i"),
      bookingStatus: { $in: ["confirmed", "pending"] },
      scheduledDates: {
        $elemMatch: {
          date: new Date(date),
          timeSlots: {
            $elemMatch: {
              playableArea: playableArea,
              startTime: timeSlot.startTime,
              endTime: timeSlot.endTime,
            },
          },
        },
      },
    })

    return !booking
  }

  generateTimeSlots(openTime, closeTime) {
    const slots = []
    const parseTime = (timeStr) => {
      const [time, period] = timeStr.split(" ")
      let [hours, minutes] = time.split(":").map(Number)
      if (period === "PM" && hours !== 12) hours += 12
      if (period === "AM" && hours === 12) hours = 0
      return { hours, minutes }
    }

    const start = parseTime(openTime)
    const end = parseTime(closeTime)

    let currentHour = start.hours
    let currentMinute = start.minutes

    while (currentHour < end.hours || (currentHour === end.hours && currentMinute < end.minutes)) {
      const startTime = this.formatTime(currentHour, currentMinute)

      // Add 1 hour
      currentMinute += 60
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60)
        currentMinute = currentMinute % 60
      }

      const endTime = this.formatTime(currentHour, currentMinute)

      if (currentHour < end.hours || (currentHour === end.hours && currentMinute <= end.minutes)) {
        slots.push({ startTime, endTime })
      }
    }

    return slots
  }

  formatTime(hours, minutes) {
    const period = hours >= 12 ? "PM" : "AM"
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`
  }

  // Method to broadcast slot updates to specific venue room
  broadcastSlotUpdate(venueId, sport, date, playableArea, updateData) {
    const roomId = `venue_${venueId}_${sport}_${date}_${playableArea}`
    this.io.to(roomId).emit("slot-update", updateData)
  }

  // Method to get active users in a venue room
  getActiveUsersInRoom(venueId, sport, date, playableArea) {
    const roomId = `venue_${venueId}_${sport}_${date}_${playableArea}`
    return this.venueRooms.get(roomId)?.size || 0
  }

  // Method to notify about booking conflicts
  notifyBookingConflict(venueId, sport, date, playableArea, conflictData) {
    const roomId = `venue_${venueId}_${sport}_${date}_${playableArea}`
    this.io.to(roomId).emit("booking-conflict", {
      ...conflictData,
      timestamp: new Date(),
    })
  }
}

export default BookingSocketManager
