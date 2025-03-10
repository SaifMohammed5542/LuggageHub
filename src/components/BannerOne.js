"use client"
// import { useRouter } from "next/navigation";
// import "../../public/ALL CSS/BannerOne.css"
// import FindLocHere from '../components/FindLocHere.js' 
// import "../../public/images/pexels-vlada-karpovich-7368312.jpg"
// import "../../public/ALL CSS/Locate.css"
// import Locate from "../components/Locate.js"
// import Image from 'next/image';



// function BannerOne() {
// 	const router = useRouter();
//     return (
//         <>
//         <section id="home" className="welcome-hero">
// 			<div className="hero-container">
// 				<div className="welcome-hero-txt">
// 					<h2>Where your <span>luggage</span> rests,<br/> so you can roam</h2>
// 					<p>
// 						Convenient, secure, and affordable luggage storage, 
// 						so you can explore freely without the burden of heavy bags. Book your spot in seconds and enjoy a hassle-free journey!
// 					</p>
// 					<button className="welcome-btn" onClick={() => router.push("/booking-form")}>Book Now!</button>
// 					{/* <FindLocHere destination={"EzyMart, Melbourne"} /> */}
// 				</div>
// 				<div className="welcome-hero-img">
// 					<Image src="/images/suit.jpg" alt="welcome-hero-img"  width={500} height={300}/>
// 				</div>
// 				{/* <div className="Locate">
//             		<button onClick={() => router.push("/Location") }>Find the nearest Storage!</button>
//         		</div> */}
// 			</div>
// 		</section>
//         </>
//     );
// };
// export default BannerOne;

/**cherck */

// "use client"
// import { useRouter } from "next/navigation";
// import Image from 'next/image';
// import "../../public/ALL CSS/BannerOne.css";

// function BannerOne() {
//     const router = useRouter();
//     return (
//         <section id="home" className="hero">
//             <div className="hero-content">
//                 <div className="text-content">
//                     <h2>Discover Stress-Free Luggage Storage</h2>
//                     <p>
//                         Convenient, secure, and affordable luggage storage, so you can roam freely. 
//                         Book a spot with ease and enjoy your journey unburdened.
//                     </p>
//                     <button className="cta-btn" onClick={() => router.push("/booking-form")}>Book Now!</button>
//                 </div>
//                 <div className="image-content">
//                     <Image src="/images/suit.jpg" alt="luggage storage" width={500} height={300} />
//                 </div>
//             </div>
//         </section>
//     );
// }

// export default BannerOne;


"use client";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import FindLocHere from "../components/FindLocHere";
import "../../public/ALL CSS/BannerOne.css";

function BannerOne() {
    const router = useRouter();
    return (
        <section id="home" className="hero">
            <div className="hero-content">
                <div className="text-content">
                    <h2>Travel Light, Store Right!</h2>
                    <p>
                        Low-Cost, High-Security Luggage Solutions
                    </p>
                    <button className="cta-btn neon-glow" onClick={() => router.push("/booking-form")}>Book Now!</button>
                    <FindLocHere destination={"EzyMArt, Melbourne"} />
                </div>
                <div className="image-content">
                    <Image src="/images/night.jpg" alt="luggage storage" width={500} height={300} className="glowing-image" />
                </div>
            </div>
        </section>
    );
}

export default BannerOne;
