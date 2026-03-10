import { NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { buildFlightAssignmentNotificationTemplate } from "@/lib/email/reminderTemplates"

export async function POST(req: Request) {
  try {
    const {
      to,
      recipientName,
      recipientRole,
      opDate,
      aircraftType,
      aircraftRegistry,
      timeRange,
      flightType,
    } = await req.json()

    const recipient = String(to || "").trim()
    if (!recipient) {
      return NextResponse.json({ error: "Recipient email is required." }, { status: 400 })
    }

    const gmailUser = process.env.GMAIL_USER
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD
    if (!gmailUser || !gmailAppPassword) {
      return NextResponse.json({ error: "GMAIL_USER or GMAIL_APP_PASSWORD is not configured." }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const from = process.env.SMTP_FROM_EMAIL || gmailUser
    const template = buildFlightAssignmentNotificationTemplate({
      recipientName: String(recipientName || "").trim() || "Flight Crew",
      recipientRole: recipientRole === "instructor" ? "instructor" : "student",
      appUrl,
      opDate: String(opDate || "").trim(),
      aircraftType: String(aircraftType || "").trim(),
      aircraftRegistry: String(aircraftRegistry || "").trim(),
      timeRange: String(timeRange || "").trim(),
      flightType: String(flightType || "").trim(),
    })

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    })

    const info = await transporter.sendMail({
      from,
      to: recipient,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    return NextResponse.json({ success: true, id: info.messageId || null })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send assignment notification email."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
