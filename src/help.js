// In-app guide for the studio owner (Studio › Help). Keep button names in sync with app.js.
const sections = [
  ['Getting started', `
    <p><b>Open the app:</b> tap the white Laurel icon on your home screen, or go to this website in Chrome or Safari. Sign in with your email and password. You stay signed in.</p>
    <p><b>Put it on your home screen</b> (once):</p>
    <ul><li><b>Android:</b> in Chrome tap <b>⋮</b>, then <b>Add to Home screen</b>.</li>
    <li><b>iPhone:</b> in Safari tap the <b>Share</b> button, then <b>Add to Home Screen</b>.</li></ul>
    <p><b>Forgot your password?</b> On the sign-in screen, type your email and tap <b>Forgot password?</b>, then follow the link in the email.</p>
    <p>The buttons <b>Today</b>, <b>Diary</b>, <b>Clients</b>, <b>Money</b>, <b>Tax</b> and <b>Studio</b> take you to each part of the app. <b>Client view</b> at the top shows what clients see.</p>`],
  ['Your day: booking requests and payments', `
    <p><b>When a client asks for a booking</b>, it appears on <b>Today</b> under <b>Booking requests</b>.</p>
    <ol><li>Check the time and treatment.</li><li>Tap <b>Confirm</b>, or <b>Decline</b> if you can't fit it in.</li><li>Send the client a WhatsApp to let them know.</li></ol>
    <p><b>After a treatment</b>, tap <b>Done &amp; paid</b>, check the amount, choose how they paid, and tap <b>Save</b>. If they haven't paid yet, tick <b>Not paid yet</b>. Only paid treatments count as income.</p>
    <p><b>If a client doesn't arrive</b>, tap <b>No-show</b>.</p>`],
  ['Diary: add, move or cancel bookings', `
    <p>Tap a day in the strip at the top. <b>‹ Week</b> and <b>Week ›</b> move between weeks.</p>
    <p><b>Add a booking</b> (for example, someone who phones you):</p>
    <ol><li>Tap <b>+ New booking</b>.</li><li>Pick the <b>Client</b>, or leave <b>New client…</b> and type their name and number.</li>
    <li>Choose the <b>Treatment</b>, <b>Date</b> and <b>Time</b>.</li><li>Leave <b>Price</b> empty to use the price list.</li><li>Tap <b>Add booking</b>.</li></ol>
    <p><b>Move a booking:</b> tap <b>Edit</b>, change the date or time, and tap <b>Save</b>.</p>
    <p><b>Cancel:</b> tap <b>Edit</b>, set <b>Status</b> to <b>Cancelled</b>, and tap <b>Save</b>. The time opens up for clients again. <b>Delete</b> removes a booking made by mistake.</p>`],
  ['Clients', `
    <p>Clients who book online are added automatically. Type in the search box to find someone, and tap a name to see their notes and visits.</p>
    <p><b>Add a client:</b> tap <b>+ Add client</b>, fill in their details and notes (skin type, allergies, pregnancy), and tap <b>Add client</b>.</p>
    <p><b>Update notes:</b> tap the name, then <b>Edit</b>, then <b>Save</b>. Only you can see client details.</p>`],
  ['Money: expenses, receipts and budget', `
    <p><b>Add an expense with a receipt:</b></p>
    <ol><li>Tap <b>+ Expense</b>.</li><li>Fill in the date, amount (including VAT), who you paid, and the category.</li>
    <li>Under <b>Receipt photo or PDF</b>, take a photo of the slip.</li><li>Tap <b>Add expense</b>.</li></ol>
    <p><b>Other income</b> (product sales, vouchers, Symm's rent): tap <b>+ Income</b>. Treatments count by themselves once marked <b>Done &amp; paid</b>.</p>
    <p><b>Budget:</b> tap <b>Edit budget</b>, set an amount per category, and tap <b>Save budget</b>. A bar turns red when you overspend.</p>`],
  ['Tax', `
    <p>The <b>Tax</b> page fills itself in for the SARS tax year (March to February). It shows profit so far, a rough tax estimate, the provisional tax dates, and how close you are to VAT registration.</p>
    <p><b>For your accountant:</b> tap <b>Copy records for accountant</b> and paste into an email or WhatsApp.</p>
    <p>The estimate is a guide only. Check it with your accountant.</p>`],
  ['Studio: prices, stock, planner, chatbot, settings', `
    <p><b>Change a price or treatment:</b> <b>Studio</b> › <b>Services &amp; prices</b> › <b>Edit</b> › change it › <b>Save</b>. Use <b>+ Add service</b> for something new. Clients see changes straight away.</p>
    <p>In the same screen you can add a <b>Short description</b>, tick <b>Extra only</b> for add-ons (clients add them to another treatment), and set the <b>Note under the heading</b> of a category. Set <b>Done by</b> to Symm for her nail treatments so they show on her page.</p>
    <p><b>Stock:</b> tap <b>−</b> or <b>+</b> to change counts. <b>Edit</b> sets when it shows as <b>Low</b>.</p>
    <p><b>Planner:</b> type a task, pick a date, and tap <b>Add</b>. Tick it off when it's done.</p>
    <p><b>Chatbot answers:</b> tap <b>Edit</b> to change what the client chat says. Leave <b>{{hours}}</b> and <b>{{prices}}</b> as they are.</p>
    <p><b>Settings</b> (do this first): under <b>People working in the space</b>, the first person is you. Tick <b>Rents the space</b> only for Symm. Then add your <b>WhatsApp number for clients</b>, set your <b>Opening hours</b>, then tap <b>Save settings</b>. The <b>Cancellation policy</b> and the <b>Note at the end of your menu</b> (Tapputi Perfumes) are here too. <b>Sign out</b> is also here.</p>`],
  ["Symm's page and extras", `
    <p>The booking page has two menus: yours and <b>Nails by Symm</b>. Clients tap the switch at the top, or swipe left and right, to move between them. Symm's bookings use her own diary times, so she and you can be booked at the same time.</p>
    <p>After choosing a treatment, clients can tap extras (for example <b>Add on Dermaplane</b>). The booking then shows the extras in its notes, with the time and price added.</p>
    <p>Symm can share her own link: your booking link with <b>#symm</b> at the end opens her page first.</p>`],
  ['Privacy and backups', `
    <p>Clients must tick that they agree to you keeping their details before they can book online. They can open <b>How we look after your details</b> to read your privacy notice. Change its wording in <b>Studio</b> › <b>Settings</b>.</p>
    <p><b>If a client asks you to delete her details:</b> <b>Clients</b> › tap her name › <b>Delete client</b> › <b>Delete</b>. Her name, number and notes are removed, and her upcoming bookings are cancelled. Past payments stay in your money records without a name.</p>
    <p><b>Backups:</b> once a month, tap <b>Download a backup</b> (on <b>Today</b> when it's due, or in <b>Studio</b> › <b>Settings</b>). Save the file to Google Drive or email it to yourself. Keep your phone locked with a PIN, because the app stays signed in.</p>`],
  ['Sharing your booking link', `
    <p>On <b>Today</b>, tap <b>Copy booking link</b> and paste it into your WhatsApp status, Instagram bio or Google profile. Clients book in their browser, with nothing to download. For Symm, add <b>#symm</b> to the end of the link.</p>`],
];

export const helpHTML = () => sections.map(([title, body], i) =>
  `<details class="help"${i === 0 ? ' open' : ''}><summary>${title}</summary><div class="helpbody">${body}</div></details>`).join('');
