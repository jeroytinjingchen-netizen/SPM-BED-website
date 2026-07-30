document.addEventListener("DOMContentLoaded", () => {
    const feedbackForm = document.getElementById("feedbackForm");
    const feedbackMessage = document.getElementById("feedbackMessage");
    const submitButton = document.getElementById("feedbackSubmitButton");

    if (!feedbackForm) {
        return;
    }

    feedbackForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        // Get selected stall
        const stallID = document.getElementById("stallID").value;

        const rating = Number(
            document.getElementById("feedbackRating").value
        );

        const comment = document
            .getElementById("feedbackComment")
            .value
            .trim();


        if (!stallID || !rating || !comment) {
            showFeedbackMessage(
                "Please complete all feedback fields.",
                "error"
            );
            return;
        }

        // Get the logged-in customer from the login page
const savedAuth = localStorage.getItem("hawkerhub-auth");

if (!savedAuth) {
    showFeedbackMessage(
        "Please log in before submitting feedback.",
        "error"
    );
    return;
}

const authData = JSON.parse(savedAuth);

const customerID = authData.customer.customerId;
const token = authData.token;

        const feedbackData = {
            customerID,
            stallID,
            fbkRating: rating,
            fbkComment: comment
        };

        try {
            submitButton.disabled = true;
            submitButton.innerHTML = `
                <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                <span>Submitting...</span>
            `;

            const headers = {
                "Content-Type": "application/json"
            };

            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const response = await fetch("/api/feedback", {
                method: "POST",
                headers,
                body: JSON.stringify(feedbackData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    result.error ||
                    "Unable to submit feedback."
                );
            }

            showFeedbackMessage(
                "Feedback submitted successfully!",
                "success"
            );

            feedbackForm.reset();

        } catch (error) {
            console.error("Feedback error:", error);

            showFeedbackMessage(
                error.message || "Unable to submit feedback.",
                "error"
            );

        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = "<span>Submit Feedback</span>";
        }
    });

    function showFeedbackMessage(message, type) {
        feedbackMessage.textContent = message;

        feedbackMessage.classList.remove(
            "show",
            "success",
            "error"
        );

        feedbackMessage.classList.add("show", type);
    }
});