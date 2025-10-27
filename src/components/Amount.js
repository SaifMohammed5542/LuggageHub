import '../../public/ALL CSS/Amount.css'
const Amount = () => {
    return (
<div className="pricing-component">
  <div className="pricing-header">
    <h3>Pricing</h3>
    <p>Affordable and Transparent</p>
  </div>
  <div className="pricing-details">
    <h3>For Luggage 🧳</h3>
    <div className="price-item">
      <span className="price">7.99 AUD</span>
      <span className="per">per bag / per day</span>
    </div>
    <p className="note">No hidden fees. Secure and hassle-free!</p>
  </div>
      <br/>
  <div className="pricing-details">
    <h3>For Key-handovers 🔑</h3>
    <div className="price-item">
      <span className="price">9.99 AUD</span>
      <span className="per">per day</span>
    </div>
    <p className="note">No hidden fees. Secure and hassle-free!</p>
  </div>
</div>
    )
}
export default Amount;