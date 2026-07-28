// controllers/feedbackController.js

const feedbackModel = require("../models/feedbackModel");

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

async function updateFeedback(req, res) {
  try {
    const { fbkID } = req.params;
    const { fbkComment, fbkRating } = req.body;

    if (!fbkID) {
      return res.status(400).json({ message: "fbkID is required." });
    }

    if (fbkRating !== undefined) {
      const rating = Number(fbkRating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "fbkRating must be between 1 and 5." });
      }
    }

    const updatedFeedback = await feedbackModel.updateFeedback(fbkID, {
      fbkComment: typeof fbkComment === "string" ? fbkComment.trim() : fbkComment,
      fbkRating: fbkRating !== undefined ? Number(fbkRating) : undefined
    });

    if (!updatedFeedback) {
      return res.status(404).json({ message: "Feedback not found." });
    }

    return res.status(200).json({
      message: "Feedback updated successfully.",
      feedback: updatedFeedback
    });
  } catch (error) {
    console.error("Update feedback error:", error);
    return res.status(500).json({ message: "Unable to update feedback.", error: error.message });
  }
}

async function deleteFeedback(req, res) {
  try {
    const { fbkID } = req.params;

    if (!fbkID) {
      return res.status(400).json({ message: "fbkID is required." });
    }

    const deleted = await feedbackModel.deleteFeedback(fbkID);

    if (!deleted) {
      return res.status(404).json({ message: "Feedback not found." });
    }

    return res.status(200).json({ message: "Feedback deleted successfully." });
  } catch (error) {
    console.error("Delete feedback error:", error);
    return res.status(500).json({ message: "Unable to delete feedback.", error: error.message });
  }
}

module.exports = {
  getAllFeedback,
  createFeedback,
  updateFeedback,
  deleteFeedback
};