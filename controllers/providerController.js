import { ProviderServices } from "../services/index.js";
const ProviderController = {

    //#region GetServiceType
    async GetServiceType(req, res, next) {
        try {
            const result = await ProviderServices.GetServiceType();
            return res.json({
                success: true,
                message: "Service Type Retrieved Successfully",
                data: { service_type: result }
            })
        } catch (error) {
            console.log("Unable to fetch service type:", error);
        }
    },
    //#endregion
}
export default ProviderController;