/* One real input, styled as six boxes, so iOS Safari can offer “From Messages”.
   Android Chrome can fill the same field via WebOTP when the SMS ends with:

     @<domain> #<code>

   Example:

     Your Laverie code is 482910.

     @laverie-transfer.example #482910

   WebOTP only works on HTTPS origins. Other browsers fall back to typing
   the code, or to the platform’s autofill if it has one.
*/
function bindLaverieOtp(root) {
  const scope = root || document;
  const input = scope.querySelector(".otp-real");
  const slots = scope.querySelectorAll(".otp-slots span");
  if (!input || !slots.length) return;

  function digits(value) {
    return String(value || "").replace(/\D/g, "").slice(0, 6);
  }

  function paint() {
    const v = digits(input.value);
    if (input.value !== v) input.value = v;
    slots.forEach((slot, i) => {
      slot.textContent = v[i] || "";
      slot.classList.toggle("is-filled", Boolean(v[i]));
      slot.classList.toggle("is-active", document.activeElement === input && i === Math.min(v.length, 5));
    });
  }

  input.addEventListener("input", paint);
  input.addEventListener("focus", paint);
  input.addEventListener("blur", () => {
    slots.forEach((slot) => slot.classList.remove("is-active"));
  });
  paint();

  if (!("OTPCredential" in window)) return;

  const ac = new AbortController();
  const form = input.form;
  if (form) {
    form.addEventListener("submit", () => ac.abort(), { once: true });
  }

  navigator.credentials
    .get({ otp: { transport: ["sms"] }, signal: ac.signal })
    .then((otp) => {
      if (!otp || !otp.code) return;
      input.value = digits(otp.code);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    })
    .catch(() => {
      /* No SMS, permission denied, or unsupported origin — type the code. */
    });
}
