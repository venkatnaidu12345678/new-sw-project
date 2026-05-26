require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { connectDatabase } = require("./config/database");
const { createServerWithSocket } = require("./config/socket");
const { setupSwagger } = require("./config/swagger");

const authRoutes = require("./routes/authRoutes");
const rideRoutes = require("./routes/rideRoutes");
const passengerRideRoutes = require("./routes/passengerRideRoutes");
const courierRoutes = require("./routes/courierRoutes");
const rideDetailsRoutes = require("./routes/RideDeatailsRoutes");
const driverRidesRoutes = require("./routes/DriverRideRoutes");
const supportRoutes = require("./routes/supportRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adRoutes = require("./routes/adRoutes");

const app = express();

app.use(cors());
app.use(express.json());
setupSwagger(app);

app.use("/auth", authRoutes);
app.use("/rides", rideRoutes);
app.use("/passenger-rides", passengerRideRoutes);
app.use("/courier", courierRoutes);
app.use("/rideDetails", rideDetailsRoutes);
app.use("/driver-rides", driverRidesRoutes);
app.use("/support", supportRoutes);
app.use("/admin", adminRoutes);
app.use("/ads", adRoutes);

connectDatabase();

const { server } = createServerWithSocket(app);
const PORT = process.env.PORT || 3001;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`LAN access: use your PC IP on port ${PORT} (e.g. http://192.168.x.x:${PORT})`);
});
