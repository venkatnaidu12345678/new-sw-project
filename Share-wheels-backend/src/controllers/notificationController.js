const notificationService = require("../services/notificationService");

const handle = async (res, fn) => {
  try {
    const result = await fn();
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  list: async (req, res) =>
    handle(res, () =>
      notificationService.listForUser(req.user, {
        limit: Number(req.query.limit) || 50,
        skip: Number(req.query.skip) || 0,
      })
    ),
  markRead: async (req, res) =>
    handle(res, () => notificationService.markRead(req.user, req.params.id)),
  markAllRead: async (req, res) =>
    handle(res, () => notificationService.markAllRead(req.user)),
};
