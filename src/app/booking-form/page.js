"use client";
import React, { useState, useEffect } from "react";
import styles from "./Booking.module.css";
import Header from "@/components/Header";
import PayPalPayment from "../../components/LuggagePay.js";

const LuggageBookingForm = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    dropOffDate: "",
    pickUpDate: "",
    luggageCount: 1,
    luggageSize: "Small",
    specialInstructions: "",
    termsAccepted: false,
    stationId: "",
  });

  const [stations, setStations] = useState([]);
  const [isFormValid, setIsFormValid] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [hasSpecialInstructions, setHasSpecialInstructions] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  
  const ratePerLuggagePerDay = 7.99;

  // Auto-fill user data if logged in
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    const storedEmail = localStorage.getItem("email");
    if (storedUsername && storedEmail) {
      setFormData((prev) => ({
        ...prev,
        fullName: storedUsername,
        email: storedEmail,
      }));
      setIsUserLoggedIn(true);
    }
  }, []);

  // Fetch available stations
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/station/list", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setStations(data.stations);
      } catch (error) {
        console.error("Failed to fetch stations:", error);
      }
    };
    fetchStations();
  }, []);

  // Calculate storage duration
  const calculateNumberOfDays = () => {
    if (!formData.dropOffDate || !formData.pickUpDate) return 1;
    const dropOff = new Date(formData.dropOffDate);
    const pickUp = new Date(formData.pickUpDate);
    const differenceInMs = pickUp - dropOff;
    return Math.ceil(differenceInMs / (1000 * 60 * 60 * 24));
  };

  const numberOfDays = calculateNumberOfDays();
  const totalAmount = formData.luggageCount * numberOfDays * ratePerLuggagePerDay;

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const updatedFormData = {
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    };

    // Auto-calculate pickup time when drop-off is selected
    if (name === "dropOffDate" && value) {
      if (!formData.dropOffDate) {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 10);
        const localISOTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        updatedFormData.dropOffDate = `${value.slice(0, 10)}T${localISOTime.split("T")[1]}`;
      }

      const dropOffTime = new Date(updatedFormData.dropOffDate || value);
      dropOffTime.setHours(dropOffTime.getHours() + 4);
      const localPickUpISO = new Date(dropOffTime.getTime() - dropOffTime.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      updatedFormData.pickUpDate = localPickUpISO;
    }

    setFormData(updatedFormData);
  };

  // Validate form
  useEffect(() => {
    const errors = {};
    if (!formData.fullName) errors.fullName = "Full Name is required";
    if (!formData.email) errors.email = "Email is required";
    if (!formData.phone) errors.phone = "Phone is required";
    if (!formData.dropOffDate) errors.dropOffDate = "Drop-off Date is required";
    if (!formData.pickUpDate) errors.pickUpDate = "Pick-up Date is required";
    if (!formData.termsAccepted) errors.termsAccepted = "You must agree to the terms";
    if (!formData.stationId) errors.stationId = "Please select a station";

    if (formData.dropOffDate && formData.pickUpDate) {
      const dropOff = new Date(formData.dropOffDate);
      const pickUp = new Date(formData.pickUpDate);
      const timeDifferenceInHours = (pickUp - dropOff) / (1000 * 60 * 60);
      if (timeDifferenceInHours < 1) {
        errors.pickUpDate = "Pick-up time must be at least 1 hour after drop-off time.";
      }
    }

    setErrors(errors);
    setIsFormValid(Object.keys(errors).length === 0);
  }, [formData]);

  // Handle successful payment
  const handlePaymentSuccess = async (paymentId) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, paymentId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send booking details.");
      }
      const data = await response.json();
      if (data.success) window.location.href = "/Booked";
      else alert("❌ Failed to send booking email.");
    } catch (error) {
      console.error("Error:", error);
      alert(`An error occurred: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const luggageSizes = [
    { value: "Small", label: "Small", icon: "🎒", desc: "Backpack, small bag" },
    { value: "Medium", label: "Medium", icon: "💼", desc: "Carry-on, briefcase" },
    { value: "Large", label: "Large", icon: "🧳", desc: "Standard suitcase" },
    { value: "Extra Large", label: "Extra Large", icon: "📦", desc: "Oversized luggage" },
  ];

  return (
    <>
      <Header />
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          {/* Hero Section */}
          <div className={styles.hero}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>Store Your Luggage</h1>
              <p className={styles.heroSubtitle}>
                Secure, convenient storage at your chosen station
              </p>
            </div>
          </div>

          <div className={styles.contentGrid}>
            {/* Main Form */}
            <div className={styles.formSection}>
              <div className={styles.formCard}>
                {/* Progress Steps */}
                <div className={styles.progressBar}>
                  <div className={`${styles.step} ${currentStep >= 1 ? styles.active : ""}`}>
                    <div className={styles.stepCircle}>1</div>
                    <span className={styles.stepLabel}>Details</span>
                  </div>
                  <div className={styles.stepLine}></div>
                  <div className={`${styles.step} ${currentStep >= 2 ? styles.active : ""}`}>
                    <div className={styles.stepCircle}>2</div>
                    <span className={styles.stepLabel}>Luggage</span>
                  </div>
                  <div className={styles.stepLine}></div>
                  <div className={`${styles.step} ${currentStep >= 3 ? styles.active : ""}`}>
                    <div className={styles.stepCircle}>3</div>
                    <span className={styles.stepLabel}>Payment</span>
                  </div>
                </div>

                <form onSubmit={(e) => e.preventDefault()}>
                  {/* Step 1: Personal Information */}
                  {currentStep === 1 && (
                    <div className={styles.stepContent}>
                      <h2 className={styles.sectionTitle}>Personal Information</h2>
                      
                      <div className={styles.inputGroup}>
                        <label htmlFor="fullName" className={styles.label}>
                          <span className={styles.labelIcon}>👤</span>
                          Full Name
                        </label>
                        <input
                          type="text"
                          id="fullName"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleChange}
                          disabled={isUserLoggedIn}
                          className={styles.input}
                          placeholder="John Doe"
                        />
                        {errors.fullName && <span className={styles.errorText}>{errors.fullName}</span>}
                      </div>

                      <div className={styles.inputRow}>
                        <div className={styles.inputGroup}>
                          <label htmlFor="email" className={styles.label}>
                            <span className={styles.labelIcon}>✉️</span>
                            Email Address
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            disabled={isUserLoggedIn}
                            className={styles.input}
                            placeholder="john@example.com"
                          />
                          {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                        </div>

                        <div className={styles.inputGroup}>
                          <label htmlFor="phone" className={styles.label}>
                            <span className={styles.labelIcon}>📞</span>
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="+1 234 567 8900"
                          />
                          {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
                        </div>
                      </div>

                      <div className={styles.inputGroup}>
                        <label htmlFor="stationId" className={styles.label}>
                          <span className={styles.labelIcon}>📍</span>
                          Storage Station
                        </label>
                        <select
                          id="stationId"
                          name="stationId"
                          value={formData.stationId}
                          onChange={handleChange}
                          className={styles.select}
                        >
                          <option value="">Select a station</option>
                          {stations.map((station) => (
                            <option key={station._id} value={station._id}>
                              {station.name} - {station.location}
                            </option>
                          ))}
                        </select>
                        {errors.stationId && <span className={styles.errorText}>{errors.stationId}</span>}
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className={styles.btnPrimary}
                        disabled={!formData.fullName || !formData.email || !formData.phone || !formData.stationId}
                      >
                        Continue to Luggage Details →
                      </button>
                    </div>
                  )}

                  {/* Step 2: Luggage & Schedule */}
                  {currentStep === 2 && (
                    <div className={styles.stepContent}>
                      <h2 className={styles.sectionTitle}>Luggage & Schedule</h2>

                      <div className={styles.inputGroup}>
                        <label className={styles.label}>
                          <span className={styles.labelIcon}>🧳</span>
                          Luggage Size
                        </label>
                        <div className={styles.sizeGrid}>
                          {luggageSizes.map((size) => (
                            <label
                              key={size.value}
                              className={`${styles.sizeCard} ${
                                formData.luggageSize === size.value ? styles.selected : ""
                              }`}
                            >
                              <input
                                type="radio"
                                name="luggageSize"
                                value={size.value}
                                checked={formData.luggageSize === size.value}
                                onChange={handleChange}
                                className={styles.radioInput}
                              />
                              <div className={styles.sizeIcon}>{size.icon}</div>
                              <div className={styles.sizeName}>{size.label}</div>
                              <div className={styles.sizeDesc}>{size.desc}</div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className={styles.inputGroup}>
                        <label htmlFor="luggageCount" className={styles.label}>
                          <span className={styles.labelIcon}>🎒</span>
                          Number of Bags
                        </label>
                        <div className={styles.counterWrapper}>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                luggageCount: Math.max(1, prev.luggageCount - 1),
                              }))
                            }
                            className={styles.counterBtn}
                          >
                            −
                          </button>
                          <span className={styles.counterValue}>{formData.luggageCount}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                luggageCount: Math.min(10, prev.luggageCount + 1),
                              }))
                            }
                            className={styles.counterBtn}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className={styles.inputRow}>
                        <div className={styles.inputGroup}>
                          <label htmlFor="dropOffDate" className={styles.label}>
                            <span className={styles.labelIcon}>📥</span>
                            Drop-off Time
                          </label>
                          <input
                            type="datetime-local"
                            id="dropOffDate"
                            name="dropOffDate"
                            value={formData.dropOffDate}
                            onChange={handleChange}
                            className={styles.input}
                            min={new Date().toISOString().slice(0, 16)}
                          />
                          {errors.dropOffDate && <span className={styles.errorText}>{errors.dropOffDate}</span>}
                        </div>

                        <div className={styles.inputGroup}>
                          <label htmlFor="pickUpDate" className={styles.label}>
                            <span className={styles.labelIcon}>📤</span>
                            Pick-up Time
                          </label>
                          <input
                            type="datetime-local"
                            id="pickUpDate"
                            name="pickUpDate"
                            value={formData.pickUpDate}
                            onChange={handleChange}
                            className={styles.input}
                            min={
                              formData.dropOffDate
                                ? new Date(new Date(formData.dropOffDate).getTime() + 4 * 60 * 60 * 1000)
                                    .toISOString()
                                    .slice(0, 16)
                                : new Date().toISOString().slice(0, 16)
                            }
                          />
                          {errors.pickUpDate && <span className={styles.errorText}>{errors.pickUpDate}</span>}
                        </div>
                      </div>

                      <div className={styles.checkboxGroup}>
                        <label className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={hasSpecialInstructions}
                            onChange={(e) => setHasSpecialInstructions(e.target.checked)}
                            className={styles.checkbox}
                          />
                          <span>Add special instructions</span>
                        </label>
                      </div>

                      {hasSpecialInstructions && (
                        <div className={styles.inputGroup}>
                          <label htmlFor="specialInstructions" className={styles.label}>
                            <span className={styles.labelIcon}>📝</span>
                            Special Instructions
                          </label>
                          <select
                            id="specialInstructions"
                            name="specialInstructions"
                            value={formData.specialInstructions}
                            onChange={handleChange}
                            className={styles.select}
                          >
                            <option value="">Select an option</option>
                            <option value="Fragile items">Fragile items</option>
                            <option value="Oversized luggage">Oversized luggage</option>
                            <option value="Specific delivery time">Specific delivery time</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      )}

                      <div className={styles.buttonRow}>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className={styles.btnSecondary}
                        >
                          ← Back
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(3)}
                          className={styles.btnPrimary}
                          disabled={!formData.dropOffDate || !formData.pickUpDate}
                        >
                          Continue to Payment →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Review & Payment */}
                  {currentStep === 3 && (
                    <div className={styles.stepContent}>
                      <h2 className={styles.sectionTitle}>Review & Payment</h2>

                      <div className={styles.reviewCard}>
                        <div className={styles.reviewSection}>
                          <h3 className={styles.reviewTitle}>Booking Details</h3>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Name:</span>
                            <span className={styles.reviewValue}>{formData.fullName}</span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Email:</span>
                            <span className={styles.reviewValue}>{formData.email}</span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Phone:</span>
                            <span className={styles.reviewValue}>{formData.phone}</span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Station:</span>
                            <span className={styles.reviewValue}>
                              {stations.find((s) => s._id === formData.stationId)?.name || "N/A"}
                            </span>
                          </div>
                        </div>

                        <div className={styles.reviewSection}>
                          <h3 className={styles.reviewTitle}>Luggage Information</h3>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Size:</span>
                            <span className={styles.reviewValue}>{formData.luggageSize}</span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Quantity:</span>
                            <span className={styles.reviewValue}>{formData.luggageCount} bag(s)</span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Drop-off:</span>
                            <span className={styles.reviewValue}>
                              {new Date(formData.dropOffDate).toLocaleString()}
                            </span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Pick-up:</span>
                            <span className={styles.reviewValue}>
                              {new Date(formData.pickUpDate).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.checkboxGroup}>
                        <label className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            name="termsAccepted"
                            checked={formData.termsAccepted}
                            onChange={handleChange}
                            className={styles.checkbox}
                          />
                          <span>I agree to the terms and conditions</span>
                        </label>
                        {errors.termsAccepted && <span className={styles.errorText}>{errors.termsAccepted}</span>}
                      </div>

                      {isLoading ? (
                        <div className={styles.loadingContainer}>
                          <div className={styles.spinner}></div>
                          <p className={styles.loadingText}>Processing your booking...</p>
                        </div>
                      ) : isFormValid ? (
                        <div className={styles.paymentSection}>
                          <PayPalPayment
                            totalAmount={totalAmount}
                            onPaymentSuccess={handlePaymentSuccess}
                            formData={formData}
                            disabled={isLoading}
                          />
                        </div>
                      ) : (
                        <div className={styles.warningBox}>
                          Please complete all required fields and accept the terms to proceed.
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className={styles.btnSecondary}
                        disabled={isLoading}
                      >
                        ← Back to Luggage Details
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Pricing Sidebar - UPDATED WITH COLLAPSIBLE FUNCTIONALITY */}
            <div className={styles.sidebar}>
              <div className={styles.priceCard}>
                <h3 className={styles.priceTitle}>Booking Summary</h3>
                
                {/* Collapsible Content - Shows ABOVE button on mobile */}
                <div className={`${styles.collapsibleContent} ${isSummaryExpanded ? styles.expanded : ''}`}>
                  <div className={styles.priceBreakdown}>
                    <div className={styles.priceRow}>
                      <span className={styles.priceLabel}>Rate per bag/day</span>
                      <span className={styles.priceValue}>A${ratePerLuggagePerDay.toFixed(2)}</span>
                    </div>
                    <div className={styles.priceRow}>
                      <span className={styles.priceLabel}>Number of bags</span>
                      <span className={styles.priceValue}>×{formData.luggageCount}</span>
                    </div>
                    <div className={styles.priceRow}>
                      <span className={styles.priceLabel}>Storage duration</span>
                      <span className={styles.priceValue}>{numberOfDays} day(s)</span>
                    </div>
                  </div>

                  <div className={styles.priceFeatures}>
                    <div className={styles.featureItem}>
                      <span className={styles.featureIcon}>✓</span>
                      <span>24/7 Security</span>
                    </div>
                    <div className={styles.featureItem}>
                      <span className={styles.featureIcon}>✓</span>
                      <span>Insurance Included</span>
                    </div>
                    <div className={styles.featureItem}>
                      <span className={styles.featureIcon}>✓</span>
                      <span>Easy Access</span>
                    </div>
                    <div className={styles.featureItem}>
                      <span className={styles.featureIcon}>✓</span>
                      <span>Flexible Scheduling</span>
                    </div>
                  </div>
                </div>

                {/* Always Visible Total & Toggle Combined */}
                <button
                  type="button"
                  onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                  className={styles.toggleButton}
                >
                  <div className={styles.toggleButtonContent}>
                    <span className={styles.totalLabel}>Total Amount</span>
                    <span className={styles.totalValue}>A${totalAmount.toFixed(2)}</span>
                  </div>
                  <div className={styles.toggleAction}>
                    {isSummaryExpanded ? (
                      <>
                        <span className={styles.toggleText}>View Less</span>
                        <span className={styles.toggleIcon}>▼</span>
                      </>
                    ) : (
                      <>
                        <span className={styles.toggleText}>View Details</span>
                        <span className={styles.toggleIcon}>▲</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LuggageBookingForm;