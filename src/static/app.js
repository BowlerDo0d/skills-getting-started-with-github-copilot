document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helpers
  function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
 
  function getInitials(nameOrEmail) {
    if (!nameOrEmail) return "?";
    // If it's an email, use the part before @; else use the full string
    const base = nameOrEmail.includes("@") ? nameOrEmail.split("@")[0] : nameOrEmail;
    const parts = base.split(/[^A-Za-z0-9]+/).filter(Boolean);
    if (parts.length === 0) return base.slice(0, 2).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Clear previous options except the placeholder
      while (activitySelect.options.length > 1) {
        activitySelect.remove(1);
      }

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants list markup
        const participantItems = details.participants.length
          ? details.participants
              .map(
                (p) =>
                  `<li><span class="avatar">${getInitials(p)}</span><span class="participant-text">${escapeHtml(p)}</span><button class="participant-delete" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(p)}" title="Remove">\u2716</button></li>`
              )
              .join("")
          : "<li class=\"no-participants\">No participants yet</li>";

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <h5>Participants</h5>
            <ul class="participants-list">
              ${participantItems}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Attach delete handlers for the buttons we just added
        const deleteButtons = activityCard.querySelectorAll(".participant-delete");
        deleteButtons.forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            const activityName = btn.getAttribute("data-activity");
            const email = btn.getAttribute("data-email");
            // optimistic UI: disable button while request runs
            btn.disabled = true;
            try {
              const resp = await fetch(
                `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`,
                { method: "DELETE" }
              );

              if (resp.ok) {
                // refresh activities list
                fetchActivities();
              } else {
                const err = await resp.json().catch(() => ({}));
                console.error("Failed to remove participant", err);
                btn.disabled = false;
                alert(err.detail || "Failed to remove participant");
              }
            } catch (err) {
              console.error("Error removing participant", err);
              btn.disabled = false;
              alert("Network error while removing participant");
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;
    const submitButton = signupForm.querySelector("button[type=submit]");
    submitButton.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so the new participant shows up immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
      submitButton.disabled = false;
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      signupForm.querySelector("button[type=submit]").disabled = false;
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
