import "../../public/ALL CSS/Cards2.css"


function Cards2() {
    return (
        <>
<section id="list-topics" className="list-topics">
			{/* <div className="container"> */}
				<div className="list-topics-content">
					<h2 className="topper">How it Works</h2>
					<ul>
						<li>
							<div className="single-list-topics-content">
								<div className="single-list-topics-icon">
									<img src="/images/smartphone.png" alt="icon" />
								</div>
                                <div className="single-list-topics-text">
								    <h2><a href="#">Book online or on the app</a></h2>
								    <p>Get the app and choose a convenient location.
                                         Your bag protection is activated upon booking online.</p>
                                </div>
							</div>
						</li>
						<li>
							<div className="single-list-topics-content">
								<div className="single-list-topics-icon">
									<img src="/images/luggage (2).png" alt="icon" />
								</div>
                                <div className="single-list-topics-text">
								    <h2><a href="#">Head to the store</a></h2>
								    <p>Drop off your bags by showing your confirmation to a store employee.</p>
                                </div>
							</div>
						</li>
						<li>
							<div className="single-list-topics-content">
								<div className="single-list-topics-icon">
									<img src="/images/enjoy.png" alt="icon" />
								</div>
                                <div className="single-list-topics-text">
								    <h2><a href="#">Enjoy the day</a></h2>
								    <p>Make the most out of your day, 
                                        then show your confirmation to pick up your stuff.</p>
                                </div>
                            </div>
						</li>
						{/* <li>
							<div className="single-list-topics-content">
								<div className="single-list-topics-icon">
									<img src="/images/booking.png" alt="icon" />
								</div>
                                <div className="single-list-topics-text">
								    <h2><a href="#">Easy Online Booking</a></h2>
								    <p>Reserve your luggage storage space in seconds.</p>
                                </div>
                            </div>
						</li> */}
					</ul>
				</div>
			{/* </div> */}
		</section>
        </>
    );
};
export default Cards2;