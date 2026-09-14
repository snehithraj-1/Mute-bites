export default async function handler(req, res) {
  return res.status(404).json({
    success: false,
    error: 'Delivery partner system has been simplified and removed from CampusBites.'
  });
}
