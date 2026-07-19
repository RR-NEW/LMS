
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