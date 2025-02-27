"use client"
import { useRouter } from "next/navigation";
import "../../public/ALL CSS/BannerOne.css"
import "../../public/images/pexels-vlada-karpovich-7368312.jpg"
import Image from 'next/image';



function BannerOne() {
	const router = useRouter();
    return (
        <>
        <section id="home" className="welcome-hero">
			<div className="hero-container">
				<div className="welcome-hero-txt">
					<h2>Where your <span>luggage</span> rests,<br/> so you can roam</h2>
					<p>
						Convenient, secure, and affordable luggage storage, 
						so you can explore freely without the burden of heavy bags. Book your spot in seconds and enjoy a hassle-free journey!
					</p>
					<button className="welcome-btn" onClick={() => router.push("/booking-form")}>Book Now!</button>
				</div>
				<div className="welcome-hero-img">
					<Image src="/images/suit.jpg" alt="welcome-hero-img"  width={500} height={300}/>
				</div>
			</div>
		</section>
        </>
    );
};
export default BannerOne;