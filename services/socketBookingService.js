import { Booking, User } from "../models/index.js"
import socketManager from "../socket/socketManager.js"
import CustomErrorHandler from "../helpers/CustomErrorHandler.js"

const SocketBookingService = {
  // Enhanced booking with socket integration
  async createBookingWithSocketCheck(bookingData) {
    try {
      const { venueId, sport, scheduledDates, isMultiDay, dateRange, userId } = bookingData

      // Perform final availability check via socket
      const finalCheck = await socketManager.performFinalAvailabilityCheck({
        venueId,
        sport,
        scheduledDates,
        playableArea: scheduledDates[0]?.timeSlots[0]?.playableArea || 1,
      })

      if (finalCheck.hasConflicts) {
        throw CustomErrorHandler.badRequest("Booking conflicts detected", {
          conflicts: finalCheck.conflicts,
        })
      }

      // Create booking with enhanced data
      const enhancedBookingData = {
        ...bookingData,
        bookedBy: userId,
        scheduledDates: scheduledDates.map((dateSlot) => ({
          ...dateSlot,
          timeSlots: dateSlot.timeSlots.map((slot) => ({
            ...slot,
            bookedBy: userId,
            plot: slot.playableArea,
          })),
        })),
      }

      const booking = new Booking(enhancedBookingData)
      await booking.save()

      // Notify other users via socket
      socketManager.notifyVenueUsers(venueId, "new-booking-created", {
        bookingId: booking._id,
        venueId,
        sport,
        scheduledDates,
        bookedBy: userId,
        timestamp: new Date().toISOString(),
      })

      return await booking.populate("venueId userId bookedBy")
    } catch (error) {
      console.error("Error in createBookingWithSocketCheck:", error)
      throw error
    }
  },

  // Multi-day availability check with conflict detection
  async checkMultiDayAvailabilityWithConflicts(data) {
    try {
      const { venueId, sport, startDate, endDate, timeSlots, playableArea } = data

      const result = await socketManager.checkMultiDayAvailability({
        venueId,
        sport,
        startDate,
        endDate,
        timeSlots,
        playableArea,
      })

      // If conflicts exist, get detailed user information
      if (result.hasConflicts) {
        for (const dateConflict of result.conflicts) {
          for (const conflict of dateConflict.conflicts) {
            if (conflict.conflictingUser) {
              const user = await User.findById(conflict.conflictingUser.userId).select("name email").lean()
              conflict.conflictingUser.userDetails = user
            }
          }
        }
      }

      return result
    } catch (error) {
      console.error("Error in checkMultiDayAvailabilityWithConflicts:", error)
      throw error
    }
  },

  // Get available slots for plot selection
  async getAvailableSlotsForPlotSelection(data) {
    try {
      const { venueId, sport, date, selectedPlot } = data

      const availability = await socketManager.checkSlotAvailability({
        venueId,
        sport,
        date,
        playableArea: selectedPlot,
      })

      return {
        ...availability,
        selectedPlot,
        plotAvailability: availability.bookedSlots.length === 0,
      }
    } catch (error) {
      console.error("Error in getAvailableSlotsForPlotSelection:", error)
      throw error
    }
  },

  // Handle slot selection with real-time conflict check
  async handleSlotSelectionWithConflictCheck(data) {
    try {
      const { venueId, sport, date, timeSlot, playableArea, userId } = data

      // Check if slot is still available
      const availability = await socketManager.checkSlotAvailability({
        venueId,
        sport,
        date,
        playableArea,
      })

      const isSlotBooked = availability.bookedSlots.some(
        (bookedSlot) =>
          bookedSlot.startTime === timeSlot.startTime &&
          bookedSlot.endTime === timeSlot.endTime &&
          bookedSlot.playableArea === playableArea,
      )

      if (isSlotBooked) {
        const conflictKey = `${timeSlot.startTime}-${timeSlot.endTime}`
        const conflictingUser = availability.conflictingUsers[conflictKey]

        return {
          success: false,
          conflict: true,
          conflictingUser,
          message: `Slot ${timeSlot.startTime} - ${timeSlot.endTime} on Plot ${playableArea} has been booked by ${conflictingUser?.userName || "another user"}`,
        }
      }

      return {
        success: true,
        conflict: false,
        message: "Slot is available for selection",
      }
    } catch (error) {
      console.error("Error in handleSlotSelectionWithConflictCheck:", error)
      throw error
    }
  },
}

export default SocketBookingService
