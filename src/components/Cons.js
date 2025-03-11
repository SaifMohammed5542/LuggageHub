import { useState } from "react";
import '../../public/ALL CSS/Cons.css'

const ConBanner = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleSection = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const sections = [
    { title: "Guaranteed Security", content: "Your luggage is securely stored with round-the-clock surveillance." },
    { title: "One Rate for All Sizes", content: "Fixed Rate for All Bag Sizes – No Additional Fees." },
    { title: "No Hourly Charges", content: "One-Time Payment for All-Day Storage." },
    { title: "24/7 Support", content: "We are available 24/7 to assist you." },
  ];

  return (
    <div className="banner-container">
      <h2 className="banner-title">Effortless Luggage Storage – Book Instantly</h2>
      <div className="accordion">
        {sections.map((section, index) => (
          <div key={index} className="accordion-item">
            <div className="accordion-header" onClick={() => toggleSection(index)}>
              <strong>{section.title}</strong>
              <span className="icon">{openIndex === index ? "−" : "+"}</span>
            </div>
            {openIndex === index && <p className="accordion-content">{section.content}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConBanner;
