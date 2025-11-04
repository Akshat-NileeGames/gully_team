import { Types } from "mongoose";
import CustomErrorHandler from "../helpers/CustomErrorHandler.js";
import { Sponsor, Tournament } from "../models/index.js";
import { adminService } from "../services/index.js";
import ImageUploader from "../helpers/ImageUploader.js";

// Utility function to check if input is a base64 encoded image or video
function isBase64Media(str) {
    return /^data:(image|video)\/[a-zA-Z0-9.+-]+;base64,/.test(str);
}

const SponsorService = {

    /**
      * @function addSponsor
      * @description Creates and saves a new sponsor for a specific tournament.
      *              If a media file (image or video) is provided in Base64 format, it is uploaded first.
      *
      * @param {Object} data - Data required to create a sponsor.
      * @param {string} data.sponsorName - Name of the sponsor.
      * @param {string} [data.sponsorDescription] - Optional sponsor description.
      * @param {string} [data.sponsorUrl] - Optional sponsor website or reference link.
      * @param {string} data.tournamentId - The ID of the tournament the sponsor is associated with.
      * @param {boolean} data.isVideo - Whether the sponsor media is a video file.
      * @param {string} [data.sponsorMedia] - Base64 or URL of the sponsor's media.
      * @returns {Promise<Sponsor>} Resolves with the created sponsor document.
      * @throws {Error} Throws an error if saving sponsor data fails.
      */
    async addSponsor(data) {
        const user = global.user;
        let imageUrl = "";
        if (data.sponsorMedia) {
            imageUrl = await ImageUploader.Upload(
                data.sponsorMedia,
                "tournament_sponsor",
            );
        }
        const sponsorData = new Sponsor({
            sponsorMedia: imageUrl,
            sponsorName: data.sponsorName,
            sponsorDescription: data.sponsorDescription || '',
            sponsorUrl: data.sponsorUrl || '',
            tournamentId: Types.ObjectId(data.tournamentId),
            isVideo: data.isVideo,
            user: user._id,
        });
        try {
            const sponsor = await sponsorData.save();
            // const mail = await adminService.sendMail("Banner Adding",user.email,user.fullName,"We are working ");
            // console.log(mail);
            return sponsor;
        } catch (err) {
            console.log("Error in adding Sponsor Details in service ", err)
        }

    },

    /**
     * @function getSponsor
     * @description Retrieves all active sponsors for a given tournament.
     *
     * @param {string} tournamentId - The ID of the tournament.
     * @returns {Promise<Array<Sponsor>>} Resolves with an array of active sponsor documents.
     * @throws {Error} Throws if there is an issue fetching sponsors from the database.
     */
    async getSponsor(tournamentId) {
        try {
            const sponsor = await Sponsor.find({ tournamentId: Types.ObjectId(tournamentId), isActive: true });
            return sponsor;
        } catch (err) {
            console.log("Error in fetching Sponsor:", err);
            throw err;
        }
    },

    /**
       * @function editSponsor
       * @description Updates an existing sponsor’s details such as media, name, description, and URL.
       *              Uploads a new media file if provided in Base64 format.
       *
       * @param {string} sponsorId - The ID of the sponsor to edit.
       * @param {Object} data - The updated sponsor data.
       * @param {string} [data.sponsorMedia] - New Base64 or URL media (optional).
       * @param {string} data.sponsorName - Updated sponsor name.
       * @param {string} [data.sponsorDescription] - Updated sponsor description.
       * @param {string} [data.sponsorUrl] - Updated sponsor link.
       * @param {string} data.tournamentId - Associated tournament ID.
       * @param {boolean} data.isVideo - Whether the media file is a video.
       * @returns {Promise<Sponsor>} Resolves with the updated sponsor document.
       * @throws {CustomErrorHandler} Throws if sponsor or tournament is not found.
       */
    async editSponsor(sponsorId, data) {

        try {
            let sponsorImage = await Sponsor.findById(sponsorId);
            if (!sponsorImage) {
                throw CustomErrorHandler.notFound("Sponsor Details not found.");
            }
            let mediaPath;
            if (data.sponsorMedia) {
                if (isBase64Media(data.sponsorMedia)) {
                    mediaPath = await ImageUploader.Upload(
                        data.sponsorMedia,
                        "tournament_sponsor",
                    );
                    // await ImageUploader.Delete(sponsorImage.sponsorMedia);
                } else {
                    mediaPath = sponsorImage.sponsorMedia;
                }
            }

            const updatedData = {
                sponsorMedia: mediaPath,
                sponsorName: data.sponsorName,
                sponsorDescription: data.sponsorDescription || '',
                sponsorUrl: data.sponsorUrl || '',
                tournamentId: Types.ObjectId(data.tournamentId),
                isVideo: data.isVideo,
                user: user._id,
            }

            const sponsor = await Sponsor.findByIdAndUpdate(sponsorId, updatedData, {
                new: true
            });

            if (!sponsor) {
                throw new CustomErrorHandler("Sponsor not found", 404);
            }
            const tournament = await Tournament.findById(data.tournamentId);
            if (!tournament) throw CustomErrorHandler.notFound("Tournament Not Found");
            tournament.TotalEditDone += 1;
            await tournament.save();
            return sponsor;
        } catch (err) {
            console.log("Error in editing Sponsor:", err);
            throw err;
        }
    },

    /**
     * @function deleteSponsor
     * @description Soft-deletes a sponsor by marking it as inactive (isActive = false).
     *
     * @param {string} sponsorId - The ID of the sponsor to delete.
     * @returns {Promise<Sponsor>} Resolves with the updated (inactive) sponsor document.
     * @throws {CustomErrorHandler} Throws if the sponsor is not found.
     */
    async deleteSponsor(sponsorId) {
        try {
            const sponsor = await Sponsor.findById(sponsorId);
            if (!sponsor) throw CustomErrorHandler.notFound("Sponsor not found");
            sponsor.isActive = false;
            await sponsor.save();
            return sponsor;
        } catch (err) {
            console.log("Error in deleting Sponsor:", err);
            throw err;
        }
    },
    /**
     * @function getSponsorsForTournament
     * @description Fetches all active sponsors for a specific tournament.
     *
     * @param {string} tournamentId - The tournament ID to fetch sponsors for.
     * @returns {Promise<Array<Sponsor>>} Resolves with a list of active sponsors for the tournament.
     * @throws {Error} Throws if fetching sponsors fails.
     */
    async getSponsorsForTournament(tournamentId) {
        try {
            const sponsors = await Sponsor.find({
                tournamentId: Types.ObjectId(tournamentId),
                isActive: true,
            });
            return sponsors;
        } catch (err) {
            console.log("Error in fetching Sponsors for Tournament:", err);
            throw err;
        }
    },
}
export default SponsorService;