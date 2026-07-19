const feedbackForm = document.getElementById("feedbackForm");

const stallSelect = document.getElementById("stallID");
const ratingInput = document.getElementById("fbkRating");
const commentInput = document.getElementById("fbkComment");

const stars = document.querySelectorAll(".star");

const ratingText = document.getElementById("ratingText");
const characterCount = document.getElementById("characterCount");

const stallError = document.getElementById("stallError");
const ratingError = document.getElementById("ratingError");
const formMessage = document.getElementById("formMessage");

/*
    Star rating
*/
stars.forEach((star) => {
    star.addEventListener("click", () => {
        const selectedRating = Number(star.dataset.rating);

        ratingInput.value = selectedRating;

        ratingText.textContent =
            `${selectedRating} out of 5 stars selected`;

        stars.forEach((currentStar) => {
            const currentRating =
                Number(currentStar.dataset.rating);

            if (currentRating <= selectedRating) {
                currentStar.classList.add("selected");
            } else {
                currentStar.classList.remove("selected");
            }
        });

        ratingError.textContent = "";
    });
});

/*
    Comment character counter
*/
commentInput.addEventListener("input", () => {
    const currentLength = commentInput.value.length;

    characterCount.textContent =
        `${currentLength} / 200`;
});

/*
    Clear stall error after selecting a stall
*/
stallSelect.addEventListener("change", () => {
    if (stallSelect.value) {
        stallError.textContent = "";
    }
});

/*
    Submit feedback form
*/
feedbackForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearMessages();

    const stallID = stallSelect.value;
    const fbkRating = Number(ratingInput.value);
    const fbkComment = commentInput.value.trim();

    let isValid = true;

    if (!stallID) {
        stallError.textContent = "Please select a food stall.";
        isValid = false;
    }

    if (!fbkRating) {
        ratingError.textContent = "Please select a rating.";
        isValid = false;
    }

    if (!fbkComment) {
        showMessage("Please enter a comment.", "error");
        isValid = false;
    }

    if (!isValid) {
        return;
    }

    const feedbackData = {
        customerID: "CUS000001",
        stallID: stallID,
        fbkRating: fbkRating,
        fbkComment: fbkComment
    };

    try {
        const response = await fetch("http://localhost:3000/api/feedback", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(feedbackData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Failed to submit feedback."
            );
        }

        showMessage(
            result.message || "Feedback submitted successfully!",
            "success"
        );

        resetForm();

    } catch (error) {
        console.error("Submit feedback error:", error);

        showMessage(
            error.message || "Unable to submit feedback.",
            "error"
        );
    }
});

/*
    Show success or error message
*/
function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
}

/*
    Clear old messages
*/
function clearMessages() {
    stallError.textContent = "";
    ratingError.textContent = "";

    formMessage.textContent = "";
    formMessage.className = "form-message";
}

/*
    Reset form after successful submission
*/
function resetForm() {
    feedbackForm.reset();

    ratingInput.value = "";
    ratingText.textContent = "No rating selected";
    characterCount.textContent = "0 / 200";

    stars.forEach((star) => {
        star.classList.remove("selected");
    });
}