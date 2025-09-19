import getStatusText from "./statusText.js";

class ApiResponse {
    static success(status, message, data = null) {
        return {
            status,
            statusText: getStatusText(status),
            message,
            data
        };
    }
    static error(status, message, data = null) {
        return {
            status,
            statusText: getStatusText(status),
            message,
            data
        };
    }

    // static error(status, message) {
    //     return {
    //         status,
    //         statusText: getStatusText(status),
    //         message,
    //         data: null
    //     };
    // }
}

export default ApiResponse;
