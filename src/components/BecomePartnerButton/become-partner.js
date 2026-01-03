import styles from "./BecomePartnerButton.module.css";

export default function BecomePartnerButton() {
  return (
    <div className={styles.container}>
      <a href="/become-a-partner" className={styles.button}>
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 20 20" 
          fill="none"
          className={styles.icon}
        >
          <path 
            d="M10 2L12.5 7L18 8L14 12L15 17.5L10 14.5L5 17.5L6 12L2 8L7.5 7L10 2Z" 
            fill="currentColor"
            opacity="0.9"
          />
        </svg>
        <span>Become a Partner</span>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 16 16" 
          fill="none"
          className={styles.arrow}
        >
          <path 
            d="M6 12L10 8L6 4" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </div>
  );
}