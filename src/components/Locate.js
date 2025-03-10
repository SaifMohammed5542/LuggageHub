import { useRouter } from "next/router";
import "../../public/ALL CSS/Locate.css"

function Locate() {
    const router = useRouter();
    return (
        <>
        <div className="Locate">
            <button onClick={() => router.push("/Location") }>Find the nearest Storage!</button>
        </div>
        </>
    );
}
export default Locate;