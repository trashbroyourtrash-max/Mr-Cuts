<!doctype html>
<html lang='en'>
<head>

const bookedDates = [
  "2026-10-24","2026-10-27","2026-10-30",
  "2026-11-03","2026-11-07","2026-11-12"
];

const cal = document.getElementById("calendar");
if(cal){
  let view = new Date();
  view.setDate(1);
  let selected = null;

  function iso(y,m,d){
    return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }
  function render(){
    const y=view.getFullYear(), m=view.getMonth();
    const title=document.getElementById("monthTitle");
    title.textContent=view.toLocaleString("en-US",{month:"long",year:"numeric"});
    const days=document.getElementById("days");
    days.innerHTML="";
    const first=new Date(y,m,1).getDay();
    const count=new Date(y,m+1,0).getDate();
    for(let i=0;i<first;i++) days.insertAdjacentHTML("beforeend",'<button class="day empty" aria-hidden="true"></button>');
    for(let d=1;d<=count;d++){
      const key=iso(y,m,d), isBooked=bookedDates.includes(key);
      const b=document.createElement("button");
      b.className="day"+(isBooked?" booked":"")+(selected===key?" selected":"");
      b.innerHTML=`${d}<small>${isBooked?"Booked":"Open"}</small>`;
      b.disabled=isBooked;
      if(!isBooked) b.onclick=()=>{selected=key;render();showSelection(key)};
      days.appendChild(b);
    }
  }
  function showSelection(key){
    const d=new Date(key+"T12:00:00");
    document.getElementById("selectedDate").textContent =
      d.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});
    document.getElementById("bookingDate").value=key;
    document.getElementById("bookingMessage").textContent="This is a frontend demo: the selected date is shown, but no booking is stored yet.";
  }
  document.getElementById("prevMonth").onclick=()=>{view.setMonth(view.getMonth()-1);render()};
  document.getElementById("nextMonth").onclick=()=>{view.setMonth(view.getMonth()+1);render()};
  render();
}
const form=document.getElementById("bookingForm");
if(form){
  form.addEventListener("submit",e=>{
    e.preventDefault();
    const name=document.getElementById("name").value.trim();
    const date=document.getElementById("bookingDate").value;
    if(!date){document.getElementById("bookingMessage").textContent="Please select an open date first.";return;}
    document.getElementById("bookingMessage").textContent=`Thanks${name?", "+name:""}! Your request for ${date} has been prepared. Connect this form to a backend to save real bookings.`;
    form.reset();
  });
}
