// Logs the underlying failure server-side and returns a generic JSON body so
// database or provider details never reach the client.
const sendServerError = (res, err) => {
  console.error(err);
  if (res.headersSent) return;
  return res.status(500).json({ message: 'Server error' });
};

module.exports = { sendServerError };
