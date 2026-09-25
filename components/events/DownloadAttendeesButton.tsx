// components/events/DownloadAttendeesButton.tsx
"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import type { Attendee } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface Props {
  eventName:  string;
  location:   string;
  eventDate:  string;   // YYYY-MM-DD
  attendees:  Attendee[];
  sessionName?: string; // optional — for session-level downloads
  variant?: "default" | "ghost";
}

function formatDateLong(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    year:    "numeric",
  });
}

function buildHTML(props: Props, institution: string, coatOfArmsUrl: string): string {
  const { eventName, location, eventDate, attendees, sessionName } = props;
  const title  = sessionName ? `${eventName} — ${sessionName}` : eventName;
  const rows   = attendees.map((a, i) => `
    <tr>
      <td class="center-align">${i + 1}</td>
      <td>${esc(a.full_name)}</td>
      <td>${esc(a.phone)}</td>
      <td>${esc(a.email ?? "")}</td>
      <td>${esc(a.designation ?? "")}</td>
      <td>${esc(a.institution ?? "")}</td>
      <td>${esc(a.mda ?? "")}</td>
    </tr>`).join("");

  // Add blank rows to pad to at least 20
  const blanks = Math.max(0, 20 - attendees.length);
  const blankRows = Array.from({ length: blanks }, (_, i) => `
    <tr>
      <td class="center-align" style="color:#546e7a;font-weight:bold;">${attendees.length + i + 1}</td>
      <td></td><td></td><td></td><td></td><td></td><td></td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #333;
    margin: 0;
    padding: 0;
    background: #fff;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 18mm 15mm 20mm;
    background: #fff;
  }

  /* Header */
  .header { text-align: center; margin-bottom: 6px; }
  .org-name { font-size: 24px; font-weight: 700; color: #0d2346; margin: 0 0 4px; letter-spacing: 0.4px; }
  .org-sub  { font-size: 14px; color: #555; margin: 0 0 12px; font-weight: 500; }
  .logo-wrap { text-align: center; margin-top: 12px;  }
  .logo-wrap img { width: 70px; height: 70px; padding-bottom:5px;}

  .top-bar { height: 3px; background: #0d2346; margin-bottom: 12px; }

  /* Event info */
  .event-block { text-align: center; margin-bottom: 10px; padding-bottom: 6px; }
  .event-title { font-size: 20px; font-weight: 700; color: #0d2346; margin: 0 0 10px; }
  .event-meta  { font-size: 13px; color: #444; margin: 3px 0; }
  .event-meta strong { color: #212121; }

  .section-title { font-size: 15px; font-weight: 700; color: #2e7d32; text-align: center; margin: 0 0 6px; letter-spacing: 1px; }

  /* Table */
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  thead th {
    background: #0d2346;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    padding: 9px 7px;
    border: 1px solid #0d2346;
    text-align: left;
  }
  thead th.center-align, tbody td.center-align { text-align: center; }
  tbody td {
    border: 1px solid #b0bec5;
    height: 36px;
    padding: 3px 7px;
    font-size: 12px;
    color: #212121;
    vertical-align: middle;
  }
  tbody tr:nth-child(even) td { background: #fafafa; }

  .col-no   { width: 5%; }
  .col-name { width: 22%; }
  .col-ph   { width: 15%; }
  .col-em   { width: 22%; }
  .col-des  { width: 17%; }
  .col-org  { width: 19%; }

  @page {
  margin: 0;
  size: A4;
}
  @media print {
  body { background: #fff; }
  .page { width: 100%; padding: 18mm 15mm 20mm; margin: 0; }
  thead { display: table-row-group; }
  thead th { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #0d2346 !important; color: #fff !important; }
}
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="logo-wrap">
      <img src="${coatOfArmsUrl}" alt="Sierra Leone Coat of Arms" crossorigin="anonymous"/>
    </div>
    <p class="org-sub">Government of Sierra Leone</p>
    <h1 class="org-name">${esc(institution )}</h1>
  </div>

  <div class="top-bar"></div>

  <!-- Event Info -->
  <div class="event-block">
    <h2 class="event-title">${esc(eventName)}</h2>
    <p class="event-meta"><strong>Venue:</strong> ${esc(location)}</p>
    <p class="event-meta"><strong>Date:</strong> ${formatDateLong(eventDate)}</p>
    <p class="event-meta"><strong>Total attendees:</strong> ${attendees.length}</p>
    ${sessionName ? `<p class="event-meta"><strong>Session:</strong> ${esc(sessionName)}</p>` : ''}
  </div>

  <h3 class="section-title">ATTENDANCE LIST</h3>

  <!-- Table -->
  <table>
    <thead>
      <tr>
        <th class="col-no center-align">No.</th>
        <th class="col-name">Full Name</th>
        <th class="col-ph">Phone</th>
        <th class="col-em">Email</th>
        <th class="col-des">Designation</th>
        <th class="col-org">Institution</th>
        <th class="col-org">MDA</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      ${blankRows}
    </tbody>
  </table>
</div>
</body>
</html>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function DownloadAttendeesButton({ variant = "default", ...props }: Props) {
  const [institution, setInstitution] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("institution").eq("id", user.id).single();
      if (data?.institution) setInstitution(data.institution);
    }
    load();
  }, []);

  function handleDownload() {
  const origin = window.location.origin;
  const coatOfArmsUrl = `${origin}/coat-removebg-preview.png`;
  const html   = buildHTML(props, institution, coatOfArmsUrl);
  
  // Use an iframe to trigger print without opening a new window
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
    
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Clean up after printing
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 100);
    }, 800);
  }
}

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700/50"
    >
      <Download className="h-4 w-4" />
      Download list
    </button>
  );
}