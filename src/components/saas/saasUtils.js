export const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

// sessionStorage key holding the login details between sign-up and the welcome screen
export const WELCOME_KEY = "khanakWelcome";
