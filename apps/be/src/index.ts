import cors from "cors";
import express from "express";
import routes from "./routes/index.js";
import { startFloodWorker } from "./workers/flood-worker.js";

const app = express();
const PORT = process.env.PORT || 8000;

// Cookies must be allowed through CORS, otherwise the browser drops
// Set-Cookie on responses from another origin (the dev frontend).
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/api/v1", routes);

app.get("/", (req, res) => {
  res.json({ message: "Server is running" });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  startFloodWorker();
});
