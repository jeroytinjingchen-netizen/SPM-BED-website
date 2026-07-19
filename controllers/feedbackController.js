// controllers/feedbackController.js

const feedbackModel = require("../models/feedbackModel");
console.log("Feedback model exports:", feedbackModel);

// GET /api/feedback
async function getAllFeedback(req, res) {
  try {
    const feedback = await feedbackModel.getAllFeedback();

    return res.status(200).json({
      message: "Feedback retrieved successfully.",
      totalFeedback: feedback.length,
      feedback
    });
  } catch (error) {
    console.error("Get all feedback error:", error);

    return res.status(500).json({
      message: "Unable to retrieve feedback.",
      error: error.message
    });
  }
}

// POST /api/feedback
async function createFeedback(req, res) {
  try {
    const {
      fbkComment,
      fbkRating,
      customerID,
      stallID
    } = req.body;

    if (!customerID || !stallID || fbkRating === undefined) {
      return res.status(400).json({
        message:
          "customerID, stallID and fbkRating are required."
      });
    }

    const rating = Number(fbkRating);

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return res.status(400).json({
        message: "fbkRating must be between 1 and 5."
      });
    }

    const newFeedback = await feedbackModel.createFeedback({
      fbkComment:
        typeof fbkComment === "string"
          ? fbkComment.trim()
          : null,
      fbkRating: rating,
      customerID,
      stallID
    });

    return res.status(201).json({
      message: "Feedback created successfully.",
      feedback: newFeedback
    });
  } catch (error) {
    console.error("Create feedback error:", error);

    return res.status(500).json({
      message: "Unable to create feedback.",
      error: error.message
    });
  }
}

module.exports = {
  getAllFeedback,
  createFeedback
};