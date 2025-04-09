// "use client"
// import { useRouter } from "next/navigation";
// import "../../public/ALL CSS/BannerOne.css"
// import "../../public/images/pexels-vlada-karpovich-7368312.jpg"
// import Image from 'next/image';



// function BannerOne() {
//     const router = useRouter();
//     return (
//         <>
//         <section id="home" className="welcome-hero">
//             <div className="hero-container">
//                 <div className="welcome-hero-txt">
//                     <h2>Be Hands-free with your Luggage in just <br/>3 taps!</h2>
//                     <p>
//                         Let us Handle your burden
//                     </p>
//                     <button className="welcome-btn" onClick={() => router.push("/booking-form")}>Book Now!</button>
//                 </div>
//                 <div className="welcome-hero-img">
//                     <Image src="/images/phone.jpg" alt="welcome-hero-img"  width={500} height={300}/>
//                 </div>
//             </div>
//         </section>
//         </>
//     );
// };
// export default BannerOne;


"use client";
import { useRouter } from "next/navigation";
import Image from 'next/image';
// import FindLocHere from "../components/FindLocHere";
import "../../public/ALL CSS/BannerTwo.css";

function BannerTwo() {
    const router = useRouter();
    return (
        <section id="home" className="hero">
            <div className="hero-content">
                <div className="text-content">
                    <h2>Be Hands-free with your Luggage in just 3 taps!</h2>
                    <p>
                        Let us Handle your burden
                    </p>
                    <button className="cta-btn neon-glow" onClick={() => router.push("/booking-form")}>Book Now!</button>
                    {/* <FindLocHere destination={"EzyMArt, Melbourne"} /> */}
                </div>
                <div className="image-content">
                    <Image src="/images/night.jpg" alt="luggage storage" width={500} height={300} className="glowing-image" />
                </div>
            </div>
        </section>
    );
}

export default BannerTwo;