"use client";

const LogoutButton = () => {
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    alert("Logged out successfully!");
    window.location.href = "/auth/login"; // Redirect to login page
  };

  return <button onClick={logout}>Logout</button>;
};

export default LogoutButton;
