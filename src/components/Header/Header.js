// components/Header.js - IMPROVED VERSION WITH ICONS
"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import styles from "./Header.module.css";
import { 
  Home, 
  MapPin, 
  HelpCircle, 
  Package, 
  // Key, 
  // Calendar, 
  BookOpen, 
  LayoutDashboard 
} from "lucide-react";

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

  // ✅ IMPROVED: Active link checker
  const isActive = (path) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
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

          {/* Logo */}
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
                <Link 
                  href="/" 
                  onClick={closeMenu}
                  className={isActive("/") ? styles.active : ""}
                >
                  <Home size={20} />
                  <span>Home</span>
                </Link>
              </li>

              <li>
                <Link 
                  href="/map-booking" 
                  onClick={closeMenu}
                  className={isActive("/map-booking") ? styles.active : ""}
                >
                  <MapPin size={20} />
                  <span>Find Storage</span>
                </Link>
              </li>

              <li>
                <a
                  href="#how-it-works"
                  onClick={(e) => {
                    e.preventDefault();
                    goToSection("how-it-works", scrollTohowItWorks);
                  }}
                  className={pathname === "/" && window.location.hash === "#how-it-works" ? styles.active : ""}
                >
                  <HelpCircle size={20} />
                  <span>How it Works</span>
                </a>
              </li>

              <li>
                <a
                  href="#services"
                  onClick={(e) => {
                    e.preventDefault();
                    goToSection("services", scrollToServices);
                  }}
                  className={pathname === "/" && window.location.hash === "#services" ? styles.active : ""}
                >
                  <Package size={20} />
                  <span>Services</span>
                </a>
              </li>

              {/* <li>
                <Link 
                  href="/key-handover" 
                  onClick={closeMenu}
                  className={isActive("/key-handover") ? styles.active : ""}
                >
                  <Key size={20} />
                  <span>Key Handover</span>
                </Link>
              </li> */}

              {/* <li className={styles.bookNowLink}>
                <Link 
                  href="/booking-form" 
                  onClick={closeMenu}
                  className={isActive("/booking-form") ? styles.active : ""}
                >
                  <Calendar size={20} />
                  <span>Book Now</span>
                </Link>
              </li> */}

              <li>
                <Link 
                  href="/blog" 
                  onClick={closeMenu}
                  className={isActive("/blog") ? styles.active : ""}
                >
                  <BookOpen size={20} />
                  <span>Blog</span>
                </Link>
              </li>

              {userRole === "admin" && (
                <li>
                  <Link 
                    href="/admin/dashboard" 
                    onClick={closeMenu}
                    className={isActive("/admin/dashboard") ? styles.active : ""}
                  >
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                  </Link>
                </li>
              )}

              {userRole === "partner" && (
                <li>
                  <Link 
                    href="/partner/dashboard" 
                    onClick={closeMenu}
                    className={isActive("/partner/dashboard") ? styles.active : ""}
                  >
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                  </Link>
                </li>
              )}
            </ul>

            {/* Auth section */}
            <div className={styles.menuExtras}>
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
                <Link href="/auth/login" className={styles.loginBtn} onClick={closeMenu}>
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