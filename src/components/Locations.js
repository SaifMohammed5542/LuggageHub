"use client"
import { useRouter } from "next/navigation";
import "../../public/ALL CSS/Locations.css"
// import Image from 'next/image';

function Locations() {
	const router = useRouter();
    return (
        <>
<section id="list-topics" className="list-topics-loc">
			{/* <div className="container"> */}
				<div className="list-topics-content-loc">
					<h2 className="topper">Our Locations</h2>
					{/* <p>(Currently We are available at only one Location)</p> */}
					<ul>
						<li>
							<div className="single-list-topics-content-loc">
								{/* <div className="single-list-topics-icon-loc">
									<Image src="/images/ezymart (1).jpg" alt="icon"  width={500} height={300}/>
								</div> */}
                                <div className="single-list-topics-text">
								    <h2><a href="#">EzyMart, <br/>660 Bourke St</a></h2>
								    <button  onClick={() => router.push("/booking-form")}>Store here</button>
                                </div>
							</div>
						</li>
					</ul>

					<ul>
						<li>
							<div className="single-list-topics-content-loc">
								{/* <div className="single-list-topics-icon-loc">
									<Image src="/images/ezymart (1).jpg" alt="icon"  width={500} height={300}/>
								</div> */}
                                <div className="single-list-topics-text">
								    <h2><a href="#">EzyMart, <br/>Southern Cross</a></h2>
								    <button  onClick={() => router.push("/booking-form")}>Store here</button>
                                </div>
							</div>
						</li>
					</ul>
				</div>
				
			{/* </div> */}
		</section>
        </>
    );
};
export default Locations;