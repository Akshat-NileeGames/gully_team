const getStatusText = (status) => {
    return {
      200: "OK",
      201: "CREATED",
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      500: "INTERNAL_SERVER_ERROR",
    }[status] || "UNKNOWN_STATUS";
  };
  export default getStatusText;
