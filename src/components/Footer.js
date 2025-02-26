import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{ background: "#222", color: "#fff", padding: "20px 0", textAlign: "center" }}>
      <div>
        <p>© 2025 MyBaggageApp. All Rights Reserved.</p>
        <nav>
          <Link href="/about">About Us</Link> | 
          <Link href="/pricing">Pricing</Link> | 
          <Link href="/faq">FAQs</Link> | 
          <Link href="/contact">Contact</Link>
        </nav>
        <p>Follow us: 
          <a href="https://facebook.com" target="_blank"> Facebook</a> | 
          <a href="https://twitter.com" target="_blank"> Twitter</a>
        </p>
      </div>
    </footer>
  );
}
