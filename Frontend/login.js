document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const errorMsg = document.getElementById("error-msg");

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault(); 

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetch("http://localhost:1001/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (data.status === "success") {
                localStorage.setItem("lms_user", JSON.stringify(data.user));
                window.location.href = "Dashboard.html";
            } else {
                errorMsg.textContent = data.message || "Invalid credentials. Please try again.";
            }
        } catch (error) {
            console.error("Login error:", error);
            errorMsg.textContent = "Server error. Is your backend running on port 1001?";
        }
    });
});

// === ADDED: GOOGLE SIGN-IN HANDLER ===
async function handleGoogleLogin(response) {
    const errorMsg = document.getElementById("error-msg");

    try {
        const res = await fetch("http://localhost:1001/api/google-login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ idToken: response.credential }),
        });

        const data = await res.json();

        if (data.status === "success") {
            localStorage.setItem("lms_user", JSON.stringify(data.user));
            window.location.href = "Dashboard.html";
        } else {
            errorMsg.textContent = data.message || "Google login failed. Please try again.";
        }
    } catch (error) {
        console.error("Google Login error:", error);
        errorMsg.textContent = "Server error during Google login.";
    }
}