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

  const router = useRouter();
  const pathname = usePathname();

  /* ===== USER INIT ===== */
  useEffect(() => {
    const storedUser = localStorage.getItem("username");
    const storedRole = localStorage.getItem("role");
    setUsername(storedUser);
    setUserRole(storedRole);

    // Ensure any old theme value is wiped (optional safety)
    localStorage.removeItem("theme");
  }, []);

  /* ===== MOBILE MENU OUTSIDE CLICK + SCROLL LOCK ===== */
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

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    setUsername(null);
    setUserRole(null);
    router.push("/auth/login");
  };

  /* ===== NAVIGATION TO SECTION HELPER ===== */
  const goToSection = (hashName, scrollFunction) => {
    setIsMenuOpen(false);

    if (pathname === "/") {
      if (typeof scrollFunction === "function") {
        scrollFunction();
      } else {
        const el = document.getElementById(hashName);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    router.push(`/#${hashName}`);
  };

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

          {/* Logo — Dark Only */}
          <div className={styles.logo}>
            <Link href="/" onClick={closeMenu}>
              <Image
                src="/images/NewLogo.png"
                alt="Luggage Terminal"
                width={500}
                height={300}
                priority
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

            {/* Auth section (no theme toggle anymore) */}
            <div className={styles.menuExtras}>
              {username ? (
                <>
                  <div className={styles.userInfo}>
                    <span className={styles.username}>
                      Welcome, {username}
                    </span>
                  </div>
                  <button
                    className={styles.logoutBtn}
                    onClick={handleLogout}
                  >
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
