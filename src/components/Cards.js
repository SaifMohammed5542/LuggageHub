// import "../../public/ALL CSS/Cards.css"


// function Cards() {
//     return (
//         <>
// <section id="list-topics" className="list-topics">
// 			{/* <div className="container"> */}
// 				<div className="list-topics-content1" >
// 					<div className="list-cards">
// 					<ul>
// 					<h2 className="topper">Our Top Services</h2>
// 						<li>
// 							<div className="single-list-topics-content1">
// 								<div className="single-list-topics-icon1">
// 									<img src="/images/suitcase.png" alt="icon" />
// 								</div>
//                                 <div className="single-list-topics-text1">
// 								    <h2><a href="#">Short-Term Storage</a></h2>
// 								    <p>Convenient storage for a few hours or a day.</p>
//                                 </div>
// 							</div>
// 						</li>
// 						<li>
// 							<div className="single-list-topics-content1">
// 								<div className="single-list-topics-icon1">
// 									<img src="/images/luggage.png" alt="icon" />
// 								</div>
//                                 <div className="single-list-topics-text1">
// 								    <h2><a href="#">Secure Lockers</a></h2>
// 								    <p>Keep your belongings safe with our secure lockers.</p>
//                                 </div>
// 							</div>
// 						</li>
// 						<li>
// 							<div className="single-list-topics-content1">
// 								<div className="single-list-topics-icon1">
// 									<img src="/images/travel-luggage (1).png" alt="icon" />
// 								</div>
//                                 <div className="single-list-topics-text1">
// 								    <h2><a href="#">Long-Term Storage</a></h2>
// 								    <p>Store your luggage for days or weeks hassle-free.</p>
//                                 </div>
//                             </div>
// 						</li>
// 						<li>
// 							<div className="single-list-topics-content1">
// 								<div className="single-list-topics-icon1">
// 									<img src="/images/booking.png" alt="icon" />
// 								</div>
//                                 <div className="single-list-topics-text1">
// 								    <h2><a href="#">Easy Online Booking</a></h2>
// 								    <p>Reserve your luggage storage space in seconds.</p>
//                                 </div>
//                             </div>
// 						</li>
// 					</ul>
// 					</div>
// 					<div className="list-image">
// 						<img src="/images/ban.jpg" alt="cards-image" />
// 					</div>
// 				</div>
// 		</section>
//         </>
//     );
// };
// export default Cards;

import React from "react";
import Image from 'next/image';
import "../../public/ALL CSS/Cards.css";

function Cards({ servicesRef }) {
  return (
    <section ref={servicesRef} id="list-topics" className="list-topics1">
      <div className="list-topics-content1" >
 					<div className="list-cards">
 					<ul>
 					<h2 className="topper">Our Top Services</h2>
 						<li>
							<div className="single-list-topics-content1">
 								<div className="single-list-topics-icon1">
 									<Image src="/images/suitcase.png" alt="icon"  width={500} height={300}/>
 								</div>
                                 <div className="single-list-topics-text1">
 								    <h2><a href="#">Short-Term Storage</a></h2>
 								    <p>Convenient storage for a few hours or a day.</p>
                                 </div>
 							</div>
 						</li>
 						<li>
 							<div className="single-list-topics-content1">
 								<div className="single-list-topics-icon1">
 									<Image src="/images/luggage.png" alt="icon"  width={500} height={300}/>
 								</div>
                                 <div className="single-list-topics-text1">
 								    <h2><a href="#">Secure Lockers</a></h2>
 								    <p>Keep your belongings safe with our secure lockers.</p>
                                 </div>
 							</div>
 						</li>
 						<li>
 							<div className="single-list-topics-content1">
 								<div className="single-list-topics-icon1">
 									<Image src="/images/travel-luggage (1).png" alt="icon"  width={500} height={300}/>
 								</div>
                                 <div className="single-list-topics-text1">
 								    <h2><a href="#">Long-Term Storage</a></h2>
 								    <p>Store your luggage for days or weeks hassle-free.</p>
                                 </div>
                             </div>
 						</li>
 						<li>
 							<div className="single-list-topics-content1">
 								<div className="single-list-topics-icon1">
 									<Image src="/images/booking.png" alt="icon"  width={500} height={300}/>
 								</div>
                                <div className="single-list-topics-text1">
 								    <h2><a href="#">Easy Online Booking</a></h2>
 								    <p>Reserve your luggage storage space in seconds.</p>
								</div>
                             </div>
 						</li>
 					</ul>
 					</div>
					<div className="list-image" >
 						<Image src="/images/air.jpg" alt="cards-image"  width={500} height={300}/>
 					</div>
 				</div>
    </section>
  );
}

export default Cards;
