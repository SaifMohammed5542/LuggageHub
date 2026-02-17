// components/Header.js
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
  Handshake,
  BookOpen,
  LayoutDashboard,
  Luggage,
} from "lucide-react";

export default function Header({ scrollToServices, scrollTohowItWorks }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [username, setUsername]     = useState(null);
  const [userRole, setUserRole]     = useState(null);

  const router   = useRouter();
  const pathname = usePathname();

  /* ─── USER INIT ──────────────────────────────────────── */
  useEffect(() => {
    setUsername(localStorage.getItem("username"));
    setUserRole(localStorage.getItem("role"));
    localStorage.removeItem("theme");
  }, []);

  /* ─── MOBILE MENU: outside-click + scroll-lock ───────── */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isMenuOpen &&
        !e.target.closest(`.${styles.menu}`) &&
        !e.target.closest(`.${styles.hamburger}`)
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

  const toggleMenu = () => setIsMenuOpen((p) => !p);
  const closeMenu  = () => setIsMenuOpen(false);

  /* ─── LOGOUT ─────────────────────────────────────────── */
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (err) {
      console.error("Logout API error:", err);
    } finally {
      ["token", "username", "email", "userId", "role"].forEach((k) =>
        localStorage.removeItem(k)
      );
      setUsername(null);
      setUserRole(null);
      router.push("/auth/login");
    }
  };

  /* ─── SECTION SCROLL HELPER ──────────────────────────── */
  const goToSection = (hashName, scrollFn) => {
    setIsMenuOpen(false);
    if (pathname === "/") {
      if (typeof scrollFn === "function") {
        scrollFn();
      } else {
        document.getElementById(hashName)?.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }
    router.push(`/#${hashName}`);
  };

  /* ─── ACTIVE LINK HELPER ─────────────────────────────── */
  const isActive = (path) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  return (
    <>
      {isMenuOpen && <div className={styles.overlay} onClick={closeMenu} />}

      <nav className={styles.nav}>
        <div className={styles.wrapper}>

          {/* Hamburger — left on mobile/tablet */}
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

          {/* Logo — centered on mobile/tablet, left on desktop */}
          <div className={styles.logo}>
            <Link href="/" onClick={closeMenu}>
              <Image
                src="/images/latestLogo.png"
                alt="Luggage Terminal"
                className="LOGO1"
                width={500}
                height={300}
                priority
              />
            </Link>
          </div>

          {/* Nav menu + auth */}
          <div className={`${styles.menu} ${isMenuOpen ? styles.open : ""}`}>
            <ul>
              <li>
                <Link href="/" onClick={closeMenu} className={isActive("/") ? styles.active : ""}>
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
                >
                  <Package size={20} />
                  <span>Services</span>
                </a>
              </li>

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

              <li>
                <Link
                  href="/become-a-partner"
                  onClick={closeMenu}
                  className={isActive("/become-a-partner") ? styles.active : ""}
                >
                  <Handshake size={20} />
                  <span>Become a Partner</span>
                </Link>
              </li>

              {/* ✅ My Bookings — visible to everyone except admin/partner */}
              {userRole !== "admin" && userRole !== "partner" && (
                <li>
                  <Link
                    href="/my-bookings"
                    onClick={closeMenu}
                    className={isActive("/my-bookings") ? styles.active : ""}
                  >
                    <Luggage size={20} />
                    <span>My Bookings</span>
                  </Link>
                </li>
              )}

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

            {/* Auth */}
            <div className={styles.menuExtras}>
              {username ? (
                <>
                  <div className={styles.userInfo}>
                    <span className={styles.username}>👋 {username}</span>
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