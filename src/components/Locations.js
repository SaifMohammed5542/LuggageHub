import "../../public/ALL CSS/Locations.css"


function Locations() {
    return (
        <>
<section id="list-topics" className="list-topics">
			{/* <div className="container"> */}
				<div className="list-topics-content-loc">
					<h2 className="topper">Our Locations</h2>
					<ul>
						<li>
							<div className="single-list-topics-content-loc">
								<div className="single-list-topics-icon-loc">
									<image src="/images/ezymart (1).jpg" alt="icon" />
								</div>
                                <div className="single-list-topics-text">
								    <h2><a href="#">Melbourne</a></h2>
								    <button>Store here</button>
                                </div>
							</div>
						</li>
						<li>
							<div className="single-list-topics-content-loc">
								<div className="single-list-topics-icon-loc">
									<image src="/images/ezymart (1).jpg" alt="icon" />
								</div>
                                <div className="single-list-topics-text">
								    <h2><a href="#">Sydney</a></h2>
								    <button>Store here</button>
                                </div>
							</div>
						</li>
						<li>
							<div className="single-list-topics-content-loc">
								<div className="single-list-topics-icon-loc">
									<image src="/images/ezymart (1).jpg" alt="icon" />
								</div>
                                <div className="single-list-topics-text">
								    <h2><a href="#">Brisbane</a></h2>
								    <button>Store here</button>
                                </div>
                            </div>
						</li>
						{/* <li>
							<div className="single-list-topics-content">
								<div className="single-list-topics-icon">
									<image src="/images/booking.png" alt="icon" />
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
export default Locations;