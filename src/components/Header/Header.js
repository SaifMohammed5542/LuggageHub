// Header.jsx
"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import styles from "./Header.module.css";

export default function Header({ scrollToServices, scrollTohowItWorks }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [username, setUsername] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [theme, setTheme] = useState(null); // 'light' | 'dark'
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedUser = localStorage.getItem("username");
    const storedRole = localStorage.getItem("role");
    setUsername(storedUser);
    setUserRole(storedRole);

    // theme init: prefer stored, else system preference
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      applyTheme(storedTheme);
    } else if (typeof window !== "undefined") {
      const prefersDark =
        window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyTheme(prefersDark ? "dark" : "light");
    }
  }, []);

  // Close menu when clicking outside + body scroll lock
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isMenuOpen &&
        !event.target.closest(`.${styles.menu}`) &&
        !event.target.closest(`.${styles.hamburger}`)
      ) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("click", handleClickOutside);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const applyTheme = (t) => {
    const root = document.documentElement;
    if (t === "dark") {
      root.setAttribute("data-theme", "dark");
      setTheme("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.removeAttribute("data-theme");
      setTheme("light");
      localStorage.setItem("theme", "light");
    }
  };

  const toggleTheme = () => applyTheme(theme === "dark" ? "light" : "dark");

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    setUsername(null);
    setUserRole(null);
    router.push("/auth/login");
  };

  // Universal navigation-to-section helper:
  // If on home page, call the scroll function directly.
  // If on any other page, navigate to home with a hash (/#section)
  // — the home page should detect the hash and scroll on mount.
  const goToSection = (hashName, scrollFunction) => {
    setIsMenuOpen(false);
    if (pathname === "/") {
      // Already on home -> just call the passed scroll function (if given)
      if (typeof scrollFunction === "function") {
        scrollFunction();
      } else {
        // fallback to anchor scroll if either function is missing
        const el = document.getElementById(hashName);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    // Not on home -> navigate to home with hash
    // using router.push to avoid full reload
    router.push(`/#${hashName}`);
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      {/* Overlay for mobile menu */}
      {isMenuOpen && <div className={styles.overlay} onClick={closeMenu} />}

      <nav className={styles.nav}>
        <div className={styles.wrapper}>
          {/* Hamburger - Mobile Only */}
          <button
            className={styles.hamburger}
            onClick={toggleMenu}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            type="button"
          >
            <span className={`${styles.bar} ${isMenuOpen ? styles.open : ""}`} />
            <span className={`${styles.bar} ${isMenuOpen ? styles.open : ""}`} />
            <span className={`${styles.bar} ${isMenuOpen ? styles.open : ""}`} />
          </button>

          {/* Logo */}
          <div className={styles.logo}>
            <Link href="/" onClick={closeMenu}>
              <Image
      src="/images/NewLogoDark.png"
      alt="Logo Light"
      width={500}
      height={300}
      priority
      className={styles.logoLight}
    />
    <Image
      src="/images/NewLogo.png"
      alt="Logo Dark"
      width={500}
      height={300}
      priority
      className={styles.logoDark}
    />
            </Link>
          </div>

          {/* Navigation Menu */}
          <div className={`${styles.menu} ${isMenuOpen ? styles.open : ""}`}>
            <ul>
              <li>
                <Link href="/" onClick={closeMenu}>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/blog" onClick={closeMenu}>
                  Blogs
                </Link>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  onClick={(e) => {
                    e.preventDefault();
                    goToSection("how-it-works", scrollTohowItWorks);
                  }}
                >
                  How it Works
                </a>
              </li>
              <li>
                <a
                  href="#services"
                  onClick={(e) => {
                    e.preventDefault();
                    goToSection("services", scrollToServices);
                  }}
                >
                  Services
                </a>
              </li>

              {userRole === "admin" && (
                <li>
                  <Link href="/admin/dashboard" onClick={closeMenu}>
                    Dashboard
                  </Link>
                </li>
              )}
              {userRole === "partner" && (
                <li>
                  <Link href="/partner/dashboard" onClick={closeMenu}>
                    Dashboard
                  </Link>
                </li>
              )}
            </ul>

            {/* Auth + Theme Toggle inside Menu */}
            <div className={styles.menuExtras}>
              <button
                type="button"
                className={styles.themeToggle}
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                )}
              </button>

              {username ? (
                <>
                  <div className={styles.userInfo}>
                    <span className={styles.username}>Welcome, {username}</span>
                  </div>
                  <button className={styles.logoutBtn} onClick={handleLogout}>
                    Logout
                  </button>
                </>
              ) : (
                <Link href="/auth/login" className={styles.loginBtn}>
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
