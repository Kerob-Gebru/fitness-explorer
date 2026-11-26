import express from "express";
import authRoutes from "./authRoutes.js";
import exerciseRoutes from "./exerciseRoutes.js";
import userStateRoutes from "./userStateRoutes.js";

const apiRouter = express.Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/exercises", exerciseRoutes);
apiRouter.use("/user-state", userStateRoutes);

apiRouter.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Fitness Explorer API is running!",
    timestamp: new Date().toISOString(),
  });
});

export default apiRouter;
