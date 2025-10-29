import { Types } from "mongoose";
import CustomErrorHandler from "../helpers/CustomErrorHandler.js";
import { Sponsor, Tournament } from "../models/index.js";
import { adminService } from "../services/index.js";
import ImageUploader from "../helpers/ImageUploader.js";
import firebaseNotification from "../helpers/firebaseNotification.js";
function isBase64Image(str) {
    return /^data:image\/[a-zA-Z]+;base64,/.test(str);
}
const SponsorService = {
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


    async getSponsor(tournamentId) {
        try {
            const sponsor = await Sponsor.find({ tournamentId: Types.ObjectId(tournamentId), isActive: true });
            return sponsor;
        } catch (err) {
            console.log("Error in fetching Sponsor:", err);
            throw err;
        }
    },



    async editSponsor(sponsorId, data) {

        try {
            let sponsorImage = await Sponsor.findOne({ sponsorId });
            if (!sponsorImage) {
                throw CustomErrorHandler.notFound("Sponsor Details not found.");
            }
            let mediaPath;
            if (data.sponsorMedia) {
                if (isBase64Image(data.sponsorMedia)) {
                    mediaPath = await ImageUploader.Upload(
                        data.sponsorMedia,
                        "tournament_sponsor",
                        sponsorImage.sponsorMedia
                    );
                    await ImageUploader.Delete(data.banner);
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