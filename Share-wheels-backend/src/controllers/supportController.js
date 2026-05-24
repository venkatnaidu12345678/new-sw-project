const supportBotService = require("../services/supportBotService");

const handle = async (res, fn) => {
  try {
    const result = await fn();
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  getContext: async (req, res) => handle(res, () => supportBotService.getContext(req.user)),
  chat: async (req, res) => handle(res, () => supportBotService.chat(req.user, req.body)),
  getSnapshot: async (req, res) => {
    const { buildFullUserSnapshot } = require("../services/supportDataRepository");
    return handle(res, async () => {
      const snap = await buildFullUserSnapshot(req.user._id);
      if (!snap) return { status: 404, body: { success: false, message: "User not found" } };
      return { status: 200, body: { success: true, snapshot: snap } };
    });
  },
};
