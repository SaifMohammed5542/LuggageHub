import React from "react";
import "../../public/ALL CSS/DumMap.css"; // Import the CSS file

const DumMap = () => {
  return (
    <div className="mapouter">
      <div className="gmap_canvas">
        <iframe
          className="gmap_iframe"
          title="Google Map"
          frameBorder="0"
          scrolling="no"
          marginHeight="0"
          marginWidth="0"
          src="https://maps.google.com/maps?width=600&amp;height=400&amp;hl=en&amp;q=-37.8166345,144.9543877&amp;t=&amp;z=14&amp;ie=UTF8&amp;iwloc=B&amp;output=embed"
        ></iframe>
      </div>
      <a href="https://sprunkin.com/">Sprunki Phases</a>
    </div>
  );
};

export default DumMap;
