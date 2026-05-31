const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Share Wheels Backend API",
      version: "1.0.0",
      description: "API documentation for Share Wheels backend services.",
    },
    servers: [
      {
        url: "http://localhost:3001",
        description: "Local development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        BasicSuccess: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
        },
        AuthRegisterRequest: {
          type: "object",
          required: ["name", "email", "mobile", "gender", "password"],
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            mobile: { type: "string" },
            gender: { type: "string" },
            password: { type: "string" },
          },
        },
        AuthLoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: { email: { type: "string" }, password: { type: "string" } },
        },
        VerifyOtpRequest: { type: "object", required: ["userId", "otp"], properties: { userId: { type: "string" }, otp: { type: "string" }, fcmToken: { type: "string" } } },
        ProfileImageRequest: { type: "object", required: ["profile_img"], properties: { profile_img: { type: "string" } } },
        FcmTokenRequest: { type: "object", required: ["fcmToken"], properties: { fcmToken: { type: "string" } } },
        SendNotificationRequest: { type: "object", required: ["userId", "title", "body"], properties: { userId: { type: "string" }, title: { type: "string" }, body: { type: "string" }, data: { type: "object" } } },
        AddVehicleRequest: { type: "object", required: ["company", "model", "type", "license_number"], properties: { company: { type: "string" }, model: { type: "string" }, type: { type: "string" }, license_number: { type: "string" }, car_image: { type: "string" }, issue_date: { type: "string" }, expiry_date: { type: "string" }, car_no: { type: "string" } } },
        EditVehicleRequest: { type: "object", properties: { company: { type: "string" }, model: { type: "string" }, type: { type: "string" }, license_number: { type: "string" }, car_image: { type: "string" }, issue_date: { type: "string" }, expiry_date: { type: "string" }, car_no: { type: "string" } } },
        TermsRequest: { type: "object", required: ["isAccepted"], properties: { isAccepted: { type: "boolean" } } },
        UserIdsRequest: { type: "object", required: ["userIds"], properties: { userIds: { type: "array", items: { type: "string" } } } },
        RideIdsRequest: { type: "object", required: ["rideIds"], properties: { rideIds: { type: "array", items: { type: "string" } } } },
        CreateRideRequest: { type: "object", required: ["from", "to", "date", "startTime", "ride_amount"], properties: { from: { type: "string" }, to: { type: "string" }, availableSeats: { type: "number" }, ride_amount: { type: "number" }, date: { type: "string" }, startTime: { type: "string" }, AlternatePhoneNumber: { type: "string" }, CanCarryCourier: { type: "boolean" }, QuickReserve: { type: "boolean" } } },
        CancelRideRequest: { type: "object", required: ["rideId", "reason"], properties: { rideId: { type: "string" }, reason: { type: "string", minLength: 10 } } },
        PostponeRideRequest: { type: "object", required: ["rideId", "newStartTime", "reason"], properties: { rideId: { type: "string" }, newStartTime: { type: "string" }, reason: { type: "string", minLength: 10 } } },
        PassengerSendRequest: { type: "object", required: ["rideId", "requires_seats"], properties: { rideId: { type: "string" }, requires_seats: { type: "number" } } },
        PassengerCreateRequest: { type: "object", required: ["from", "to", "ride_need_date", "seats_needed", "amount_will"], properties: { from: { type: "string" }, to: { type: "string" }, ride_need_date: { type: "string" }, seats_needed: { type: "number" }, amount_will: { type: "number" }, date: { type: "string" }, luggage_included: { type: "boolean" } } },
        DriverPickPassengerRequest: { type: "object", required: ["passenger_rideId", "rideId"], properties: { passenger_rideId: { type: "string" }, rideId: { type: "string" } } },
        CourierCreateRequest: { type: "object", required: ["from", "to", "courier_type", "what_to_deliver", "courier_img", "amount_will", "date", "receiver_name", "receiver_mobile", "receiver_alternate_mobile", "receiver_address"], properties: { from: { type: "string" }, to: { type: "string" }, courier_type: { type: "string" }, what_to_deliver: { type: "string" }, courier_img: { type: "string" }, amount_will: { type: "string" }, date: { type: "object", properties: { startDate: { type: "string" }, endDate: { type: "string" } } }, receiver_name: { type: "string" }, receiver_mobile: { type: "string" }, receiver_alternate_mobile: { type: "string" }, receiver_address: { type: "string" } } },
        CourierRideRequest: { type: "object", required: ["rideId", "from", "to", "courier_type", "what_to_deliver", "courier_img", "amount_will", "date", "receiver_name", "receiver_mobile", "receiver_alternate_mobile", "receiver_address"], properties: { rideId: { type: "string" }, from: { type: "string" }, to: { type: "string" }, courier_type: { type: "string" }, what_to_deliver: { type: "string" }, courier_img: { type: "string" }, amount_will: { type: "string" }, date: { type: "string" }, receiver_name: { type: "string" }, receiver_mobile: { type: "string" }, receiver_alternate_mobile: { type: "string" }, receiver_address: { type: "string" } } },
        RideCourierActionRequest: { type: "object", required: ["rideId", "courierId"], properties: { rideId: { type: "string" }, courierId: { type: "string" } } },
        DriverPassengerActionRequest: { type: "object", required: ["rideId", "passenger_userId"], properties: { rideId: { type: "string" }, passenger_userId: { type: "string" } } },
        StartEndRideRequest: { type: "object", required: ["rideId"], properties: { rideId: { type: "string" } } },
        EnrouteRequestsRequest: { type: "object", required: ["from", "to", "date"], properties: { from: { type: "string" }, to: { type: "string" }, date: { type: "string" } } },
        RideDetailsRequest: { type: "object", required: ["userId"], properties: { userId: { type: "string" } } },
        AdminRegisterRequest: { type: "object", required: ["name", "email", "mobile", "password"], properties: { name: { type: "string" }, email: { type: "string" }, mobile: { type: "string" }, password: { type: "string" } } },
        AdminLoginRequest: { type: "object", required: ["email", "password"], properties: { email: { type: "string" }, password: { type: "string" } } },
      },
    },
    paths: {
      "/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register user",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/AuthRegisterRequest" } } },
          },
          responses: { 200: { description: "OK" } },
        },
      },
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login with email and password",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/AuthLoginRequest" } } },
          },
          responses: { 200: { description: "OK" } },
        },
      },
      "/auth/verify-otp": {
        post: {
          tags: ["Auth"],
          summary: "Verify OTP",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/VerifyOtpRequest" } } },
          },
          responses: { 200: { description: "OK" } },
        },
      },
      "/auth/verify-token": { post: { tags: ["Auth"], summary: "Verify JWT token", responses: { 200: { description: "OK" } } } },
      "/auth/profile/image": { post: { tags: ["Auth"], summary: "Update profile image", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ProfileImageRequest" } } } }, responses: { 200: { description: "OK" } } } },
      "/auth/register-fcm-token": { post: { tags: ["Auth"], summary: "Save FCM token", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/FcmTokenRequest" } } } }, responses: { 200: { description: "OK" } } } },
      "/auth/send-notification": { post: { tags: ["Auth"], summary: "Send push notification", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SendNotificationRequest" } } } }, responses: { 200: { description: "OK" } } } },
      "/auth/add-vehicle": { post: { tags: ["Auth"], summary: "Add vehicle", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AddVehicleRequest" } } } }, responses: { 200: { description: "OK" } } } },
      "/auth/edit-vehicle": { patch: { tags: ["Auth"], summary: "Edit vehicle", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/EditVehicleRequest" } } } }, responses: { 200: { description: "OK" } } } },
      "/auth/user/terms": { put: { tags: ["Auth"], summary: "Accept/reject terms", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TermsRequest" } } } }, responses: { 200: { description: "OK" } } } },
      "/auth/get-users-data": { post: { tags: ["Auth"], summary: "Get multiple users data", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UserIdsRequest" } } } }, responses: { 200: { description: "OK" } } } },
      "/auth/user-profile": { get: { tags: ["Auth"], summary: "Get user profile", security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" } } } },

      "/rides/get-rides-data": { post: { tags: ["Rides"], summary: "Get rides by IDs", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RideIdsRequest" } } } }, responses: { 200: { description: "OK" } } } },
      "/rides/create-ride": { post: { tags: ["Rides"], summary: "Create ride", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateRideRequest" } } } }, responses: { 200: { description: "OK" } } } },
      "/rides/get-rides": {
        get: {
          tags: ["Rides"],
          summary: "Search rides",
          parameters: [
            { in: "query", name: "from", required: true, schema: { type: "string" } },
            { in: "query", name: "to", required: true, schema: { type: "string" } },
            { in: "query", name: "date", required: true, schema: { type: "string", example: "2026-04-30" } },
          ],
          responses: { 200: { description: "OK" } },
        },
      },
      "/rides/ride/cancel": {
        post: {
          tags: ["Rides"],
          summary: "Cancel ride (driver, ≥2h before start, reason required)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/CancelRideRequest" } } },
          },
          responses: { 200: { description: "OK" } },
        },
      },
      "/rides/ride/postpone": {
        post: {
          tags: ["Rides"],
          summary: "Postpone ride once (driver, ≥2h before, max +2h delay, reason required)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/PostponeRideRequest" } } },
          },
          responses: { 200: { description: "OK" } },
        },
      },
      "/rides/passenger/send-request": {
        post: {
          tags: ["Rides"],
          summary: "Passenger send request",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/PassengerSendRequest" } } },
          },
          responses: { 200: { description: "OK" } },
        },
      },
      "/rides/upcoming-rides": { get: { tags: ["Rides"], summary: "Upcoming rides", security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" } } } },
      "/rides/history-rides": { get: { tags: ["Rides"], summary: "Ride history", security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" } } } },
      "/rides/ride-details/{rideId}": {
        get: {
          tags: ["Rides"],
          summary: "Ride details",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "rideId", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/rides/my-requests": { get: { tags: ["Rides"], summary: "My ride/courier requests", security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" } } } },
      "/rides/my-passenger-requests": { get: { tags: ["Rides"], summary: "My open passenger requests", security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" } } } },
      "/rides/my-courier-requests": { get: { tags: ["Rides"], summary: "My open courier requests", security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" } } } },

      "/passenger-rides/create-passenger-request": { post: { tags: ["Passenger Rides"], summary: "Create passenger request", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PassengerCreateRequest" } } } }, responses: { 200: { description: "OK" } } } },
      "/passenger-rides/open": { get: { tags: ["Passenger Rides"], summary: "Get open passenger requests", security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" } } } },
      "/passenger-rides/driver/pick-passenger": { post: { tags: ["Passenger Rides"], summary: "Driver picks passenger", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/DriverPickPassengerRequest" } } } }, responses: { 200: { description: "OK" } } } },

      "/courier/create-courier-request": { post: { tags: ["Courier"], summary: "Create courier request", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CourierCreateRequest" } } } }, responses: { 201: { description: "Created" } } } },
      "/courier/request-courier": { post: { tags: ["Courier"], summary: "Request courier on ride", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CourierRideRequest" } } } }, responses: { 200: { description: "OK" } } } },
      "/courier/accept-courier": {
        post: {
          tags: ["Courier"],
          summary: "Accept courier request",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/RideCourierActionRequest" } } },
          },
          responses: { 200: { description: "OK" } },
        },
      },
      "/courier/reject-courier": {
        post: {
          tags: ["Courier"],
          summary: "Reject courier request",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/RideCourierActionRequest" } } },
          },
          responses: { 200: { description: "OK" } },
        },
      },
      "/courier/remove-delivery": { post: { tags: ["Courier"], summary: "Remove delivery", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RideCourierActionRequest" } } } }, responses: { 200: { description: "OK" } } } },

      "/driver-rides/driver-accept-passenger-request": { post: { tags: ["Driver Rides"], summary: "Accept passenger request", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/DriverPassengerActionRequest" } } } }, responses: { 200: { description: "OK" } } } },
      "/driver-rides/driver-reject-passenger-request": { post: { tags: ["Driver Rides"], summary: "Reject passenger request", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/DriverPassengerActionRequest" } } } }, responses: { 200: { description: "OK" } } } },
      "/driver-rides/driver-remove-passenger": { post: { tags: ["Driver Rides"], summary: "Remove passenger", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/DriverPassengerActionRequest" } } } }, responses: { 200: { description: "OK" } } } },
      "/driver-rides/start-ride": { patch: { tags: ["Driver Rides"], summary: "Start ride", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/StartEndRideRequest" } } } }, responses: { 200: { description: "OK" } } } },
      "/driver-rides/end-ride": { patch: { tags: ["Driver Rides"], summary: "End ride", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/StartEndRideRequest" } } } }, responses: { 200: { description: "OK" } } } },
      "/driver-rides/enroute-requests": { post: { tags: ["Driver Rides"], summary: "Get enroute requests", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/EnrouteRequestsRequest" } } } }, responses: { 200: { description: "OK" } } } },
      "/driver-rides/driver/pick-courier": { post: { tags: ["Driver Rides"], summary: "Pick courier", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RideCourierActionRequest" } } } }, responses: { 200: { description: "OK" } } } },

      "/rideDetails/user/get-ride-details": { post: { tags: ["Ride Details"], summary: "Get user ride details", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RideDetailsRequest" } } } }, responses: { 200: { description: "OK" } } } },

      "/support/context": { get: { tags: ["Support"], summary: "Support bot context and suggestions", security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" } } } },
      "/support/snapshot": { get: { tags: ["Support"], summary: "Full user DB snapshot for support", security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" } } } },
      "/support/chat": {
        post: {
          tags: ["Support"],
          summary: "Support bot chat message",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["message"],
                  properties: {
                    message: { type: "string" },
                    history: { type: "array", items: { type: "object" } },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "OK" } },
        },
      },

      "/admin/register": { post: { tags: ["Admin"], summary: "Admin register", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AdminRegisterRequest" } } } }, responses: { 200: { description: "OK" } } } },
      "/admin/login": { post: { tags: ["Admin"], summary: "Admin login", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AdminLoginRequest" } } } }, responses: { 200: { description: "OK" } } } },
    },
  },
  apis: ["./src/routes/*.js", "./src/controllers/*.js"],
});

const setupSwagger = (app) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

module.exports = {
  setupSwagger,
};
