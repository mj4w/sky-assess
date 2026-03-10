import { NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { buildDebriefCompletedTemplate } from "@/lib/email/reminderTemplates"

export async function POST(req: Request) {
  try {
    const { to, studentName, instructorName, courseCode, lessonNo, debriefUrl } = await req.json()
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
    const template = buildDebriefCompletedTemplate({
      studentName: String(studentName || "").trim() || "Student Pilot",
      instructorName: String(instructorName || "").trim() || "Flight Instructor",
      courseCode: String(courseCode || "").trim() || "PPL",
      lessonNo: String(lessonNo || "").trim() || "N/A",
      appUrl,
      debriefUrl: String(debriefUrl || "").trim() || undefined,
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
    const message = error instanceof Error ? error.message : "Unable to send debrief completion email."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
