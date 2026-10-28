import { useState } from "react";
import { IconArrowRight, IconMapPin, IconPhone } from "@tabler/icons-react";
import "./ContactPage.css";

export default function ContactPage() {
  const [prepared, setPrepared] = useState(false);
  const [error, setError] = useState("");

  const submit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const empty = ["name", "email", "message"].find(
      (key) => !values[key]?.trim(),
    );
    if (empty) {
      setError("Please complete your name, email and message.");
      form.elements.namedItem(empty)?.focus();
      return;
    }
    const labels = {
      name: "Full name",
      email: "Email",
      phone: "Phone",
      subject: "Subject",
      message: "Message",
    };
    const text = [
      "MAK RENTALS — CONTACT MESSAGE",
      "Prepared locally. This message has not been sent.",
      "",
      ...Object.entries(labels).map(
        ([key, label]) => `${label}: ${values[key]?.trim() || "Not provided"}`,
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "MAK-contact-message.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setError("");
    setPrepared(true);
  };

  return (
    <section className="rent-contact-page" aria-labelledby="rent-contact-title">
      <div className="rent-contact-layout">
        <div className="rent-contact-intro">
          <h1 id="rent-contact-title">
            Get in <span>touch</span>
            <br />
            with MAK.
          </h1>
          <p className="rent-contact-description">
            Planning a rental, airport pickup or business travel? Tell us what
            you have in mind.
          </p>
          <dl className="rent-contact-details">
            <div>
              <IconPhone size={36} stroke={1.5} aria-hidden="true" />
              <div>
                <dt>Phone</dt>
                <dd>
                  <a href="tel:+966138892607">+966 53 490 0058</a> <br />
                  <a href="tel:+966138892607">+966 56 745 9555</a> <br />

                </dd>
              </div>
            </div>
            <div>
              <IconMapPin size={38} stroke={1.5} aria-hidden="true" />
              <div>
                <dt>Office</dt>
                <dd>
                  <address>
                    Mishary Al-Khonaini International Cont. Est. 1st Floor, CGC
                    Building 10th Street, Aqrabia Post Box 32360 Al-Khobar
                    31952,
                    <br />
                    Kingdom of Saudi Arabia
                  </address>
                </dd>
              </div>
            </div>
          </dl>
        </div>
        <form
          className="rent-contact-form"
          onSubmit={submit}
          onChange={() => {
            setPrepared(false);
            setError("");
          }}
          aria-label="Contact MAK Rentals"
        >
          <div className="rent-contact-fields">
            <label htmlFor="rent-contact-name">
              Full name
              <input
                id="rent-contact-name"
                name="name"
                autoComplete="name"
                required
                maxLength={120}
                placeholder="Enter your full name…"
              />
            </label>
            <label htmlFor="rent-contact-phone">
              Phone <span className="rent-contact-optional">(optional)</span>
              <input
                id="rent-contact-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                maxLength={40}
                placeholder="Enter your phone number…"
              />
            </label>
            <label htmlFor="rent-contact-email">
              Email
              <input
                id="rent-contact-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="Enter your email address…"
              />
            </label>
            <label htmlFor="rent-contact-subject">
              Subject
              <select
                id="rent-contact-subject"
                name="subject"
                required
                defaultValue="Vehicle rental"
              >
                <option>Vehicle rental</option>
                <option>Airport transfer</option>
                <option>Business transport</option>
                <option>Existing enquiry</option>
                <option>General question</option>
              </select>
            </label>
            <label className="rent-contact-wide" htmlFor="rent-contact-message">
              Message
              <textarea
                id="rent-contact-message"
                name="message"
                rows={3}
                required
                maxLength={4000}
                placeholder="Your dates, destination or question…"
              />
            </label>
          </div>
          {error && (
            <p className="rent-contact-error" role="alert">
              {error}
            </p>
          )}
          {prepared && (
            <p className="rent-contact-status" role="status">
              Your enquiry has been downloaded. It has not been sent to MAK.
            </p>
          )}
          <div className="rent-contact-submit">
            <button type="submit" className="rent-button">
              Send <IconArrowRight size={22} stroke={1.7} aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
