async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("errorMsg");

  errorMsg.textContent = "";

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    console.log("LOGIN RESPONSE:", data);

    if (!res.ok) {
      throw new Error(data.message || "Login gagal");
    }

    window.location.href = "/admin";
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    errorMsg.textContent = err.message || "Username atau password salah";
  }
}