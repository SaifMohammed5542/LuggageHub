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
                    <h2>Be Hands-free with your Luggage in just <br/>3 taps!</h2>
                    <p>
                        Let us Handle your burden
                    </p>
                    <button className="welcome-btn" onClick={() => router.push("/booking-form")}>Book Now!</button>
                </div>
                <div className="welcome-hero-img">
                    <Image src="/images/phone.jpg" alt="welcome-hero-img"  width={500} height={300}/>
                </div>
            </div>
        </section>
        </>
    );
};
export default BannerOne;