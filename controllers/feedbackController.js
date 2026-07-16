const feedbackModel = require("../models/feedbackModel");

async function createFeedback(req, res) {
  try {
    const {
      fbkID,
      fbkComment,
      fbkRating,
      customerID,
      stallID
    } = req.body;

    if (
      !fbkID ||
      !fbkComment ||
      !fbkRating ||
      !customerID ||
      !stallID
    ) {
      return res.status(400).json({
        message: "All feedback fields are required."
      });
    }

    const rating = Number(fbkRating);

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5."
      });
    }

    const newFeedback =
      await feedbackModel.createFeedback({
        fbkID,
        fbkComment,
        fbkRating: rating,
        customerID,
        stallID
      });

    return res.status(201).json({
      message: "Feedback saved successfully.",
      feedback: newFeedback
    });

  } catch (error) {
    console.error("Create feedback error:", error);

    return res.status(500).json({
      message: "Unable to save feedback.",
      error: error.message
    });
  }
}

module.exports = {
  createFeedback
};