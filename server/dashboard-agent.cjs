// Keep the Node backend compatible with the shared ESM handler used by Vercel.
function createDashboardAgent(options) {
  return async (body) => {
    const module = await import('../shared/dashboard-agent.mjs');
    return module.createDashboardAgent(options)(body);
  };
}
module.exports = { createDashboardAgent };
