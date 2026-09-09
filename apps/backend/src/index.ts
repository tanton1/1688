import { app } from "./app.js";
import { ENV } from "./config/env.js";

const server = app.listen(ENV.PORT, () => {
  console.log(`🚀 [1688 Sync Hub Backend] is running at http://localhost:${ENV.PORT}`);
  console.log(`📡 Health check available at http://localhost:${ENV.PORT}/health`);
  console.log(`🔗 API Base: http://localhost:${ENV.PORT}/api/v1`);
});

export default server;
