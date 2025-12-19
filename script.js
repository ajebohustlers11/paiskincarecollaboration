document.addEventListener("DOMContentLoaded", () => {
  // Loader
  window.onload = () => {
    setTimeout(() => {
      const loader = document.getElementById("loader");
      const main = document.getElementById("mainContent");
      if (loader) loader.style.display = "none";
      if (main) main.style.display = "block";
    }, 1200);
  };

  const form = document.getElementById("collabForm");
  if (!form) {
    console.error("collabForm not found in DOM");
    return;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    try {
      console.log("Submit clicked — preparing PDF...");

      // collect form data (safe)
      const formData = new FormData(form);
      const name = (formData.get("name") || "").toString().trim();
      const email = (formData.get("email") || "").toString().trim();
      const insta = (formData.get("insta") || "").toString().trim();
      const phone = (formData.get("phone") || "").toString().trim();
      const address = (formData.get("address") || "").toString().trim();

      // NEW: additional fields present on index.html
      const tiktok = (formData.get("tiktok") || "").toString().trim();
      const audience = (formData.get("audience") || "").toString().trim();
      const mediakit = (formData.get("mediakit") || "").toString().trim();
      const typical_rate = (formData.get("typical_rate") || "").toString().trim();
      const country = (formData.get("country") || "").toString().trim();

      // payment: support multiple field names
      const paymentRaw =
        formData.get("payment") ||
        formData.get("paymentMethod") ||
        formData.get("paymentMethodHidden") ||
        formData.get("payment_method") ||
        null;
      const payment = (paymentRaw || "Not specified").toString().trim();

      // collect image files (1..30)
      const imageFiles = [];
      for (let i = 1; i <= 30; i++) {
        const file = formData.get(`img${i}`);
        if (file && file.type && file.type.startsWith("image/")) {
          imageFiles.push(file);
        }
      }
      console.log("Images found:", imageFiles.length);

      // Ensure jsPDF present
      if (!window.jspdf || !window.jspdf.jsPDF && !window.jspdf.default && !window.jspdf) {
        console.error("jsPDF not loaded or accessible as window.jspdf");
        alert("PDF library not loaded. Please check your script includes.");
        return;
      }
      // get constructor
      const jsPDFConstructor = window.jspdf && (window.jspdf.jsPDF || window.jspdf.default || window.jspdf);

      // create doc
      const doc = new jsPDFConstructor();

      // helpers ------------------------------------------------
      function trimOr(value, fallback = "") {
        return (value || "").toString().trim() || fallback;
      }

      // Resize image client-side to max dimension (keeps PDF small)
      function readAndResizeImage(file, maxSize = 1000) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = (err) => reject(err);
          reader.onload = () => {
            const img = new Image();
            img.onload = () => {
              try {
                const canvas = document.createElement("canvas");
                let { width, height } = img;
                const ratio = width / height;
                if (width > maxSize || height > maxSize) {
                  if (ratio > 1) {
                    width = maxSize;
                    height = Math.round(maxSize / ratio);
                  } else {
                    height = maxSize;
                    width = Math.round(maxSize * ratio);
                  }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                // use JPEG to reduce size; keep quality reasonable
                const mime = (file.type === "image/png") ? "image/png" : "image/jpeg";
                const dataUrl = canvas.toDataURL(mime, 0.85);
                resolve(dataUrl);
              } catch (err) {
                // fallback to original dataURL
                resolve(reader.result);
              }
            };
            img.onerror = (err) => {
              // cannot load image; resolve with original data url (may fail later)
              resolve(reader.result);
            };
            img.src = reader.result;
          };
          reader.readAsDataURL(file);
        });
      }

      // detect image mime from dataURL
      function detectImageType(dataUrl) {
        if (!dataUrl || typeof dataUrl !== "string") return "JPEG";
        if (dataUrl.startsWith("data:image/png")) return "PNG";
        if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) return "JPEG";
        if (dataUrl.startsWith("data:image/webp")) return "WEBP";
        return "JPEG";
      }

      // build PDF ------------------------------------------------
      let y = 20;
      const lineHeight = 8;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("COLLABORATION AGREEMENT", 105, y, { align: "center" });
      y += lineHeight * 2;

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      // replace brand name as needed
      doc.text("Pai Skincare", 20, y); y += lineHeight;


      doc.setFont("helvetica", "bold");
      doc.text("Influencer Details", 20, y); y += lineHeight;
      doc.setFont("helvetica", "normal");
      doc.text(`Full Name: ${trimOr(name)}`, 20, y); y += lineHeight;
      doc.text(`Email Address: ${trimOr(email)}`, 20, y); y += lineHeight;
      doc.text(`Instagram Handle: ${trimOr(insta)}`, 20, y); y += lineHeight;
      // NEW: write TikTok
      doc.text(`TikTok Handle: ${trimOr(tiktok)}`, 20, y); y += lineHeight;
      // NEW: other handles
      doc.text(`Other Handles: ${trimOr(audience)}`, 20, y); y += lineHeight;
      // NEW: portfolio / mediakit
      doc.text(`Portfolio / Media Kit: ${trimOr(mediakit)}`, 20, y); y += lineHeight;
      // NEW: typical rate
      doc.text(`Typical Rate / Budget: ${trimOr(typical_rate)}`, 20, y); y += lineHeight;
      // NEW: country / state
      doc.text(`Country / State: ${trimOr(country)}`, 20, y); y += lineHeight;

      doc.text(`Phone Number: ${trimOr(phone)}`, 20, y); y += lineHeight;
      doc.text(`Delivery Address: ${trimOr(address)}`, 20, y); y += lineHeight;

      // Payment
      doc.setFont("helvetica", "bold");
      doc.text("Payment Method:", 20, y);

      doc.setFont("helvetica", "normal");
      // print payment neatly to the right, with wrapping if long
      doc.text(payment, 72, y, { maxWidth: 90 });

      y += lineHeight * 1.6;


      doc.setFont("helvetica", "bold");
      doc.text("Selected Product Screenshots:", 20, y); y += lineHeight;

      // Add each image after resizing
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        console.log(`Processing image ${i + 1}/${imageFiles.length}`, file && file.name);
        const dataUrl = await readAndResizeImage(file, 1000); // resized DataURL
        if (y > 230) { doc.addPage(); y = 20; }

        doc.setFont("helvetica", "normal");
        doc.text(`Item ${i + 1}:`, 25, y);
        y += 4;

        const imgType = detectImageType(dataUrl);
        try {
          // place 50x50 images; adjust if need
          doc.addImage(dataUrl, imgType, 25, y, 50, 50);
        } catch (err) {
          console.warn("addImage failed for item", i + 1, err);
          // try fallback without specifying type
          try { doc.addImage(dataUrl, 25, y, 50, 50); } catch (err2) {
            console.warn("fallback addImage also failed", err2);
          }
        }
        y += 58;
      }

      y += lineHeight;

      // ====== START CHANGE: force Invoice Summary onto its OWN PAGE ======
      // Always create a new page so the invoice is on its own page.
      // Reset the vertical cursor so invoice content starts at the top.
      doc.addPage();
      y = 20;
      // ====== END CHANGE ======

      doc.setFont("helvetica", "bold");
      doc.text("Invoice Summary", 20, y); y += lineHeight;
      doc.setFont("helvetica", "normal");
      doc.text(`Items Provided (${imageFiles.length}): $0`, 25, y); y += lineHeight;
      doc.text(`Payment Method: ${payment}`, 25, y); y += lineHeight;
      doc.text("Tax Fee: -", 25, y); y += lineHeight;
      doc.text("------------------------------------------------------", 25, y); y += lineHeight;
      doc.setFont("helvetica", "bold");
      doc.text("Total Payable: 1,000.00 GBP", 25, y); y += lineHeight * 2;

      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text(
        "By submitting this agreement, the influencer agrees to promote the brand’s products under the stated collaboration terms and conditions.",
        20, y,
        { maxWidth: 170 }
      );

      const safeName = (name || "influencer").replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const fileName = `collaboration_agreement_${safeName}.pdf`;

      // Create a Blob and trigger download — more reliable than relying on jsPDF.save promise
      try {
        const blob = doc.output("blob");
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        // Append to DOM to support Firefox
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(url);
          if (a && a.parentNode) a.parentNode.removeChild(a);
          // pass all useful data to afterDownloadSuccess
          afterDownloadSuccess({ name, payment, email, insta, tiktok, audience, mediakit, typical_rate, country, phone });
        }, 300); // small delay to ensure browser started download
      } catch (err) {
        console.error("Failed creating blob/download:", err);
        alert("Failed to generate file for download. See console for details.");
      }
    } catch (err) {
      console.error("Error during form submit/pdf generation:", err);
      alert("An error occurred while generating the PDF. Check console for details.");
    }
  });

  // Called after download initiated
  function afterDownloadSuccess(data) {
    try {
      form.style.display = "none";
      const success = document.getElementById("success");
      if (success) success.style.display = "block";

      const emailLink = document.getElementById("emailLink");
      if (emailLink) {
        const subject = `Collaboration Submission from ${data.name || ""}`;

        // PROFESSIONAL message per your request
        const bodyPlain = [
          `Hello,`,
          ``,
          `My name is ${data.name || ""}. I confirm that I have completed my registration and have read and agree to the Collaboration Terms & Conditions.`,
          `I would like to proceed with the collaboration. Please find my documents attached for your review.`,
          ``,
          `Details:`,
          `• Email: ${data.email || ""}`,
          `• Instagram: ${data.insta || ""}`,
          `• TikTok: ${data.tiktok || ""}`,
          `• Other Handles: ${data.audience || ""}`,
          `• Portfolio: ${data.mediakit || ""}`,
          `• Typical Rate / Budget: ${data.typical_rate || ""}`,
          `• Country / State: ${data.country || ""}`,
          `• Phone: ${data.phone || ""}`,
          `• Preferred Payment Method: ${data.payment || ""}`,
          ``,
          `Kind regards,`,
          `${data.name || ""}`
        ].join("\n");

        emailLink.innerHTML = `<i class="fas fa-envelope"></i> Send Email`;
        // NOTE: mailto cannot attach the file automatically. The user will need to attach the downloaded PDF manually.
        emailLink.href = `mailto:paiskincare.creatorhub@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyPlain)}`;

        // small UX reminder when they click the email link
        emailLink.addEventListener('click', () => {
          setTimeout(() => {
            alert('Please attach the downloaded PDF (collaboration agreement) to this email before sending.');
          }, 200);
        }, { once: true });
      }
    } catch (err) {
      console.warn("afterDownloadSuccess error:", err);
    }
  }

  // small utility to read file as data URL (not used by resizing path but kept)
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = (e) => reject(e);
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }
}); // DOMContentLoaded end

// payment sync + keyboard accessibility (IIFE)
(function () {
  const hidden = document.getElementById('paymentMethodHidden');
  const radios = document.querySelectorAll('input[name="pm"]');

  if (!radios || radios.length === 0) {
    // nothing to sync — maybe user uses a select instead
    return;
  }

  radios.forEach(r => {
    r.addEventListener('change', () => {
      if (r.checked && hidden) hidden.value = r.value;
      // update ARIA on labels
      radios.forEach(rr => {
        const lbl = document.querySelector(`label[for="${rr.id}"]`);
        if (lbl) lbl.setAttribute('aria-checked', rr.checked ? 'true' : 'false');
      });
    });

    // support label keyboard activation
    const lbl = document.querySelector(`label[for="${r.id}"]`);
    if (lbl) {
      lbl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          r.checked = true;
          r.dispatchEvent(new Event('change', { bubbles: true }));
          lbl.focus();
        }
      });
    }
  });

  // initialize hidden value
  const init = document.querySelector('input[name="pm"]:checked');
  if (init && hidden) hidden.value = init.value;
})();
