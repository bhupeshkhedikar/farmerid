import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./FarmerIdGenerator.css";

const FarmerIdGenerator = () => {
    /* =========================================================
       FARMER DATA
    ========================================================= */

    const [farmer, setFarmer] = useState({
        fullName: "",
        nameMarathi: "",
        dob: "",
        gender: "पुरुष",
        uid: "",
        farmerId: "",
        mobile: "",
        photo: "",
        address: "",
        district: "",
        tehsil: "",
        village: "",
        pincode: "",
    });

    /* =========================================================
       LAND DATA
    ========================================================= */

    const [lands, setLands] = useState([
        {
            district: "",
            tehsil: "",
            village: "",
            surveyNo: "",
            area: "",
        },
    ]);

    /* =========================================================
       UI
    ========================================================= */

    const [selectedDesign, setSelectedDesign] =
        useState("classic");

    const [cardSide, setCardSide] =
        useState("front");

    const [qrCode, setQrCode] =
        useState("");

    const [isGenerating, setIsGenerating] =
        useState(false);

    /*
     * IMPORTANT:
     * These refs remain mounted even when the user
     * switches between front/back preview.
     */
    const frontCardRef = useRef(null);
    const backCardRef = useRef(null);

    /* =========================================================
       FARMER INPUT
    ========================================================= */

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFarmer((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    /* =========================================================
       PHOTO UPLOAD
    ========================================================= */

    const handlePhotoUpload = (e) => {
        const file = e.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("कृपया फक्त फोटो अपलोड करा.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("फोटोचा आकार 5MB पेक्षा कमी असावा.");
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            setFarmer((prev) => ({
                ...prev,
                photo: reader.result,
            }));
        };

        reader.readAsDataURL(file);
    };

    /* =========================================================
       REMOVE PHOTO
    ========================================================= */

    const removePhoto = () => {
        setFarmer((prev) => ({
            ...prev,
            photo: "",
        }));
    };

    /* =========================================================
       LAND CHANGE
    ========================================================= */

    const handleLandChange = (
        index,
        field,
        value
    ) => {
        setLands((prev) =>
            prev.map((land, i) =>
                i === index
                    ? {
                        ...land,
                        [field]: value,
                    }
                    : land
            )
        );
    };

    /* =========================================================
       ADD LAND
    ========================================================= */

    const addLand = () => {
        setLands((prev) => [
            ...prev,
            {
                district: "",
                tehsil: "",
                village: "",
                surveyNo: "",
                area: "",
            },
        ]);
    };

    /* =========================================================
       REMOVE LAND
    ========================================================= */

    const removeLand = (index) => {
        if (lands.length === 1) return;

        setLands((prev) =>
            prev.filter((_, i) => i !== index)
        );
    };

    /* =========================================================
       TOTAL AREA
    ========================================================= */

    const totalArea = lands.reduce(
        (total, land) => {
            const value = parseFloat(land.area);

            if (isNaN(value)) {
                return total;
            }

            return total + value;
        },
        0
    );

    /* =========================================================
       DISPLAY ADDRESS
  
       If full address exists, DO NOT append
       village / taluka / district again.
    ========================================================= */

    const displayAddress =
        farmer.address?.trim()
            ? farmer.address.trim()
            : [
                farmer.village,
                farmer.tehsil,
                farmer.district,
                farmer.pincode,
            ]
                .filter(Boolean)
                .join(", ");

    /* =========================================================
       QR
    ========================================================= */

    useEffect(() => {
        const generateQR = async () => {
            const qrData = JSON.stringify({
                farmerId:
                    farmer.farmerId || "",

                name:
                    farmer.nameMarathi ||
                    farmer.fullName ||
                    "",

                uid:
                    farmer.uid || "",

                mobile:
                    farmer.mobile || "",

                district:
                    farmer.district || "",

                tehsil:
                    farmer.tehsil || "",

                village:
                    farmer.village || "",
            });

            try {
                const qr =
                    await QRCode.toDataURL(
                        qrData,
                        {
                            width: 400,
                            margin: 1,
                            errorCorrectionLevel: "M",
                        }
                    );

                setQrCode(qr);
            } catch (error) {
                console.error(
                    "QR generation error:",
                    error
                );
            }
        };

        generateQR();
    }, [
        farmer.farmerId,
        farmer.nameMarathi,
        farmer.fullName,
        farmer.uid,
        farmer.mobile,
        farmer.district,
        farmer.tehsil,
        farmer.village,
    ]);

    /* =========================================================
       WAIT FOR CARD IMAGES
       IMPORTANT FOR PDF GENERATION
    ========================================================= */

    const waitForImages = async (element) => {
        if (!element) return;

        const images =
            Array.from(
                element.querySelectorAll("img")
            );

        await Promise.all(
            images.map(
                (img) =>
                    new Promise((resolve) => {
                        if (img.complete) {
                            resolve();
                            return;
                        }

                        img.onload = resolve;
                        img.onerror = resolve;
                    })
            )
        );
    };

    /* =========================================================
       CAPTURE CARD
    ========================================================= */

    const captureCard = async (
        element,
        backgroundColor
    ) => {
        if (!element) {
            throw new Error(
                "Card element not found."
            );
        }

        const original = {
            background:
                element.style.background,

            backgroundImage:
                element.style.backgroundImage,

            backgroundColor:
                element.style.backgroundColor,
        };

        try {
            /*
             * Remove gradients temporarily.
             */
            element.style.backgroundImage =
                "none";

            element.style.background =
                backgroundColor;

            element.style.backgroundColor =
                backgroundColor;

            /*
             * Make sure fonts are loaded.
             */
            if (document.fonts?.ready) {
                await document.fonts.ready;
            }

            /*
             * Make sure all card images are loaded.
             */
            await waitForImages(element);

            /*
             * Small render delay.
             */
            await new Promise((resolve) =>
                requestAnimationFrame(resolve)
            );

            const canvas =
                await html2canvas(
                    element,
                    {
                        scale: 2,

                        useCORS: true,

                        allowTaint: false,

                        backgroundColor:
                            backgroundColor,

                        logging: false,

                        imageTimeout: 15000,

                        scrollX: 0,

                        scrollY: 0,

                        onclone: (
                            clonedDocument
                        ) => {
                            const style =
                                clonedDocument.createElement(
                                    "style"
                                );

                            style.innerHTML = `
                * {
                  animation: none !important;
                  transition: none !important;
                }

                .farmer-card {
                  box-shadow: none !important;
                  background-image: none !important;
                }

                .farmer-card-classic {
                  background: #e2f8da !important;
                }

                .farmer-card-modern {
                  background: #e3f4dd !important;
                }

                .farmer-card-minimal {
                  background: #f8fcf7 !important;
                }

                .farmer-card-classic::before {
                  background: #72dd00 !important;
                }

                .farmer-card-classic::after {
                  background: #08732e !important;
                }

                .farmer-card-modern::before {
                  background: #075b31 !important;
                }

                .farmer-card-modern .card-bottom {
                  background: #075b31 !important;
                }

                .farmer-card-modern
                .card-bottom::before {
                  background: #3da74b !important;
                }

                .farmer-card-minimal::before {
                  background: #0b6635 !important;
                }

                .farmer-card-minimal .card-bottom {
                  background: #1a683b !important;
                }

                .farmer-card-minimal
                .card-bottom::before {
                  background: #8bca45 !important;
                }

                .back-card-footer {
                  background: #08732e !important;
                }

                .back-card-footer::before {
                  background: #74e500 !important;
                }

                /*
                 * Custom logo/image
                 */
                .card-logo-image {
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                }

                .card-farmer-icon img {
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                }

                .back-logo img {
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                }
              `;

                            clonedDocument.head.appendChild(
                                style
                            );
                        },
                    }
                );

            return canvas;
        } finally {
            /*
             * Restore original styles.
             */
            element.style.background =
                original.background;

            element.style.backgroundImage =
                original.backgroundImage;

            element.style.backgroundColor =
                original.backgroundColor;
        }
    };

    /* =========================================================
       DOWNLOAD PDF
  
       PAGE 1 = FRONT
       PAGE 2 = BACK
    ========================================================= */

    const downloadPDF = async () => {
        if (
            !frontCardRef.current ||
            !backCardRef.current
        ) {
            alert(
                "कार्ड तयार झालेले नाही."
            );

            return;
        }

        setIsGenerating(true);

        try {
            const backgroundColor =
                selectedDesign === "minimal"
                    ? "#f8fcf7"
                    : selectedDesign === "modern"
                        ? "#e3f4dd"
                        : "#e2f8da";

            /*
             * Wait for a render cycle.
             */
            await new Promise((resolve) =>
                requestAnimationFrame(resolve)
            );

            /*
             * FRONT
             */
            const frontCanvas =
                await captureCard(
                    frontCardRef.current,
                    backgroundColor
                );

            /*
             * BACK
             */
            const backCanvas =
                await captureCard(
                    backCardRef.current,
                    backgroundColor
                );

            if (
                !frontCanvas ||
                !backCanvas
            ) {
                throw new Error(
                    "Unable to capture cards."
                );
            }

            /*
             * Convert to JPEG.
             */
            const frontImage =
                frontCanvas.toDataURL(
                    "image/jpeg",
                    0.95
                );

            const backImage =
                backCanvas.toDataURL(
                    "image/jpeg",
                    0.95
                );

            if (
                !frontImage.startsWith(
                    "data:image/jpeg"
                )
            ) {
                throw new Error(
                    "Front JPEG generation failed."
                );
            }

            if (
                !backImage.startsWith(
                    "data:image/jpeg"
                )
            ) {
                throw new Error(
                    "Back JPEG generation failed."
                );
            }

            /*
             * CREATE PDF
             */

            const pdf = new jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a4",
                compress: true,
            });

            /*
             * A4 Landscape
             */
            const pageWidth = 297;
            const pageHeight = 210;

            /*
             * ID CARD
             */
            const cardWidth = 250;
            const cardHeight = 150;

            const x =
                (pageWidth - cardWidth) /
                2;

            const y =
                (pageHeight - cardHeight) /
                2;

            /*
             * ==========================================
             * PAGE 1 - FRONT
             * ==========================================
             */

            pdf.addImage(
                frontImage,
                "JPEG",
                x,
                y,
                cardWidth,
                cardHeight,
                undefined,
                "FAST"
            );

            /*
             * ==========================================
             * PAGE 2 - BACK
             * ==========================================
             */

            pdf.addPage(
                "a4",
                "landscape"
            );

            pdf.addImage(
                backImage,
                "JPEG",
                x,
                y,
                cardWidth,
                cardHeight,
                undefined,
                "FAST"
            );

            /*
             * ==========================================
             * SAVE
             * ==========================================
             */

            const safeFarmerId =
                farmer.farmerId
                    ?.trim()
                    .replace(
                        /[^a-zA-Z0-9-_]/g,
                        ""
                    );

            const fileName =
                safeFarmerId
                    ? `${safeFarmerId}-farmer-card.pdf`
                    : "farmer-id-card.pdf";

            pdf.save(fileName);

        } catch (error) {
            console.error(
                "PDF generation error:",
                error
            );

            alert(
                "PDF तयार करताना समस्या आली. कृपया पुन्हा प्रयत्न करा."
            );

        } finally {
            setIsGenerating(false);
        }
    };

    /* =========================================================
       PRINT
    ========================================================= */

    const printCard = () => {
        window.print();
    };

    /* =========================================================
       RESET
    ========================================================= */

    const resetForm = () => {
        const confirmation =
            window.confirm(
                "सर्व माहिती काढून टाकायची आहे का?"
            );

        if (!confirmation) return;

        setFarmer({
            fullName: "",
            nameMarathi: "",
            dob: "",
            gender: "पुरुष",
            uid: "",
            farmerId: "",
            mobile: "",
            photo: "",
            address: "",
            district: "",
            tehsil: "",
            village: "",
            pincode: "",
        });

        setLands([
            {
                district: "",
                tehsil: "",
                village: "",
                surveyNo: "",
                area: "",
            },
        ]);

        setSelectedDesign(
            "classic"
        );

        setCardSide("front");
    };

    /* =========================================================
       DESIGN
    ========================================================= */

    const designClass =
        `farmer-card farmer-card-${selectedDesign}`;

    /* =========================================================
       DOB
    ========================================================= */

    const formattedDOB = farmer.dob
        ? new Date(
            farmer.dob
        ).toLocaleDateString(
            "en-GB"
        )
        : "DD/MM/YYYY";

    /* =========================================================
       JSX
    ========================================================= */

    return (
        <div className="farmer-generator-page">

            {/* =====================================================
          HEADER
      ===================================================== */}

            <header className="farmer-generator-header">

                <div className="farmer-header-inner">

                    <div className="farmer-brand">

                        {/* CUSTOM AGRISTACK LOGO */}
                        <div className="farmer-brand-icon">
                            <img
                                src="/agri_stack_logo.png"
                                alt="AgriStack"
                            />
                        </div>

                        <div>
                            <h1>
                                शेतकरी ओळखपत्र
                            </h1>

                            <p>
                                Farmer ID Card Generator
                            </p>
                        </div>

                    </div>

                    <div className="header-status">

                        <span className="status-dot"></span>

                        कार्ड तयार करण्यासाठी तयार

                    </div>

                </div>

            </header>

            {/* =====================================================
          MAIN
      ===================================================== */}

            <main className="farmer-generator-container">

                <div className="generator-layout">

                    {/* =================================================
              FORM
          ================================================= */}

                    <section className="generator-form-panel">

                        {/* =================================================
                PERSONAL
            ================================================= */}

                        <div className="form-section">

                            <div className="form-section-header">

                                <div className="section-number">
                                    01
                                </div>

                                <div>
                                    <h2>
                                        शेतकरी माहिती
                                    </h2>

                                    <p>
                                        शेतकऱ्याची वैयक्तिक माहिती भरा
                                    </p>
                                </div>

                            </div>

                            <div className="form-grid">

                                {/* PHOTO */}

                                <div className="photo-upload-area">

                                    <label className="form-label">
                                        शेतकऱ्याचा फोटो
                                    </label>

                                    <div className="photo-upload-box">

                                        {farmer.photo ? (

                                            <div className="uploaded-photo-wrapper">

                                                <img
                                                    src={farmer.photo}
                                                    alt="Farmer"
                                                />

                                                <button
                                                    type="button"
                                                    className="remove-photo"
                                                    onClick={
                                                        removePhoto
                                                    }
                                                >
                                                    ×
                                                </button>

                                            </div>

                                        ) : (

                                            <label
                                                htmlFor="farmerPhoto"
                                                className="photo-placeholder"
                                            >

                                                <span className="photo-icon">
                                                    📷
                                                </span>

                                                <strong>
                                                    फोटो अपलोड करा
                                                </strong>

                                                <small>
                                                    JPG / PNG • कमाल 5MB
                                                </small>

                                            </label>

                                        )}

                                        <input
                                            id="farmerPhoto"
                                            type="file"
                                            accept="image/*"
                                            onChange={
                                                handlePhotoUpload
                                            }
                                            hidden
                                        />

                                    </div>

                                </div>

                                {/* NAME */}

                                <div className="form-field">

                                    <label className="form-label">
                                        पूर्ण नाव
                                        <span>*</span>
                                    </label>

                                    <input
                                        type="text"
                                        name="fullName"
                                        value={
                                            farmer.fullName
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="उदा. रामराव शिंदे"
                                    />

                                </div>

                                {/* MARATHI NAME */}

                                <div className="form-field">

                                    <label className="form-label">
                                        नाव (मराठी)
                                    </label>

                                    <input
                                        type="text"
                                        name="nameMarathi"
                                        value={
                                            farmer.nameMarathi
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="मराठी नाव"
                                    />

                                </div>

                                {/* DOB */}

                                <div className="form-field">

                                    <label className="form-label">
                                        जन्मतारीख
                                        <span>*</span>
                                    </label>

                                    <input
                                        type="date"
                                        name="dob"
                                        value={
                                            farmer.dob
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />

                                </div>

                                {/* GENDER */}

                                <div className="form-field">

                                    <label className="form-label">
                                        लिंग
                                    </label>

                                    <select
                                        name="gender"
                                        value={
                                            farmer.gender
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    >

                                        <option value="पुरुष">
                                            पुरुष
                                        </option>

                                        <option value="महिला">
                                            महिला
                                        </option>

                                        <option value="इतर">
                                            इतर
                                        </option>

                                    </select>

                                </div>

                                {/* UID */}

                                <div className="form-field">

                                    <label className="form-label">
                                        आधार / UID
                                    </label>

                                    <input
                                        type="text"
                                        name="uid"
                                        value={
                                            farmer.uid
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="12 अंकी UID"
                                        maxLength="12"
                                        inputMode="numeric"
                                    />

                                </div>

                                {/* FARMER ID */}

                                <div className="form-field">

                                    <label className="form-label">
                                        Farmer ID
                                        <span>*</span>
                                    </label>

                                    <input
                                        type="text"
                                        name="farmerId"
                                        value={
                                            farmer.farmerId
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="उदा. 20974538833"
                                        inputMode="numeric"
                                    />

                                </div>

                                {/* MOBILE */}

                                <div className="form-field">

                                    <label className="form-label">
                                        मोबाईल क्रमांक
                                    </label>

                                    <input
                                        type="tel"
                                        name="mobile"
                                        value={
                                            farmer.mobile
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="10 अंकी मोबाईल"
                                        maxLength="10"
                                        inputMode="numeric"
                                    />

                                </div>

                            </div>

                        </div>

                        {/* =================================================
                ADDRESS
            ================================================= */}

                        <div className="form-section">

                            <div className="form-section-header">

                                <div className="section-number">
                                    02
                                </div>

                                <div>

                                    <h2>
                                        पत्ता
                                    </h2>

                                    <p>
                                        शेतकऱ्याचा संपूर्ण पत्ता भरा
                                    </p>

                                </div>

                            </div>

                            <div className="form-grid">

                                <div className="form-field form-field-full">

                                    <label className="form-label">
                                        पूर्ण पत्ता
                                    </label>

                                    <textarea
                                        name="address"
                                        value={
                                            farmer.address
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="उदा. मू पो कोल्हापुर तहसील कोल्हापुर जिल्हा कोल्हापुर महाराष्ट्र 416001"
                                        rows="3"
                                    />

                                </div>

                                <div className="form-field">

                                    <label className="form-label">
                                        जिल्हा
                                    </label>

                                    <input
                                        type="text"
                                        name="district"
                                        value={
                                            farmer.district
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="उदा. कोल्हापुर "
                                    />

                                </div>

                                <div className="form-field">

                                    <label className="form-label">
                                        तालुका
                                    </label>

                                    <input
                                        type="text"
                                        name="tehsil"
                                        value={
                                            farmer.tehsil
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="उदा. कोल्हापुर "
                                    />

                                </div>

                                <div className="form-field">

                                    <label className="form-label">
                                        गाव
                                    </label>

                                    <input
                                        type="text"
                                        name="village"
                                        value={
                                            farmer.village
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="उदा. कोल्हापुर "
                                    />

                                </div>

                                <div className="form-field">

                                    <label className="form-label">
                                        पिनकोड
                                    </label>

                                    <input
                                        type="text"
                                        name="pincode"
                                        value={
                                            farmer.pincode
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="उदा. 416001"
                                        maxLength="6"
                                        inputMode="numeric"
                                    />

                                </div>

                            </div>

                        </div>

                        {/* =================================================
                LAND
            ================================================= */}

                        <div className="form-section">

                            <div className="form-section-header">

                                <div className="section-number">
                                    03
                                </div>

                                <div className="section-heading-with-button">

                                    <div>

                                        <h2>
                                            जमीन माहिती
                                        </h2>

                                        <p>
                                            शेतजमिनीची माहिती भरा
                                        </p>

                                    </div>

                                    <button
                                        type="button"
                                        className="add-land-btn"
                                        onClick={
                                            addLand
                                        }
                                    >
                                        + जमीन जोडा
                                    </button>

                                </div>

                            </div>

                            <div className="land-records">

                                {lands.map(
                                    (land, index) => (

                                        <div
                                            className="land-record"
                                            key={index}
                                        >

                                            <div className="land-record-top">

                                                <strong>
                                                    जमीन{" "}
                                                    {index + 1}
                                                </strong>

                                                {lands.length >
                                                    1 && (

                                                        <button
                                                            type="button"
                                                            className="remove-land-btn"
                                                            onClick={() =>
                                                                removeLand(
                                                                    index
                                                                )
                                                            }
                                                        >
                                                            काढा
                                                        </button>

                                                    )}

                                            </div>

                                            <div className="land-grid">

                                                <div className="form-field">

                                                    <label className="form-label">
                                                        जिल्हा
                                                    </label>

                                                    <input
                                                        type="text"
                                                        value={
                                                            land.district
                                                        }
                                                        onChange={(e) =>
                                                            handleLandChange(
                                                                index,
                                                                "district",
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="जिल्हा"
                                                    />

                                                </div>

                                                <div className="form-field">

                                                    <label className="form-label">
                                                        तालुका
                                                    </label>

                                                    <input
                                                        type="text"
                                                        value={
                                                            land.tehsil
                                                        }
                                                        onChange={(e) =>
                                                            handleLandChange(
                                                                index,
                                                                "tehsil",
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="तालुका"
                                                    />

                                                </div>

                                                <div className="form-field">

                                                    <label className="form-label">
                                                        गाव
                                                    </label>

                                                    <input
                                                        type="text"
                                                        value={
                                                            land.village
                                                        }
                                                        onChange={(e) =>
                                                            handleLandChange(
                                                                index,
                                                                "village",
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="गाव"
                                                    />

                                                </div>

                                                <div className="form-field">

                                                    <label className="form-label">
                                                        सर्वे नंबर
                                                    </label>

                                                    <input
                                                        type="text"
                                                        value={
                                                            land.surveyNo
                                                        }
                                                        onChange={(e) =>
                                                            handleLandChange(
                                                                index,
                                                                "surveyNo",
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="सर्वे नं."
                                                    />

                                                </div>

                                                <div className="form-field">

                                                    <label className="form-label">
                                                        क्षेत्रफळ (हे.)
                                                    </label>

                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={
                                                            land.area
                                                        }
                                                        onChange={(e) =>
                                                            handleLandChange(
                                                                index,
                                                                "area",
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="0.00"
                                                    />

                                                </div>

                                            </div>

                                        </div>

                                    )
                                )}

                            </div>

                            <div className="total-area-box">

                                <span>
                                    एकूण क्षेत्रफळ
                                </span>

                                <strong>
                                    {totalArea.toFixed(
                                        2
                                    )}{" "}
                                    हे.
                                </strong>

                            </div>

                        </div>

                        {/* =================================================
                DESIGN
            ================================================= */}

                        <div className="form-section">

                            <div className="form-section-header">

                                <div className="section-number">
                                    04
                                </div>

                                <div>

                                    <h2>
                                        कार्ड डिझाइन
                                    </h2>

                                    <p>
                                        आपल्याला आवडणारे डिझाइन निवडा
                                    </p>

                                </div>

                            </div>

                            <div className="design-options">

                                {/* CLASSIC */}

                                <button
                                    type="button"
                                    className={
                                        selectedDesign ===
                                            "classic"
                                            ? "design-option active"
                                            : "design-option"
                                    }
                                    onClick={() =>
                                        setSelectedDesign(
                                            "classic"
                                        )
                                    }
                                >

                                    <div className="mini-card mini-card-green">

                                        <img
                                            src="/agri_stack_logo.png"
                                            alt="AgriStack"
                                            className="mini-card-logo"
                                        />

                                        <small>
                                            शेतकरी ओळखपत्र
                                        </small>

                                    </div>

                                    <strong>
                                        Classic Green
                                    </strong>

                                </button>

                                {/* MODERN */}

                                <button
                                    type="button"
                                    className={
                                        selectedDesign ===
                                            "modern"
                                            ? "design-option active"
                                            : "design-option"
                                    }
                                    onClick={() =>
                                        setSelectedDesign(
                                            "modern"
                                        )
                                    }
                                >

                                    <div className="mini-card mini-card-modern">

                                        <img
                                            src="/agri_stack_logo.png"
                                            alt="AgriStack"
                                            className="mini-card-logo"
                                        />

                                        <small>
                                            ID CARD
                                        </small>

                                    </div>

                                    <strong>
                                        Modern
                                    </strong>

                                </button>

                                {/* MINIMAL */}

                                <button
                                    type="button"
                                    className={
                                        selectedDesign ===
                                            "minimal"
                                            ? "design-option active"
                                            : "design-option"
                                    }
                                    onClick={() =>
                                        setSelectedDesign(
                                            "minimal"
                                        )
                                    }
                                >

                                    <div className="mini-card mini-card-minimal">

                                        <img
                                            src="/agri_stack_logo.png"
                                            alt="AgriStack"
                                            className="mini-card-logo"
                                        />

                                        <small>
                                            Farmer ID
                                        </small>

                                    </div>

                                    <strong>
                                        Minimal
                                    </strong>

                                </button>

                            </div>

                        </div>

                        {/* =================================================
                ACTIONS
            ================================================= */}

                        <div className="form-actions">

                            <button
                                type="button"
                                className="reset-btn"
                                onClick={
                                    resetForm
                                }
                            >
                                ↻ रीसेट
                            </button>

                            <button
                                type="button"
                                className="print-btn"
                                onClick={
                                    printCard
                                }
                            >
                                🖨 प्रिंट
                            </button>

                            <button
                                type="button"
                                className="download-btn"
                                onClick={
                                    downloadPDF
                                }
                                disabled={
                                    isGenerating
                                }
                            >
                                {isGenerating
                                    ? "PDF तयार होत आहे..."
                                    : "↓ PDF डाउनलोड करा"}
                            </button>

                        </div>

                        <div className="unofficial-notice">

                            ⚠️ हे कार्ड केवळ माहितीच्या /
                            वैयक्तिक वापरासाठी आहे.
                            हे कोणतेही शासकीय ओळखपत्र नाही.

                        </div>

                    </section>

                    {/* =================================================
              PREVIEW
          ================================================= */}

                    <aside className="preview-panel">

                        <div className="preview-panel-header">

                            <div>

                                <h2>
                                    कार्ड पूर्वावलोकन
                                </h2>

                                <p>
                                    माहिती भरताच कार्ड अपडेट होईल
                                </p>

                            </div>

                            <div className="live-badge">

                                <span></span>

                                LIVE

                            </div>

                        </div>

                        {/* SIDE SWITCH */}

                        <div className="side-switcher">

                            <button
                                type="button"
                                className={
                                    cardSide ===
                                        "front"
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setCardSide(
                                        "front"
                                    )
                                }
                            >
                                समोर
                            </button>

                            <button
                                type="button"
                                className={
                                    cardSide ===
                                        "back"
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setCardSide(
                                        "back"
                                    )
                                }
                            >
                                मागील बाजू
                            </button>

                        </div>

                        {/* =================================================
                VISIBLE FRONT
            ================================================= */}

                        <div
                            className={
                                cardSide ===
                                    "front"
                                    ? "card-preview-area"
                                    : "card-preview-area preview-hidden"
                            }
                        >

                            <div
                                ref={
                                    frontCardRef
                                }
                                className={
                                    designClass
                                }
                            >

                                {/* CARD TOP */}

                                <div className="card-top">

                                    {/* CUSTOM AGRISTACK LOGO */}

                                    <div className="card-logo">

                                        <img
                                            src="/agri_stack_logo.png"
                                            alt="AgriStack"
                                            className="card-logo-image"
                                        />

                                    </div>

                                    {/* CUSTOM FARMER IMAGE */}

                                    <div className="card-farmer-icon">

                                        <img
                                            src="/farmer.png"
                                            alt="Farmer"
                                        />

                                    </div>

                                </div>

                                {/* CARD MAIN CONTENT */}

                                <div className="card-main-content">

                                    {/* FARMER UPLOADED PHOTO */}

                                    <div className="card-photo">

                                        {farmer.photo ? (

                                            <img
                                                src={
                                                    farmer.photo
                                                }
                                                alt="Farmer"
                                            />

                                        ) : (

                                            <div className="card-photo-placeholder">

                                                <span>
                                                    👤
                                                </span>

                                                <small>
                                                    फोटो
                                                </small>

                                            </div>

                                        )}

                                    </div>

                                    {/* FARMER INFORMATION */}

                                    <div className="card-info">

                                        <div className="card-info-row">

                                            <strong>
                                                नाव :
                                            </strong>

                                            <span>
                                                {farmer.nameMarathi ||
                                                    farmer.fullName ||
                                                    "शेतकऱ्याचे नाव"}
                                            </span>

                                        </div>

                                        <div className="card-info-row">

                                            <strong>
                                                जन्मतारीख :
                                            </strong>

                                            <span>
                                                {formattedDOB}
                                            </span>

                                        </div>

                                        <div className="card-info-row">

                                            <strong>
                                                लिंग :
                                            </strong>

                                            <span>
                                                {farmer.gender}
                                            </span>

                                        </div>

                                        <div className="card-info-row">

                                            <strong>
                                                UID :
                                            </strong>

                                            <span>
                                                {farmer.uid ||
                                                    "XXXXXXXXXXXX"}
                                            </span>

                                        </div>

                                    </div>

                                    {/* QR */}

                                    <div className="card-qr">

                                        {qrCode ? (

                                            <img
                                                src={
                                                    qrCode
                                                }
                                                alt="QR Code"
                                            />

                                        ) : (

                                            <div className="qr-placeholder">
                                                QR
                                            </div>

                                        )}

                                    </div>

                                </div>

                                {/* FARMER ID */}

                                <div className="card-id-section">

                                    <small>
                                        FARMER ID
                                    </small>

                                    <strong>
                                        {farmer.farmerId ||
                                            "00000000000"}
                                    </strong>

                                </div>

                                {/* CARD BOTTOM */}

                                <div className="card-bottom">
                                    <div className="tractor-icon">
                                        <img
                                            src="/tractor.png"
                                            alt="Tractor"
                                        />
                                    </div>
                                </div>

                            </div>

                        </div>

                        {/* =================================================
                VISIBLE BACK
            ================================================= */}

                        <div
                            className={
                                cardSide ===
                                    "back"
                                    ? "card-preview-area"
                                    : "card-preview-area preview-hidden"
                            }
                        >

                            <div
                                ref={
                                    backCardRef
                                }
                                className={`${designClass} farmer-card-back`}
                            >

                                {/* BACK HEADER */}

                                <div className="back-card-header">

                                    <div className="back-address">

                                        <strong>
                                            पत्ता :
                                        </strong>

                                        <span>
                                            {displayAddress ||
                                                "पूर्ण पत्ता येथे दिसेल"}
                                        </span>

                                    </div>

                                    {/* CUSTOM AGRISTACK LOGO */}

                                    <div className="back-logo">

                                        <img
                                            src="/agri_stack_logo.png"
                                            alt="AgriStack"
                                        />

                                    </div>

                                </div>

                                {/* LAND TABLE */}

                                <div className="land-table-wrapper">

                                    <table className="land-table">

                                        <thead>

                                            <tr>

                                                <th>
                                                    जिल्हा
                                                </th>

                                                <th>
                                                    तालुका
                                                </th>

                                                <th>
                                                    गाव
                                                </th>

                                                <th>
                                                    सर्वे नं.
                                                </th>

                                                <th>
                                                    क्षेत्र (हे.)
                                                </th>

                                            </tr>

                                        </thead>

                                        <tbody>

                                            {lands.map(
                                                (
                                                    land,
                                                    index
                                                ) => (

                                                    <tr
                                                        key={
                                                            index
                                                        }
                                                    >

                                                        <td>
                                                            {land.district ||
                                                                "-"}
                                                        </td>

                                                        <td>
                                                            {land.tehsil ||
                                                                "-"}
                                                        </td>

                                                        <td>
                                                            {land.village ||
                                                                "-"}
                                                        </td>

                                                        <td>
                                                            {land.surveyNo ||
                                                                "-"}
                                                        </td>

                                                        <td>
                                                            {land.area ||
                                                                "0.00"}
                                                        </td>

                                                    </tr>

                                                )
                                            )}

                                            <tr className="total-row">

                                                <td
                                                    colSpan="4"
                                                >
                                                    एकूण
                                                </td>

                                                <td>
                                                    {totalArea.toFixed(
                                                        2
                                                    )}
                                                </td>

                                            </tr>

                                        </tbody>

                                    </table>

                                </div>

                                {/* BACK FOOTER */}

                                <div className="back-card-footer">
                                    <div className="back-tractor">
                                        <img
                                            src="/tractor.png"
                                            alt="Tractor"
                                        />
                                    </div>

                                    <div className="unofficial-card-label">
                                        * अनधिकृत कार्ड
                                    </div>
                                </div>

                            </div>

                        </div>

                        {/* HELP */}

                        <div className="preview-help">

                            <div className="help-icon">
                                💡
                            </div>

                            <div>

                                <strong>
                                    कार्ड कसे तयार करावे?
                                </strong>

                                <p>
                                    डावीकडील माहिती भरा,
                                    डिझाइन निवडा आणि PDF
                                    डाउनलोड करा.
                                </p>

                            </div>

                        </div>

                    </aside>

                </div>

            </main>

        </div>
    );
};

export default FarmerIdGenerator;