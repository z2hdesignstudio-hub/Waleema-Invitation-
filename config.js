/* ------------------------------------------------------------------
   Invitation settings — the only file you need to edit.

   rsvpEndpoint
     Paste the Google Apps Script "Web app" URL here (it ends in /exec).
     Follow README.md, section 1, to get it. Until it is set, the RSVP
     form will tell guests it is not connected yet.

   eventISO
     Start of the event, used by the countdown (Sri Lanka time, +05:30).
   ------------------------------------------------------------------ */
window.INVITE_CONFIG = {
  rsvpEndpoint: "https://script.google.com/macros/s/AKfycbzBuIQ57U6aa6lg7lX9QvLf71NsTBz5RW1A2vlEHsoEnCIfQnhNuRnUTMouuPgsMRkn/exec",
  eventISO: "2026-12-23T12:30:00+05:30",
  helpPhone: "077 897 7028"
};
